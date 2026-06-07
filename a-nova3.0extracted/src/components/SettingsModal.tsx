import React, { useState } from "react";
import { 
  X, 
  ChevronLeft,
  Bot, 
  Sliders, 
  Volume2, 
  User, 
  Check, 
  Save, 
  FileDown,
  Plus,
  Trash,
  Globe,
  Monitor,
  Sun,
  Moon,
  Key,
  Eye,
  EyeOff,
  Calendar,
  Cpu,
  Sparkles,
  Lock,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Settings, User as UserType, ChatSession } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSaveSettings: (settings: Settings) => Promise<void>;
  user: UserType | null;
  onUpdateProfile: (
    username: string,
    avatarUrl: string,
    displayName?: string,
    planStatus?: string,
    password?: string,
    email?: string,
    phone?: string,
    emailVerified?: boolean,
    phoneVerified?: boolean
  ) => Promise<void>;
  sessions: ChatSession[];
  onClearHistory: () => Promise<void>;
  onDeleteSession?: (id: string) => Promise<void>;
  onDeleteMultipleSessions?: (ids: string[]) => Promise<void>;
  defaultTab?: string;
}

type TabType = 
  | "profile" 
  | "ai" 
  | "appearance" 
  | "data";

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  user,
  onUpdateProfile,
  sessions,
  onClearHistory,
  onDeleteSession,
  onDeleteMultipleSessions,
  defaultTab
}: SettingsModalProps) {
  // Navigation active tab
  const [activeTab, setActiveTab ] = useState<TabType>("profile");
  
  // Mobile navigation view pane ("menu" shows list of tabs, "content" shows actual settings pane)
  const [mobileView, setMobileView] = useState<"menu" | "content">("menu");

  // Sync active tab with parent's defaultTab
  React.useEffect(() => {
    if (isOpen) {
      if (defaultTab) {
        if (defaultTab === "general" || defaultTab === "ai") {
          setActiveTab("ai");
        } else {
          setActiveTab(defaultTab as any);
        }
        setMobileView("content");
      } else {
        setMobileView("menu");
      }
    }
  }, [isOpen, defaultTab]);

  // --- SETTINGS VALUES (Syncing inputs to local states first) ---
  const [defaultModel, setDefaultModel] = useState(settings.defaultModel || "gemini-3.5-flash");
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt || "You are A-NOVA, an extremely advanced, professional AI workspace platform.");
  const [aboutMe, setAboutMe] = useState(settings.aboutMe || "");
  const [respondWay, setRespondWay] = useState(settings.respondWay || "");
  const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled || false);
  const [voiceName, setVoiceName] = useState(settings.voiceName || "Zephyr");
  const [isDarkMode, setIsDarkMode] = useState(settings.isDarkMode !== false);

  // General tab states
  const [language, setLanguage] = useState(settings.language || "en-US");
  const [timezone, setTimezone] = useState(settings.timezone || "America/New_York");

  // Appearance tab states
  const [theme, setTheme] = useState<'system' | 'dark' | 'light'>(settings.theme || 'dark');
  const [chatWidth, setChatWidth] = useState<'standard' | 'full'>(settings.chatWidth || 'standard');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>(settings.fontSize || 'md');

  // Personalization tab states
  const [memoryEnabled, setMemoryEnabled] = useState(settings.memoryEnabled !== false);
  const [customInstructionsEnabled, setCustomInstructionsEnabled] = useState(settings.customInstructionsEnabled !== false);

  // Voice tab states
  const [speechSpeed, setSpeechSpeed] = useState<number>(settings.speechSpeed || 1.0);
  const [micSettingsEnabled, setMicSettingsEnabled] = useState(settings.micSettingsEnabled !== false);

  // Data Controls states
  const [historyDisabled, setHistoryDisabled] = useState(settings.historyDisabled === true);

  // Password / Credentials states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // API Key state
  const [customApiKey, setCustomApiKey] = useState(settings.customApiKey || "");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  // User Profile inputs
  const [username, setUsername] = useState(user?.username || "");
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || "");
  const [emailAddress, setEmailAddress] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [emailVerified, setEmailVerified] = useState(user?.emailVerified !== false);
  const [phoneVerified, setPhoneVerified] = useState(user?.phoneVerified !== false);

  // Phone update OTP context
  const [isPhoneVerifying, setIsPhoneVerifying] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneTimer, setPhoneTimer] = useState(0);
  const phoneTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Notification simulator modal inline
  const [inlineNotification, setInlineNotification] = useState<string | null>(null);

  const startPhoneVerificationTimer = () => {
    if (phoneTimerRef.current) clearInterval(phoneTimerRef.current);
    setPhoneTimer(300); // 5 minutes
    phoneTimerRef.current = setInterval(() => {
      setPhoneTimer((prev) => {
        if (prev <= 1) {
          if (phoneTimerRef.current) clearInterval(phoneTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  React.useEffect(() => {
    return () => {
      if (phoneTimerRef.current) clearInterval(phoneTimerRef.current);
    };
  }, []);

  const triggerToastNotification = (otp: string) => {
    setInlineNotification(`SIMULATED PROFILE SECURITY SMS • NOW: Your verification code is [ ${otp} ]. valid for 5 mins.`);
    setTimeout(() => setInlineNotification(null), 10000);
  };

  const [planStatus, setPlanStatus] = useState<string>(user?.planStatus || "Plus");
  const [avatarUrlInput, setAvatarUrlInput] = useState(user?.avatarUrl || "");
  const [avatarSeed, setAvatarSeed] = useState(user?.username || "A-NOVA");

  // System UI status notifications
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  // --- ACTIONS ---

  const showSuccessNotification = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const showErrorNotification = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg("");
    setTimeout(() => setErrorMsg(""), 4000);
  };

  const handleExportData = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        plan: planStatus,
        userProfile: {
          username,
          displayName,
          email: emailAddress,
          createdAt: user?.createdAt
        },
        settings: {
          defaultModel,
          systemPrompt,
          aboutMe,
          respondWay,
          voiceEnabled,
          voiceName,
          isDarkMode,
          language,
          timezone,
          theme,
          chatWidth,
          fontSize,
          memoryEnabled,
          customInstructionsEnabled,
          speechSpeed,
          micSettingsEnabled,
          customApiKey,
          historyDisabled
        },
        sessions: sessions
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `anova_myai_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showSuccessNotification("Account settings & chat session history exported successfully!");
    } catch (err) {
      console.error("Export failed:", err);
      showErrorNotification("Export processing failed. Please try clearing browser cache.");
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await onClearHistory();
      setConfirmClear(false);
      showSuccessNotification("Your complete chat history has been permanently cleared.");
    } catch (error) {
      console.error(error);
      showErrorNotification("Failed to clear chat history database.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    // Password validation logic
    if (newPassword || currentPassword || confirmNewPassword) {
      if (!currentPassword) {
        showErrorNotification("Please type your current password to modify security set-ups.");
        setSaving(false);
        return;
      }
      if (newPassword !== confirmNewPassword) {
        showErrorNotification("New password and confirmation fields do not match.");
        setSaving(false);
        return;
      }
      if (newPassword.length < 6) {
        showErrorNotification("New password must be at least 6 characters in length.");
        setSaving(false);
        return;
      }
    }

    try {
      // Sync Dicebear URL generator vs custom url entry
      const finalAvatar = avatarUrlInput.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed || username || "A-NOVA")}`;

      // 1. Submit user profile changes
      await onUpdateProfile(
        username.trim(),
        finalAvatar,
        displayName.trim(),
        planStatus,
        newPassword || undefined,
        emailAddress.trim(),
        phoneNumber.trim(),
        emailVerified,
        phoneVerified
      );

      // 2. Submit workspace settings changes
      await onSaveSettings({
        defaultModel,
        systemPrompt,
        aboutMe,
        respondWay,
        voiceEnabled,
        voiceName: voiceName as any,
        isDarkMode: theme === "dark" || (theme === "system" && isDarkMode),
        
        language,
        timezone,
        theme,
        chatWidth,
        fontSize,
        memoryEnabled,
        customInstructionsEnabled,
        speechSpeed,
        micSettingsEnabled,
        customApiKey,
        historyDisabled
      });

      // Local password states clean up on success
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      showSuccessNotification("All workspace configuration parameters updated successfully!");
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error(err);
      showErrorNotification(err.message || "Server rejected validation settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="settings_modal_wrapper" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Absolute backdrop shadow layer */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/75 backdrop-blur-[5px] transition-opacity" 
      />

      <motion.div
        id="settings_modal_body"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="w-full max-w-5xl bg-zinc-900 border border-zinc-805 rounded-2xl shadow-2xl relative z-10 flex flex-col md:flex-row overflow-hidden max-h-[88vh] text-zinc-150 font-sans"
      >
        {/* Left internal tab sidebar */}
        <div id="settings_tab_sidebar" className={`w-full md:w-64 bg-zinc-950 p-4 border-r border-zinc-900 flex flex-col justify-between shrink-0 overflow-y-auto ${mobileView === "menu" ? "flex" : "hidden md:flex"}`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-2 py-3 mb-3 border-b border-zinc-900">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-650 to-teal-500 flex items-center justify-center shrink-0 border border-emerald-400/20 relative">
                <span className="text-[13px] font-black font-mono text-white select-none">A</span>
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <span className="font-bold text-xs tracking-wider text-zinc-100 uppercase font-mono truncate">A-NOVA WORKSPACE</span>
            </div>

            {/* Profile Tab */}
            <button
              id="tab_settings_profile"
              type="button"
              onClick={() => { setActiveTab("profile"); setMobileView("content"); }}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                activeTab === "profile" 
                  ? "bg-zinc-900 text-emerald-400 font-semibold" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-zinc-400" />
                <span>My Profile</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-900 text-emerald-400 font-mono font-bold rounded uppercase shrink-0">{planStatus}</span>
            </button>

            {/* AI Preferences Tab */}
            <button
              id="tab_settings_ai"
              type="button"
              onClick={() => { setActiveTab("ai"); setMobileView("content"); }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                activeTab === "ai" 
                  ? "bg-zinc-900 text-emerald-400 font-semibold" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <Sliders className="w-4 h-4 text-zinc-400" />
              <span>AI Configurations</span>
            </button>

            {/* Theme Display & Sound Tab */}
            <button
              id="tab_settings_appearance"
              type="button"
              onClick={() => { setActiveTab("appearance"); setMobileView("content"); }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                activeTab === "appearance" 
                  ? "bg-zinc-900 text-emerald-400 font-semibold" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <Monitor className="w-4 h-4 text-zinc-400" />
              <span>Display & Audio</span>
            </button>

            {/* Data controls & Erasures Tab */}
            <button
              id="tab_settings_data"
              type="button"
              onClick={() => { setActiveTab("data"); setMobileView("content"); }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                activeTab === "data" 
                  ? "bg-zinc-900 text-emerald-400 font-semibold" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
              }`}
            >
              <FileDown className="w-4 h-4 text-zinc-400" />
              <span>Data & Privacy</span>
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-900 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Workspace Mode</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 font-mono text-zinc-500 rounded font-semibold">v1.5.0</span>
          </div>
        </div>

        {/* Right Content Area */}
        <div className={`flex-1 flex flex-col min-w-0 bg-zinc-900 ${mobileView === "content" ? "flex" : "hidden md:flex"}`}>
          
          {/* Section Header */}
          <div className="p-5 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10 gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileView("menu")}
                className="md:hidden flex items-center justify-center p-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg cursor-pointer transition-colors shrink-0"
                title="Back to menu"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <h3 className="font-bold text-sm tracking-wide text-zinc-100 font-sans truncate">
                {activeTab === "profile" && "Manage User Profile & Plan"}
                {activeTab === "ai" && "AI Configurations & Custom Instructions"}
                {activeTab === "appearance" && "Display Themes & Speech Outputs"}
                {activeTab === "data" && "Data Portability & Workspace Erasures"}
              </h3>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form and Tabs Controller */}
          <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-y-auto p-6 md:p-8 space-y-6">
            <AnimatePresence mode="wait">
              {/* STATUS NOTIFICATION TOASTS */}
              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-emerald-400 text-xs flex items-center gap-2.5 font-semibold"
                >
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs flex items-center gap-2.5 font-semibold"
                >
                  <X className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {/* ================================== TAB 1: PROFILE ================================== */}
              {activeTab === "profile" && (
                <motion.div
                  key="tab-profile"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="space-y-6"
                >
                  {/* Simulated Secure SMS Banner for settings updates */}
                  <AnimatePresence>
                    {inlineNotification && (
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-3 bg-zinc-950 border border-emerald-500 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 text-emerald-400 font-medium">
                          <MessageSquare className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-bounce" />
                          <span>{inlineNotification}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInlineNotification(null)}
                          className="text-zinc-500 hover:text-zinc-300 text-xs font-bold"
                        >
                          ✕
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-zinc-950 border border-zinc-850">
                    <img 
                      className="w-16 h-16 rounded-2xl bg-zinc-900 border-2 border-emerald-500 p-1 object-cover transition-transform shrink-0"
                      src={avatarUrlInput.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed || username || "A-NOVA")}`} 
                      alt="Profile Avatar"
                    />
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-zinc-100 truncate">{displayName || username}</h4>
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950 border border-emerald-900 text-emerald-400 font-mono font-bold rounded uppercase shrink-0">Plan: {planStatus}</span>
                      </div>
                      
                      {/* Sub-channel Status indicators badges layout */}
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 border ${
                          emailVerified 
                            ? "bg-emerald-950/40 border-emerald-900 text-emerald-400" 
                            : "bg-amber-950/40 border-amber-900 text-amber-400"
                        }`}>
                          <span>EMAIL:</span>
                          <span>{emailVerified ? "VERIFIED" : "UNVERIFIED"}</span>
                        </span>

                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 border ${
                          phoneVerified 
                            ? "bg-emerald-950/40 border-emerald-900 text-emerald-400" 
                            : "bg-amber-950/40 border-amber-900 text-amber-400"
                        }`}>
                          <span>PHONE:</span>
                          <span>{phoneVerified ? "VERIFIED" : "UNVERIFIED"}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono mt-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Registered: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : "Active Sandbox User"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Username Input */}
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-2 uppercase tracking-wider">Username Handle</label>
                      <div className="relative">
                        <input
                          id="ip_settings_username_profile"
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Unique identifier"
                          className="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-zinc-100 rounded-xl focus:outline-none transition-all"
                        />
                        <span className="absolute left-3.5 top-2.5 text-zinc-500 font-mono text-xs">@</span>
                      </div>
                    </div>

                    {/* Display Name Input */}
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-2 uppercase tracking-wider">Display Name</label>
                      <input
                        id="ip_settings_displayName_profile"
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Human representation name"
                        className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-zinc-100 rounded-xl focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Dual Channel modification slots with inline verify integrations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email address and instant verification bypass */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider">Email Address</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            id="ip_settings_email_profile"
                            type="email"
                            required
                            value={emailAddress}
                            onChange={(e) => {
                              setEmailAddress(e.target.value);
                              // reset verification if changed
                              if (e.target.value.toLowerCase() !== (user?.email || "").toLowerCase()) {
                                setEmailVerified(false);
                              } else {
                                setEmailVerified(user?.emailVerified !== false);
                              }
                            }}
                            placeholder="Active email address"
                            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-zinc-100 rounded-xl focus:outline-none transition-all"
                          />
                        </div>

                        {!emailVerified && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const response = await fetch("/api/auth/simulate-email-confirm", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ email: emailAddress })
                                });
                                if (response.ok) {
                                  setEmailVerified(true);
                                  showSuccessNotification("Simulated email verification bypass triggered successfully!");
                                }
                              } catch (e) {
                                console.warn("Confirm simulation failed");
                              }
                            }}
                            className="px-3 bg-emerald-950 border border-emerald-900 text-emerald-400 font-bold hover:text-emerald-300 text-[10px] rounded-xl font-mono active:scale-95 transition-all whitespace-nowrap"
                          >
                            Verify Link
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Phone Number Slot with Interactive OTP flow */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider">Phone Number</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            id="ip_settings_phone_profile"
                            type="tel"
                            required
                            value={phoneNumber}
                            onChange={(e) => {
                              setPhoneNumber(e.target.value);
                              if (e.target.value.replace(/[^0-9]/g, "") !== (user?.phone || "").replace(/[^0-9]/g, "")) {
                                setPhoneVerified(false);
                              } else {
                                setPhoneVerified(user?.phoneVerified !== false);
                              }
                            }}
                            placeholder="+1 (555) 000-0000"
                            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-zinc-100 rounded-xl focus:outline-none transition-all"
                          />
                        </div>

                        {!phoneVerified && !isPhoneVerifying && (
                          <button
                            type="button"
                            disabled={!phoneNumber}
                            onClick={async () => {
                              setErrorMsg("");
                              setSuccessMsg("");
                              try {
                                const res = await fetch("/api/auth/send-sms-otp", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ phone: phoneNumber })
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error);

                                setIsPhoneVerifying(true);
                                startPhoneVerificationTimer();
                                triggerToastNotification(data.otp);
                                showSuccessNotification(`Security OTP sent to ${phoneNumber}`);
                              } catch (err: any) {
                                setErrorMsg(err.message || "Failed to dispatch verification OTP.");
                              }
                            }}
                            className="px-3 bg-emerald-950 border border-emerald-900 text-emerald-400 font-bold hover:text-emerald-300 text-[10px] rounded-xl font-mono active:scale-95 transition-all whitespace-nowrap"
                          >
                            Verify OTP
                          </button>
                        )}
                      </div>

                      {/* Expanded Inline Verificator Form */}
                      {isPhoneVerifying && (
                        <div className="p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2 mt-2">
                          <p className="text-[10px] text-zinc-450 leading-relaxed font-mono">
                            VERIFY CODE SECURELY (Expires: <span className="text-emerald-400">{Math.floor(phoneTimer / 60)}:{(phoneTimer % 60) < 10 ? "0" : ""}{phoneTimer % 60}</span>)
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="XXXXXX"
                              value={phoneOtp}
                              onChange={(e) => setPhoneOtp(e.target.value.replace(/[^0-9]/g, ""))}
                              className="flex-1 bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 outline-none p-1.5 tracking-wider font-mono rounded"
                            />
                            <button
                              type="button"
                              disabled={phoneOtp.length < 6}
                              onClick={async () => {
                                setErrorMsg("");
                                try {
                                  const res = await fetch("/api/auth/verify-sms-otp", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ phone: phoneNumber, otp: phoneOtp, email: emailAddress })
                                  });
                                  const data = await res.json();
                                  if (!res.ok) throw new Error(data.error || "Incorrect OTP sequence.");

                                  setPhoneVerified(true);
                                  setIsPhoneVerifying(false);
                                  setPhoneOtp("");
                                  if (phoneTimerRef.current) clearInterval(phoneTimerRef.current);
                                  showSuccessNotification("Phone number verified and synchronized!");
                                } catch (err: any) {
                                  setErrorMsg(err.message || "Credential verify aborted.");
                                }
                              }}
                              className="px-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white font-bold text-[10px] rounded"
                            >
                              Verify Code
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Change Plan Selector */}
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-2 uppercase tracking-wider">Subscription Tier</label>
                      <select
                        id="ip_settings_plan_profile"
                        value={planStatus}
                        onChange={(e) => setPlanStatus(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-zinc-100 rounded-xl focus:outline-none cursor-pointer transition-all"
                      >
                        <option value="Free Tier">Free Tier (Standard API Limits)</option>
                        <option value="Plus">A-NOVA Plus Sandbox ($20/mo Included)</option>
                        <option value="Enterprise">A-NOVA Enterprise Unlimited ($120/mo)</option>
                      </select>
                    </div>
                  </div>

                  {/* Avatar Customization */}
                  <div className="p-4 rounded-2xl bg-zinc-950/40 border border-zinc-850 space-y-3">
                    <label className="block text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider">Avatar Settings</label>
                    
                    <div className="flex gap-4 items-center flex-col sm:flex-row">
                      <div className="flex-1 space-y-2 w-full">
                        <label className="block text-[9px] text-zinc-450 font-mono uppercase">Option A: Robot Illustration Seed</label>
                        <input
                          id="ip_settings_avatar_seed_profile"
                          type="text"
                          value={avatarSeed}
                          onChange={(e) => {
                            setAvatarSeed(e.target.value);
                            setAvatarUrlInput(""); 
                          }}
                          placeholder="E.g. Explorer-77"
                          className="w-full px-4 py-2 bg-zinc-950 border border-zinc-850 text-xs text-zinc-100 rounded-xl focus:border-emerald-500 outline-none"
                        />
                      </div>
                      
                      <div className="hidden sm:block h-10 w-px bg-zinc-850 self-end mb-1" />

                      <div className="flex-1 space-y-2 w-full">
                        <label className="block text-[9px] text-zinc-450 font-mono uppercase">Option B: Custom Picture JPEG/PNG URL</label>
                        <input
                          id="ip_settings_avatar_url_profile"
                          type="text"
                          value={avatarUrlInput}
                          onChange={(e) => setAvatarUrlInput(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full px-4 py-2 bg-zinc-950 border border-zinc-850 text-xs text-zinc-100 rounded-xl focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Unified Password / Credentials Modification Inline */}
                  <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      Change Account Password
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] text-zinc-450 font-mono uppercase mb-1.5">Current Password</label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 bg-zinc-90 w-full bg-zinc-900 border border-zinc-850 text-xs rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[9px] text-zinc-450 font-mono uppercase mb-1.5">New Password</label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 chars"
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 text-xs rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] text-zinc-450 font-mono uppercase mb-1.5">Confirm New Password</label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Re-type password"
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-850 text-xs rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <div className="text-zinc-500">
                        {newPassword && (
                          <span className="font-mono">
                            Password Strength: <span className={newPassword.length >= 8 ? "text-emerald-400 font-bold" : "text-yellow-500 font-bold"}>
                              {newPassword.length >= 8 ? "Strong" : "Weak/Short"}
                            </span>
                          </span>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 cursor-pointer font-mono"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showPassword ? "Hide Characters" : "Show Characters"}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ================================== TAB 2: AI PREFERENCES ================================== */}
              {activeTab === "ai" && (
                <motion.div
                  key="tab-ai"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Default Model Selector */}
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-2 uppercase tracking-wider">Default Core Model</label>
                      <select
                        id="select_general_model"
                        value={defaultModel}
                        onChange={(e) => setDefaultModel(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-zinc-100 rounded-xl focus:outline-none cursor-pointer transition-all"
                      >
                        <option value="gemini-3.5-flash">Gemini 3.5 Flash (Ultra fast responder - default)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (Extreme reasoning & code comprehension)</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard core logic model)</option>
                      </select>
                    </div>

                    {/* Language Preference */}
                    <div>
                      <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-2 uppercase tracking-wider">Interface Language</label>
                      <select
                        id="select_general_language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-xs text-zinc-100 rounded-xl focus:outline-none cursor-pointer transition-all"
                      >
                        <option value="en-US">English (United States)</option>
                        <option value="en-GB">English (United Kingdom)</option>
                        <option value="es-ES">Español (España)</option>
                        <option value="fr-FR">Français (France)</option>
                        <option value="de-DE">Deutsch (Deutschland)</option>
                        <option value="ja-JP">日本語 (日本)</option>
                        <option value="zh-CN">简体中文 (中国)</option>
                        <option value="vt-VN">Tiếng Việt (Việt Nam)</option>
                      </select>
                    </div>
                  </div>

                  {/* System Instruction Panel */}
                  <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-4">
                    <label className="block text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider">Global System Prompt Instruct</label>
                    <textarea
                      id="system_prompt_textarea"
                      rows={2}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Define the baseline operational personality of the A-NOVA assistant..."
                      className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-850 focus:border-emerald-500 text-xs text-zinc-100 rounded-xl focus:outline-none transition-all resize-none leading-relaxed font-sans"
                    />
                  </div>

                  {/* Custom ChatGPT Style Instructions Toggle */}
                  <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-850 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div>
                        <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-emerald-400" />
                          Custom Instructions
                        </h4>
                        <p className="text-[10px] text-zinc-500 mt-1">Specify detailed instructions to fine-tune model style and code layout.</p>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input 
                          id="toggle_custom_instructions"
                          type="checkbox" 
                          checked={customInstructionsEnabled} 
                          onChange={(e) => setCustomInstructionsEnabled(e.target.checked)} 
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-zinc-900 border border-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-zinc-300 after:content-[''] after:absolute after:top-[4px] after:right-[18px] after:bg-zinc-500 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-zinc-100"></div>
                      </label>
                    </div>

                    {customInstructionsEnabled && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-2 uppercase">1. What would you like A-NOVA to know about you to provide better responses?</label>
                          <textarea
                            id="about_me_text_input"
                            rows={2}
                            value={aboutMe}
                            onChange={(e) => setAboutMe(e.target.value)}
                            placeholder="E.g. I am a frontend developer specializing in React. Please avoid general coding intros and deliver structured code files."
                            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-850 focus:border-emerald-500 text-xs text-zinc-100 rounded-xl focus:outline-none transition-all resize-none leading-relaxed font-sans"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-2 uppercase font-semibold">2. How would you like A-NOVA to format / address responses?</label>
                          <textarea
                            id="respond_way_text_input"
                            rows={2}
                            value={respondWay}
                            onChange={(e) => setRespondWay(e.target.value)}
                            placeholder="E.g. Keep explanations direct, analytical, and objective. Prefer using named function exports and clean hooks."
                            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-850 focus:border-emerald-500 text-xs text-zinc-100 rounded-xl focus:outline-none transition-all resize-none leading-relaxed font-sans"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom API Key Input config */}
                  <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-3">
                    <div>
                      <h4 className="text-xs font-bold font-mono tracking-wider uppercase text-zinc-350 flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-emerald-450" />
                        Private Google Gemini Key
                      </h4>
                      <p className="text-[10px] text-zinc-500 mt-1">Provide custom credentials to override global workspace usage limits securely.</p>
                    </div>

                    <div className="relative">
                      <input
                        id="ip_custom_api_key_modal"
                        type={apiKeyVisible ? "text" : "password"}
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full pl-4 pr-12 py-2.5 bg-zinc-900 border border-zinc-850 text-xs text-zinc-200 font-mono rounded-xl focus:border-emerald-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setApiKeyVisible(!apiKeyVisible)}
                        className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300 font-semibold"
                      >
                        {apiKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[9.5px] text-zinc-550 leading-relaxed font-mono">This key is handled encrypted. It is loaded server-side only to handle LLM calls without exposing tokens to browser debuggers.</p>
                  </div>
                </motion.div>
              )}

              {/* ================================== TAB 3: DISPLAY & AUDIO ================================== */}
              {activeTab === "appearance" && (
                <motion.div
                  key="tab-appearance"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="space-y-5"
                >
                  {/* Theme Section */}
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-2 uppercase tracking-wide">Workspace UI Theme Style</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTheme("dark");
                          setIsDarkMode(true);
                        }}
                        className={`flex flex-col items-center gap-2 p-3 text-xs rounded-xl border font-bold cursor-pointer transition-all ${
                          theme === "dark" 
                            ? "bg-zinc-950 text-emerald-405 border-zinc-750" 
                            : "bg-zinc-950/20 text-zinc-500 border-zinc-900 hover:text-zinc-300"
                        }`}
                      >
                        <Moon className="w-4 h-4 shrink-0" />
                        <span>Cosmic Dark</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTheme("light");
                          setIsDarkMode(false);
                        }}
                        className={`flex flex-col items-center gap-2 p-3 text-xs rounded-xl border font-bold cursor-pointer transition-all ${
                          theme === "light" 
                            ? "bg-zinc-950 text-emerald-405 border-zinc-750" 
                            : "bg-zinc-950/20 text-zinc-500 border-zinc-900 hover:text-zinc-300"
                        }`}
                      >
                        <Sun className="w-4 h-4 shrink-0" />
                        <span>Pure Light</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTheme("system")}
                        className={`flex flex-col items-center gap-2 p-3 text-xs rounded-xl border font-bold cursor-pointer transition-all ${
                          theme === "system" 
                            ? "bg-zinc-950 text-emerald-405 border-zinc-750" 
                            : "bg-zinc-950/20 text-zinc-500 border-zinc-900 hover:text-zinc-300"
                        }`}
                      >
                        <Monitor className="w-4 h-4 shrink-0" />
                        <span>System Sync</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Chat Layout Width Selector */}
                    <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-850 space-y-3">
                      <div>
                        <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">Layout Chat Width</h4>
                        <p className="text-[10px] text-zinc-500 mt-1">Adjust if you prefer center-aligned standard layout boundaries or wide content stretching.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setChatWidth("standard")}
                          className={`px-3 py-2 text-[11px] font-bold rounded-lg border transition-all ${
                            chatWidth === "standard" 
                              ? "bg-zinc-900 border-zinc-700 text-emerald-400" 
                              : "bg-zinc-950 text-zinc-500 border-zinc-900 hover:text-zinc-300"
                          }`}
                        >
                          Standard Max (3xl)
                        </button>
                        <button
                          type="button"
                          onClick={() => setChatWidth("full")}
                          className={`px-3 py-2 text-[11px] font-bold rounded-lg border transition-all ${
                            chatWidth === "full" 
                              ? "bg-zinc-900 border-zinc-700 text-emerald-400" 
                              : "bg-zinc-950 text-zinc-500 border-zinc-900 hover:text-zinc-300"
                          }`}
                        >
                          Full Widescreen (100%)
                        </button>
                      </div>
                    </div>

                    {/* Font Sizing Panel */}
                    <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-850 space-y-3">
                      <div>
                        <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400">Workspace Font Size</h4>
                        <p className="text-[10px] text-zinc-500 mt-1">Change visual chat typography spacing scale for accessibility preferences.</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setFontSize("sm")}
                          className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                            fontSize === "sm" 
                              ? "bg-zinc-900 border-zinc-700 text-emerald-400" 
                              : "bg-zinc-950 text-zinc-500 border-zinc-900 hover:text-zinc-300"
                          }`}
                        >
                          Small
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontSize("md")}
                          className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                            fontSize === "md" 
                              ? "bg-zinc-900 border-zinc-700 text-emerald-400" 
                              : "bg-zinc-950 text-zinc-500 border-zinc-900 hover:text-zinc-300"
                          }`}
                        >
                          Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => setFontSize("lg")}
                          className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                            fontSize === "lg" 
                              ? "bg-zinc-900 border-zinc-700 text-emerald-400" 
                              : "bg-zinc-950 text-zinc-500 border-zinc-900 hover:text-zinc-300"
                          }`}
                        >
                          Large
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* TTS Speech synthesized audio config */}
                  <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-850 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                      <div>
                        <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                          Speech TTS Synthesis Outputs
                        </h4>
                        <p className="text-[10px] text-zinc-500 mt-1">Utilize system text-to-speech to read responses aloud dynamically.</p>
                      </div>
                      
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          id="toggle_voice_reader_modal"
                          type="checkbox" 
                          checked={voiceEnabled} 
                          onChange={(e) => setVoiceEnabled(e.target.checked)} 
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-zinc-900 border border-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-zinc-300 after:content-[''] after:absolute after:top-[4px] after:right-[18px] after:bg-zinc-500 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-zinc-100"></div>
                      </label>
                    </div>

                    {voiceEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        {/* Voice Timber Select */}
                        <div>
                          <label className="block text-[9.5px] font-bold font-mono text-zinc-400 mb-1.5 uppercase">Acoustic Voice Option</label>
                          <select
                            id="select_settings_voice_name_modal"
                            value={voiceName}
                            onChange={(e) => setVoiceName(e.target.value)}
                            className="w-full px-4 py-2 bg-zinc-90 w-full bg-zinc-900 border border-zinc-850 text-xs text-zinc-100 rounded-xl focus:border-emerald-500 outline-none cursor-pointer"
                          >
                            <option value="Zephyr">Zephyr (Confident Neutral)</option>
                            <option value="Kore">Kore (Warm Executive)</option>
                            <option value="Puck">Puck (Cheerful Energetic)</option>
                            <option value="Charon">Charon (Declamatory Explanatory)</option>
                            <option value="Fenrir">Fenrir (Steady Modernist)</option>
                          </select>
                        </div>

                        {/* Speed rate selection */}
                        <div>
                          <label className="block text-[9.5px] font-bold font-mono text-zinc-400 mb-1.5 uppercase">Speech speed rate: {speechSpeed}x</label>
                          <div className="flex items-center gap-3 bg-zinc-900 px-4 py-1.5 border border-zinc-850 rounded-xl">
                            <span className="text-[9px] text-zinc-500 font-mono">0.5x</span>
                            <input
                              type="range"
                              min="0.5"
                              max="2.0"
                              step="0.25"
                              value={speechSpeed}
                              onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                              className="flex-1 accent-emerald-500 h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-[9px] text-zinc-500 font-mono">2.0x</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ================================== TAB 4: DATA & PRIVACY ================================== */}
              {activeTab === "data" && (
                <motion.div
                  key="tab-data"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="space-y-5"
                >
                  {/* Transient Memory Sandbox Mode toggle */}
                  <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div className="pr-4">
                        <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300">Disable Chat History (Transient WorkSpace)</h4>
                        <p className="text-[10px] text-zinc-500 mt-1 leading-normal font-sans">
                          When checked, new chats are preserved only in active browser memory. Conversations are purged upon page reload and are not written to database stores.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={historyDisabled}
                          onChange={(e) => setHistoryDisabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-zinc-900 border border-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-zinc-300 after:content-[''] after:absolute after:top-[4px] after:right-[18px] after:bg-zinc-500 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-zinc-100"></div>
                      </label>
                    </div>
                  </div>

                  {/* Backup Backups Export Section */}
                  <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-3">
                    <div>
                      <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300">Data Portability Backups</h4>
                      <p className="text-[10px] text-zinc-500 mt-1 hover:text-zinc-400 transition-colors">Download configuration backups, preset variables and full dialogue threads text.</p>
                    </div>

                    <button
                      id="btn_settings_export_history"
                      type="button"
                      onClick={handleExportData}
                      className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <FileDown className="w-4 h-4 text-emerald-400" />
                      Export Chats & Configurations (JSON)
                    </button>
                  </div>

                  {/* Individual dialog deletions inline */}
                  <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-3">
                    <div>
                      <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300">Selective History Deletion</h4>
                      <p className="text-[10px] text-zinc-505 text-zinc-500 mt-1">Erase specific active conversations instantly from persistent database layers.</p>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
                      {sessions.length > 0 ? (
                        sessions.map((sess) => (
                          <div key={sess.id} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-850 text-xs hover:border-zinc-800 transition-all">
                            <span className="text-zinc-200 truncate pr-4 font-sans font-medium">{sess.title || "Untitled Active Chat"}</span>
                            <button
                              type="button"
                              onClick={async () => {
                                if (onDeleteSession) {
                                  await onDeleteSession(sess.id);
                                  showSuccessNotification(`Purged individual chat: "${sess.title || "Untitled"}"`);
                                }
                              }}
                              className="p-1 hover:bg-zinc-950 hover:text-red-400 rounded text-zinc-500 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-zinc-650 py-3 text-center font-mono">No active dialog threads currently running.</p>
                      )}
                    </div>
                  </div>

                  {/* Big Master Database Purge (Irreversible) */}
                  <div className="p-4 rounded-2xl bg-red-950/15 border border-red-900/35 space-y-3">
                    <div>
                      <h4 className="text-xs font-bold font-mono text-red-400 uppercase tracking-wider">Master Purge Dialogs Database</h4>
                      <p className="text-[10px] text-zinc-500 leading-normal">
                        Completely wipe your active conversation threads and diagnostic details from servers. This operation cannot be reversed.
                      </p>
                    </div>

                    {!confirmClear ? (
                      <button
                        type="button"
                        onClick={() => setConfirmClear(true)}
                        className="px-4 py-2 bg-red-900/20 border border-red-900/35 hover:bg-red-950 hover:text-white text-xs font-bold text-red-300 rounded-xl transition-all cursor-pointer"
                      >
                        Purge All Conversations
                      </button>
                    ) : (
                      <div className="space-y-3 p-3 bg-red-950/20 rounded-xl border border-red-900/30">
                        <p className="text-xs text-red-200 font-semibold leading-relaxed">⚠️ Warning: Click delete below to wipe all dialog history from local storage and databases permanently.</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleClearAllHistory}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-lg cursor-pointer"
                          >
                            Yes, Delete Everything
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmClear(false)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-bold rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Form Action Buttons */}
            <div className="pt-5 border-t border-zinc-850 flex items-center justify-between mt-auto">
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider hidden sm:inline">Secure Session Synced</span>
              
              <div className="flex gap-2.5 shrink-0 ml-auto w-full sm:w-auto justify-end">
                <button
                  id="btn_close_settings_modal_drawer"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="btn_submit_save_anova_settings"
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs rounded-xl cursor-pointer flex items-center gap-2 transition-all active:scale-[0.98]"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save configurations
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
