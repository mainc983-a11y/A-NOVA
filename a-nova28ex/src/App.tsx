import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { User, ChatSession, Settings, AttachedFile } from "./types";
import { apiFetch } from "./apiClient";
import Sidebar from "./components/Sidebar";
import ChatInterface from "./components/ChatInterface";
import AnovaLogo from "./components/AnovaLogo";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { PermissionProvider } from "./components/PermissionManager";
import { Bot, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { getOrGenerateUserId } from "./utils/userId";
import { getSovereignConfig, executeSovereignWorkflow } from "./services/sovereignEngine";
import { isLocationRequiredForQuery, getDeviceNativeLocation, getCachedLocationPermission } from "./utils/geolocation";

// Lazy-load SettingsModal and LoginRegister with instant preloading to eliminate tap latency
const loadSettingsModalComponent = () => import("./components/SettingsModal");
const loadLoginRegisterComponent = () => import("./components/LoginRegister");

const SettingsModal = React.lazy(loadSettingsModalComponent);
const LoginRegister = React.lazy(loadLoginRegisterComponent);

// Configurable session expiration duration (e.g., 7 days)
const SESSION_EXPIRATION_DAYS = 7;
const SESSION_EXPIRATION_MS = SESSION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalInitialRegister, setLoginModalInitialRegister] = useState(false);

  const handleOpenLoginModal = useCallback((isRegister = false) => {
    setLoginModalInitialRegister(isRegister);
    setIsLoginModalOpen(true);
  }, []);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  const [activeCognitiveMode, setActiveCognitiveMode] = useState<'general' | 'math' | 'coding' | 'sovereign'>(() => {
    try {
      return (localStorage.getItem("a_nova_selected_cognitive_mode") as 'general' | 'math' | 'coding' | 'sovereign') || "sovereign";
    } catch {
      return "sovereign";
    }
  });
  
  // Track currently in-flight session detail requests to prevent duplicate parallel fetches
  const loadingSessionsRef = useRef<Record<string, boolean>>({});
  const lastSyncedTokenRef = useRef<string | null>(null);
  const pendingSessionCreationRef = useRef<{ tempId: string; promise: Promise<string> } | null>(null);
  const sessionIdAliasMapRef = useRef<Record<string, string>>({});
  const activeStreamIntervalsRef = useRef<Set<any>>(new Set());

  useEffect(() => {
    return () => {
      activeStreamIntervalsRef.current.forEach((id) => clearInterval(id));
      activeStreamIntervalsRef.current.clear();
    };
  }, []);
  
  // High-performance React state untethering ref to eliminate list-level rendering cascade lag
  const sessionsRef = useRef<ChatSession[]>([]);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);
  
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem("a_nova_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.voiceName || parsed.voiceName === "Zephyr") {
          parsed.voiceName = "Nova";
        }
        return parsed;
      }
    } catch (e) {}
    return {
      defaultModel: "gemini-3.6-flash",
      systemPrompt: "You are A-NOVA, a warm, highly intelligent, and conversational AI companion.",
      aboutMe: "",
      respondWay: "",
      voiceEnabled: false,
      voiceName: "Nova",
      theme: "system",
      isDarkMode: typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : true,
      accentColor: "auto",
      fontSize: "md",
      messageDensity: "comfortable",
      showChatMetadata: false,
      codeTheme: "auto"
    };
  });

  // Sidebar / Settings Modal Open State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<any>(undefined);
  
  // Status flags
  const [loadingSessions, setLoadingSessions] = useState<Record<string, boolean>>({});
  const [authBootstrapping, setAuthBootstrapping] = useState(true);

  // Sync back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Active session resolver
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Sync Tailwind root theme classes & appearance data attributes based on settings
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      let isDark = settings.isDarkMode ?? true;

      if (settings.theme === 'system') {
        if (typeof window !== 'undefined' && window.matchMedia) {
          isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
      } else if (settings.theme === 'dark') {
        isDark = true;
      } else if (settings.theme === 'light') {
        isDark = false;
      }

      if (settings.isDarkMode !== isDark) {
        setSettings(prev => ({ ...prev, isDarkMode: isDark }));
      }

      if (isDark) {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      } else {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      }

      if (settings.accentColor) root.setAttribute("data-accent-color", settings.accentColor);
      if (settings.fontSize) root.setAttribute("data-font-size", settings.fontSize);
      if (settings.messageDensity) root.setAttribute("data-message-density", settings.messageDensity);
    };

    applyTheme();

    if (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.isDarkMode, settings.theme, settings.accentColor, settings.fontSize, settings.messageDensity]);

  // Helper to sanitize user object from fake placeholders
  const sanitizeUserObj = (u: any) => {
    if (!u) return u;
    const isPlaceholder = (e?: string) => {
      if (!e || !e.trim()) return true;
      const lower = e.toLowerCase().trim();
      return lower.includes("@a-nova.workspace") || lower.includes("a-nova.internal") || lower.startsWith("guest_") || lower === "guest_user" || lower.includes("google.user") || lower.includes("apple.user");
    };
    const cleanEmail = isPlaceholder(u.email) ? "" : u.email;
    const cleanUsername = (!u.username || u.username === "guest_user" || u.username.startsWith("guest_")) ? "Guest" : u.username;
    const cleanDisplayName = (!u.displayName || u.displayName === "guest_user" || u.displayName.startsWith("guest_")) ? (cleanUsername === "Guest" ? "Guest User" : cleanUsername) : u.displayName;
    return {
      ...u,
      email: cleanEmail,
      username: cleanUsername,
      displayName: cleanDisplayName
    };
  };

  // Bootstrapping session load
  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const savedToken = localStorage.getItem("a_nova_auth_token");
        const savedUserData = localStorage.getItem("a_nova_user_data");

        if (savedToken) {
          try {
            const res = await apiFetch("/api/auth/me", {
              headers: { Authorization: `Bearer ${savedToken}` }
            }, "App.tsx:initAuthMe");
            if (res.ok) {
              const rawProfile = await res.json();
              const profile = sanitizeUserObj(rawProfile);
              if (!active) return;
              setToken(savedToken);
              setUser(profile);
              if (profile.email) {
                localStorage.setItem("a_nova_remembered_email", profile.email);
              }
              await syncUserWorkspace(savedToken);
              if (window.location.pathname === "/login") {
                window.history.pushState({}, "", "/");
                setCurrentPath("/");
              }
              return;
            }
          } catch (meErr) {
            console.warn("Auth validation skipped:", meErr);
          }

          if (savedUserData) {
            try {
              const rawUser = JSON.parse(savedUserData);
              const parsedUser = sanitizeUserObj(rawUser);
              if (!active) return;
              setToken(savedToken);
              setUser(parsedUser);
              if (parsedUser.email) {
                localStorage.setItem("a_nova_remembered_email", parsedUser.email);
              }
              await syncUserWorkspace(savedToken);
              if (window.location.pathname === "/login") {
                window.history.pushState({}, "", "/");
                setCurrentPath("/");
              }
              return;
            } catch (parseE) {
              console.warn("User data parse error:", parseE);
            }
          }
        } else {
          setToken(null);
          setUser(null);
          if (window.location.pathname === "/login") {
            window.history.pushState({}, "", "/");
            setCurrentPath("/");
          }
          setIsLoginModalOpen(false);
        }
      } catch (err) {
        console.error("Session init fell back due to error:", err);
      } finally {
        if (active) {
          setAuthBootstrapping(false);
        }
      }
    };

    checkSession();

    // Check for password recovery URL parameters
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      if (searchParams.get("type") === "recovery" || hashParams.get("type") === "recovery" || searchParams.get("token")) {
        setIsLoginModalOpen(true);
      }
    } catch {}

    // Set up real-time status listener safely
    let subscription: any = null;
    if (isSupabaseConfigured) {
      try {
        const res = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!active) return;
          console.log(`[GOOGLE AUTH] Auth state changed event: ${event}`);

          if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED")) {
            const userToken = session.access_token;
            const meta = session.user.user_metadata || {};
            const userEmail = (session.user.email || meta.email || "").toLowerCase().trim();
            const fullName = meta.full_name || meta.name || [meta.given_name, meta.family_name].filter(Boolean).join(" ") || meta.displayName || (userEmail ? userEmail.split("@")[0] : "Google User");
            const avatarUrl = meta.avatar_url || meta.picture || meta.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${session.user.id}`;
            const googleId = session.user.identities?.find((i: any) => i.provider === "google")?.id || meta.sub || session.user.id;
            const isGoogle = session.user.app_metadata?.provider === "google" || meta.provider === "google" || session.user.identities?.some((i: any) => i.provider === "google");

            let activeUser: User = {
              id: session.user.id,
              email: userEmail,
              username: userEmail ? userEmail.split("@")[0] : "user_" + session.user.id.slice(0, 8),
              displayName: fullName,
              avatarUrl: avatarUrl,
              createdAt: session.user.created_at || new Date().toISOString(),
              planStatus: meta?.planStatus || "none",
              role: "user",
              provider: isGoogle ? "google" : "supabase",
              emailVerified: true
            };

            // Sync user profile & account linking on backend
            try {
              const syncRes = await apiFetch("/api/auth/google-sync", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${userToken}` 
                },
                body: JSON.stringify({
                  email: userEmail,
                  displayName: fullName,
                  avatarUrl: avatarUrl,
                  googleId: googleId,
                  provider: isGoogle ? "google" : "supabase"
                })
              }, "App.tsx:googleAuthSync");

              if (syncRes.ok) {
                const syncData = await syncRes.json();
                if (syncData.user) {
                  activeUser = sanitizeUserObj(syncData.user);
                }
              }
            } catch (syncErr) {
              console.warn("[GOOGLE AUTH] Server user sync notice:", syncErr);
            }

            localStorage.setItem("a_nova_auth_token", userToken);
            localStorage.setItem("a_nova_user_data", JSON.stringify(activeUser));
            localStorage.setItem("a_nova_session_created_at", Date.now().toString());
            if (activeUser.email) {
              localStorage.setItem("a_nova_remembered_email", activeUser.email);
            }

            setToken(userToken);
            setUser(activeUser);
            await syncUserWorkspace(userToken);

            if (window.location.pathname === "/login") {
              window.history.pushState({}, "", "/");
              setCurrentPath("/");
            }
          } else if (event === "PASSWORD_RECOVERY") {
            console.log("[AUTH] Password recovery event detected.");
            setIsLoginModalOpen(true);
          } else if (event === "SIGNED_OUT") {
            console.log("[GOOGLE AUTH] User signed out cleanly.");
            lastSyncedTokenRef.current = null;
            localStorage.removeItem("a_nova_auth_token");
            localStorage.removeItem("a_nova_user_data");
            localStorage.removeItem("a_nova_auth_user");
            localStorage.removeItem("a_nova_session_created_at");
            setToken(null);
            setUser(null);
            setSessions([]);
            setActiveSessionId(null);
            setIsLoginModalOpen(false);
          }
        });
        subscription = res?.data?.subscription;
      } catch (listenerErr) {
        console.warn("Supabase auth state change listener skipped:", listenerErr);
      }
    }

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Synchronizes complete history list and settings structures
  const syncUserWorkspace = useCallback(async (userToken: string) => {
    if (lastSyncedTokenRef.current === userToken) {
      return; // Already synced for this session token, omit duplicate request
    }
    lastSyncedTokenRef.current = userToken;
    let retries = 2;
    while (retries >= 0) {
      try {
        // 1. Load settings configurations
        const settingsRes = await apiFetch("/api/settings", {
          headers: { Authorization: `Bearer ${userToken}` }
        }, "App.tsx:syncUserSettings");
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData);
        }

        // 2. Load conversations history list
        const chatsRes = await apiFetch("/api/chats", {
          headers: { Authorization: `Bearer ${userToken}` }
        }, "App.tsx:syncUserChats");
        if (chatsRes.ok) {
          let chatsList: ChatSession[] = await chatsRes.json();

          // Retention policy:
          // NOT LOGGED IN: keep conversations for only the previous 7 days (auto-remove > 7 days old)
          // LOGGED IN: permanent storage in user account (keep all previous conversations)
          const isNotLoggedIn = !user || !userToken || userToken.startsWith("anon_") || userToken.startsWith("guest_");
          if (isNotLoggedIn) {
            const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            chatsList = chatsList.filter((s: ChatSession) => {
              const time = new Date(s.updatedAt || s.createdAt).getTime();
              return !isNaN(time) && (now - time <= SEVEN_DAYS_MS);
            });
          }

          setSessions(chatsList);

          const savedMode = (localStorage.getItem("a_nova_selected_cognitive_mode") as 'general' | 'math' | 'coding' | 'sovereign') || "general";
          setActiveCognitiveMode(savedMode);

          if (chatsList && chatsList.length > 0) {
            // Find chats in this saved mode
            const chatsInMode = chatsList.filter((s: ChatSession) => (s.mode || 'general') === savedMode && !s.archived);

            if (chatsInMode.length > 0) {
              // Automatically load and open the most recent chat session of this mode
              await loadSessionDetails(chatsInMode[0].id, userToken);
            } else {
              // Start a fresh specialized session
              await triggerNewSession(savedMode, userToken);
            }
          } else {
            // If no chats exist, start a fresh companion session
            await triggerNewSession(savedMode, userToken);
          }
          break; // success
        } else {
          throw new Error("Invalid sync server response status.");
        }
      } catch (error) {
        if (retries === 0) {
          console.error("Workspace synchronization failed permanently after retries:", error);
        } else {
          console.warn(`Sync user workspace error, retrying... (${retries} left)`);
          await new Promise(r => setTimeout(r, 600));
        }
      }
      retries--;
    }
  }, []);

  // Load complete dialog messages sequence inside of a session ID
  const loadSessionDetails = useCallback(async (id: string, userToken = token) => {
    // 1. Instantly update active session state for 100% responsive, lag-free visual selection
    setActiveSessionId(id);

    const existingSession = (sessionsRef.current || []).find(s => s.id === id);
    if (existingSession && existingSession.mode) {
      try {
        localStorage.setItem("a_nova_selected_cognitive_mode", existingSession.mode);
        setActiveCognitiveMode(existingSession.mode);
      } catch (err) {
        console.warn("Storage write failed:", err);
      }
    }

    // 2. Optimistic skip: if it's a new optimistic session, do not perform details fetching
    if (id.startsWith("temp_")) return;

    // 3. Cache Check: If messages are already present, we are ready to display and can omit blocking fetches
    if (existingSession && existingSession.messages && existingSession.messages.length > 0) {
      return;
    }

    const activeToken = userToken || token;
    if (!activeToken) return;
    
    // Prevent duplicated / parallel in-flight fetches for the exact same session
    if (loadingSessionsRef.current[id]) return;
    loadingSessionsRef.current[id] = true;

    let retries = 2;
    while (retries >= 0) {
      try {
        const res = await apiFetch(`/api/chats/${id}`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        }, "App.tsx:loadSessionDetails");
        if (res.ok) {
          const fullSession = await res.json();
          setSessions(prev => 
            prev.map(s => s.id === id ? fullSession : s)
          );
          setActiveSessionId(id);
          break; // success
        } else {
          throw new Error("Invalid session retrieve status.");
        }
      } catch (err) {
        if (retries === 0) {
          console.error(`Failed to load details for active session ${id} after retries:`, err);
        } else {
          console.warn(`Load session ${id} error, retrying... (${retries} left)`);
          await new Promise(r => setTimeout(r, 600));
        }
      }
      retries--;
    }
    loadingSessionsRef.current[id] = false;
  }, [token]);

  const getOrEnsureToken = useCallback(() => {
    if (token) return token;
    let anon = localStorage.getItem("a_nova_anon_token");
    if (!anon) {
      anon = "anon_" + Math.random().toString(36).substring(2, 12);
      localStorage.setItem("a_nova_anon_token", anon);
    }
    setToken(anon);
    return anon;
  }, [token]);

  // Create new specialized conversation thread on the backend database
  const triggerNewSession = useCallback(async (mode: 'general' | 'math' | 'coding' | 'sovereign' = 'general', userToken = token) => {
    const activeToken = userToken || token || getOrEnsureToken();
    if (!activeToken) return "";
    
    // OPTIMISTIC UI: Instantly create and select a temporary session
    const tempId = "temp_" + Math.random().toString(36).substring(2, 11);
    const optimisticSession: ChatSession = {
      id: tempId,
      title: mode === "math" ? "Math Workspace" : mode === "coding" ? "Complex Coding" : mode === "sovereign" ? "BIS Assistant" : "New Chat",
      mode,
      messages: [],
      selectedModel: mode === "sovereign" ? "auto" : (settings.defaultModel || "gemini-3.6-flash"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
      archived: false
    };

    setSessions(prev => [optimisticSession, ...prev]);
    setActiveSessionId(tempId);

    const creationPromise = (async () => {
      try {
        const res = await apiFetch("/api/chats", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`
          },
          body: JSON.stringify({ mode })
        }, "App.tsx:triggerNewSession");
        if (res.ok) {
          const newSession = await res.json();
          sessionIdAliasMapRef.current[tempId] = newSession.id;
          // Replace temp optimistic state with real server payload while preserving any user-sent messages
          setSessions(prev => 
            prev.map(s => {
              if (s.id === tempId) {
                return {
                  ...newSession,
                  messages: (s.messages && s.messages.length > 0) ? s.messages : newSession.messages,
                  title: (s.title && !["New Chat", "Math Workspace", "Complex Coding", "BIS Assistant"].includes(s.title)) ? s.title : newSession.title
                };
              }
              return s;
            })
          );
          setActiveSessionId(prevId => prevId === tempId ? newSession.id : prevId);
          return newSession.id as string;
        } else {
          // Keep optimistic session so direct message posting creates chat on backend
          console.warn("Session creation endpoint returned non-200, retaining optimistic session for chat.");
          return tempId;
        }
      } catch (err) {
        console.warn("New session creation network issue, retaining optimistic session for chat:", err);
        return tempId;
      } finally {
        if (pendingSessionCreationRef.current?.tempId === tempId) {
          pendingSessionCreationRef.current = null;
        }
      }
    })();

    pendingSessionCreationRef.current = { tempId, promise: creationPromise };

    return tempId;
  }, [token]);

  // --- CONTROLLER HANDLERS ---

  const handleAuthSuccess = (newToken: string, activeUser: User) => {
    setToken(newToken);
    setUser(activeUser);
    setIsLoginModalOpen(false);
    try {
      localStorage.setItem("a_nova_session_created_at", Date.now().toString());
      if (activeUser?.email) {
        localStorage.setItem("a_nova_remembered_email", activeUser.email);
      }
    } catch (e) {}
    syncUserWorkspace(newToken);
    if (window.location.pathname === "/login") {
      window.history.pushState({}, "", "/");
      setCurrentPath("/");
    }
  };

  const handleLogout = useCallback(async () => {
    try {
      localStorage.removeItem("a_nova_auth_token");
      localStorage.removeItem("a_nova_user_data");
      localStorage.removeItem("a_nova_auth_user");
      localStorage.removeItem("a_nova_session_created_at");
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn("Supabase signout issue:", err);
    }
    setToken(null);
    setUser(null);
    setSessions([]);
    setActiveSessionId(null);
    setIsLoginModalOpen(false);
  }, []);

  const handleRenameSession = useCallback(async (id: string, newTitle: string) => {
    if (!token) return;
    try {
      const res = await apiFetch(`/api/chats/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle })
      }, "App.tsx:handleRenameSession");
      if (res.ok) {
        setSessions(prev => 
          prev.map(s => s.id === id ? { ...s, title: newTitle } : s)
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const handleEditMessage = useCallback(async (sessionId: string, messageId: string, newContent: string) => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id !== sessionId) return s;
        const updatedMsgs = (s.messages || []).map(m =>
          m.id === messageId ? { ...m, content: newContent } : m
        );
        return { ...s, messages: updatedMsgs };
      })
    );

    if (token && sessionId && !sessionId.startsWith("temp_")) {
      try {
        await apiFetch(`/api/chats/${sessionId}/messages/${messageId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ content: newContent })
        }, "App.tsx:handleEditMessage");
      } catch (err) {
        console.error("Failed to save message edit:", err);
      }
    }
  }, [token]);

  const handleRetryMessage = useCallback(async (sessionId: string, messageId: string, promptText: string) => {
    const activeToken = token || getOrEnsureToken();
    if (!activeToken) return;

    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    const msgIdx = (session.messages || []).findIndex(m => m.id === messageId);
    if (msgIdx === -1) return;

    const userMsg = msgIdx > 0 && session.messages[msgIdx - 1].role === "user" ? session.messages[msgIdx - 1] : null;
    const effectivePrompt = userMsg ? userMsg.content : promptText;
    const effectiveFiles = userMsg?.attachedFiles || [];

    setLoadingSessions(prev => ({ ...prev, [sessionId]: true }));

    // Clear target message content in-place to stream new response
    setSessions(prev =>
      prev.map(s => {
        if (s.id !== sessionId) return s;
        const updatedMsgs = (s.messages || []).map(m =>
          m.id === messageId ? { ...m, content: "", generatedImages: undefined } : m
        );
        return { ...s, messages: updatedMsgs };
      })
    );

    try {
      const response = await apiFetch(`/api/chats/${sessionId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`
        },
        body: JSON.stringify({ content: effectivePrompt, attachedFiles: effectiveFiles })
      }, "App.tsx:handleRetryMessage");

      if (!response.ok) {
        let errMsg = "Communication failure.";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("Generative stream is not readable.");

        let buffer = "";
        let accumulatedText = "";
        let lastUpdate = Date.now();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || !cleanLine.startsWith("data: ")) continue;

            const jsonStr = cleanLine.substring(6);
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === "chunk" && parsed.text !== undefined) {
                accumulatedText += parsed.text;

                const now = Date.now();
                if (now - lastUpdate > 16) {
                  lastUpdate = now;
                  setSessions(prev =>
                    prev.map(s => {
                      if (s.id !== sessionId) return s;
                      const updatedMsgs = (s.messages || []).map(m =>
                        m.id === messageId ? { ...m, content: accumulatedText } : m
                      );
                      return { ...s, messages: updatedMsgs };
                    })
                  );
                }
              }
            } catch (err) {
              console.warn("Error parsing chunk:", err);
            }
          }
        }

        // Apply final text to in-place target message
        setSessions(prev =>
          prev.map(s => {
            if (s.id !== sessionId) return s;
            const updatedMsgs = (s.messages || []).map(m =>
              m.id === messageId ? { ...m, content: accumulatedText } : m
            );
            return { ...s, messages: updatedMsgs };
          })
        );

        // Persist retried message on backend server
        if (activeToken && sessionId && !sessionId.startsWith("temp_")) {
          try {
            await apiFetch(`/api/chats/${sessionId}/messages/${messageId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${activeToken}`
              },
              body: JSON.stringify({ content: accumulatedText })
            }, "App.tsx:handleRetryMessage:put");
          } catch (err) {
            console.error("Failed to save retried message on server:", err);
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to retry message:", err);
    } finally {
      setLoadingSessions(prev => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
    }
  }, [token, sessions, getOrEnsureToken]);

  const handleDeleteSession = useCallback(async (id: string) => {
    if (!token) return;
    try {
      const res = await apiFetch(`/api/chats/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      }, "App.tsx:handleDeleteSession");
      if (res.ok) {
        setSessions(prev => {
          const updatedList = prev.filter(s => s.id !== id);
          return updatedList;
        });
        
        if (activeSessionId === id) {
          const updatedList = sessionsRef.current.filter(s => s.id !== id && (s.mode || 'general') === activeCognitiveMode && !s.archived);
          if (updatedList.length > 0) {
            loadSessionDetails(updatedList[0].id);
          } else {
            triggerNewSession(activeCognitiveMode);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [token, activeSessionId, activeCognitiveMode, loadSessionDetails, triggerNewSession]);

  const handleDeleteMultipleSessions = useCallback(async (ids: string[]) => {
    if (!token || ids.length === 0) return;
    try {
      const res = await apiFetch(`/api/chats`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ ids })
      }, "App.tsx:handleDeleteMultipleSessions");
      if (res.ok) {
        setSessions(prev => {
          const updatedList = prev.filter(s => !ids.includes(s.id));
          return updatedList;
        });
        
        if (activeSessionId && ids.includes(activeSessionId)) {
          const updatedList = sessionsRef.current.filter(s => !ids.includes(s.id) && (s.mode || 'general') === activeCognitiveMode && !s.archived);
          const firstRemaining = updatedList[0];
          if (firstRemaining) {
            loadSessionDetails(firstRemaining.id);
          } else {
            triggerNewSession(activeCognitiveMode);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [token, activeSessionId, activeCognitiveMode, loadSessionDetails, triggerNewSession]);

  const handleClearHistory = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch("/api/chats", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      }, "App.tsx:handleClearHistory");
      if (res.ok) {
        setSessions([]);
        setActiveSessionId(null);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const handlePinSession = useCallback(async (id: string, pinned: boolean) => {
    if (!token) return;
    try {
      const res = await apiFetch(`/api/chats/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pinned })
      }, "App.tsx:handlePinSession");
      if (res.ok) {
        setSessions(prev => 
          prev.map(s => s.id === id ? { ...s, pinned } : s)
        );
      }
    } catch (err) {
      console.error("Pin session failure:", err);
    }
  }, [token]);

  const handleArchiveSession = useCallback(async (id: string, archived: boolean) => {
    if (!token) return;
    try {
      const res = await apiFetch(`/api/chats/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ archived })
      }, "App.tsx:handleArchiveSession");
      if (res.ok) {
        setSessions(prev => 
          prev.map(s => s.id === id ? { ...s, archived } : s)
        );
        if (archived && activeSessionId === id) {
          const remaining = sessionsRef.current.filter(s => s.id !== id && !s.archived && (s.mode || 'general') === activeCognitiveMode);
          if (remaining.length > 0) {
            loadSessionDetails(remaining[0].id);
          } else {
            triggerNewSession(activeCognitiveMode);
          }
        }
      }
    } catch (err) {
      console.error("Archive session failure:", err);
    }
  }, [token, activeSessionId, activeCognitiveMode, loadSessionDetails, triggerNewSession]);

  const handleSaveSettings = useCallback(async (updatedSettings: Settings) => {
    setSettings(updatedSettings);
    try {
      localStorage.setItem("a_nova_settings", JSON.stringify(updatedSettings));
    } catch (e) {}

    if (!token) return;
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedSettings)
      }, "App.tsx:handleSaveSettings");
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      }
    } catch (err) {
      console.error("Save settings failed:", err);
    }
  }, [token]);

  const handleUpdateProfile = useCallback(async (
    newUsername: string,
    avatarUrl: string,
    displayName?: string,
    planStatus?: string,
    password?: string,
    email?: string,
    phone?: string,
    emailVerified?: boolean,
    phoneVerified?: boolean,
    extraFields?: {
      countryCode?: string;
      bio?: string;
      website?: string;
      company?: string;
      occupation?: string;
      privacyVisibility?: 'public' | 'private';
      profileDiscoverable?: boolean;
      dateFormat?: string;
      timeFormat?: '12h' | '24h';
    }
  ) => {
    if (!token) return;
    try {
      const res = await apiFetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername,
          avatarUrl,
          displayName,
          planStatus,
          password,
          email,
          phone,
          emailVerified,
          phoneVerified,
          ...extraFields
        })
      }, "App.tsx:handleUpdateProfile");
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
      }
    } catch (error) {
      console.error(error);
    }
  }, [token]);

  const handleSelectModel = useCallback(async (modelName: string) => {
    if (!token || !activeSessionId) return;
    try {
      const res = await apiFetch(`/api/chats/${activeSessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ selectedModel: modelName })
      }, "App.tsx:handleSelectModel");

      if (res.ok) {
        setSessions(prev => 
          prev.map(s => s.id === activeSessionId ? { ...s, selectedModel: modelName } : s)
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, [token, activeSessionId]);

  const handleSetChatMode = useCallback(async (id: string, mode: 'general' | 'math' | 'coding' | 'sovereign') => {
    try {
      localStorage.setItem("a_nova_selected_cognitive_mode", mode);
    } catch (err) {
      console.warn("Storage write failed:", err);
    }

    // Instantly update local state so the visual UI is 100% responsive and lag-free everywhere
    setSessions(prev => 
      prev.map(s => s.id === id ? { ...s, mode } : s)
    );

    if (!token) return;
    try {
      const res = await apiFetch(`/api/chats/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mode })
      }, "App.tsx:handleSetChatMode");
      if (!res.ok) {
        console.warn("Server mode sync warnings encountered, using resilient local storage mode");
      }
    } catch (err) {
      console.error("Failed to select chat preset template mode:", err);
    }
  }, [token]);

  const handleSelectMode = useCallback(async (mode: 'general' | 'math' | 'coding' | 'sovereign') => {
    setActiveCognitiveMode(mode);
    try {
      localStorage.setItem("a_nova_selected_cognitive_mode", mode);
    } catch (err) {
      console.warn("Storage write failed:", err);
    }

    const modeSessions = (sessionsRef.current || []).filter(s => (s.mode || 'general') === mode && !s.archived);
    if (modeSessions.length > 0) {
      await loadSessionDetails(modeSessions[0].id);
    } else {
      await triggerNewSession(mode);
    }
  }, [triggerNewSession, loadSessionDetails]);

  const refreshConversationsList = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch("/api/chats", {
        headers: { Authorization: `Bearer ${token}` }
      }, "App.tsx:refreshConversationsList");
      if (res.ok) {
        const list = await res.json();
        setSessions(prev => 
          prev.map(s => {
            const listMatch = list.find((item: any) => item.id === s.id);
            return listMatch ? { ...s, title: listMatch.title } : s;
          })
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const handleSendMessage = useCallback(async (content: string, files: AttachedFile[], explicitSessionId?: string) => {
    const activeToken = token || getOrEnsureToken();
    if (!activeToken) return;

    let targetSessionId = explicitSessionId || activeSessionId;

    // 1. If currently active session is a temporary optimistic session, wait for the server creation to finish if pending
    if (targetSessionId && targetSessionId.startsWith("temp_")) {
      if (pendingSessionCreationRef.current && pendingSessionCreationRef.current.tempId === targetSessionId) {
        try {
          const realId = await pendingSessionCreationRef.current.promise;
          if (realId) {
            targetSessionId = realId;
          }
        } catch (_) {}
      }
    }

    // 2. If no active session, trigger creation and await its server resolution
    if (!targetSessionId) {
      const tempId = await triggerNewSession(activeCognitiveMode);
      if (tempId && tempId.startsWith("temp_")) {
        if (pendingSessionCreationRef.current && pendingSessionCreationRef.current.tempId === tempId) {
          try {
            const realId = await pendingSessionCreationRef.current.promise;
            if (realId) {
              targetSessionId = realId;
            } else {
              targetSessionId = tempId;
            }
          } catch (_) {
            targetSessionId = tempId;
          }
        } else {
          targetSessionId = tempId;
        }
      } else {
        targetSessionId = tempId;
      }
      if (!targetSessionId) return;
    }

    const isMatchSession = (s: { id: string }) => 
      s.id === targetSessionId || 
      (sessionIdAliasMapRef.current[targetSessionId] && s.id === sessionIdAliasMapRef.current[targetSessionId]) ||
      (sessionIdAliasMapRef.current[s.id] === targetSessionId);

    setLoadingSessions(prev => ({ ...prev, [targetSessionId]: true }));

    const projUserMessage = {
      id: "proj_msg_" + Math.random().toString(36).substring(2, 11),
      role: "user" as const,
      content,
      timestamp: new Date().toISOString(),
      attachedFiles: files
    };

    setSessions(prev => 
      prev.map(s => {
        if (isMatchSession(s)) {
          return {
            ...s,
            messages: [...(s.messages || []), projUserMessage]
          };
        }
        return s;
      })
    );

    try {
      const targetSessionObj = sessionsRef.current.find(s => isMatchSession(s));
      const isSovereignMode = (targetSessionObj?.mode || activeCognitiveMode) === 'sovereign';

      let sovereignPayload: any = null;
      if (isSovereignMode) {
        try {
          const config = getSovereignConfig();
          sovereignPayload = {
            sovereignConfig: config
          };
        } catch (sovErr) {
          console.error("Sovereign config load error:", sovErr);
        }
      }

      // Device Location handling for General Chat & Private AI
      let userCoords: { lat: number; lng: number } | null = null;
      let locationPermState: string | undefined = undefined;

      const currentMode = targetSessionObj?.mode || activeCognitiveMode || "general";
      if (currentMode === "general" || currentMode === "sovereign") {
        const needsLocation = isLocationRequiredForQuery(content, "general");
        const cachedPerm = getCachedLocationPermission();
        
        if (needsLocation || cachedPerm === "granted") {
          try {
            const locResult = await getDeviceNativeLocation(needsLocation && !cachedPerm);
            locationPermState = locResult.state;
            if (locResult.coords) {
              userCoords = {
                lat: locResult.coords.lat,
                lng: locResult.coords.lng
              };
            }
          } catch (_) {}
        }
      }

      const isAndroid = typeof navigator !== "undefined" && (/android/i.test(navigator.userAgent) || /android/i.test(navigator.platform));
      const platform = isAndroid ? "android" : "web";

      const response = await apiFetch(`/api/chats/${targetSessionId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
          "x-platform": platform
        },
        body: JSON.stringify({
          content,
          attachedFiles: files,
          mode: currentMode,
          coords: userCoords,
          locationPermission: locationPermState,
          platform,
          ...(sovereignPayload || {})
        })
      }, "App.tsx:handleSendMessage");

      if (!response.ok) {
        let errMsg = "Communication failure.";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) {
          throw new Error("Generative stream is not readable.");
        }

        let buffer = "";
        let accumulatedText = "";
        let assistantMsgId = "msg_stream_" + Math.random().toString(36).substring(2, 11);
        
        // Push an empty placeholder message first
        const tempAssistantMsg = {
          id: assistantMsgId,
          role: "assistant" as const,
          content: "",
          timestamp: new Date().toISOString()
        };

        setSessions(prev =>
          prev.map(s => {
            if (isMatchSession(s)) {
              return {
                ...s,
                messages: [...(s.messages || []), tempAssistantMsg]
              };
            }
            return s;
          })
        );

        let finalChat: any = null;
        let finalMessage: any = null;
        let lastUpdate = Date.now();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || !cleanLine.startsWith("data: ")) continue;
            
            const jsonStr = cleanLine.substring(6);
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === "chunk" && parsed.text !== undefined) {
                accumulatedText += parsed.text;
                
                const now = Date.now();
                if (now - lastUpdate > 40) {
                  lastUpdate = now;
                  setSessions(prev => {
                    const sIdx = prev.findIndex(s => isMatchSession(s));
                    if (sIdx === -1) return prev;
                    const targetSession = prev[sIdx];
                    const msgIdx = targetSession.messages.findIndex(m => m.id === assistantMsgId);
                    if (msgIdx === -1) return prev;
                    
                    const updatedMessages = [...targetSession.messages];
                    updatedMessages[msgIdx] = { ...updatedMessages[msgIdx], content: accumulatedText };
                    
                    const updatedSessions = [...prev];
                    updatedSessions[sIdx] = { ...targetSession, messages: updatedMessages };
                    return updatedSessions;
                  });
                }
              } else if (parsed.type === "done") {
                if (parsed.chat) finalChat = parsed.chat;
                if (parsed.activeMessage) finalMessage = parsed.activeMessage;
              }
            } catch (err) {
              console.warn("Error parsing chunk:", err);
            }
          }
        }

        // Apply final text to state to ensure completeness of temporary message
        setSessions(prev => {
          const sIdx = prev.findIndex(s => isMatchSession(s));
          if (sIdx === -1) return prev;
          const targetSession = prev[sIdx];
          const msgIdx = targetSession.messages.findIndex(m => m.id === assistantMsgId);
          if (msgIdx === -1) return prev;
          
          const updatedMessages = [...targetSession.messages];
          updatedMessages[msgIdx] = { ...updatedMessages[msgIdx], content: accumulatedText };
          
          const updatedSessions = [...prev];
          updatedSessions[sIdx] = { ...targetSession, messages: updatedMessages };
          return updatedSessions;
        });

        // Apply final correct state and metadata
        if (finalChat) {
          if (targetSessionId.startsWith("temp_") && finalChat.id) {
            sessionIdAliasMapRef.current[targetSessionId] = finalChat.id;
          }
          setSessions(prev =>
            prev.map(s => isMatchSession(s) ? {
              ...finalChat,
              messages: (finalChat.messages && finalChat.messages.length > 0) ? finalChat.messages : s.messages
            } : s)
          );
          setActiveSessionId(prevId => (isMatchSession({ id: prevId }) && finalChat.id) ? finalChat.id : prevId);

          // Trigger browser notifications if enabled
          if (typeof window !== "undefined" && "Notification" in window) {
            const storedPerm = localStorage.getItem("permission_approved_notifications");
            if (storedPerm === "granted" && Notification.permission === "granted" && finalMessage?.content) {
              try {
                new Notification("A-Nova Companion Workspace", {
                  body: finalMessage.content.slice(0, 110) + "...",
                  icon: "https://api.dicebear.com/7.x/bottts/svg?seed=A-NOVA"
                });
              } catch (_) {}
            }
          }

          // Voice synthesization handled centrally by ChatInterface for unified TTS waveform state
        }
      } else {
        // Fallback for standard non-streamed content (or legacy/error responses)
        const data = await response.json();
        
        if (response.ok) {
          const fullChatState = data.chat;
          const assistantMsg = data.activeMessage;

          if (fullChatState?.id && targetSessionId.startsWith("temp_")) {
            sessionIdAliasMapRef.current[targetSessionId] = fullChatState.id;
          }

          if (assistantMsg && assistantMsg.content) {
            const fullText = assistantMsg.content;
            const words = fullText.split(/(\s+)/);
            let currentWordIndex = 0;
            let currentStreamedText = "";

            const initialAssistantMsg = {
              ...assistantMsg,
              content: ""
            };

            const chatWithEmptyAssistant = {
              ...fullChatState,
              messages: [
                ...fullChatState.messages.slice(0, -1),
                initialAssistantMsg
              ]
            };

            setSessions(prev => 
              prev.map(s => isMatchSession(s) ? chatWithEmptyAssistant : s)
            );

            const wordsPerTick = Math.max(1, Math.ceil(words.length / 100));
            const intervalId = setInterval(() => {
              activeStreamIntervalsRef.current.add(intervalId);
              if (currentWordIndex < words.length) {
                for (let i = 0; i < wordsPerTick && currentWordIndex < words.length; i++) {
                  currentStreamedText += words[currentWordIndex];
                  currentWordIndex++;
                }

                setSessions(prev => {
                  const sIdx = prev.findIndex(s => isMatchSession(s));
                  if (sIdx === -1) return prev;
                  const targetSession = prev[sIdx];
                  const msgIdx = targetSession.messages.findIndex(m => m.id === assistantMsg.id);
                  if (msgIdx === -1) return prev;
                  
                  const updatedMessages = [...targetSession.messages];
                  updatedMessages[msgIdx] = { ...updatedMessages[msgIdx], content: currentStreamedText };
                  
                  const updatedSessions = [...prev];
                  updatedSessions[sIdx] = { ...targetSession, messages: updatedMessages };
                  return updatedSessions;
                });
              } else {
                clearInterval(intervalId);
                activeStreamIntervalsRef.current.delete(intervalId);
                setSessions(prev => 
                  prev.map(s => isMatchSession(s) ? fullChatState : s)
                );
                setActiveSessionId(prevId => (isMatchSession({ id: prevId }) && fullChatState?.id) ? fullChatState.id : prevId);

                if (typeof window !== "undefined" && "Notification" in window) {
                  const storedPerm = localStorage.getItem("permission_approved_notifications");
                  if (storedPerm === "granted" && Notification.permission === "granted" && data.activeMessage?.content) {
                    try {
                      new Notification("A-Nova Companion Workspace", {
                        body: data.activeMessage.content.slice(0, 110) + "...",
                        icon: "https://api.dicebear.com/7.x/bottts/svg?seed=A-NOVA"
                      });
                    } catch (_) {}
                  }
                }
              }
            }, 55);
          } else {
            setSessions(prev => 
              prev.map(s => isMatchSession(s) ? data.chat : s)
            );
            setActiveSessionId(prevId => (isMatchSession({ id: prevId }) && data.chat?.id) ? data.chat.id : prevId);

            if (typeof window !== "undefined" && "Notification" in window) {
              const storedPerm = localStorage.getItem("permission_approved_notifications");
              if (storedPerm === "granted" && Notification.permission === "granted" && data.activeMessage?.content) {
                try {
                  new Notification("A-Nova Companion Workspace", {
                    body: data.activeMessage.content.slice(0, 110) + "...",
                    icon: "https://api.dicebear.com/7.x/bottts/svg?seed=A-NOVA"
                  });
                } catch (_) {}
              }
            }
          }

          // Voice synthesization handled centrally by ChatInterface for unified TTS waveform state
        } else {
          throw new Error(data.error || "Communication failure.");
        }
      }
    } catch (error: any) {
      console.error("Chat message process failure:", error);
      
      // Graceful error state insertion: keeps user informed & app completely interactive
      const errMsg = {
        id: "msg_error_" + Math.random().toString(36).substring(2, 11),
        role: "assistant" as const,
        content: `❌ **A-NOVA Workspace Connection Warning:** Unable to establish complete link with generative backend. Check settings or refresh page to sync chat.\n*(Reason: ${error.message || "Timeout"})*`,
        timestamp: new Date().toISOString()
      };
      
      setSessions(prev => 
        prev.map(s => {
          if (isMatchSession(s)) {
            return {
              ...s,
              messages: [...(s.messages || []), errMsg]
            };
          }
          return s;
        })
      );
    } finally {
      setLoadingSessions(prev => {
        const next = { ...prev };
        delete next[targetSessionId];
        return next;
      });
      refreshConversationsList();
    }
  }, [token, activeSessionId, settings, refreshConversationsList, activeCognitiveMode, triggerNewSession]);

  const handleNewSessionPreset = useCallback((mode?: 'general' | 'math' | 'coding' | 'sovereign') => {
    triggerNewSession(mode || activeCognitiveMode || 'general');
  }, [triggerNewSession, activeCognitiveMode]);

  // Preload lazy components in background during idle/mount so tapping Settings or Login opens in 0ms without lag
  useEffect(() => {
    const preloadModalChunks = () => {
      loadSettingsModalComponent();
      loadLoginRegisterComponent();
    };
    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(preloadModalChunks);
      } else {
        setTimeout(preloadModalChunks, 150);
      }
    }
  }, []);

  const handleOpenSettingsTab = useCallback((tab?: string) => {
    loadSettingsModalComponent();
    setSettingsActiveTab(tab);
    setSettingsOpen(true);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
    setSettingsActiveTab(undefined);
  }, []);

  if (authBootstrapping) {
    return (
      <div id="loader_splash" className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
        {/* Subtle background ambient glow */}
        <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-cyan-600/15 via-indigo-600/15 to-purple-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center space-y-6 relative z-10 text-center"
        >
          {/* Logo emblem */}
          <AnovaLogo size="xl" showText={true} subtitle="INTELLIGENCE WORKSPACE" animated={true} />

          {/* Minimal progress line */}
          <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden relative border border-zinc-800/80 mt-2">
            <motion.div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 rounded-full"
              initial={{ width: "10%" }}
              animate={{ width: "90%" }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
          </div>

          <p className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
            Syncing workspace environment...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <PermissionProvider isDark={settings.isDarkMode}>
      <div 
        id="app_root_layout" 
        className={`flex flex-col lg:flex-row h-screen h-[100dvh] w-full max-w-full min-w-0 relative overflow-hidden font-sans transition-all duration-300 ${
          settings.isDarkMode ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"
        }`}
      >
        {/* 1. Sidebar Panel */}
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          user={user}
          onSelectSession={loadSessionDetails}
          onNewSession={handleNewSessionPreset}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
          onDeleteMultipleSessions={handleDeleteMultipleSessions}
          onClearHistory={handleClearHistory}
          onPinSession={handlePinSession}
          onArchiveSession={handleArchiveSession}
          onOpenSettings={handleOpenSettingsTab}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onToggleMobile={handleToggleSidebar}
          settings={settings}
          onSetChatMode={handleSetChatMode}
          activeMode={activeCognitiveMode}
          onSelectMode={handleSelectMode}
          onOpenLogin={handleOpenLoginModal}
        />

        {/* 2. Main Chat Workspace */}
        <ChatInterface
          session={activeSession}
          onSendMessage={handleSendMessage}
          onSelectModel={handleSelectModel}
          loading={Boolean(activeSessionId && loadingSessions[activeSessionId])}
          onSetChatMode={handleSetChatMode}
          settings={settings}
          onToggleSidebar={handleToggleSidebar}
          user={user}
          activeMode={activeCognitiveMode}
          onSelectMode={handleSelectMode}
          onOpenLogin={handleOpenLoginModal}
          onOpenSettings={() => handleOpenSettingsTab()}
          onEditMessage={handleEditMessage}
          onRetryMessage={handleRetryMessage}
        />

        {/* 3. Global Settings portal */}
        <AnimatePresence>
          {settingsOpen && (
            <Suspense fallback={null}>
              <SettingsModal
                isOpen={settingsOpen}
                onClose={handleCloseSettings}
                settings={settings}
                onSaveSettings={handleSaveSettings}
                user={user}
                onUpdateProfile={handleUpdateProfile}
                sessions={sessions}
                onUpdateSessions={(updated) => setSessions(updated)}
                onClearHistory={handleClearHistory}
                onDeleteSession={handleDeleteSession}
                onDeleteMultipleSessions={handleDeleteMultipleSessions}
                defaultTab={settingsActiveTab}
                onLogout={handleLogout}
              />
            </Suspense>
          )}
        </AnimatePresence>

        {/* 4. Bottom-sheet Login Modal */}
        <AnimatePresence>
          {isLoginModalOpen && (
            <Suspense fallback={null}>
              <LoginRegister
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onAuthSuccess={handleAuthSuccess}
                initialRegistering={loginModalInitialRegister}
              />
            </Suspense>
          )}
        </AnimatePresence>

      </div>
    </PermissionProvider>
  );
}
