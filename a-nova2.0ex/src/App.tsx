import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { User, ChatSession, Settings, AttachedFile } from "./types";
import Sidebar from "./components/Sidebar";
import ChatInterface from "./components/ChatInterface";
import LoginRegister from "./components/LoginRegister";
import AnovaLogo from "./components/AnovaLogo";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { Bot, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

// Lazy-load SettingsModal to reduce initial bundle evaluation overhead
const SettingsModal = React.lazy(() => import("./components/SettingsModal"));

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  const [activeCognitiveMode, setActiveCognitiveMode] = useState<'general' | 'math' | 'coding' | 'project'>(() => {
    try {
      return (localStorage.getItem("a_nova_selected_cognitive_mode") as 'general' | 'math' | 'coding' | 'project') || "general";
    } catch {
      return "general";
    }
  });
  
  // Track currently in-flight session detail requests to prevent duplicate parallel fetches
  const loadingSessionsRef = useRef<Record<string, boolean>>({});
  const lastSyncedTokenRef = useRef<string | null>(null);
  const pendingSessionCreationRef = useRef<{ tempId: string; promise: Promise<string> } | null>(null);
  
  // High-performance React state untethering ref to eliminate list-level rendering cascade lag
  const sessionsRef = useRef<ChatSession[]>([]);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);
  
  const [settings, setSettings] = useState<Settings>({
    defaultModel: "gemini-3.5-flash",
    systemPrompt: "You are A-NOVA, a warm, highly intelligent, and conversational AI companion.",
    aboutMe: "",
    respondWay: "",
    voiceEnabled: false,
    voiceName: "Zephyr",
    isDarkMode: true
  });

  // Sidebar / Settings Modal Open State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<any>("profile");
  
  // Status flags
  const [apiLoading, setApiLoading] = useState(false);
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

  // Sync Tailwind root theme classes based on settings isDarkMode
  useEffect(() => {
    try {
      const root = document.documentElement;
      if (settings.isDarkMode) {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      } else {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      }
    } catch (e) {
      console.warn("Theme class injection bypassed:", e);
    }
  }, [settings.isDarkMode]);

  // Bootstrapping session load
  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        // 1. Check standard Supabase session checking if available and configured
        if (isSupabaseConfigured) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!active) return;
            if (session) {
              const userToken = session.access_token;
              const activeUser: User = {
                id: session.user.id,
                email: session.user.email || "",
                username: session.user.user_metadata?.username || session.user.email?.split("@")[0] || "user",
                displayName: session.user.user_metadata?.displayName || session.user.user_metadata?.username || session.user.email?.split("@")[0] || "user",
                createdAt: session.user.created_at || new Date().toISOString(),
                planStatus: "Plus",
                role: "user"
              };
              localStorage.setItem("a_nova_auth_token", userToken);
              localStorage.setItem("a_nova_user_data", JSON.stringify(activeUser));
              if (session.user.email) {
                localStorage.setItem("a_nova_remembered_email", session.user.email);
              }
              setToken(userToken);
              setUser(activeUser);
              await syncUserWorkspace(userToken);

              if (window.location.pathname === "/login") {
                window.history.pushState({}, "", "/");
                setCurrentPath("/");
              }
              return;
            }
          } catch (supaErr) {
            console.warn("[AUTH] Supabase getSession skipped/unreachable:", supaErr);
          }
        }

        // 2. Fallback: Check local persistent storage token & profile
        const savedToken = localStorage.getItem("a_nova_auth_token");
        const savedUserData = localStorage.getItem("a_nova_user_data");

        if (savedToken) {
          try {
            const res = await fetch("/api/auth/me", {
              headers: { Authorization: `Bearer ${savedToken}` }
            });
            if (res.ok) {
              const profile = await res.json();
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
            console.warn("Local auth validation skipped:", meErr);
          }

          if (savedUserData) {
            try {
              const parsedUser = JSON.parse(savedUserData);
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
        }

        setToken(null);
        setUser(null);
        if (window.location.pathname !== "/login") {
          window.history.pushState({}, "", "/login");
          setCurrentPath("/login");
        }
      } catch (err) {
        console.error("Session restore fell back due to error:", err);
      } finally {
        if (active) {
          setAuthBootstrapping(false);
        }
      }
    };

    checkSession();

    // Set up real-time status listener safely
    let subscription: any = null;
    if (isSupabaseConfigured) {
      try {
        const res = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!active) return;
          if (session) {
            const userToken = session.access_token;
            const activeUser: User = {
              id: session.user.id,
              email: session.user.email || "",
              username: session.user.user_metadata?.username || session.user.email?.split("@")[0] || "user",
              displayName: session.user.user_metadata?.displayName || session.user.user_metadata?.username || session.user.email?.split("@")[0] || "user",
              createdAt: session.user.created_at || new Date().toISOString(),
              planStatus: "Plus",
              role: "user"
            };
            localStorage.setItem("a_nova_auth_token", userToken);
            localStorage.setItem("a_nova_user_data", JSON.stringify(activeUser));
            if (session.user.email) {
              localStorage.setItem("a_nova_remembered_email", session.user.email);
            }
            setToken(userToken);
            setUser(activeUser);
            await syncUserWorkspace(userToken);

            if (window.location.pathname === "/login") {
              window.history.pushState({}, "", "/");
              setCurrentPath("/");
            }
          } else if (event === "SIGNED_OUT") {
            lastSyncedTokenRef.current = null;
            localStorage.removeItem("a_nova_auth_token");
            localStorage.removeItem("a_nova_user_data");
            localStorage.removeItem("a_nova_auth_user");
            setToken(null);
            setUser(null);
            setSessions([]);
            setActiveSessionId(null);

            if (window.location.pathname !== "/login") {
              window.history.pushState({}, "", "/login");
              setCurrentPath("/login");
            }
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
        const settingsRes = await fetch("/api/settings", {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData);
        }

        // 2. Load conversations history list
        const chatsRes = await fetch("/api/chats", {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        if (chatsRes.ok) {
          const chatsList = await chatsRes.json();
          setSessions(chatsList);

          const savedMode = (localStorage.getItem("a_nova_selected_cognitive_mode") as 'general' | 'math' | 'coding' | 'project') || "general";
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
        const res = await fetch(`/api/chats/${id}`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
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

  // Create new specialized conversation thread on the backend database
  const triggerNewSession = useCallback(async (mode: 'general' | 'math' | 'coding' | 'project' = 'general', userToken = token) => {
    const activeToken = userToken || token;
    if (!activeToken) return "";
    
    // OPTIMISTIC UI: Instantly create and select a temporary session
    const tempId = "temp_" + Math.random().toString(36).substring(2, 11);
    const optimisticSession: ChatSession = {
      id: tempId,
      title: mode === "math" ? "Math Workspace" : mode =="coding" ? "Complex Coding" : mode === "project" ? "Project Board" : "New Chat",
      mode,
      messages: [],
      selectedModel: settings.defaultModel || "gemini-3.5-flash",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
      archived: false
    };

    setSessions(prev => [optimisticSession, ...prev]);
    setActiveSessionId(tempId);

    const creationPromise = (async () => {
      try {
        const res = await fetch("/api/chats", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`
          },
          body: JSON.stringify({ mode })
        });
        if (res.ok) {
          const newSession = await res.json();
          // Replace temp optimistic state with real server payload
          setSessions(prev => 
            prev.map(s => s.id === tempId ? newSession : s)
          );
          setActiveSessionId(prevId => prevId === tempId ? newSession.id : prevId);
          return newSession.id as string;
        } else {
          // Fallback on HTTP failures
          setSessions(prev => prev.filter(s => s.id !== tempId));
          return "";
        }
      } catch (err) {
        console.error("New session creation failed:", err);
        // Fallback on network errors
        setSessions(prev => prev.filter(s => s.id !== tempId));
        return "";
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
    if (activeUser?.email) {
      try {
        localStorage.setItem("a_nova_remembered_email", activeUser.email);
      } catch (e) {}
    }
    syncUserWorkspace(newToken);
    window.history.pushState({}, "", "/");
    setCurrentPath("/");
  };

  const handleLogout = useCallback(async () => {
    try {
      localStorage.removeItem("a_nova_auth_token");
      localStorage.removeItem("a_nova_user_data");
      localStorage.removeItem("a_nova_auth_user");
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
    window.history.pushState({}, "", "/login");
    setCurrentPath("/login");
  }, []);

  const handleRenameSession = useCallback(async (id: string, newTitle: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        setSessions(prev => 
          prev.map(s => s.id === id ? { ...s, title: newTitle } : s)
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const handleDeleteSession = useCallback(async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const res = await fetch(`/api/chats`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ ids })
      });
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
      const res = await fetch("/api/chats", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const res = await fetch(`/api/chats/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pinned })
      });
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
      const res = await fetch(`/api/chats/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ archived })
      });
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
    if (!token) return;
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedSettings)
      });
      if (res.ok) {
        setSettings(updatedSettings);
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
    phoneVerified?: boolean
  ) => {
    if (!token) return;
    try {
      const res = await fetch("/api/auth/profile", {
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
          phoneVerified
        })
      });
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
      const res = await fetch(`/api/chats/${activeSessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ selectedModel: modelName })
      });

      if (res.ok) {
        setSessions(prev => 
          prev.map(s => s.id === activeSessionId ? { ...s, selectedModel: modelName } : s)
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, [token, activeSessionId]);

  const handleSetChatMode = useCallback(async (id: string, mode: 'general' | 'math' | 'coding' | 'project') => {
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
      const res = await fetch(`/api/chats/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mode })
      });
      if (!res.ok) {
        console.warn("Server mode sync warnings encountered, using resilient local storage mode");
      }
    } catch (err) {
      console.error("Failed to select chat preset template mode:", err);
    }
  }, [token]);

  const handleSelectMode = useCallback(async (mode: 'general' | 'math' | 'coding' | 'project') => {
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
      const res = await fetch("/api/chats", {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  const handleSendMessage = useCallback(async (content: string, files: AttachedFile[]) => {
    if (!token) return;

    let targetSessionId = activeSessionId;

    // 1. If currently active session is a temporary optimistic session, wait for the server creation to finish
    if (targetSessionId && targetSessionId.startsWith("temp_")) {
      if (pendingSessionCreationRef.current && pendingSessionCreationRef.current.tempId === targetSessionId) {
        const realId = await pendingSessionCreationRef.current.promise;
        if (realId) {
          targetSessionId = realId;
        } else {
          console.warn("Message sending aborted: optimistic conversation creation failed.");
          return;
        }
      }
    }

    // 2. If no active session, trigger creation and await its server resolution
    if (!targetSessionId) {
      const tempId = await triggerNewSession(activeCognitiveMode);
      if (tempId && tempId.startsWith("temp_")) {
        if (pendingSessionCreationRef.current && pendingSessionCreationRef.current.tempId === tempId) {
          const realId = await pendingSessionCreationRef.current.promise;
          if (realId) {
            targetSessionId = realId;
          } else {
            console.warn("Message sending aborted: optimistic conversation creation failed (new session).");
            return;
          }
        } else {
          targetSessionId = tempId;
        }
      } else {
        targetSessionId = tempId;
      }
      if (!targetSessionId) return;
    }

    setApiLoading(true);

    const projUserMessage = {
      id: "proj_msg_" + Math.random().toString(36).substring(2, 11),
      role: "user" as const,
      content,
      timestamp: new Date().toISOString(),
      attachedFiles: files
    };

    setSessions(prev => 
      prev.map(s => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            messages: [...(s.messages || []), projUserMessage]
          };
        }
        return s;
      })
    );

    try {
      const response = await fetch(`/api/chats/${targetSessionId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content, attachedFiles: files })
      });

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
            if (s.id === targetSessionId) {
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
                if (now - lastUpdate > 60) {
                  lastUpdate = now;
                  setSessions(prev => {
                    const sIdx = prev.findIndex(s => s.id === targetSessionId);
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
          const sIdx = prev.findIndex(s => s.id === targetSessionId);
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
          setSessions(prev =>
            prev.map(s => s.id === targetSessionId ? finalChat : s)
          );

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

          // Voice synthesization if enabled
          if (settings.voiceEnabled && finalMessage?.content && typeof window !== "undefined") {
            const synth = window.speechSynthesis;
            if (synth) {
              synth.cancel();
              const speechText = finalMessage.content
                .replace(/```[\s\S]*?```/g, "[code block]")
                .replace(/[*#_`~-]/g, "")
                .slice(0, 300);
              
              const utterance = new SpeechSynthesisUtterance(speechText);
              synth.speak(utterance);
            }
          }
        }
      } else {
        // Fallback for standard non-streamed content (or legacy/error responses)
        const data = await response.json();
        
        if (response.ok) {
          const fullChatState = data.chat;
          const assistantMsg = data.activeMessage;

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
              prev.map(s => s.id === targetSessionId ? chatWithEmptyAssistant : s)
            );

            const wordsPerTick = Math.max(1, Math.ceil(words.length / 100));
            const intervalId = setInterval(() => {
              if (currentWordIndex < words.length) {
                for (let i = 0; i < wordsPerTick && currentWordIndex < words.length; i++) {
                  currentStreamedText += words[currentWordIndex];
                  currentWordIndex++;
                }

                setSessions(prev => {
                  const sIdx = prev.findIndex(s => s.id === targetSessionId);
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
                setSessions(prev => 
                  prev.map(s => s.id === targetSessionId ? fullChatState : s)
                );

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
              prev.map(s => s.id === targetSessionId ? data.chat : s)
            );

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

          if (settings.voiceEnabled && data.activeMessage?.content && typeof window !== "undefined") {
            const synth = window.speechSynthesis;
            if (synth) {
              synth.cancel();
              const speechText = data.activeMessage.content
                .replace(/```[\s\S]*?```/g, "[code block]")
                .replace(/[*#_`~-]/g, "")
                .slice(0, 300);
              
              const utterance = new SpeechSynthesisUtterance(speechText);
              synth.speak(utterance);
            }
          }
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
          if (s.id === targetSessionId) {
            return {
              ...s,
              messages: [...(s.messages || []), errMsg]
            };
          }
          return s;
        })
      );
    } finally {
      setApiLoading(false);
      refreshConversationsList();
    }
  }, [token, activeSessionId, settings, refreshConversationsList, activeCognitiveMode, triggerNewSession]);

  const handleNewSessionPreset = useCallback((mode?: 'general' | 'math' | 'coding' | 'project') => {
    triggerNewSession(mode || activeCognitiveMode || 'general');
  }, [triggerNewSession, activeCognitiveMode]);

  const handleOpenSettingsTab = useCallback((tab?: string) => {
    setSettingsActiveTab(tab || "profile");
    setSettingsOpen(true);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
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

  if (!user || !token || currentPath === "/login") {
    return <LoginRegister onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div 
      id="app_root_layout" 
      className={`flex flex-col md:flex-row h-screen h-[100dvh] w-full relative overflow-hidden font-sans transition-all duration-300 ${
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
      />

      {/* 2. Main Chat Workspace */}
      <ChatInterface
        session={activeSession}
        onSendMessage={handleSendMessage}
        onSelectModel={handleSelectModel}
        loading={apiLoading}
        onSetChatMode={handleSetChatMode}
        settings={settings}
        onToggleSidebar={handleToggleSidebar}
        user={user}
        activeMode={activeCognitiveMode}
        onSelectMode={handleSelectMode}
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
              onClearHistory={handleClearHistory}
              onDeleteSession={handleDeleteSession}
              onDeleteMultipleSessions={handleDeleteMultipleSessions}
              defaultTab={settingsActiveTab}
              onLogout={handleLogout}
            />
          </Suspense>
        )}
      </AnimatePresence>

    </div>
  );
}
