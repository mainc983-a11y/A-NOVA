import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { User, ChatSession, Settings, AttachedFile } from "./types";
import Sidebar from "./components/Sidebar";
import ChatInterface from "./components/ChatInterface";
import LoginRegister from "./components/LoginRegister";
import { supabase } from "./supabaseClient";
import { Bot, Sparkles } from "lucide-react";
import { AnimatePresence } from "motion/react";

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
  
  // High-performance React state untethering ref to eliminate list-level rendering cascade lag
  const sessionsRef = useRef<ChatSession[]>([]);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);
  
  const [settings, setSettings] = useState<Settings>({
    defaultModel: "gemini-3.5-flash",
    systemPrompt: "You are A-NOVA, an extremely advanced, professional AI workspace platform styled with precise high-contrast typography.",
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
        // 1. Restore standard Supabase session checking
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (session) {
          const userToken = session.access_token;
          setToken(userToken);
          const activeUser: User = {
            id: session.user.id,
            email: session.user.email || "",
            username: session.user.user_metadata?.username || session.user.email?.split("@")[0] || "user",
            displayName: session.user.user_metadata?.displayName || session.user.user_metadata?.username || session.user.email?.split("@")[0] || "user",
            createdAt: session.user.created_at || new Date().toISOString(),
            planStatus: "Plus",
            role: "user"
          };
          setUser(activeUser);
          await syncUserWorkspace(userToken);

          if (window.location.pathname === "/login") {
            window.history.pushState({}, "", "/");
            setCurrentPath("/");
          }
        } else {
          setToken(null);
          setUser(null);
          if (window.location.pathname !== "/login") {
            window.history.pushState({}, "", "/login");
            setCurrentPath("/login");
          }
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

    // Set up real-time status listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      if (session) {
        const userToken = session.access_token;
        setToken(userToken);
        const activeUser: User = {
          id: session.user.id,
          email: session.user.email || "",
          username: session.user.user_metadata?.username || session.user.email?.split("@")[0] || "user",
          displayName: session.user.user_metadata?.displayName || session.user.user_metadata?.username || session.user.email?.split("@")[0] || "user",
          createdAt: session.user.created_at || new Date().toISOString(),
          planStatus: "Plus",
          role: "user"
        };
        setUser(activeUser);
        await syncUserWorkspace(userToken);

        if (window.location.pathname === "/login") {
          window.history.pushState({}, "", "/");
          setCurrentPath("/");
        }
      } else if (event === "SIGNED_OUT" || !session) {
        lastSyncedTokenRef.current = null;
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
    if (!activeToken) return;
    
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
      } else {
        // Fallback on HTTP failures
        setSessions(prev => prev.filter(s => s.id !== tempId));
      }
    } catch (err) {
      console.error("New session creation failed:", err);
      // Fallback on network errors
      setSessions(prev => prev.filter(s => s.id !== tempId));
    }
  }, [token]);

  // --- CONTROLLER HANDLERS ---

  const handleAuthSuccess = (newToken: string, activeUser: User) => {
    setToken(newToken);
    setUser(activeUser);
    syncUserWorkspace(newToken);
    window.history.pushState({}, "", "/");
    setCurrentPath("/");
  };

  const handleLogout = useCallback(async () => {
    try {
      localStorage.removeItem("a_nova_auth_token");
      localStorage.removeItem("a_nova_auth_user");
      await supabase.auth.signOut();
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
    if (!token || !activeSessionId) return;

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
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...(s.messages || []), projUserMessage]
          };
        }
        return s;
      })
    );

    try {
      const response = await fetch(`/api/chats/${activeSessionId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content, attachedFiles: files })
      });

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
            prev.map(s => s.id === activeSessionId ? chatWithEmptyAssistant : s)
          );

          const wordsPerTick = Math.max(1, Math.ceil(words.length / 100));
          const intervalId = setInterval(() => {
            if (currentWordIndex < words.length) {
              for (let i = 0; i < wordsPerTick && currentWordIndex < words.length; i++) {
                currentStreamedText += words[currentWordIndex];
                currentWordIndex++;
              }

              // HIGH PERFORMANCE SURGICAL O(1) MESSAGE INDEX REPLACEMENT - ELIMINATES LAG
              setSessions(prev => {
                const sIdx = prev.findIndex(s => s.id === activeSessionId);
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
                prev.map(s => s.id === activeSessionId ? fullChatState : s)
              );

              // NATIVE WEB NOTIFICATION TRIGGER ON COMPLETE CHAT STREAM
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
          }, 55); // 55ms optimizes browser paint operations and CPU overhead, completely preventing typing lags
        } else {
          setSessions(prev => 
            prev.map(s => s.id === activeSessionId ? data.chat : s)
          );

          // NATIVE WEB NOTIFICATION TRIGGER ON COMPLETE CHAT STREAM
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
          if (s.id === activeSessionId) {
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
  }, [token, activeSessionId, settings, refreshConversationsList]);

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
      <div id="loader_splash" className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-16 h-16 mb-2 select-none">
            {/* Glowing ambient background */}
            <div className="absolute inset-0 bg-emerald-505/20 rounded-2xl blur-md animate-pulse" />
            
            {/* Core logo container */}
            <div className="relative w-full h-full bg-gradient-to-br from-emerald-600 via-teal-650 to-cyan-500 rounded-2xl flex items-center justify-center border border-emerald-400/25 shadow-lg shadow-emerald-950/40">
              <span className="text-3xl font-black tracking-tighter text-white font-mono select-none">A</span>
              <Sparkles className="w-4 h-4 text-emerald-300 absolute -top-1.5 -right-3 animate-pulse" />
            </div>
          </div>
          <h2 className="text-[10px] font-bold tracking-widest text-zinc-505 font-mono uppercase animate-pulse">Initializing A-NOVA Orchestrator</h2>
        </div>
      </div>
    );
  }

  if (!user || !token || currentPath === "/login") {
    return <LoginRegister onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div 
      id="app_root_layout" 
      className={`flex flex-col md:flex-row min-h-screen relative overflow-hidden font-sans transition-all duration-300 ${
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
            />
          </Suspense>
        )}
      </AnimatePresence>

    </div>
  );
}
