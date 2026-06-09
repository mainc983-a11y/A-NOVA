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
  Trash,
  Monitor,
  Sun,
  Moon,
  Key,
  Eye,
  EyeOff,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Database
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
  defaultTab
}: SettingsModalProps) {
  const [activeTab, setActiveTab ] = useState<TabType>("profile");
  const [mobileView, setMobileView] = useState<"menu" | "content">("menu");

  useEffectSync();

  function useEffectSync() {
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
  }

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
  const [emailAddress] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [emailVerified] = useState(user?.emailVerified !== false);
  const [phoneVerified] = useState(user?.phoneVerified !== false);

  // Notification simulator modal inline
  const [inlineNotification, setInlineNotification] = useState<string | null>(null);

  const [planStatus, setPlanStatus] = useState<string>(user?.planStatus || "Plus");
  const [avatarUrlInput, setAvatarUrlInput] = useState(user?.avatarUrl || "");
  const [avatarSeed, setAvatarSeed] = useState(user?.username || "A-NOVA");

  // System UI status notifications
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

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

      showSuccessNotification("Your configurations and chat indexes were exported successfully!");
    } catch (err) {
      console.error("Export failed:", err);
      showErrorNotification("Export parsing crashed. Please audit your storage size.");
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await onClearHistory();
      setConfirmClear(false);
      showSuccessNotification("A-Nova chat indexes successfully purges.");
    } catch (error) {
      console.error(error);
      showErrorNotification("Bulk clear action failed.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    if (newPassword || currentPassword || confirmNewPassword) {
      if (!currentPassword) {
        showErrorNotification("Current password required to edit security parameters.");
        setSaving(false);
        return;
      }
      if (newPassword !== confirmNewPassword) {
        showErrorNotification("New password confirmation does not match.");
        setSaving(false);
        return;
      }
      if (newPassword.length < 6) {
        showErrorNotification("Passwords must be at least 6 characters.");
        setSaving(false);
        return;
      }
    }

    try {
      const finalAvatar = avatarUrlInput.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed || username || "A-NOVA")}`;

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

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      showSuccessNotification("Platform environments synchronized.");
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      console.error(err);
      showErrorNotification(err.message || "Failed validating configuration environments.");
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
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity" 
      />

      <motion.div
        id="settings_modal_body"
        initial={{ opacity: 0, scale: 0.97, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 15 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.85)] relative z-10 flex flex-col md:flex-row overflow-hidden max-h-[85vh] text-zinc-200 font-sans"
      >
        {/* Left internal tab sidebar */}
        <div id="settings_tab_sidebar" className={`w-full md:w-64 bg-zinc-950 p-5 border-r border-zinc-850 flex flex-col justify-between shrink-0 overflow-y-auto ${mobileView === "menu" ? "flex" : "hidden md:flex"}`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 px-2 py-3 mb-4 border-b border-zinc-900 select-none">
              <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-500 flex items-center justify-center shrink-0 shadow-md">
                <span className="text-[11px] font-black font-display text-white">A</span>
              </div>
              <span className="font-bold text-[10px] tracking-widest text-zinc-400 uppercase font-mono">SETTINGS DEV-KIT</span>
            </div>

            {/* Profile Tab */}
            <button
              id="tab_settings_profile"
              type="button"
              onClick={() => { setActiveTab("profile"); setMobileView("content"); }}
              className={`flex items-center justify-between w-full px-3.5 py-3 rounded-2xl text-xs font-semibold tracking-wide cursor-pointer transition-all ${
                activeTab === "profile" 
                  ? "bg-zinc-900 text-cyan-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-zinc-800/80" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4.5 h-4.5" />
                <span>My Profile</span>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono font-bold rounded-md uppercase shrink-0">{planStatus}</span>
            </button>

            {/* AI Preferences Tab */}
            <button
              id="tab_settings_ai"
              type="button"
              onClick={() => { setActiveTab("ai"); setMobileView("content"); }}
              className={`flex items-center gap-2.5 w-full px-3.5 py-3 rounded-2xl text-xs font-semibold tracking-wide cursor-pointer transition-all ${
                activeTab === "ai" 
                  ? "bg-zinc-900 text-cyan-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-zinc-800/80" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent"
              }`}
            >
              <Sliders className="w-4.5 h-4.5" />
              <span>AI Engine Setup</span>
            </button>

            {/* Theme Display & Sound Tab */}
            <button
              id="tab_settings_appearance"
              type="button"
              onClick={() => { setActiveTab("appearance"); setMobileView("content"); }}
              className={`flex items-center gap-2.5 w-full px-3.5 py-3 rounded-2xl text-xs font-semibold tracking-wide cursor-pointer transition-all ${
                activeTab === "appearance" 
                  ? "bg-zinc-900 text-cyan-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-zinc-800/80" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent"
              }`}
            >
              <Monitor className="w-4.5 h-4.5" />
              <span>Display & Audio</span>
            </button>

            {/* Data controls Tab */}
            <button
              id="tab_settings_data"
              type="button"
              onClick={() => { setActiveTab("data"); setMobileView("content"); }}
              className={`flex items-center gap-2.5 w-full px-3.5 py-3 rounded-2xl text-xs font-semibold tracking-wide cursor-pointer transition-all ${
                activeTab === "data" 
                  ? "bg-zinc-900 text-cyan-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-zinc-800/80" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 border border-transparent"
              }`}
            >
              <FileDown className="w-4.5 h-4.5" />
              <span>Data & Portability</span>
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-650 font-mono">
            <span>PLATFORM SECURE</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        </div>

        {/* Right Content Area */}
        <div className={`flex-1 flex flex-col min-w-0 bg-zinc-900/40 backdrop-blur-3xl ${mobileView === "content" ? "flex" : "hidden md:flex"}`}>
          
          {/* Section Header */}
          <div className="p-5 border-b border-zinc-850 flex items-center justify-between bg-zinc-950/40 backdrop-blur sticky top-0 z-10 gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileView("menu")}
                className="md:hidden flex items-center justify-center p-2 bg-zinc-90 w hover:bg-zinc-800 text-zinc-300 rounded-xl cursor-pointer shrink-0 transition-all border border-zinc-800"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>

              <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-cyan-400 truncate">
                {activeTab === "profile" && "Account Profile Environment"}
                {activeTab === "ai" && "AI Hyperparameters & Prompt Inject"}
                {activeTab === "appearance" && "Appearance Modes & Synthesis"}
                {activeTab === "data" && "Sovereignty Data Portability"}
              </h3>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form and Content fields */}
          <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-y-auto p-6 md:p-8 space-y-6">
            <AnimatePresence mode="wait">
              {/* STATUS INDICATORS */}
              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-emerald-950/20 border border-emerald-900/50 rounded-2xl text-emerald-400 text-xs flex items-center gap-3 font-semibold"
                >
                  <Check className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-950/20 border border-red-900/50 rounded-2xl text-red-400 text-xs flex items-center gap-3 font-semibold"
                >
                  <X className="w-4.5 h-4.5 text-red-500 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {/* PROFILE TAB */}
              {activeTab === "profile" && (
                <motion.div
                  key="tab-profile-dev"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-2xl bg-zinc-950/60 border border-zinc-850/80">
                    <img 
                      className="w-16 h-16 rounded-2xl bg-zinc-900 border-2 border-cyan-500/80 p-1 object-cover shrink-0"
                      src={avatarUrlInput.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed || username || "A-NOVA")}`} 
                      alt="Profile"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate font-display">{displayName || username}</h4>
                        <span className="text-[9px] px-2 py-0.5 bg-cyan-950/80 border border-cyan-900 text-cyan-400 font-mono font-bold rounded-lg uppercase">{planStatus}</span>
                      </div>
                      <div className="flex justify-center sm:justify-start gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[8px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 border ${emailVerified ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400' : 'bg-red-950/40 border-red-900/50 text-red-400'}`}>
                          EMAIL: {emailVerified ? "VALIDATED" : "PENDING"}
                        </span>
                        <span className={`text-[8px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 border ${phoneVerified ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400' : 'bg-red-950/40 border-red-900/50 text-red-400'}`}>
                          PHONE: {phoneVerified ? "VALIDATED" : "PENDING"}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono mt-2.5">Workspace Seed ID: {user?.id || 'guest'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[9px] font-bold font-mono text-zinc-400 mb-2 uppercase tracking-widest">Username Handle</label>
                      <div className="relative">
                        <input
                          id="ip_settings_username_profile"
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-9 pr-4 py-3 bg-zinc-950/70 border border-zinc-800 focus:border-cyan-500 text-xs text-white rounded-2xl focus:outline-none transition-all duration-200"
                        />
                        <span className="absolute left-3.5 top-3.5 text-zinc-500 font-mono text-xs">@</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold font-mono text-zinc-400 mb-2 uppercase tracking-widest">Display Alias Name</label>
                      <input
                        id="ip_settings_displayName_profile"
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-950/70 border border-zinc-800 focus:border-cyan-500 text-xs text-white rounded-2xl focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[9px] font-bold font-mono text-zinc-400 mb-2 uppercase tracking-widest">Security Email Address</label>
                      <input
                        id="ip_settings_email_profile"
                        type="email"
                        disabled
                        value={emailAddress}
                        className="w-full px-4 py-3 bg-zinc-950/30 border border-zinc-900 text-xs text-zinc-500 rounded-2xl cursor-not-allowed select-text"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold font-mono text-zinc-400 mb-2 uppercase tracking-widest">SMS Recovery Phone</label>
                      <input
                        id="ip_settings_phone_profile"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-4 py-3 bg-zinc-950/70 border border-zinc-800 focus:border-cyan-500 text-xs text-white rounded-2xl focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Avatar Engine config */}
                  <div className="p-5 rounded-2xl bg-zinc-950/40 border border-zinc-850/80 space-y-4">
                    <label className="block text-[9px] font-bold font-mono text-zinc-400 uppercase tracking-widest">Profile Avatar Config</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[8px] text-zinc-500 tracking-wider uppercase font-mono mb-1.5">Preset Bottts Vector Seed</label>
                        <input
                          id="ip_settings_avatar_seed_profile"
                          type="text"
                          value={avatarSeed}
                          onChange={(e) => {
                            setAvatarSeed(e.target.value);
                            setAvatarUrlInput("");
                          }}
                          className="w-full px-4 py-2 bg-zinc-950 border border-zinc-850 focus:border-cyan-500 text-xs text-white rounded-xl outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] text-zinc-500 tracking-wider uppercase font-mono mb-1.5">Custom Image Unsplash URL</label>
                        <input
                          id="ip_settings_avatar_url_profile"
                          type="text"
                          value={avatarUrlInput}
                          onChange={(e) => setAvatarUrlInput(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full px-4 py-2 bg-zinc-950 border border-zinc-850 focus:border-cyan-500 text-xs text-white rounded-xl outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password Security Setups Option */}
                  <div className="p-5 bg-zinc-950/40 border border-zinc-850/80 rounded-2xl space-y-4">
                    <div className="border-b border-zinc-900 pb-3">
                      <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-350">Update Core Passkey Security</h4>
                      <p className="text-[10px] text-zinc-550 mt-1">Submit high grade character updates to change credentials.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[8px] font-bold font-mono text-zinc-400 mb-1.5 uppercase">Current Password</label>
                        <input
                          id="ip_settings_old_password"
                          type={showPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 focus:border-cyan-500 text-xs rounded-xl outline-none text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold font-mono text-zinc-400 mb-1.5 uppercase">New Password</label>
                        <input
                          id="ip_settings_new_password"
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 focus:border-cyan-500 text-xs rounded-xl outline-none text-white"
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-[8px] font-bold font-mono text-zinc-400 mb-1.5 uppercase">Re-Type Password</label>
                        <input
                          id="ip_settings_confirm_password"
                          type={showPassword ? "text" : "password"}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="w-full pl-3 pr-10 py-2 bg-zinc-950 border border-zinc-850 focus:border-cyan-500 text-xs rounded-xl outline-none text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-[23px] text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* AI CHANNELS AND CORES CONFIGS */}
              {activeTab === "ai" && (
                <motion.div
                  key="tab-ai-dev"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[9px] font-bold font-mono text-zinc-400 mb-2 uppercase tracking-widest">Base Reasoning Core</label>
                      <select
                        id="select_general_model"
                        value={defaultModel}
                        onChange={(e) => setDefaultModel(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 text-xs text-white rounded-2xl outline-none cursor-pointer focus:border-cyan-500"
                      >
                        <option value="gemini-3.5-flash">Gemini 3.5 Flash (SaaS lightning responder)</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Extreme logic & compilation reasoning)</option>
                        <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Base model core)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold font-mono text-zinc-400 mb-2 uppercase tracking-widest">Locale Coordinates</label>
                      <select
                        id="select_general_language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 text-xs text-white rounded-2xl outline-none cursor-pointer focus:border-cyan-500"
                      >
                        <option value="en-US">English (Western Standard - US)</option>
                        <option value="es-ES">Español (España/Latam)</option>
                        <option value="fr-FR">Français (France)</option>
                        <option value="de-DE">Deutsch (Deutschland)</option>
                        <option value="ja-JP">日本語 (日本)</option>
                        <option value="zh-CN">简体中文 (China)</option>
                        <option value="vt-VN">Tiếng Việt (Vietnam)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-zinc-950/40 border border-zinc-850/80 space-y-3">
                    <label className="block text-[9px] font-bold font-mono text-zinc-400 uppercase tracking-widest">Baseline System Prompt Context</label>
                    <textarea
                      id="system_prompt_textarea"
                      rows={3}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 focus:border-cyan-500 text-xs text-white rounded-2xl outline-none resize-none font-sans leading-relaxed"
                    />
                  </div>

                  {/* Custom Prompt Instructions */}
                  <div className="p-5 rounded-3xl bg-zinc-950/40 border border-zinc-850/80 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div>
                        <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-300">Custom System Instruction Sets</h4>
                        <p className="text-[10px] text-zinc-550 mt-1">Specify background memory contexts to inject on cognitive prompt loops.</p>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input 
                          id="toggle_custom_instructions"
                          type="checkbox" 
                          checked={customInstructionsEnabled} 
                          onChange={(e) => setCustomInstructionsEnabled(e.target.checked)} 
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-zinc-900 border border-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-zinc-300 after:content-[''] after:absolute after:top-[4px] after:right-[18px] after:bg-zinc-500 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-600 peer-checked:after:bg-zinc-100"></div>
                      </label>
                    </div>

                    <AnimatePresence>
                      {customInstructionsEnabled && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 overflow-hidden"
                        >
                          <div>
                            <label className="block text-[9px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">1. User background profile characteristics</label>
                            <textarea
                              id="about_me_text_input"
                              rows={2.5}
                              value={aboutMe}
                              onChange={(e) => setAboutMe(e.target.value)}
                              placeholder="E.g. Frontend system software designer, specializing in fast performance architectures. Prefers clear layouts, modular scripts..."
                              className="w-full px-4 py-3 bg-zinc-950/85 border border-zinc-800 focus:border-cyan-500 text-xs text-zinc-105 rounded-2xl outline-none resize-none leading-relaxed"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">2. Desired model personality parameters</label>
                            <textarea
                              id="respond_way_text_input"
                              rows={2.5}
                              value={respondWay}
                              onChange={(e) => setRespondWay(e.target.value)}
                              placeholder="E.g. Address queries with strategic depth, avoid verbose introductions. Deliver code templates in functional TS with appropriate typing..."
                              className="w-full px-4 py-3 bg-zinc-950/85 border border-zinc-800 focus:border-cyan-500 text-xs text-zinc-105 rounded-2xl outline-none resize-none leading-relaxed"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Private Token Overrides */}
                  <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-850/80 space-y-3">
                    <div>
                      <h4 className="text-[10px] font-bold font-mono tracking-widest uppercase text-cyan-400 flex items-center gap-1.5">
                        <Key className="w-4 h-4" />
                        Custom Decrypt-At-Rest API Keys
                      </h4>
                      <p className="text-[10px] text-zinc-500 mt-1">Provide custom credentials to override global workspace usage limits securely.</p>
                    </div>

                    <div className="relative">
                      <input
                        id="ip_custom_api_key_modal"
                        type={apiKeyVisible ? "text" : "password"}
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        placeholder="Google Gemini credential token override (Optional)"
                        className="w-full pl-4 pr-12 py-3 bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono rounded-2xl outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setApiKeyVisible(!apiKeyVisible)}
                        className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {apiKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STYLINGS, AUDIOS AND ACCENTS OPTIONS */}
              {activeTab === "appearance" && (
                <motion.div
                  key="tab-appearance-dev"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-[9px] font-bold font-mono text-zinc-400 mb-2 uppercase tracking-widest">Interface Skin Environment</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => { setTheme("dark"); setIsDarkMode(true); }}
                        className={`flex flex-col items-center gap-2 p-4 text-xs font-semibold rounded-2xl border cursor-pointer transition-all ${theme === 'dark' ? 'bg-zinc-950 text-cyan-400 border-zinc-800 shadow-xl' : 'bg-transparent text-zinc-500 border-zinc-900'}`}
                      >
                        <Moon className="w-4.5 h-4.5 shrink-0" />
                        <span>Cosmic Dark</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTheme("light"); setIsDarkMode(false); }}
                        className={`flex flex-col items-center gap-2 p-4 text-xs font-semibold rounded-2xl border cursor-pointer transition-all ${theme === 'light' ? 'bg-zinc-955 text-cyan-405 border-zinc-800 shadow-xl' : 'bg-transparent text-zinc-500 border-zinc-900'}`}
                      >
                        <Sun className="w-4.5 h-4.5 shrink-0" />
                        <span>Solar Light</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme("system")}
                        className={`flex flex-col items-center gap-2 p-4 text-xs font-semibold rounded-2xl border cursor-pointer transition-all ${theme === 'system' ? 'bg-zinc-955 text-cyan-405 border-zinc-800 shadow-xl' : 'bg-transparent text-zinc-500 border-zinc-900'}`}
                      >
                        <Monitor className="w-4.5 h-4.5 shrink-0" />
                        <span>Core Sync</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="p-5 bg-zinc-950/30 rounded-2xl border border-zinc-850/80 space-y-4">
                      <div>
                        <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-400">Content Sizing Bounds</h4>
                        <p className="text-[10px] text-zinc-500 mt-1">Scale thread interfaces wider to render high resolution dashboards cleanly.</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setChatWidth("standard")}
                          className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-xl border transition-all ${chatWidth === 'standard' ? 'bg-cyan-950 border-cyan-800 text-cyan-400 shadow-md' : 'bg-zinc-950 border-zinc-900 text-zinc-500'}`}
                        >
                          Standard Max (3xl)
                        </button>
                        <button
                          type="button"
                          onClick={() => setChatWidth("full")}
                          className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-xl border transition-all ${chatWidth === 'full' ? 'bg-cyan-950 border-cyan-800 text-cyan-400 shadow-md' : 'bg-zinc-950 border-zinc-900 text-zinc-500'}`}
                        >
                          Widescreen Wide
                        </button>
                      </div>
                    </div>

                    <div className="p-5 bg-zinc-950/30 rounded-2xl border border-zinc-850/80 space-y-4">
                      <div>
                        <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-400">Typography Spacing font</h4>
                        <p className="text-[10px] text-zinc-550 mt-1">Magnify chat interface components font dimensions.</p>
                      </div>
                      <div className="flex gap-1.5">
                        {['sm', 'md', 'lg'].map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setFontSize(sz as any)}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-xl border transition-all ${fontSize === sz ? 'bg-cyan-950 border-cyan-800 text-cyan-400' : 'bg-zinc-950 border-zinc-900 text-zinc-500'}`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Speech synthesis synthesizer options */}
                  <div className="p-5 bg-zinc-950/40 border border-zinc-850/80 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div>
                        <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-350 flex items-center gap-2">
                          <Volume2 className="w-4.5 h-4.5 text-cyan-400 animate-pulse" />
                          Neural TTS Speech Output
                        </h4>
                        <p className="text-[10px] text-zinc-555 mt-1">Enable A-Nova synthetic voice feedback system during stream closures.</p>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input 
                          id="toggle_voice_output"
                          type="checkbox" 
                          checked={voiceEnabled} 
                          onChange={(e) => setVoiceEnabled(e.target.checked)} 
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-zinc-900 border border-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-zinc-300 after:content-[''] after:absolute after:top-[4px] after:right-[18px] after:bg-zinc-500 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-600 peer-checked:after:bg-zinc-100"></div>
                      </label>
                    </div>

                    {voiceEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[8px] font-bold font-mono text-zinc-500 mb-1.5 uppercase">Acoustic Audio Voice Model</label>
                          <select
                            id="voice_accent_selector"
                            value={voiceName}
                            onChange={(e) => setVoiceName(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-850 text-xs rounded-xl text-white outline-none"
                          >
                            <option value="Zephyr">Zephyr (Futuristic crisp synthesizer - Default)</option>
                            <option value="Aura">Aura (Harmonic deep bass)</option>
                            <option value="Solaris">Solaris (Brisk high tempo logical)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[8px] font-bold font-mono text-zinc-400 mb-1.5 uppercase">Speech speed level ({speechSpeed}x)</label>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={speechSpeed}
                            onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-3"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* DATA CONTROLS AND PURGINGS */}
              {activeTab === "data" && (
                <motion.div
                  key="tab-data-dev"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="p-5 rounded-2xl bg-zinc-950/50 border border-zinc-850/80 flex items-center justify-between gap-5 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-300">Disable Session History Databases</h4>
                      <p className="text-[10px] text-zinc-500 leading-relaxed mt-1.5">New thread requests won't index to persistent buckets. Wiped out entirely on browser sessions reload boundaries.</p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                      <input 
                        id="toggle_history_saving"
                        type="checkbox" 
                        checked={historyDisabled} 
                        onChange={(e) => setHistoryDisabled(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-zinc-900 border border-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-zinc-300 after:content-[''] after:absolute after:top-[4px] after:right-[18px] after:bg-zinc-500 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-650 peer-checked:after:bg-zinc-100"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Backup Export */}
                    <div className="p-5 rounded-2xl bg-zinc-950/30 border border-zinc-900 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-cyan-950/20 border border-cyan-800/30 text-cyan-400 rounded-xl shrink-0">
                          <Database className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">Platform Encrypt Backup</h4>
                          <p className="text-[10px] text-zinc-500 leading-relaxed">Save a backup containing all chat models preferences and database messages directly to your local file system.</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleExportData}
                        className="w-full py-3 px-4 bg-zinc-950/80 hover:bg-zinc-90 w border border-zinc-800 hover:border-zinc-700 transition duration-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 text-zinc-300 cursor-pointer"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>Export Backup Archive</span>
                      </button>
                    </div>

                    {/* Dangerous Purge settings */}
                    <div className="p-5 rounded-2xl bg-zinc-950/30 border border-zinc-905 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-955/20 border border-red-900/30 text-red-400 rounded-xl shrink-0">
                          <Trash className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">Danger Zone Purge</h4>
                          <p className="text-[10px] text-zinc-500 leading-relaxed">Execute hard database commands to clean up all conversation models and indexes completely.</p>
                        </div>
                      </div>

                      {confirmClear ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleClearAllHistory}
                            className="flex-1 py-3 px-4 bg-red-650 hover:bg-red-550 text-white text-[11px] font-bold rounded-xl cursor-pointer shadow-lg transition-colors"
                          >
                            Permanently Erase Everything
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmClear(false)}
                            className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmClear(true)}
                          className="w-full py-3 px-4 bg-red-950/30 hover:bg-red-900/30 border border-red-900/40 text-red-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <Trash className="w-4 h-4" />
                          <span>Clear Chat Database Indexes</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom active action segments */}
            <div className="pt-6 border-t border-zinc-850 bg-zinc-950/10 flex flex-col sm:flex-row items-center justify-end gap-3 mt-auto sticky -bottom-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 bg-zinc-950 hover:bg-zinc-90 w text-zinc-400 hover:text-zinc-200 border border-zinc-850 rounded-2xl text-xs font-semibold tracking-wide transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-650 uppercase tracking-widest text-white font-semibold text-xs rounded-2xl flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50 active:scale-[0.98] transition-all duration-300 shadow-[0_4px_15px_-4px_rgba(6,182,212,0.4)] cursor-pointer border border-white/5"
              >
                {saving ? (
                  <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 text-white" />
                    <span>Synchronize Platform</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
