import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  Binary, 
  Code, 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  Settings as SettingsIcon, 
  LogOut, 
  X, 
  Menu,
  Plus,
  MessageCircle,
  MoreVertical,
  Trash2,
  Trash,
  Square,
  CheckSquare,
  AlertCircle,
  Edit2,
  Check,
  CheckCircle2
} from "lucide-react";
import { ChatSession, User } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  user: User | null;
  onSelectSession: (id: string) => void;
  onNewSession: (mode?: 'general' | 'math' | 'coding' | 'project') => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  onDeleteMultipleSessions?: (ids: string[]) => void;
  onClearHistory: () => void;
  onOpenSettings: (tab?: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onToggleMobile: () => void;
  settings?: any;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  user,
  onSelectSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
  onDeleteMultipleSessions,
  onClearHistory,
  onOpenSettings,
  onLogout,
  isOpen,
  onToggleMobile,
  settings
}: SidebarProps) {
  // Desktop-only collapsible sidebar state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Selection mode states
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Rename modal / inline states
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitleState, setRenameTitleState] = useState("");

  // Context Menu state
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ x: number, y: number } | null>(null);

  // Deletion Confirmation modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null); // For individual delete confirmation
  const [deleteMultipleConfirm, setDeleteMultipleConfirm] = useState(false); // For multiple delete confirmation
  const [clearHistoryConfirm, setClearHistoryConfirm] = useState(false); // For clear history confirmation

  // Long press tracking timer
  const touchTimerRef = useRef<any>(null);

  // Click outside listener for context menu
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuSessionId(null);
      setMenuCoords(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const toggleSelectSession = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Right-click context handler
  const handleContextMenu = (e: React.MouseEvent, sessionId: string, currentTitle: string) => {
    e.preventDefault();
    setActiveMenuSessionId(sessionId);
    setRenameTitleState(currentTitle);
    setMenuCoords({ x: e.clientX, y: e.clientY });
  };

  // Long-press detection for mobile
  const handleTouchStart = (sessionId: string, currentTitle: string) => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      setActiveMenuSessionId(sessionId);
      setRenameTitleState(currentTitle);
      // Position menu near the screen center on mobile
      setMenuCoords({ x: window.innerWidth / 2 - 96, y: window.innerHeight / 2 - 60 });
    }, 705); // slightly above 700ms long press duration
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
  };

  // Active session helper to identify current mode
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const activeMode = activeSession?.mode || 'general';

  // Navigation Items Config
  const NAV_ITEMS = [
    {
      id: "general" as const,
      label: "General",
      icon: MessageSquare,
    },
    {
      id: "math" as const,
      label: "Mathematics",
      icon: Binary,
    },
    {
      id: "coding" as const,
      label: "Coding",
      icon: Code,
    },
    {
      id: "project" as const,
      label: "Project",
      icon: Target,
    }
  ];

  // Routing navigation clicks (selects previous matching mode session or spawns a new one)
  const handleOptionClick = (mode: 'general' | 'math' | 'coding' | 'project') => {
    const existing = sessions.find(s => (s.mode || 'general') === mode);
    // If clicking already active option, start a fresh chat of this mode for convenience
    if (activeMode === mode) {
      onNewSession(mode);
    } else if (existing) {
      onSelectSession(existing.id);
    } else {
      onNewSession(mode);
    }
  };

  return (
    <>
      {/* Backdrop for mobile overlays */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onToggleMobile}
            className="md:hidden fixed inset-0 bg-black z-40"
          />
        )}
      </AnimatePresence>

      {/* Primary Sidebar Panel */}
      <aside
        id="side_navigation"
        className={`fixed md:sticky top-0 left-0 bottom-0 z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-250 dark:border-zinc-900 text-zinc-850 dark:text-zinc-200 h-screen transition-all duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "md:w-16 w-64" : "md:w-64 w-62"}`}
      >
        {/* Toggle Collapse Header */}
        <div className="p-3.5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-900 min-h-12">
          {!isCollapsed && (
            <span className="text-xs font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase px-1">
              AI MODES
            </span>
          )}
          
          {/* Collapse/Expand toggle button (desktop) */}
          <button 
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="hidden md:flex p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors ml-auto"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Close trigger for mobile */}
          <button 
            type="button"
            onClick={onToggleMobile} 
            className="md:hidden p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Outer Scroll Container for sidebar controls */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden p-3 space-y-5">
          
          {/* 4 Clean AI Mode Navigation Options */}
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeMode === item.id;
              
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    handleOptionClick(item.id);
                    if (window.innerWidth < 768) {
                      onToggleMobile();
                    }
                  }}
                  className={`w-full group relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer text-sm transition-all duration-200 ${
                    isActive
                      ? "bg-zinc-200/90 dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 font-semibold shadow-sm border border-zinc-300/40 dark:border-zinc-800"
                      : "text-zinc-650 dark:text-zinc-405 border border-transparent hover:bg-zinc-200/40 dark:hover:bg-zinc-900/45 hover:text-zinc-900 dark:hover:text-zinc-100"
                  } ${isCollapsed ? "justify-center px-0" : "px-3"}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon 
                    className={`w-4.5 h-4.5 shrink-0 transition-transform duration-205 group-hover:scale-105 ${
                      isActive 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200"
                    }`} 
                  />
                  
                  {!isCollapsed && (
                    <span className="truncate leading-none">
                      {item.label}
                    </span>
                  )}

                  {/* Hover Tooltip in collapsed layout */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2 py-1.5 bg-zinc-900 dark:bg-zinc-800 text-zinc-100 dark:text-zinc-200 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap shadow-md border border-zinc-800 dark:border-zinc-700">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* + New Chat Action Button */}
          <div className="px-0.5">
            <button
              type="button"
              onClick={() => {
                onNewSession(activeMode);
                if (window.innerWidth < 768) {
                  onToggleMobile();
                }
              }}
              className={`w-full group flex items-center gap-2.5 p-2.5 text-sm font-medium border border-zinc-300 dark:border-zinc-800 rounded-xl hover:bg-zinc-200/40 dark:hover:bg-zinc-900/60 justify-center transition-all duration-250 cursor-pointer ${
                isCollapsed ? "px-0" : "px-3"
              }`}
              title={isCollapsed ? "+ New Chat" : undefined}
            >
              <Plus className="w-4.5 h-4.5 shrink-0 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-white" />
              {!isCollapsed && (
                <span className="text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white">
                  + New Chat
                </span>
              )}

              {/* Collapsed Tooltip */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1.5 bg-zinc-900 dark:bg-zinc-850 text-zinc-100 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap shadow-md border border-zinc-800">
                  + New Chat
                </div>
              )}
            </button>
          </div>

          {/* Divider and Recent Chats heading */}
          {!isCollapsed && (
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-900 flex items-center justify-between px-1">
              <span className="text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-550 uppercase">
                Recent Chats {isSelecting && <span className="text-[10px] text-emerald-500 ml-1 font-mono">(Select Mode)</span>}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsSelecting(!isSelecting);
                    setSelectedIds([]);
                  }}
                  className={`p-1 rounded hover:bg-zinc-205 dark:hover:bg-zinc-900 transition-colors cursor-pointer ${isSelecting ? "text-emerald-500 hover:text-emerald-400" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
                  title="Delete multiple selected chats"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setClearHistoryConfirm(true)}
                  className="p-1 rounded text-zinc-400 dark:text-zinc-500 hover:text-rose-500 hover:bg-zinc-205 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                  title="Clear all conversations"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Warning banner when history is disabled */}
          {settings?.historyDisabled && !isCollapsed && (
            <div className="mx-0.5 p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 rounded-xl space-y-1 my-1">
              <div className="flex items-start gap-1 px-0.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider font-mono">History is disabled</span>
              </div>
              <p className="text-[9px] text-zinc-500 dark:text-zinc-450 leading-normal font-sans pl-1.5">
                New conversations won't save to database and are wiped out instantly on browser reload.
              </p>
            </div>
          )}

          {/* Selective multiple delete bar overlay */}
          {isSelecting && selectedIds.length > 0 && !isCollapsed && (
            <div className="p-2.5 bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/60 dark:border-zinc-800 rounded-xl space-y-2 mt-1">
              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
                  {selectedIds.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-[9px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  Clear check
                </button>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setDeleteMultipleConfirm(true)}
                  className="flex-1 py-1 px-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Chosen</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSelecting(false);
                    setSelectedIds([]);
                  }}
                  className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-250 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold rounded-lg cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Recent chats stream */}
          <div className="flex-1 space-y-1">
            {sessions.length === 0 ? (
              !isCollapsed && (
                <div className="px-1 text-xs text-zinc-405 dark:text-zinc-500 italic">
                  No saved conversations
                </div>
              )
            ) : (
              sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isSelected = selectedIds.includes(session.id);
                const isRenaming = renamingId === session.id;

                if (isRenaming) {
                  return (
                    <div key={session.id} className="w-full flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-350 dark:border-zinc-800 rounded-xl z-20">
                      <input
                        type="text"
                        autoFocus
                        value={renameTitleState}
                        onChange={(e) => setRenameTitleState(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onRenameSession(session.id, renameTitleState);
                            setRenamingId(null);
                          } else if (e.key === "Escape") {
                            setRenamingId(null);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-transparent px-1.5 py-0.5 text-xs text-zinc-850 dark:text-zinc-100 focus:outline-none font-sans font-medium"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRenameSession(session.id, renameTitleState);
                          setRenamingId(null);
                        }}
                        className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-zinc-200 dark:hover:bg-zinc-850 rounded transition-colors cursor-pointer shrink-0"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingId(null);
                        }}
                        className="p-1 text-zinc-505 hover:bg-zinc-205 dark:hover:bg-zinc-850 rounded transition-colors cursor-pointer shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={session.id}
                    className="relative group w-full"
                    onContextMenu={(e) => handleContextMenu(e, session.id, session.title || "Untitled Chat")}
                    onTouchStart={() => handleTouchStart(session.id, session.title || "Untitled Chat")}
                    onTouchEnd={handleTouchEnd}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelecting) {
                          toggleSelectSession(session.id);
                        } else {
                          onSelectSession(session.id);
                          if (window.innerWidth < 768) {
                            onToggleMobile();
                          }
                        }
                      }}
                      className={`w-full relative flex items-center gap-2.5 p-2 rounded-xl text-left cursor-pointer text-xs transition-all duration-200 ${
                        isActive
                          ? "bg-zinc-200/55 dark:bg-zinc-900/65 font-medium border border-zinc-300/20 dark:border-zinc-805/80 text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-600 dark:text-zinc-400 border border-transparent hover:bg-zinc-200/30 dark:hover:bg-zinc-900/30 hover:text-zinc-900 dark:hover:text-zinc-200"
                      } ${isCollapsed ? "justify-center px-0" : "px-3"}`}
                      title={session.title || "Untitled Chat"}
                    >
                      {/* Left icon checkbox selector mode or default circle */}
                      {isSelecting && !isCollapsed ? (
                        isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-400 dark:text-zinc-650 shrink-0" />
                        )
                      ) : (
                        <MessageCircle className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-500 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-550"}`} />
                      )}
                      
                      {!isCollapsed && (
                        <span className="truncate leading-normal w-full pr-14 font-sans font-medium text-[11px]">
                          {session.title || "Untitled Chat"}
                        </span>
                      )}

                      {/* Collapsed Tooltip */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-2 py-1.5 bg-zinc-900 dark:bg-zinc-850 text-zinc-100 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap shadow-md border border-zinc-800">
                          {session.title || "Untitled Chat"}
                        </div>
                      )}
                    </button>

                    {/* Inline Hover Delete and Rename buttons matching ChatGPT layout and menu */}
                    {!isCollapsed && !isSelecting && (
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10 bg-gradient-to-l from-zinc-50 dark:from-zinc-950 via-zinc-50/95 dark:via-zinc-950/95 pl-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameTitleState(session.title || "");
                            setRenamingId(session.id);
                          }}
                          className="p-1 hover:bg-zinc-205 dark:hover:bg-zinc-900 rounded text-zinc-450 hover:text-emerald-500 dark:hover:text-zinc-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                          title="Rename Conversation"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(session.id);
                          }}
                          className="p-1 hover:bg-zinc-205 dark:hover:bg-zinc-900 rounded text-zinc-450 hover:text-red-500 dark:hover:text-zinc-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete Conversation"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Bottom Sidebar Footer */}
        {user && (
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-900 mt-auto bg-zinc-50/50 dark:bg-zinc-950/40">
            
            {/* User Profile Info section - converted to an elegant active button */}
            <button
              id="sidebar_profile_button"
              type="button"
              onClick={() => onOpenSettings("profile")}
              className={`w-full group/prof text-left flex items-center gap-2.5 pb-2 border-b border-zinc-200/70 dark:border-zinc-900/70 mb-2 p-1.5 hover:bg-zinc-200/50 dark:hover:bg-zinc-900/40 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${isCollapsed ? "justify-center" : "px-1"}`}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || user.username}
                  className="w-7 h-7 rounded-full object-cover border border-zinc-300 dark:border-zinc-800 shrink-0 group-hover/prof:border-emerald-500 transition-colors"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                  {((user.displayName || user.username || user.email || 'U')[0]).toUpperCase()}
                </div>
              )}
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-150 leading-tight group-hover/prof:text-emerald-500 transition-colors">
                    {user.displayName || user.username}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-500 truncate leading-none">
                    {user.email}
                  </span>
                </div>
              )}

              {/* Collapsed Profile Tag Tooltip */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 dark:bg-zinc-850 text-zinc-100 text-[11px] rounded opacity-0 hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-md border border-zinc-800">
                  {user.displayName || user.username} ({user.email})
                </div>
              )}
            </button>

            {/* Utility Commands: Settings & Logout */}
            <div className="space-y-0.5">
              {/* Settings Action Button */}
              <button
                id="btn_open_settings"
                type="button"
                onClick={() => onOpenSettings("general")}
                className={`w-full group relative flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-150 transition-all cursor-pointer ${
                  isCollapsed ? "justify-center px-0" : "px-2.5"
                }`}
                title={isCollapsed ? "Settings" : undefined}
              >
                <SettingsIcon className="w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-white" />
                {!isCollapsed && <span>Settings</span>}

                {/* Hover Tooltip in collapsed layout */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1.5 bg-zinc-900 dark:bg-zinc-800 text-zinc-100 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap shadow-md border border-zinc-805">
                    Settings
                  </div>
                )}
              </button>

              {/* Logout Action Button */}
              <button
                id="btn_logout_user"
                type="button"
                onClick={onLogout}
                className={`w-full group relative flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-zinc-650 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 dark:hover:text-red-400 transition-all cursor-pointer ${
                  isCollapsed ? "justify-center px-0" : "px-2.5"
                }`}
                title={isCollapsed ? "Logout" : undefined}
              >
                <LogOut className="w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-400 group-hover:text-red-500" />
                {!isCollapsed && <span>Logout</span>}

                {/* Hover Tooltip in collapsed layout */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2 py-1.5 bg-zinc-900 dark:bg-zinc-800 text-zinc-100 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 whitespace-nowrap shadow-md border border-zinc-805">
                    Logout
                  </div>
                )}
              </button>
            </div>

          </div>
        )}
      </aside>

      {/* Right-click and long-press custom popover menu */}
      <AnimatePresence>
        {activeMenuSessionId && menuCoords && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{
              position: "fixed",
              top: `${menuCoords.y}px`,
              left: `${menuCoords.x}px`,
              zIndex: 9999,
            }}
            className="w-48 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 rounded-xl shadow-xl p-1.5 flex flex-col space-y-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setRenameTitleState(sessions.find(s => s.id === activeMenuSessionId)?.title || "");
                setRenamingId(activeMenuSessionId);
                setActiveMenuSessionId(null);
                setMenuCoords(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-emerald-500 text-left transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Rename Conversation</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSelecting(true);
                setSelectedIds([activeMenuSessionId]);
                setActiveMenuSessionId(null);
                setMenuCoords(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 text-left transition-colors cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Select Multiple</span>
            </button>
            <div className="border-t border-zinc-150 dark:border-zinc-800 my-1" />
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmId(activeMenuSessionId);
                setActiveMenuSessionId(null);
                setMenuCoords(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-xs font-bold text-red-500 hover:text-red-400 text-left transition-colors cursor-pointer"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Delete Conversation</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ MODAL 1: INDIVIDUAL DELETE CONFIRMATION ============ */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="fixed inset-0 bg-black"
            />
            {/* Dialog frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-90 w-full max-w-sm rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shadow-2xl relative z-10 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-sans">
                    Delete conversation?
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal font-sans">
                    Are you sure you want to delete <span className="font-semibold text-zinc-750 dark:text-zinc-300">"{sessions.find(s => s.id === deleteConfirmId)?.title || "Untitled Chat"}"</span>? This will permanently wipe all logs and messages instantly. This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteSession(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-550 text-white font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Delete Chat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============ MODAL 2: MULTIPLE DELETIONS CONFIRMATION ============ */}
      <AnimatePresence>
        {deleteMultipleConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteMultipleConfirm(false)}
              className="fixed inset-0 bg-black"
            />
            {/* Dialog frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-90 w-full max-w-sm rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shadow-2xl relative z-10 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-105 dark:bg-red-950/45 flex items-center justify-center shrink-0 text-red-650 dark:text-red-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-sans">
                    Delete {selectedIds.length} conversations?
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal font-sans">
                    Are you sure you want to bulk purge those {selectedIds.length} chosen conversations from the workstation database? Once deleted, logs and files will be cleared instantly. This action is irreversible.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteMultipleConfirm(false)}
                  className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteMultipleSessions && selectedIds.length > 0) {
                      onDeleteMultipleSessions(selectedIds);
                    } else {
                      selectedIds.forEach((id) => onDeleteSession(id));
                    }
                    setSelectedIds([]);
                    setIsSelecting(false);
                    setDeleteMultipleConfirm(false);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-550 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Delete Selected
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============ MODAL 3: CLEAR ALL HISTORY CONFIRMATION ============ */}
      <AnimatePresence>
        {clearHistoryConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setClearHistoryConfirm(false)}
              className="fixed inset-0 bg-black"
            />
            {/* Dialog frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-90 w-full max-w-sm rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shadow-2xl relative z-10 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-105 dark:bg-red-950/45 flex items-center justify-center shrink-0 text-red-650 dark:text-red-400">
                  <Trash2 className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-sans uppercase tracking-wider font-mono">
                    Purge all chat history?
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal font-sans">
                    Extremely critical choice. This completely deletes all of your saved chat history and resets active channels. This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setClearHistoryConfirm(false)}
                  className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-205 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    setClearHistoryConfirm(false);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-550 text-white font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Delete All Chats
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
