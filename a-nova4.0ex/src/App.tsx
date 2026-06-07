import React, { useState, useEffect } from "react";
import { User, ChatSession, Settings, AttachedFile } from "./types";
import Sidebar from "./components/Sidebar";
import LoginRegister from "./components/LoginRegister";
import ChatInterface from "./components/ChatInterface";
import SettingsModal from "./components/SettingsModal";
import { Bot, Sparkles } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { supabase } from "./supabaseClient";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
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
        // If there is an active local user session token, restore it immediately
        const savedToken = localStorage.getItem("anova_token") || localStorage.getItem("myai_token");
        if (savedToken && savedToken.startsWith("myai_token_")) {
          console.log("[AUTH DEBUG] Local user session token detected on startup. Restoring instantly.");
          await restoreUserSession(savedToken);
          return;
        }

        // Wrap Supabase call in a promise race to prevent timeouts or cold-start hangs
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((_, reject) => 
          setTimeout(() => reject(new Error("Supabase connection timeout")), 1500)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (!active) return;
        if (session) {
          const userToken = session.access_token;
          setToken(userToken);
          const activeUser = {
            id: session.user.id,
            email: session.user.email || "",
            username: session.user.user_metadata?.username || session.user.email?.split("@")[0] || "user",
            displayName: session.user.user_metadata?.username || session.user.email?.split("@")[0] || "user",
            createdAt: session.user.created_at || new Date().toISOString(),
            planStatus: "Plus",
            role: "user"
          };
          setUser(activeUser);
          localStorage.setItem("anova_token", userToken);
          await syncUserWorkspace(userToken);
          setAuthBootstrapping(false);
        } else {
          if (savedToken) {
            await restoreUserSession(savedToken);
          } else {
            setAuthBootstrapping(false);
          }
        }
      } catch (err) {
        console.error("Session restore fell back due to error:", err);
        const savedToken = localStorage.getItem("anova_token") || localStorage.getItem("myai_token");
        if (savedToken) {
          await restoreUserSession(savedToken);
        } else {
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
        const activeUser = {
          id: session.user.id,
          email: session.user.email || "",
          username: session.user.user_metadata?.username || session.user.email?.split("@")[0] || "user",
          displayName: session.user.user_metadata?.username || session.user.email?.split("@")[0] || "user",
          createdAt: session.user.created_at || new Date().toISOString(),
          planStatus: "Plus",
          role: "user"
        };
        setUser(activeUser);
        localStorage.setItem("anova_token", userToken);
        await syncUserWorkspace(userToken);
      } else if (event === "SIGNED_OUT") {
        // Protect local user session from being cleared by irrelevant Supabase auth status transitions
        const currentToken = localStorage.getItem("anova_token") || localStorage.getItem("myai_token");
        if (currentToken && currentToken.startsWith("myai_token_")) {
          console.log("[AUTH DEBUG] Supabase SIGNED_OUT event bypassed for active local session.");
          return;
        }
        setToken(null);
        setUser(null);
        setSessions([]);
        setActiveSessionId(null);
        localStorage.removeItem("anova_token");
        localStorage.removeItem("myai_token");
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const restoreUserSession = async (userToken: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        setToken(userToken);
        setUser(data);
        await syncUserWorkspace(userToken);
      } else {
        localStorage.removeItem("anova_token");
        localStorage.removeItem("myai_token");
      }
    } catch (err) {
      console.error("Session restoration failed:", err);
    } finally {
      setAuthBootstrapping(false);
    }
  };

  // Synchronizes complete history list and settings structures
  const syncUserWorkspace = async (userToken: string) => {
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

        if (chatsList && chatsList.length > 0) {
          // Automatically load and open the most recent chat session
          await loadSessionDetails(chatsList[0].id, userToken);
        } else {
          // If no chats exist, start a fresh companion session
          await triggerNewSession("general", userToken);
        }
      }
    } catch (error) {
      console.error("Workspace synchronization failed:", error);
    }
  };

  // Load complete dialog messages sequence inside of a session ID
  const loadSessionDetails = async (id: string, userToken = token) => {
    if (!userToken) return;
    try {
      const res = await fetch(`/api/chats/${id}`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      if (res.ok) {
        const fullSession = await res.json();
        setSessions(prev => 
          prev.map(s => s.id === id ? fullSession : s)
        );
        setActiveSessionId(id);
      }
    } catch (err) {
      console.error("Failed to load details for active session:", err);
    }
  };

  // Create new specialized conversation thread on the backend database
  const triggerNewSession = async (mode: 'general' | 'math' | 'coding' | 'project' = 'general', userToken = token) => {
    if (!userToken) return;
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({ mode })
      });
      if (res.ok) {
        const newSession = await res.json();
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
      }
    } catch (err) {
      console.error("New session creation failed:", err);
    }
  };

  // --- CONTROLLER HANDLERS ---

  const handleAuthSuccess = (newToken: string, activeUser: User) => {
    localStorage.setItem("anova_token", newToken);
    setToken(newToken);
    setUser(activeUser);
    syncUserWorkspace(newToken);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase signout issue:", err);
    }
    localStorage.removeItem("anova_token");
    localStorage.removeItem("myai_token");
    setToken(null);
    setUser(null);
    setSessions([]);
    setActiveSessionId(null);
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
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
  };

  const handleDeleteSession = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedList = sessions.filter(s => s.id !== id);
        setSessions(updatedList);
        
        if (activeSessionId === id) {
          if (updatedList.length > 0) {
            loadSessionDetails(updatedList[0].id);
          } else {
            setActiveSessionId(null);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMultipleSessions = async (ids: string[]) => {
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
        const updatedList = sessions.filter(s => !ids.includes(s.id));
        setSessions(updatedList);
        
        if (activeSessionId && ids.includes(activeSessionId)) {
          const firstRemaining = updatedList[0];
          if (firstRemaining) {
            loadSessionDetails(firstRemaining.id);
          } else {
            setActiveSessionId(null);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearHistory = async () => {
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
  };

  const handleSaveSettings = async (updatedSettings: Settings) => {
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
  };

  const handleUpdateProfile = async (
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
  };

  const handleSelectModel = async (modelName: string) => {
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
  };

  const handleSetChatMode = async (id: string, mode: 'general' | 'math' | 'coding' | 'project') => {
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
      if (res.ok) {
        setSessions(prev => 
          prev.map(s => s.id === id ? { ...s, mode } : s)
        );
      }
    } catch (err) {
      console.error("Failed to select chat preset template mode:", err);
    }
  };

  const handleSendMessage = async (content: string, files: AttachedFile[]) => {
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

          const intervalId = setInterval(() => {
            if (currentWordIndex < words.length) {
              currentStreamedText += words[currentWordIndex];
              currentWordIndex++;

              setSessions(prev => 
                prev.map(s => {
                  if (s.id === activeSessionId) {
                    const updatedMessages = s.messages.map(m => {
                      if (m.id === assistantMsg.id) {
                        return { ...m, content: currentStreamedText };
                      }
                      return m;
                    });
                    return { ...s, messages: updatedMessages };
                  }
                  return s;
                })
              );
            } else {
              clearInterval(intervalId);
              setSessions(prev => 
                prev.map(s => s.id === activeSessionId ? fullChatState : s)
              );
            }
          }, 12);
        } else {
          setSessions(prev => 
            prev.map(s => s.id === activeSessionId ? data.chat : s)
          );
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
    } finally {
      setApiLoading(false);
      refreshConversationsList();
    }
  };

  const refreshConversationsList = async () => {
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
  };

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

  if (!user || !token) {
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
        onNewSession={(mode) => triggerNewSession(mode || 'general')}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        onDeleteMultipleSessions={handleDeleteMultipleSessions}
        onClearHistory={handleClearHistory}
        onOpenSettings={(tab) => {
          setSettingsActiveTab(tab || "profile");
          setSettingsOpen(true);
        }}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onToggleMobile={() => setSidebarOpen(!sidebarOpen)}
        settings={settings}
      />

      {/* 2. Main Chat Workspace */}
      <ChatInterface
        session={activeSession}
        onSendMessage={handleSendMessage}
        onSelectModel={handleSelectModel}
        loading={apiLoading}
        onSetChatMode={handleSetChatMode}
        settings={settings}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        user={user}
      />

      {/* 3. Global Settings portal */}
      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
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
        )}
      </AnimatePresence>

    </div>
  );
}
