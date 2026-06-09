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
  Plus,
  MessageCircle,
  Trash2,
  Trash,
  CheckSquare,
  AlertCircle,
  Edit2,
  Check,
  Search,
  Pin,
  PinOff,
  Archive,
  Inbox,
  Sparkles,
  Layers
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
  onPinSession: (id: string, pinned: boolean) => void;
  onArchiveSession: (id: string, archived: boolean) => void;
  onOpenSettings: (tab?: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onToggleMobile: () => void;
  settings?: any;
}

const Sidebar = React.memo(function Sidebar({
  sessions,
  activeSessionId,
  user,
  onSelectSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
  onDeleteMultipleSessions,
  onClearHistory,
  onPinSession,
  onArchiveSession,
  onOpenSettings,
  onLogout,
  isOpen,
  onToggleMobile,
  settings
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitleState, setRenameTitleState] = useState("");
  
  // Toggles for history types
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  // Deletion modals
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteMultipleConfirm, setDeleteMultipleConfirm] = useState(false);
  const [clearHistoryConfirm, setClearHistoryConfirm] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const activeMode = activeSession?.mode || 'general';

  const isDark = settings?.isDarkMode ?? true;

  const CORES = [
    {
      id: "general" as const,
      label: "General dialogue",
      icon: MessageSquare,
      color: "from-sky-500 to-blue-500",
      accentBg: "bg-sky-500/10 dark:bg-sky-500/5",
      accentText: "text-sky-600 dark:text-sky-400"
    },
    {
      id: "math" as const,
      label: "Mathematics",
      icon: Binary,
      color: "from-violet-500 to-purple-500",
      accentBg: "bg-violet-500/10 dark:bg-violet-500/5",
      accentText: "text-violet-600 dark:text-violet-450"
    },
    {
      id: "coding" as const,
      label: "Coding workspace",
      icon: Code,
      color: "from-emerald-500 to-teal-500",
      accentBg: "bg-emerald-500/10 dark:bg-emerald-500/5",
      accentText: "text-emerald-600 dark:text-emerald-400"
    },
    {
      id: "project" as const,
      label: "Strategic blueprints",
      icon: Target,
      color: "from-rose-500 to-pink-500",
      accentBg: "bg-rose-500/10 dark:bg-rose-500/5",
      accentText: "text-rose-600 dark:text-rose-400"
    }
  ];

  const toggleSelectSession = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCoreClick = (mode: 'general' | 'math' | 'coding' | 'project') => {
    onNewSession(mode);
    if (window.innerWidth < 768) {
      onToggleMobile();
    }
  };

  // Helper to categorize dates
  const getGroupLabel = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return "Previous 7 Days";
      return "Older conversations";
    } catch {
      return "Older conversations";
    }
  };

  // Filter conversations
  const visibleSessions = sessions.filter(s => {
    const titleMatch = (s.title || "Untitled Chat").toLowerCase().includes(searchQuery.toLowerCase());
    
    if (showArchivedOnly) {
      return s.archived && titleMatch;
    } else {
      return !s.archived && titleMatch;
    }
  });

  // Extract pinned vs regular history group
  const pinnedSessions = showArchivedOnly ? [] : visibleSessions.filter(s => s.pinned);
  const regularSessions = showArchivedOnly ? visibleSessions : visibleSessions.filter(s => !s.pinned);

  // Group regular sessions
  const groupedSessions: { [key: string]: ChatSession[] } = {};
  regularSessions.forEach(session => {
    const group = getGroupLabel(session.updatedAt || session.createdAt);
    if (!groupedSessions[group]) {
      groupedSessions[group] = [];
    }
    groupedSessions[group].push(session);
  });

  const orderedGroups = ["Today", "Yesterday", "Previous 7 Days", "Older conversations"];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onToggleMobile}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
          />
        )}
      </AnimatePresence>

      <aside
        id="side_navigation"
        className={`fixed md:sticky top-0 left-0 bottom-0 z-50 flex flex-col h-screen transition-all duration-300 ease-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "md:w-16 w-64" : "md:w-68 w-68"} ${
          isDark 
            ? "bg-zinc-950 border-r border-zinc-900 text-zinc-100" 
            : "bg-zinc-50 border-r border-zinc-200 text-zinc-800"
        }`}
      >
        {/* Header (Branding & Collapsing) */}
        <div className={`p-4 flex items-center justify-between border-b h-15 shrink-0 ${
          isDark ? "border-zinc-900" : "border-zinc-200"
        }`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2 px-1 font-display">
              <div className="relative w-6 h-6 flex items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 shadow-sm">
                <span className="text-[11px] font-black tracking-tight text-white select-none">A</span>
                <Sparkles className="w-2.5 h-2.5 text-sky-200 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-tight leading-none">
                  A-NOVA
                </span>
                <span className="text-[7.5px] font-medium tracking-widest text-zinc-400 dark:text-zinc-550 mt-0.5 leading-none font-mono">
                  INTELLIGENCE
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto relative w-6 h-6 flex items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 shadow-sm">
              <span className="text-[11px] font-black text-white">A</span>
            </div>
          )}
          
          <button 
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className={`hidden md:flex p-1.5 rounded-lg cursor-pointer transition-colors ${
              isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-900" : "text-zinc-550 hover:text-zinc-900 hover:bg-zinc-150"
            }`}
            title={isCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          <button 
            type="button"
            onClick={onToggleMobile} 
            className={`md:hidden p-1.5 rounded-lg cursor-pointer transition-colors ${
              isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-900" : "text-zinc-550 hover:text-zinc-900 hover:bg-zinc-150"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scroll Elements container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          
          {/* New Chat Button */}
          <div>
            <button
              type="button"
              onClick={() => {
                onNewSession(activeMode);
                if (window.innerWidth < 768) {
                  onToggleMobile();
                }
              }}
              className={`w-full group relative flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                isCollapsed ? "justify-center" : ""
              } ${
                isDark 
                  ? "border-zinc-850 hover:bg-zinc-900 text-zinc-100" 
                  : "border-zinc-220 hover:bg-zinc-100 text-zinc-800"
              }`}
            >
              <Plus className="w-4 h-4 shrink-0" />
              {!isCollapsed && (
                <span>New chat</span>
              )}

              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-250 text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                  New chat
                </div>
              )}
            </button>
          </div>

          {/* Cognitive Cores (Only visible when expanded or icons represent modes) */}
          <div className="space-y-0.5">
            {!isCollapsed && (
              <span className="text-[8.5px] font-bold tracking-widest text-zinc-400 dark:text-zinc-550 uppercase px-2 py-1 block font-mono">
                Cognitive Cores
              </span>
            )}
            {CORES.map((core) => {
              const Icon = core.icon;
              const isActive = activeMode === core.id && !showArchivedOnly;
              
              return (
                <button
                  key={core.id}
                  type="button"
                  onClick={() => handleCoreClick(core.id)}
                  className={`w-full group relative flex items-center gap-2.5 p-2 rounded-xl cursor-pointer text-xs transition-all ${
                    isActive
                      ? `${core.accentBg} ${core.accentText} font-medium`
                      : isDark
                        ? "text-zinc-405 hover:bg-zinc-900/40 hover:text-zinc-100"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  } ${isCollapsed ? "justify-center" : "px-3"}`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? core.accentText : 'text-zinc-400'}`} />
                  
                  {!isCollapsed && (
                    <span className="truncate text-xs">
                      {core.label}
                    </span>
                  )}

                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-zinc-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                      {core.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          {!isCollapsed && (
            <div className="px-1 relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-xl outline-none transition-all ${
                    isDark 
                      ? "bg-zinc-900/40 border border-zinc-850 text-white placeholder-zinc-500 focus:border-cyan-550"
                      : "bg-zinc-100/80 border border-zinc-200 text-zinc-900 placeholder-zinc-450 focus:border-blue-500"
                  }`}
                />
                <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-zinc-400 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-2 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Bulk Select Control Active */}
          <AnimatePresence>
            {isSelecting && selectedIds.length > 0 && !isCollapsed && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`p-2 rounded-xl space-y-1.5 shadow-sm border ${
                  isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-100/60 border-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] px-1 font-mono">
                  <span className="text-zinc-500 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-sky-505" />
                    {selectedIds.length} chosen
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeleteMultipleConfirm(true)}
                    className="flex-1 py-1 px-2 bg-red-500/10 hover:bg-red-500 border border-red-550/20 text-red-650 dark:text-red-400 text-[10px] font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelecting(false);
                      setSelectedIds([]);
                    }}
                    className={`px-2 py-1 text-[10px] font-medium rounded-lg cursor-pointer ${
                      isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Archive / Active Tabs Selector */}
          {!isCollapsed && (
            <div className={`flex border-b text-[10px] font-semibold ${
              isDark ? "border-zinc-900" : "border-zinc-200"
            }`}>
              <button
                type="button"
                onClick={() => setShowArchivedOnly(false)}
                className={`flex-1 py-1.5 text-center transition-colors cursor-pointer border-b-2 ${
                  !showArchivedOnly 
                    ? "text-sky-500 border-sky-500 font-bold" 
                    : "text-zinc-400 border-transparent hover:text-zinc-600 dark:hover:text-zinc-200"
                }`}
              >
                Conversations
              </button>
              <button
                type="button"
                onClick={() => setShowArchivedOnly(true)}
                className={`flex-1 py-1.5 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1 ${
                  showArchivedOnly 
                    ? "text-sky-500 border-sky-500 font-bold" 
                    : "text-zinc-400 border-transparent hover:text-zinc-600 dark:hover:text-zinc-200"
                }`}
              >
                <Inbox className="w-3 h-3" />
                <span>Archived</span>
              </button>
            </div>
          )}

          {/* History headers & bulk handlers */}
          {!isCollapsed && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[8.5px] font-bold tracking-widest text-zinc-400 dark:text-zinc-550 uppercase font-mono">
                {showArchivedOnly ? "Archived Logs" : "Conversations"}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsSelecting(!isSelecting);
                    setSelectedIds([]);
                  }}
                  className={`p-1 rounded-lg hover:bg-zinc-205 dark:hover:bg-zinc-900 transition-all cursor-pointer ${
                    isSelecting ? "text-sky-500 bg-sky-500/10" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  }`}
                  title="Bulk selection"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setClearHistoryConfirm(true)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                  title="Wipe recent history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Chats Render */}
          <div className="space-y-3">
            
            {/* 1. Pinned conversations list */}
            {pinnedSessions.length > 0 && !isCollapsed && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-1 pb-1">
                  <Pin className="w-3 h-3 text-sky-400" />
                  <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">Pinned</span>
                </div>
                {pinnedSessions.map(session => renderSessionItem(session))}
              </div>
            )}

            {/* 2. Grouped conversations list */}
            <div className="space-y-3">
              {orderedGroups.map(group => {
                const groupItems = groupedSessions[group] || [];
                if (groupItems.length === 0) return null;

                return (
                  <div key={group} className="space-y-1">
                    {!isCollapsed && (
                      <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wide font-mono px-1">
                        {group}
                      </span>
                    )}
                    {groupItems.map(session => renderSessionItem(session))}
                  </div>
                );
              })}

              {/* Empty state list helper */}
              {visibleSessions.length === 0 && (
                <div className="text-center py-6">
                  <MessageCircle className="w-5 h-5 mx-auto text-zinc-300 dark:text-zinc-700 mb-1" />
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic block font-mono">
                    {sessions.length === 0 ? "Empty workspace" : "No results match"}
                  </span>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* User Account controls segment at bottom */}
        {user && (
          <div className={`p-3 border-t mt-auto shrink-0 ${
            isDark ? "border-zinc-900 bg-zinc-950/80" : "border-zinc-200 bg-zinc-50/80"
          }`}>
            {/* User Details display */}
            <button
              id="sidebar_profile_button"
              type="button"
              onClick={() => onOpenSettings("profile")}
              className={`w-full group text-left flex items-center gap-2 px-1.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                isDark ? "hover:bg-zinc-900" : "hover:bg-zinc-150"
              }`}
            >
              <div className="relative shrink-0">
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                  alt={user.displayName || user.username}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-lg object-cover border dark:border-zinc-800 border-zinc-250 block scale-98 hover:scale-100 transition-transform"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-505 border border-white dark:border-zinc-950 animate-pulse" />
              </div>

              {!isCollapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold truncate leading-none">
                    {user.displayName || user.username}
                  </span>
                  <span className="text-[9px] text-zinc-450 dark:text-zinc-550 truncate font-mono mt-1 leading-none">
                    {user.email}
                  </span>
                </div>
              )}

              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-zinc-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                  {user.displayName || user.username}
                </div>
              )}
            </button>

            {/* Config Commands shortcuts */}
            <div className="flex items-center gap-1 mt-2.5 pt-1.5 border-t border-zinc-200 dark:border-zinc-900">
              <button
                id="btn_open_settings"
                type="button"
                onClick={() => onOpenSettings("general")}
                className={`flex-1 group relative flex items-center justify-center gap-1.5 p-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  isCollapsed ? "justify-center" : ""
                } ${
                  isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-900" : "text-zinc-550 hover:text-zinc-900 hover:bg-zinc-150"
                }`}
              >
                <SettingsIcon className="w-3.5 h-3.5 shrink-0" />
                {!isCollapsed && <span>Settings</span>}
              </button>

              <button
                id="btn_logout_user"
                type="button"
                onClick={onLogout}
                className={`group relative flex items-center justify-center p-1.5 rounded-lg transition-all cursor-pointer ${
                  isCollapsed ? "w-full" : "px-2"
                } ${
                  isDark ? "text-zinc-400 hover:text-red-400 hover:bg-red-500/10" : "text-zinc-550 hover:text-red-500 hover:bg-red-50"
                }`}
                title="Log out session"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* 4. Overlay Deletion Modals */}
      {/* Delete session confirmation modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs z-999 animate-fade-in text-white select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl ${
                isDark ? "bg-zinc-950 border-zinc-850" : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <AlertCircle className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display">Delete thread</h3>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Are you absolutely sure you want to permanently delete this conversación thread? This action is irreversible.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className={`py-1.5 px-3 text-xs font-semibold rounded-xl cursor-pointer transition-colors ${
                    isDark ? "bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 hover:text-white" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteConfirmId) {
                      onDeleteSession(deleteConfirmId);
                      setDeleteConfirmId(null);
                    }
                  }}
                  className="py-1.5 px-3 hover:opacity-95 text-xs font-semibold bg-red-650 hover:bg-red-500 text-white rounded-xl cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete multiple modal */}
        {deleteMultipleConfirm && (
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs z-999 animate-fade-in text-white select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl ${
                isDark ? "bg-zinc-950 border-zinc-850" : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <AlertCircle className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display">Delete {selectedIds.length} conversations</h3>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    This will delete all {selectedIds.length} selectively chosen conversations. This action cannot be revoked.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteMultipleConfirm(false)}
                  className={`py-1.5 px-3 text-xs font-semibold rounded-xl cursor-pointer transition-colors ${
                    isDark ? "bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 hover:text-white" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteMultipleSessions) {
                      onDeleteMultipleSessions(selectedIds);
                    }
                    setSelectedIds([]);
                    setIsSelecting(false);
                    setDeleteMultipleConfirm(false);
                  }}
                  className="py-1.5 px-3 hover:opacity-95 text-xs font-semibold bg-red-650 hover:bg-red-500 text-white rounded-xl cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Clear all modal */}
        {clearHistoryConfirm && (
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs z-999 animate-fade-in text-white select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl ${
                isDark ? "bg-zinc-950 border-zinc-850" : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <AlertCircle className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display">Wipe entire history</h3>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    This will purge ALL conversations in your database folder completely. This is a destructive security wipe.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setClearHistoryConfirm(false)}
                  className={`py-1.5 px-3 text-xs font-semibold rounded-xl cursor-pointer transition-colors ${
                    isDark ? "bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 hover:text-white" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    setClearHistoryConfirm(false);
                  }}
                  className="py-1.5 px-3 hover:opacity-95 text-xs font-semibold bg-red-650 hover:bg-red-500 text-white rounded-xl cursor-pointer"
                >
                  Wipe Database
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  // Modular helper to render a single chat history session
  function renderSessionItem(session: ChatSession) {
    const isActive = session.id === activeSessionId;
    const isSelected = selectedIds.includes(session.id);
    const isRenaming = renamingId === session.id;

    if (isRenaming) {
      return (
        <div key={session.id} className={`w-full flex items-center gap-1.5 p-1 rounded-xl border ${
          isDark ? "bg-zinc-900 border-zinc-800" : "bg-zinc-150 border-zinc-250"
        }`}>
          <input
            type="text"
            autoFocus
            value={renameTitleState}
            onChange={(e) => setRenameTitleState(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (renameTitleState.trim()) {
                  onRenameSession(session.id, renameTitleState.trim());
                }
                setRenamingId(null);
              } else if (e.key === "Escape") {
                setRenamingId(null);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent px-2 py-0.5 text-xs rounded focus:outline-none"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (renameTitleState.trim()) {
                onRenameSession(session.id, renameTitleState.trim());
              }
              setRenamingId(null);
            }}
            className="p-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-505 rounded-lg transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRenamingId(null);
            }}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer text-zinc-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    return (
      <div
        key={session.id}
        className="relative group w-full"
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
          className={`w-full relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left cursor-pointer text-[12.5px] transition-all group-hover:pr-18 ${
            isActive
              ? isDark 
                ? "bg-zinc-900 border border-zinc-850 text-white font-medium" 
                : "bg-zinc-200 border border-zinc-250 text-zinc-950 font-medium"
              : isDark
                ? "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-250"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
          } ${isCollapsed ? "justify-center" : "px-3"}`}
          title={session.title || "Untitled Chat"}
        >
          {isSelecting && !isCollapsed ? (
            isSelected ? (
              <div className="w-4 h-4 rounded bg-sky-550 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-white stroke-[4]" />
              </div>
            ) : (
              <div className={`w-4 h-4 rounded border shrink-0 ${
                isDark ? "border-zinc-705 bg-zinc-950" : "border-zinc-305 bg-white"
              }`} />
            )
          ) : (
            <MessageCircle className={`w-3.5 h-3.5 shrink-0 ${
              isActive 
                ? isDark ? "text-sky-400" : "text-sky-500" 
                : "text-zinc-400 group-hover:text-zinc-550 dark:group-hover:text-zinc-300"
            }`} />
          )}
          
          {!isCollapsed && (
            <span className="truncate w-full pr-1.5">
              {session.title || "Untitled Chat"}
            </span>
          )}

          {isCollapsed && (
            <div className="absolute left-full ml-3 px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
              {session.title || "Untitled Chat"}
            </div>
          )}
        </button>

        {/* Quick controls on hover */}
        {!isCollapsed && !isSelecting && (
          <div className={`absolute right-1 leading-none top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5 z-10 p-0.5 rounded-lg border ${
            isDark 
              ? "bg-zinc-900/90 border-zinc-800" 
              : "bg-white/90 border-zinc-150"
          }`}>
            {/* 1. Pin action Toggle button */}
            {!showArchivedOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPinSession(session.id, !session.pinned);
                }}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  session.pinned 
                    ? "text-sky-550 hover:text-sky-600 bg-sky-500/10" 
                    : "text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100"
                }`}
                title={session.pinned ? "Unpin chat" : "Pin chat"}
              >
                {session.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
              </button>
            )}

            {/* 2. Archive action Toggle button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onArchiveSession(session.id, !session.archived);
              }}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                session.archived 
                  ? "text-amber-500 hover:text-amber-600 bg-amber-500/10" 
                  : "text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100"
              }`}
              title={session.archived ? "Unarchive chat" : "Archive chat"}
            >
              <Archive className="w-3 h-3" />
            </button>

            {/* 3. Rename */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRenameTitleState(session.title || "");
                setRenamingId(session.id);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-850 dark:hover:text-zinc-150 rounded-md transition-colors cursor-pointer"
              title="Rename"
            >
              <Edit2 className="w-3 h-3" />
            </button>

            {/* 4. Delete */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmId(session.id);
              }}
              className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
              title="Delete permanently"
            >
              <Trash className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }
});

export default Sidebar;
