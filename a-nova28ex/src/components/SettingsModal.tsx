import React, { useState, useEffect, useMemo, useRef } from "react";
import { resolveVoiceAndAudioParams } from "../voice/voiceResolver";
import { fetchGeminiTtsAudio } from "../voice/audioUtils";
import { 
  X, 
  ChevronLeft,
  ArrowLeft,
  Sliders, 
  Volume2, 
  Play,
  Square,
  User, 
  Check, 
  Save, 
  FileDown,
  Trash2,
  Monitor,
  Sun,
  Moon,
  Key,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  ChevronRight,
  Database,
  Camera,
  Mic,
  MapPin,
  Bell,
  LogOut,
  HardDrive,
  Info,
  Palette,
  Mail,
  MessageSquare,
  MessageCircle,
  Paperclip,
  Lock,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Command,
  FileText,
  Laptop,
  Smartphone,
  ExternalLink,
  Code,
  Zap,
  CheckCircle2,
  AlertCircle,
  VolumeX,
  Languages,
  Activity,
  Layers,
  File,
  Globe,
  CreditCard,
  Receipt,
  Calendar,
  Download,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Building2,
  ArrowRight,
  RotateCcw,
  Search,
  Image,
  Wand2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Settings, User as UserType, ChatSession } from "../types";
import UserAvatar from "./UserAvatar";
import ProfilePictureSection from "./ProfilePictureSection";
import AccountProfileTab from "./AccountProfileTab";
import SubscriptionTab from "./SubscriptionTab";
import AppearanceTab from "./AppearanceTab";
import StorageAndFilesTab from "./StorageAndFilesTab";

const FIXED_VOICE_PREVIEW_TEXT = "Hello, I’m your AI assistant. This is a preview of my voice.";

const VOICE_PROFILES = [
  {
    id: "Nova",
    name: "NOVA",
    isDefault: true,
    tagline: "Natural, warm & balanced modern AI assistant voice",
    description: "Primary neural engine designed for balanced, natural, everyday conversation.",
    accentGlow: "from-cyan-500/20 via-blue-500/20 to-indigo-500/20 text-cyan-400 border-cyan-500/30",
    iconType: "core",
  },
  {
    id: "Orbit",
    name: "ORBIT",
    isDefault: false,
    tagline: "Clear, confident & crisp modern AI delivery",
    description: "High-precision voice engine optimized for structured, articulate output.",
    accentGlow: "from-blue-500/20 via-sky-500/20 to-teal-500/20 text-sky-400 border-sky-500/30",
    iconType: "orbit",
  },
  {
    id: "Aura",
    name: "AURA",
    isDefault: false,
    tagline: "Smooth, soft & calm natural AI delivery",
    description: "Soothing audio stream tuned for relaxed, fluid information flow.",
    accentGlow: "from-purple-500/20 via-violet-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30",
    iconType: "aura",
  },
  {
    id: "Pulse",
    name: "PULSE",
    isDefault: false,
    tagline: "Energetic, expressive & dynamic lively AI delivery",
    description: "Dynamic frequency response with animated rhythm and natural prosody.",
    accentGlow: "from-emerald-500/20 via-amber-500/20 to-rose-500/20 text-emerald-400 border-emerald-500/30",
    iconType: "pulse",
  },
  {
    id: "Vector",
    name: "VECTOR",
    isDefault: false,
    tagline: "Deep, precise, controlled & technical AI delivery",
    description: "Articulate geometric voice model built for complex, technical explanations.",
    accentGlow: "from-indigo-500/20 via-slate-500/20 to-blue-500/20 text-indigo-400 border-indigo-500/30",
    iconType: "vector",
  },
];

const VOICE_LANGUAGES = [
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "hi-IN", label: "Hindi" },
  { value: "es-ES", label: "Spanish" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "pt-BR", label: "Portuguese" },
  { value: "ar-SA", label: "Arabic" },
  { value: "ja-JP", label: "Japanese" },
  { value: "ko-KR", label: "Korean" },
  { value: "zh-CN", label: "Chinese" },
];

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
  onUpdateSessions?: (updatedSessions: ChatSession[]) => void;
  onClearHistory: () => Promise<void>;
  onDeleteSession?: (id: string) => Promise<void>;
  onDeleteMultipleSessions?: (ids: string[]) => Promise<void>;
  defaultTab?: string;
  onLogout?: () => void | Promise<void>;
  onDeleteAccount?: () => Promise<void>;
}

export type TabCategory = 
  | "account" 
  | "subscription"
  | "appearance" 
  | "chat" 
  | "personalization"
  | "notifications" 
  | "voice" 
  | "privacy" 
  | "storage" 
  | "about";

// A-NOVA Official Subscription Plans
export const ANOVA_PRICING_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    priceFormatted: "₹49/month",
    period: "/month",
    emoji: "🟢",
    colorScheme: "emerald",
    bgBadge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    borderActive: "border-emerald-500/80 bg-emerald-500/10",
    buttonBg: "bg-emerald-600 hover:bg-emerald-500 text-white",
    features: [
      "Basic AI access",
      "Limited messages",
      "Standard response speed"
    ]
  },
  {
    id: "basic",
    name: "Basic",
    price: 99,
    priceFormatted: "₹99/month",
    period: "/month",
    emoji: "🔵",
    colorScheme: "sky",
    bgBadge: "bg-sky-500/10 text-sky-400 border-sky-500/30",
    borderActive: "border-sky-500/80 bg-sky-500/10",
    buttonBg: "bg-sky-600 hover:bg-sky-500 text-white",
    features: [
      "More messages",
      "Faster responses",
      "File uploads"
    ]
  },
  {
    id: "standard",
    name: "Standard",
    price: 199,
    priceFormatted: "₹199/month",
    period: "/month",
    emoji: "🟣",
    colorScheme: "purple",
    badgeLabel: "Recommended",
    bgBadge: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    borderActive: "border-purple-500/80 bg-purple-500/10",
    buttonBg: "bg-purple-600 hover:bg-purple-500 text-white",
    features: [
      "Advanced AI models",
      "Image generation",
      "Voice chat",
      "Priority responses"
    ]
  },
  {
    id: "premium",
    name: "Premium",
    price: 299,
    priceFormatted: "₹299/month",
    period: "/month",
    emoji: "🟠",
    colorScheme: "amber",
    badgeLabel: "Popular",
    bgBadge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    borderActive: "border-amber-500/80 bg-amber-500/10",
    buttonBg: "bg-amber-600 hover:bg-amber-500 text-white",
    features: [
      "Higher usage limits",
      "Faster performance",
      "Early access to new features"
    ]
  },
  {
    id: "pro",
    name: "Pro",
    price: 499,
    priceFormatted: "₹499/month",
    period: "/month",
    emoji: "🔴",
    colorScheme: "rose",
    badgeLabel: "Maximum Power",
    bgBadge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    borderActive: "border-rose-500/80 bg-rose-500/10",
    buttonBg: "bg-rose-600 hover:bg-rose-500 text-white",
    features: [
      "Everything included",
      "Highest usage limits",
      "Best AI models",
      "Maximum file upload limits",
      "Priority support"
    ]
  }
];

// Preset avatar options for quick selection
const AVATAR_PRESETS = [
  "A-NOVA", "Zephyr", "CyberBot", "Orbit", "NeonPixel", "Quantum", "Astro", "Echo"
];

// Helper toggle switch component optimized for touch & memoized
const ToggleSwitch = React.memo(({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) => (
  <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700/60 transition-all min-h-[52px]">
    <div className="pr-3 min-w-0 flex-1">
      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>
      {description && <p className="text-[9px] sm:text-[10.5px] font-normal text-zinc-500 dark:text-zinc-400 mt-0.5 leading-[1.35] break-words max-w-full">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-sky-500' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
));

function SettingsModalComponent({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  user,
  onUpdateProfile,
  sessions,
  onUpdateSessions,
  onClearHistory,
  onDeleteSession,
  defaultTab,
  onLogout,
  onDeleteAccount
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabCategory>("account");
  const [mobileView, setMobileView] = useState<"menu" | "content">("menu");

  // Sync incoming defaultTab when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultTab && !["home", "menu", "main", "settings", "general"].includes(defaultTab)) {
        if (defaultTab === "profile" || defaultTab === "account") {
          setActiveTab("account");
        } else if (["subscription", "plan", "billing", "pricing"].includes(defaultTab)) {
          setActiveTab("subscription");
        } else if (defaultTab === "ai" || defaultTab === "chat") {
          setActiveTab("chat");
        } else if (["personalization", "custom-instructions", "instructions", "personal"].includes(defaultTab)) {
          setActiveTab("personalization");
        } else if (defaultTab === "appearance") {
          setActiveTab("appearance");
        } else if (defaultTab === "data" || defaultTab === "privacy") {
          setActiveTab("privacy");
        } else if (["notifications", "voice", "storage", "about"].includes(defaultTab)) {
          setActiveTab(defaultTab as TabCategory);
        } else {
          setActiveTab("account");
        }
        setMobileView("content");
      } else {
        setMobileView("menu");
      }
    }
  }, [isOpen, defaultTab]);

  // --- LOCAL FORM STATES ---
  // Account / Profile
  const [username, setUsername] = useState(user?.username || "");
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || "");
  const [emailAddress, setEmailAddress] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [emailVerified, setEmailVerified] = useState(user?.emailVerified !== false);
  const [phoneVerified, setPhoneVerified] = useState(user?.phoneVerified !== false);
  const [avatarUrlInput, setAvatarUrlInput] = useState(user?.avatarUrl || "");
  const [avatarSeed, setAvatarSeed] = useState(user?.username || "A-NOVA");
  const [planStatus, setPlanStatus] = useState<string>(user?.planStatus || "none");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // --- SUBSCRIPTION & BILLING STATES ---
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    const status = user?.planStatus?.toLowerCase() || "";
    if (status.includes("pro")) return "pro";
    if (status.includes("premium")) return "premium";
    if (status.includes("starter")) return "starter";
    if (status.includes("basic")) return "basic";
    return "standard";
  });
  const [subStatus, setSubStatus] = useState<"active" | "inactive" | "cancelled">("active");
  const [autoRenew, setAutoRenew] = useState<boolean>(true);
  const [nextBillingDate, setNextBillingDate] = useState<string>("24 August 2026");

  // Payment Method States
  const [paymentMethod, setPaymentMethod] = useState<{ type: string; details: string; provider: string }>({
    type: "UPI",
    details: "alex.nova@okaxis",
    provider: "Google Pay"
  });
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedPayType, setSelectedPayType] = useState<"upi" | "card" | "netbanking">("upi");
  const [upiIdInput, setUpiIdInput] = useState<string>("alex.nova@okaxis");
  const [upiAppSelect, setUpiAppSelect] = useState<string>("Google Pay");
  const [cardNumberInput, setCardNumberInput] = useState<string>("");
  const [cardExpiryInput, setCardExpiryInput] = useState<string>("");
  const [cardCvvInput, setCardCvvInput] = useState<string>("");
  const [cardNameInput, setCardNameInput] = useState<string>("");
  const [cardTypeSelect, setCardTypeSelect] = useState<string>("Credit Card (Visa)");
  const [netBankSelect, setNetBankSelect] = useState<string>("HDFC Bank");

  // Subscription Modals
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [showPlanConfirmModal, setShowPlanConfirmModal] = useState<boolean>(false);
  const [planToConfirm, setPlanToConfirm] = useState<typeof ANOVA_PRICING_PLANS[0] | null>(null);

  // Billing History
  const [billingHistory, setBillingHistory] = useState([
    { id: "INV-2026-08912", date: "24 Jul 2026", planName: "Standard Plan", amountINR: 199, status: "Paid" },
    { id: "INV-2026-07421", date: "24 Jun 2026", planName: "Standard Plan", amountINR: 199, status: "Paid" },
    { id: "INV-2026-06103", date: "24 May 2026", planName: "Basic Plan", amountINR: 99, status: "Paid" },
  ]);

  // Sub-view Navigation (e.g. Account -> Change Password)
  const [activeSubPage, setActiveSubPage] = useState<"main" | "change-password">("main");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Password / Security
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Reset active sub-page whenever tab or modal changes
  useEffect(() => {
    if (isOpen) {
      setActiveSubPage("main");
    }
  }, [isOpen, activeTab]);

  // Sync profile fields when modal opens or user updates
  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || "");
      setDisplayName(user.displayName || user.username || "");
      setEmailAddress(user.email || "");
      setPhoneNumber(user.phone || (user as any).phoneNumber || "");
      setAvatarUrlInput(user.avatarUrl || "");
      setPlanStatus(user.planStatus || "none");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  }, [isOpen, user]);

  // Appearance
  const [theme, setTheme] = useState<'system' | 'dark' | 'light'>((settings.theme as any) || 'system');
  const [chatWidth, setChatWidth] = useState<'standard' | 'full'>((settings.chatWidth as any) || 'standard');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>((settings.fontSize as any) || 'md');
  const [messageDensity, setMessageDensity] = useState<'comfortable' | 'compact' | 'spacious'>((settings.messageDensity as any) || 'comfortable');
  const [accentColor, setAccentColor] = useState<'cyan' | 'purple' | 'emerald' | 'rose' | 'amber' | 'blue'>((settings.accentColor as any) || 'cyan');
  const [enableAnimations, setEnableAnimations] = useState(settings.enableAnimations !== false);

  useEffect(() => {
    if (isOpen) {
      if (settings.theme) setTheme(settings.theme as any);
      if (settings.chatWidth) setChatWidth(settings.chatWidth as any);
      if (settings.fontSize) setFontSize(settings.fontSize as any);
      if (settings.messageDensity) setMessageDensity(settings.messageDensity as any);
      if (settings.accentColor) setAccentColor(settings.accentColor as any);
      if (settings.defaultModel) setDefaultModel(settings.defaultModel);
      if (settings.responseStyle) setResponseStyle(settings.responseStyle as any);
      if (settings.webSearchEnabled !== undefined) setWebSearchEnabled(settings.webSearchEnabled);
      if (settings.imageGenEnabled !== undefined) setImageGenEnabled(settings.imageGenEnabled);
      setAboutMe(settings.aboutMe || "");
      setRespondWay(settings.respondWay || "");
      setPreferredLanguage(settings.preferredLanguage || settings.language || "English (US)");
      setResponseTone(settings.responseTone || "Friendly & Conversational");
      setWritingStyle(settings.writingStyle || "Detailed Step-by-Step");
      setCustomInstructionsEnabled(settings.customInstructionsEnabled !== false);
      setSystemPrompt(settings.systemPrompt || "You are A-NOVA, a warm, highly intelligent, and conversational AI companion.");
    }
  }, [isOpen, settings]);

  // Chat & AI Model preferences
  const [defaultModel, setDefaultModel] = useState(settings.defaultModel || "gemini-3.6-flash");
  const [responseStyle, setResponseStyle] = useState<'fast' | 'balanced' | 'quality'>(settings.responseStyle || 'balanced');
  const [webSearchEnabled, setWebSearchEnabled] = useState(settings.webSearchEnabled !== false);
  const [imageGenEnabled, setImageGenEnabled] = useState(settings.imageGenEnabled !== false);
  const [memoryEnabled, setMemoryEnabled] = useState(settings.memoryEnabled !== false);
  const [autoScroll, setAutoScroll] = useState(settings.autoScroll !== false);
  const [codeFormatting, setCodeFormatting] = useState(settings.codeFormatting !== false);
  const [markdownEnabled, setMarkdownEnabled] = useState(settings.markdownEnabled !== false);
  const [enterToSend, setEnterToSend] = useState(settings.enterToSend !== false);
  const [responseStreaming, setResponseStreaming] = useState(settings.responseStreaming !== false);
  const [historyDisabled, setHistoryDisabled] = useState(settings.historyDisabled === true);

  // Personalization & Custom Instructions
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt || "You are A-NOVA, a warm, highly intelligent, and conversational AI companion.");
  const [aboutMe, setAboutMe] = useState(settings.aboutMe || "");
  const [respondWay, setRespondWay] = useState(settings.respondWay || "");
  const [preferredLanguage, setPreferredLanguage] = useState(settings.preferredLanguage || settings.language || "English (US)");
  const [responseTone, setResponseTone] = useState(settings.responseTone || "Friendly & Conversational");
  const [writingStyle, setWritingStyle] = useState(settings.writingStyle || "Detailed Step-by-Step");
  const [customInstructionsEnabled, setCustomInstructionsEnabled] = useState(settings.customInstructionsEnabled !== false);

  // Voice & Audio
  const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled !== false);
  const [voiceName, setVoiceName] = useState(settings.voiceName || "Nova");
  const [speechSpeed, setSpeechSpeed] = useState<number>(settings.speechSpeed || 1.0);
  const [micSettingsEnabled, setMicSettingsEnabled] = useState(settings.micSettingsEnabled !== false);
  const [voiceLanguage, setVoiceLanguage] = useState(settings.voiceLanguage || "en-US");
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const activeUtteranceRef = useRef<{ id: string; utterance: SpeechSynthesisUtterance } | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopAllVoicePreviews = () => {
    if (previewAudioRef.current) {
      try {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      } catch (_) {}
      previewAudioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    if (activeUtteranceRef.current) {
      activeUtteranceRef.current.utterance.onend = null;
      activeUtteranceRef.current.utterance.onerror = null;
      activeUtteranceRef.current = null;
    }
    setPreviewingVoiceId(null);
  };

  // Stop voice preview when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      stopAllVoicePreviews();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopAllVoicePreviews();
    };
  }, []);

  const fallbackBrowserVoicePreview = (profile: typeof VOICE_PROFILES[number]) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    setPreviewingVoiceId(profile.id);

    const utterance = new SpeechSynthesisUtterance(FIXED_VOICE_PREVIEW_TEXT);
    const selectedLang = voiceLanguage || "en-US";
    utterance.lang = selectedLang;

    const speakNow = () => {
      const voices = window.speechSynthesis.getVoices();
      const resolved = resolveVoiceAndAudioParams(profile.id, selectedLang, voices);

      if (resolved.voice) {
        utterance.voice = resolved.voice;
      }
      utterance.pitch = resolved.pitch;
      utterance.rate = resolved.rate;

      const currentRef = { id: profile.id, utterance };
      activeUtteranceRef.current = currentRef;

      utterance.onend = () => {
        if (activeUtteranceRef.current === currentRef) {
          activeUtteranceRef.current = null;
          setPreviewingVoiceId(null);
        }
      };

      utterance.onerror = () => {
        if (activeUtteranceRef.current === currentRef) {
          activeUtteranceRef.current = null;
          setPreviewingVoiceId(null);
        }
      };

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        if (activeUtteranceRef.current === currentRef) {
          activeUtteranceRef.current = null;
          setPreviewingVoiceId(null);
        }
      }
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        speakNow();
      };
      setTimeout(speakNow, 100);
    } else {
      speakNow();
    }
  };

  const handleToggleVoicePreview = async (profile: typeof VOICE_PROFILES[number]) => {
    if (previewingVoiceId === profile.id) {
      stopAllVoicePreviews();
      return;
    }

    stopAllVoicePreviews();
    setPreviewingVoiceId(profile.id);

    // 1. Try Gemini TTS API server route (bypasses restricted Chrome Google speech services)
    try {
      const result = await fetchGeminiTtsAudio(FIXED_VOICE_PREVIEW_TEXT, profile.id);
      if (result && result.audioUrl) {
        const audio = new Audio(result.audioUrl);
        previewAudioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(result.audioUrl);
          previewAudioRef.current = null;
          setPreviewingVoiceId((curr) => (curr === profile.id ? null : curr));
        };

        audio.onerror = () => {
          URL.revokeObjectURL(result.audioUrl);
          previewAudioRef.current = null;
          fallbackBrowserVoicePreview(profile);
        };

        try {
          await audio.play();
          return;
        } catch (playErr) {
          console.warn("[SettingsModal] Autoplay blocked, falling back:", playErr);
        }
      }
    } catch (err) {
      console.warn("[SettingsModal] Gemini TTS preview error, falling back:", err);
    }

    fallbackBrowserVoicePreview(profile);
  };

  // Notifications
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(settings.browserNotificationsEnabled !== false);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(settings.soundEffectsEnabled !== false);
  const [productUpdates, setProductUpdates] = useState(settings.productUpdates !== false);
  const [securityAlerts, setSecurityAlerts] = useState(settings.securityAlerts !== false);

  // Privacy & API
  const [customApiKey, setCustomApiKey] = useState(settings.customApiKey || "");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(settings.twoFactorEnabled || false);

  // Validation & Strength Helpers
  const isValidEmail = !emailAddress || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress);
  const isValidUsername = username.trim().length > 0;

  // Password Requirements Checklist
  const passwordRequirements = useMemo(() => {
    return [
      { id: "length", label: "Minimum 8 characters", met: newPassword.length >= 8 },
      { id: "upper", label: "At least one uppercase letter (A-Z)", met: /[A-Z]/.test(newPassword) },
      { id: "lower", label: "At least one lowercase letter (a-z)", met: /[a-z]/.test(newPassword) },
      { id: "number", label: "At least one number (0-9)", met: /[0-9]/.test(newPassword) },
      { id: "special", label: "At least one special character (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(newPassword) },
    ];
  }, [newPassword]);

  const allPasswordRequirementsMet = useMemo(() => {
    return passwordRequirements.every(req => req.met);
  }, [passwordRequirements]);

  const pwStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: "", color: "", bg: "", percent: 0 };
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[a-z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    if (score <= 2) {
      return { score, label: "Weak", color: "text-rose-400", bg: "bg-rose-500", percent: 33 };
    } else if (score <= 4) {
      return { score, label: "Medium", color: "text-amber-400", bg: "bg-amber-500", percent: 66 };
    } else {
      return { score, label: "Strong", color: "text-emerald-400", bg: "bg-emerald-500", percent: 100 };
    }
  }, [newPassword]);

  const passwordsMatch = Boolean(newPassword && confirmNewPassword && newPassword === confirmNewPassword);
  const passwordMismatch = Boolean(confirmNewPassword && newPassword !== confirmNewPassword);

  // Password Update Execution
  const handlePasswordUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentPassword) {
      showErrorNotification("Please enter your current password.");
      return;
    }
    if (!allPasswordRequirementsMet) {
      showErrorNotification("Please meet all password validation requirements.");
      return;
    }
    if (!passwordsMatch) {
      showErrorNotification("New password and confirmation password do not match.");
      return;
    }

    setUpdatingPassword(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const finalAvatar = avatarUrlInput.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed || username || "A-NOVA")}`;
      await onUpdateProfile(
        username.trim(),
        finalAvatar,
        displayName.trim(),
        planStatus,
        newPassword,
        emailAddress.trim(),
        phoneNumber.trim(),
        emailVerified,
        phoneVerified
      );

      showSuccessNotification("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      // Automatically redirect back to Settings after a successful password change
      setTimeout(() => {
        setActiveSubPage("main");
      }, 1000);
    } catch (err: any) {
      console.error("Password change error:", err);
      showErrorNotification(err.message || "Failed to update password. Re-authentication may be required.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Unsaved Form Changes Tracking (explicit Save required for Custom Instructions / Password)
  const [showSavedToastModal, setShowSavedToastModal] = useState(false);
  const [showUnsavedGuardModal, setShowUnsavedGuardModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const triggerAutoSaveToast = () => {
    setShowSavedToastModal(true);
    setTimeout(() => setShowSavedToastModal(false), 2500);
  };

  const hasUnsavedFormChanges = useMemo(() => {
    const passwordFormActive = Boolean(currentPassword || newPassword || confirmNewPassword);
    return passwordFormActive;
  }, [currentPassword, newPassword, confirmNewPassword]);

  const handleResetChatSettings = async () => {
    setDefaultModel("gemini-3.6-flash");
    setResponseStyle("balanced");
    setWebSearchEnabled(true);
    setImageGenEnabled(true);
    setVoiceName("Zephyr");
    setHistoryDisabled(false);
    setAutoScroll(true);
    setCodeFormatting(true);
    setMarkdownEnabled(true);
    setEnterToSend(true);
    setResponseStreaming(true);

    await handleAutoSaveSetting({
      defaultModel: "gemini-3.6-flash",
      responseStyle: "balanced",
      webSearchEnabled: true,
      imageGenEnabled: true,
      voiceName: "Zephyr" as any,
      historyDisabled: false,
      autoScroll: true,
      codeFormatting: true,
      markdownEnabled: true,
      enterToSend: true,
      responseStreaming: true
    });

    triggerAutoSaveToast();
    showSuccessNotification("Chat & AI Model settings reset to defaults.");
  };

  const handleSavePersonalization = async () => {
    setSaving(true);
    try {
      await handleAutoSaveSetting({
        aboutMe,
        respondWay,
        preferredLanguage,
        responseTone,
        writingStyle,
        customInstructionsEnabled,
        systemPrompt
      }, { silent: true });
    } catch (err: any) {
      showErrorNotification(err?.message || "Failed to save personalization settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardPersonalization = () => {
    setAboutMe(settings.aboutMe || "");
    setRespondWay(settings.respondWay || "");
    setPreferredLanguage(settings.preferredLanguage || settings.language || "English (US)");
    setResponseTone(settings.responseTone || "Friendly & Conversational");
    setWritingStyle(settings.writingStyle || "Detailed Step-by-Step");
    setCustomInstructionsEnabled(settings.customInstructionsEnabled !== false);
    setSystemPrompt(settings.systemPrompt || "You are A-NOVA, a warm, highly intelligent, and conversational AI companion.");
  };

  const handleResetPersonalization = async () => {
    setAboutMe("");
    setRespondWay("");
    setPreferredLanguage("English (US)");
    setResponseTone("Friendly & Conversational");
    setWritingStyle("Detailed Step-by-Step");
    setCustomInstructionsEnabled(true);
    setSystemPrompt("You are A-NOVA, a warm, highly intelligent, and conversational AI companion.");

    await handleAutoSaveSetting({
      aboutMe: "",
      respondWay: "",
      preferredLanguage: "English (US)",
      responseTone: "Friendly & Conversational",
      writingStyle: "Detailed Step-by-Step",
      customInstructionsEnabled: true,
      systemPrompt: "You are A-NOVA, a warm, highly intelligent, and conversational AI companion."
    }, { silent: true });
  };

  // Immediate Auto-Save Handler for Simple Toggle & Select Settings
  const handleAutoSaveSetting = async (updates: Partial<Settings>, options?: { silent?: boolean }) => {
    const nextTheme = updates.theme ?? theme;
    const isDark =
      nextTheme === 'dark' ||
      (nextTheme === 'system'
        ? typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        : false);
    const updated: Settings = {
      ...settings,
      theme: nextTheme,
      isDarkMode: isDark,
      chatWidth: updates.chatWidth ?? chatWidth,
      fontSize: updates.fontSize ?? fontSize,
      messageDensity: updates.messageDensity ?? messageDensity,
      accentColor: updates.accentColor ?? accentColor,
      enableAnimations: updates.enableAnimations ?? enableAnimations,
      defaultModel: updates.defaultModel ?? defaultModel,
      systemPrompt: updates.systemPrompt ?? (settings.systemPrompt || "You are A-NOVA, a warm, highly intelligent, and conversational AI companion."),
      aboutMe: updates.aboutMe ?? (settings.aboutMe || ""),
      respondWay: updates.respondWay ?? (settings.respondWay || ""),
      preferredLanguage: updates.preferredLanguage ?? (settings.preferredLanguage || settings.language || "English (US)"),
      responseTone: updates.responseTone ?? (settings.responseTone || "Friendly & Conversational"),
      writingStyle: updates.writingStyle ?? (settings.writingStyle || "Detailed Step-by-Step"),
      voiceEnabled: updates.voiceEnabled ?? voiceEnabled,
      voiceName: (updates.voiceName as any) ?? voiceName,
      speechSpeed: updates.speechSpeed ?? speechSpeed,
      micSettingsEnabled: updates.micSettingsEnabled ?? micSettingsEnabled,
      voiceLanguage: updates.voiceLanguage ?? voiceLanguage,
      soundEffectsEnabled: updates.soundEffectsEnabled ?? soundEffectsEnabled,
      browserNotificationsEnabled: updates.browserNotificationsEnabled ?? browserNotificationsEnabled,
      productUpdates: updates.productUpdates ?? productUpdates,
      securityAlerts: updates.securityAlerts ?? securityAlerts,
      customApiKey: updates.customApiKey ?? customApiKey,
      twoFactorEnabled: updates.twoFactorEnabled ?? twoFactorEnabled,
      memoryEnabled: updates.memoryEnabled ?? memoryEnabled,
      customInstructionsEnabled: updates.customInstructionsEnabled ?? customInstructionsEnabled,
      autoScroll: updates.autoScroll ?? autoScroll,
      codeFormatting: updates.codeFormatting ?? codeFormatting,
      markdownEnabled: updates.markdownEnabled ?? markdownEnabled,
      enterToSend: updates.enterToSend ?? enterToSend,
      responseStreaming: updates.responseStreaming ?? responseStreaming,
      historyDisabled: updates.historyDisabled ?? historyDisabled,
      ...updates,
    };

    try {
      await onSaveSettings(updated);
      if (!options?.silent) {
        triggerAutoSaveToast();
      }
    } catch (err) {
      console.error("Auto-save error:", err);
    }
  };

  const handleAttemptNavigation = (navFn: () => void) => {
    if (hasUnsavedFormChanges) {
      setPendingNavigation(() => navFn);
      setShowUnsavedGuardModal(true);
    } else {
      navFn();
    }
  };

  // Status & Modal Dialogs
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Derived Statistics from sessions
  const chatStats = useMemo(() => {
    let totalMessages = 0;
    let totalFiles = 0;
    let totalBytes = 0;
    const uploadedFilesList: { id: string; name: string; size: number; sessionTitle: string; date: string }[] = [];

    sessions.forEach((sess) => {
      if (sess.messages) {
        totalMessages += sess.messages.length;
        sess.messages.forEach((msg) => {
          if (msg.attachedFiles) {
            totalFiles += msg.attachedFiles.length;
            msg.attachedFiles.forEach((file) => {
              totalBytes += file.size || 2048;
              uploadedFilesList.push({
                id: `${sess.id}_${file.name}_${Math.random()}`,
                name: file.name,
                size: file.size || 2048,
                sessionTitle: sess.title || "Chat Session",
                date: msg.timestamp || sess.updatedAt
              });
            });
          }
        });
      }
    });

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return {
      totalChats: sessions.length,
      totalMessages,
      totalFiles,
      totalBytes,
      formattedStorage: formatSize(totalBytes),
      uploadedFilesList
    };
  }, [sessions]);

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

  // --- SUBSCRIPTION HANDLERS ---
  const handleDownloadGSTInvoice = (inv: { id: string; date: string; planName: string; amountINR: number }) => {
    const cgstVal = (inv.amountINR * 0.09).toFixed(2);
    const sgstVal = (inv.amountINR * 0.09).toFixed(2);
    const baseVal = (inv.amountINR - parseFloat(cgstVal) - parseFloat(sgstVal)).toFixed(2);

    const docText = `===================================================================
                  A-NOVA AI TECHNOLOGIES PVT. LTD.
                TAX INVOICE / GST PAYMENT RECEIPT
===================================================================
Invoice Number   : ${inv.id}
Invoice Date     : ${inv.date}
GSTIN / UIN      : 27AAACA9876A1Z5
SAC Code         : 998313 (Information Technology Services)
State Code       : 27 (Maharashtra, India)
-------------------------------------------------------------------
BILL TO CUSTOMER:
Customer Name    : ${displayName || username || "Valued Customer"}
Email Address    : ${emailAddress || "customer@anova.ai"}
Phone Number     : ${phoneNumber || "+91 98765 43210"}
Payment Method   : ${paymentMethod.provider} (${paymentMethod.type})
Billing Address  : Mumbai, India
-------------------------------------------------------------------
ITEM & PLAN DETAILS:
Service Name     : A-NOVA ${inv.planName} Subscription
Billing Cycle    : Monthly Recurring
Unit Price       : ₹${baseVal}

TAX BREAKDOWN (GST 18%):
Base Amount      : ₹${baseVal}
CGST (9%)        : ₹${cgstVal}
SGST (9%)        : ₹${sgstVal}
-------------------------------------------------------------------
TOTAL AMOUNT PAID: ₹${inv.amountINR}.00
PAYMENT STATUS   : PAID IN FULL (SUCCESS)
-------------------------------------------------------------------
This is a computer generated invoice and requires no physical signature.
A-NOVA AI Technologies Pvt. Ltd. | Support: support@anova.ai
===================================================================`;

    const blob = new Blob([docText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ANOVA_GST_Invoice_${inv.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showSuccessNotification(`Downloaded GST Invoice (${inv.id})`);
  };

  const handleConfirmPlanSwitch = async () => {
    if (!planToConfirm) return;
    try {
      setSelectedPlanId(planToConfirm.id);
      const newStatusString = `${planToConfirm.name} Tier (${planToConfirm.priceFormatted})`;
      setPlanStatus(newStatusString);
      setSubStatus("active");
      
      // Update profile
      await onUpdateProfile(
        username.trim(),
        avatarUrlInput.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed || username || "A-NOVA")}`,
        displayName.trim(),
        newStatusString,
        undefined,
        emailAddress.trim(),
        phoneNumber.trim(),
        emailVerified,
        phoneVerified
      );

      // Add entry to billing history
      const newInvId = `INV-2026-0${Math.floor(1000 + Math.random() * 9000)}`;
      const todayFormatted = "24 Jul 2026";
      setBillingHistory(prev => [
        { id: newInvId, date: todayFormatted, planName: `${planToConfirm.name} Plan`, amountINR: planToConfirm.price, status: "Paid" },
        ...prev
      ]);

      setShowPlanConfirmModal(false);
      setPlanToConfirm(null);
      showSuccessNotification(`Upgraded to ${planToConfirm.name} Plan (${planToConfirm.priceFormatted}) successfully!`);
    } catch (err: any) {
      console.error(err);
      showErrorNotification("Failed to update subscription plan.");
    }
  };

  const handleSavePaymentMethod = () => {
    if (selectedPayType === "upi") {
      if (!upiIdInput.includes("@")) {
        showErrorNotification("Please enter a valid UPI ID (e.g. name@upi)");
        return;
      }
      setPaymentMethod({
        type: "UPI",
        details: upiIdInput.trim(),
        provider: upiAppSelect
      });
    } else if (selectedPayType === "card") {
      if (!cardNumberInput || cardNumberInput.length < 12) {
        showErrorNotification("Please enter a valid card number.");
        return;
      }
      const last4 = cardNumberInput.slice(-4);
      setPaymentMethod({
        type: cardTypeSelect.includes("Credit") ? "Credit Card" : "Debit Card",
        details: `•••• ${last4}`,
        provider: cardTypeSelect
      });
    } else if (selectedPayType === "netbanking") {
      setPaymentMethod({
        type: "Net Banking",
        details: netBankSelect,
        provider: netBankSelect
      });
    }
    setShowPaymentModal(false);
    showSuccessNotification("Payment method updated successfully!");
  };

  const handleConfirmCancelSubscription = () => {
    setSubStatus("cancelled");
    setAutoRenew(false);
    const updatedStatus = `${planStatus} (Cancelled - Ends ${nextBillingDate})`;
    setPlanStatus(updatedStatus);
    setShowCancelModal(false);
    showSuccessNotification(`Subscription cancelled. Active until ${nextBillingDate}.`);
  };

  const handleReactivateSubscription = () => {
    setSubStatus("active");
    setAutoRenew(true);
    const currentPlanObj = ANOVA_PRICING_PLANS.find(p => p.id === selectedPlanId) || ANOVA_PRICING_PLANS[2];
    const activeStatus = `${currentPlanObj.name} Tier (${currentPlanObj.priceFormatted})`;
    setPlanStatus(activeStatus);
    showSuccessNotification(`Subscription reactivated successfully! Renewal set for ${nextBillingDate}.`);
  };

  const handleExportData = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        userProfile: {
          username,
          displayName,
          email: emailAddress,
          createdAt: user?.createdAt,
          provider: user?.provider || "Supabase Auth"
        },
        settings: {
          defaultModel,
          systemPrompt,
          aboutMe,
          respondWay,
          voiceEnabled,
          voiceName,
          theme,
          fontSize,
          messageDensity,
          accentColor,
          enableAnimations,
          chatWidth,
          autoScroll,
          codeFormatting,
          markdownEnabled,
          enterToSend,
          responseStreaming,
          soundEffectsEnabled,
          browserNotificationsEnabled,
          speechSpeed,
          voiceLanguage,
          historyDisabled,
          twoFactorEnabled,
          customApiKey
        },
        chatHistory: sessions
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = `anova_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(blobUrl);

      showSuccessNotification("Backup exported successfully!");
    } catch (err) {
      console.error("Export failed:", err);
      showErrorNotification("Backup export failed.");
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await onClearHistory();
      setConfirmClearHistory(false);
      showSuccessNotification("All chat history permanently deleted.");
    } catch (error) {
      console.error(error);
      showErrorNotification("Failed to delete chat history.");
    }
  };

  const handleDeleteAccountAction = async () => {
    try {
      if (onDeleteAccount) {
        await onDeleteAccount();
      } else if (onLogout) {
        await onClearHistory();
        await onLogout();
      }
      onClose();
    } catch (err: any) {
      showErrorNotification(err.message || "Failed to delete account.");
    }
  };

  const handleSaveExplicitForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    if (newPassword || currentPassword || confirmNewPassword) {
      if (!currentPassword) {
        showErrorNotification("Current password is required to change password.");
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

      const isDark =
        theme === "dark" ||
        (theme === "system"
          ? typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
          : false);

      await onSaveSettings({
        defaultModel,
        systemPrompt,
        aboutMe,
        respondWay,
        voiceEnabled,
        voiceName: voiceName as any,
        isDarkMode: isDark,
        language: settings.language || "en-US",
        timezone: settings.timezone || "America/New_York",
        theme,
        chatWidth,
        fontSize,
        messageDensity,
        accentColor,
        enableAnimations,
        memoryEnabled,
        customInstructionsEnabled,
        autoScroll,
        codeFormatting,
        markdownEnabled,
        enterToSend,
        responseStreaming,
        speechSpeed,
        micSettingsEnabled,
        voiceLanguage,
        customApiKey,
        historyDisabled,
        twoFactorEnabled,
        soundEffectsEnabled,
        browserNotificationsEnabled,
        productUpdates,
        securityAlerts
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      if (activeTab !== "personalization") {
        triggerAutoSaveToast();
        showSuccessNotification("Changes saved successfully.");
      }
      if (activeSubPage === "change-password") {
        setActiveSubPage("main");
      }
    } catch (err: any) {
      console.error(err);
      showErrorNotification(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = handleSaveExplicitForm;

  if (!isOpen) return null;

  const NAV_ITEMS: { id: TabCategory; label: string; icon: any; badge?: string }[] = [
    { id: "account", label: "Account & Profile", icon: User },
    { id: "subscription", label: "Subscription / Plan", icon: CreditCard },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "chat", label: "Chat & AI Model", icon: MessageSquare },
    { id: "personalization", label: "Personalization & Custom Instructions", icon: FileText },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "voice", label: "Voice & Audio", icon: Volume2 },
    { id: "privacy", label: "Privacy & Security", icon: ShieldCheck },
    { id: "storage", label: "Storage & Files", icon: HardDrive, badge: chatStats.formattedStorage },
    { id: "about", label: "About & Support", icon: Info }
  ];

  return (
    <div id="settings_modal_wrapper" className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 lg:p-6 overflow-hidden select-none touch-action-manipulation">
      {/* Crisp translucent backdrop - avoids expensive full-screen real-time backdrop-blur on mobile GPUs */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose} 
        className="absolute inset-0 bg-black/80 transition-opacity cursor-pointer" 
      />

      <motion.div
        id="settings_modal_body"
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-full h-[100dvh] max-w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl sm:h-auto sm:max-h-[88vh] bg-white dark:bg-zinc-950 border-0 sm:border border-zinc-200 dark:border-zinc-800/90 rounded-none sm:rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden font-sans text-zinc-900 dark:text-zinc-100 transform-gpu will-change-transform"
      >
        <AnimatePresence mode="wait" initial={false}>
          {mobileView === "menu" ? (
            /* UNIFIED SETTINGS INDEX PAGE (All Devices: Mobile, Tablet, Desktop) */
            <motion.div
              key="settings-menu-index"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col h-full h-[100dvh] sm:h-auto w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white overflow-hidden"
            >
          {/* Fixed Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 border-b border-zinc-200 dark:border-zinc-800/80 sticky top-0 bg-white dark:bg-zinc-950 z-30 pt-[max(14px,env(safe-area-inset-top))]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-sm">
                <Sliders className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              </div>
              <h2 className="font-bold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-white">Settings</h2>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close Settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Settings List */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6 max-w-3xl sm:max-w-4xl mx-auto w-full">

            {/* GROUP 1: ACCOUNT & PLAN */}
            <div className="space-y-1.5">
              <p className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">Account & Plan</p>
              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 divide-y divide-zinc-200 dark:divide-zinc-800/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setActiveTab("account"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                      <User className="w-4.5 h-4.5 text-sky-500 dark:text-sky-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Account & Profile</p>
                      <p className="text-[12.5px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 leading-[1.35] truncate max-w-full">Name, email, avatar & password</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("subscription"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4.5 h-4.5 text-purple-500 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Subscription / Plan</p>
                      <p className="text-[12.5px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 leading-[1.35] truncate max-w-full">Manage plan, usage & billing</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                </button>
              </div>
            </div>

            {/* GROUP 2: PREFERENCES & AI */}
            <div className="space-y-1.5">
              <p className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">Preferences & AI</p>
              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 divide-y divide-zinc-200 dark:divide-zinc-800/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setActiveTab("appearance"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Palette className="w-4.5 h-4.5 text-amber-500 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Appearance</p>
                      <p className="text-[12.5px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 leading-[1.35] truncate max-w-full">Theme ({theme}), accent color, density</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("chat"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Chat & AI Model</p>
                      <p className="text-[12.5px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 leading-[1.35] truncate max-w-full">Model: {defaultModel.replace('gemini-', '')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("personalization"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <FileText className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Personalization & Custom Instructions</p>
                      <p className="text-[12.5px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 leading-[1.35] truncate max-w-full">About me & response style preferences</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("voice"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                      <Volume2 className="w-4.5 h-4.5 text-rose-500 dark:text-rose-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Voice & Audio</p>
                      <p className="text-[12.5px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 leading-[1.35] truncate max-w-full">AI Voice: {voiceName || "Nova"} • {VOICE_LANGUAGES.find(l => l.value === voiceLanguage)?.label || "English (United States)"}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                </button>
              </div>
            </div>

            {/* GROUP 3: NOTIFICATIONS & PRIVACY */}
            <div className="space-y-1.5">
              <p className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">Notifications & Privacy</p>
              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 divide-y divide-zinc-200 dark:divide-zinc-800/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setActiveTab("notifications"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                      <Bell className="w-4.5 h-4.5 text-yellow-500 dark:text-yellow-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Notifications</p>
                      <p className="text-[12.5px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 leading-[1.35] truncate max-w-full">Alerts, sound effects, security</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("privacy"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4.5 h-4.5 text-cyan-500 dark:text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Privacy & Security</p>
                      <p className="text-[12.5px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 leading-[1.35] truncate max-w-full">API keys, active sessions, 2FA</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                </button>


              </div>
            </div>

            {/* GROUP 4: APP & SUPPORT */}
            <div className="space-y-1.5">
              <p className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">App & Support</p>
              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 divide-y divide-zinc-200 dark:divide-zinc-800/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setActiveTab("storage"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                      <HardDrive className="w-4.5 h-4.5 text-teal-500 dark:text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">Storage & Cache</p>
                      <p className="text-[12.5px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 leading-[1.35] truncate max-w-full">Usage: {chatStats.formattedStorage}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("about"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700/60 flex items-center justify-center shrink-0">
                      <Info className="w-4.5 h-4.5 text-zinc-700 dark:text-zinc-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white">About, Help & Feedback</p>
                      <p className="text-[12.5px] sm:text-xs font-normal text-zinc-500 dark:text-zinc-400 leading-[1.35] truncate max-w-full">v2.5.0 • Support, shortcuts & feedback</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                </button>
              </div>
            </div>

            {/* Log Out Button at bottom */}
            {onLogout && (
              <div className="pt-2 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs sm:text-sm font-bold cursor-pointer transition-all active:scale-[0.98] min-h-[48px]"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
          </motion.div>
          ) : (
            /* UNIFIED DEDICATED CATEGORY PAGE (All Devices: Mobile, Tablet, Desktop) */
            <motion.div
              key={`settings-content-${activeTab}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col min-w-0 w-full h-full h-[100dvh] sm:h-auto bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white overflow-hidden"
            >
          
          {/* Section Header */}
          <div className="px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-white dark:bg-zinc-950 sticky top-0 z-30 shrink-0 pt-[max(14px,env(safe-area-inset-top))]">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  handleAttemptNavigation(() => {
                    if (activeSubPage !== "main") {
                      setActiveSubPage("main");
                    } else {
                      setMobileView("menu");
                    }
                  });
                }}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer transition-colors shrink-0 active:scale-95 text-xs sm:text-sm font-semibold min-h-[40px]"
                aria-label="Back to Settings menu"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-700 dark:text-zinc-200" />
                <span>Settings</span>
              </button>

              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base md:text-lg tracking-tight text-zinc-900 dark:text-white flex items-center gap-2 truncate">
                  {activeSubPage === "change-password" 
                    ? "Change Password" 
                    : NAV_ITEMS.find(n => n.id === activeTab)?.label}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasUnsavedFormChanges && activeTab !== "personalization" && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDiscardPersonalization}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-semibold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Discard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveExplicitForm()}
                    disabled={saving}
                    className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
                  >
                    {saving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <button 
                type="button"
                onClick={() => handleAttemptNavigation(onClose)} 
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Close Settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form Content Scrollable Dashboard */}
          <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 w-full max-w-3xl sm:max-w-4xl mx-auto overflow-x-hidden">
            
            {/* Feedback Notifications */}
            <AnimatePresence>
              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2.5 font-medium"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2.5 font-medium"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {/* TAB 1: ACCOUNT & PROFILE */}
              {activeTab === "account" && (
                <AccountProfileTab
                  user={user}
                  onUpdateProfile={onUpdateProfile}
                  sessions={sessions}
                  settings={settings}
                  onSaveSettings={onSaveSettings}
                  onLogout={onLogout}
                  onDeleteAccount={onDeleteAccount}
                  showSuccess={showSuccessNotification}
                  showError={showErrorNotification}
                />
              )}

              {/* TAB 2: SUBSCRIPTION / PLAN */}
              {activeTab === "subscription" && (
                <SubscriptionTab
                  user={user}
                  onUpdateProfile={onUpdateProfile}
                  sessions={sessions}
                  settings={settings}
                  showSuccess={showSuccessNotification}
                  showError={showErrorNotification}
                />
              )}

              {/* TAB 3: APPEARANCE */}
              {activeTab === "appearance" && (
                <AppearanceTab
                  settings={settings}
                  onSaveSettings={onSaveSettings}
                  showSuccess={showSuccessNotification}
                  showError={showErrorNotification}
                />
              )}

              {/* TAB 3: CHAT & AI MODEL */}
              {activeTab === "chat" && (
                <motion.div
                  key="tab-chat"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {/* Default AI Model */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">AI Model Selection</h4>
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">Select the primary model for chat queries and tasks</p>
                    <select
                      value={defaultModel}
                      onChange={(e) => {
                        setDefaultModel(e.target.value);
                        handleAutoSaveSetting({ defaultModel: e.target.value });
                      }}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500/80 text-xs text-zinc-900 dark:text-white rounded-xl outline-none cursor-pointer transition-colors"
                    >
                      <option value="gemini-3.6-flash">Gemini 3.6 Flash (Ultra fast response)</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep reasoning & code)</option>
                      <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Compact model)</option>
                    </select>
                  </div>

                  {/* Response Style */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">Response Style</h4>
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">Choose output speed and depth balance</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      {[
                        { id: 'fast', label: 'Fast', desc: 'Fastest response time, concise replies' },
                        { id: 'balanced', label: 'Balanced', desc: 'Optimal balance of depth and speed' },
                        { id: 'quality', label: 'Quality', desc: 'Deep reasoning, comprehensive answers' },
                      ].map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => {
                            setResponseStyle(style.id as any);
                            handleAutoSaveSetting({ responseStyle: style.id as any });
                          }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            responseStyle === style.id
                              ? 'bg-sky-500/10 border-sky-500/80 text-sky-600 dark:text-sky-400 font-semibold'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <p className="text-xs font-bold">{style.label}</p>
                          <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-0.5">{style.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Capabilities & Toggles */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Capabilities & Search</h4>
                    <div className="space-y-2.5">
                      <ToggleSwitch
                        checked={webSearchEnabled}
                        onChange={(val) => {
                          setWebSearchEnabled(val);
                          handleAutoSaveSetting({ webSearchEnabled: val });
                        }}
                        label="Web Search Grounding"
                        description="Ground AI responses with live web search results"
                      />
                      <ToggleSwitch
                        checked={imageGenEnabled}
                        onChange={(val) => {
                          setImageGenEnabled(val);
                          handleAutoSaveSetting({ imageGenEnabled: val });
                        }}
                        label="Image Generation"
                        description="Enable AI image generation capabilities"
                      />
                    </div>
                  </div>

                  {/* Chat Option Toggles */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Conversation Preferences</h4>
                    
                    <div className="space-y-2.5">
                      <ToggleSwitch
                        checked={!historyDisabled}
                        onChange={(val) => {
                          setHistoryDisabled(!val);
                          handleAutoSaveSetting({ historyDisabled: !val });
                        }}
                        label="Save Chat History"
                        description="Store conversation sessions in history sidebar"
                      />
                      <ToggleSwitch
                        checked={autoScroll}
                        onChange={(val) => {
                          setAutoScroll(val);
                          handleAutoSaveSetting({ autoScroll: val });
                        }}
                        label="Auto-Scroll on Response"
                        description="Automatically scroll workspace down when AI responds"
                      />
                      <ToggleSwitch
                        checked={codeFormatting}
                        onChange={(val) => {
                          setCodeFormatting(val);
                          handleAutoSaveSetting({ codeFormatting: val });
                        }}
                        label="Code Syntax Highlighting"
                        description="Format code blocks with copy button and highlighting"
                      />
                      <ToggleSwitch
                        checked={markdownEnabled}
                        onChange={(val) => {
                          setMarkdownEnabled(val);
                          handleAutoSaveSetting({ markdownEnabled: val });
                        }}
                        label="Rich Markdown Formatting"
                        description="Render bold text, lists, and formatting in chat"
                      />
                      <ToggleSwitch
                        checked={enterToSend}
                        onChange={(val) => {
                          setEnterToSend(val);
                          handleAutoSaveSetting({ enterToSend: val });
                        }}
                        label="Press Enter to Send Message"
                        description="Use Shift+Enter for new lines, Enter to submit"
                      />
                      <ToggleSwitch
                        checked={responseStreaming}
                        onChange={(val) => {
                          setResponseStreaming(val);
                          handleAutoSaveSetting({ responseStreaming: val });
                        }}
                        label="Response Streaming"
                        description="Stream output in real-time as generated"
                      />
                    </div>
                  </div>

                  {/* Custom API Keys */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">Custom Gemini API Key</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setApiKeyVisible(!apiKeyVisible)}
                        className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-medium transition-colors cursor-pointer"
                      >
                        {apiKeyVisible ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">Optional custom key override for higher request limits</p>
                    <input
                      type={apiKeyVisible ? "text" : "password"}
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      onBlur={(e) => handleAutoSaveSetting({ customApiKey: e.target.value })}
                      placeholder="AIzaSy..."
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500/80 text-xs text-zinc-900 dark:text-white font-mono rounded-xl outline-none transition-colors"
                    />
                  </div>

                  {/* Reset to Defaults */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleResetChatSettings}
                      className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700 active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to Defaults</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* TAB 3b: PERSONALIZATION & CUSTOM INSTRUCTIONS */}
              {activeTab === "personalization" && (
                <motion.div
                  key="tab-personalization"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {/* Custom Instructions Enable Switch */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">Custom Instructions</h4>
                      <p className="text-[9px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">Personalize AI responses across all workspace conversations</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={customInstructionsEnabled}
                      onClick={() => {
                        const val = !customInstructionsEnabled;
                        setCustomInstructionsEnabled(val);
                        handleAutoSaveSetting({ customInstructionsEnabled: val }, { silent: true });
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        customInstructionsEnabled ? 'bg-sky-500' : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        customInstructionsEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* What should the AI know about me? */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                        What should the AI know about me?
                      </label>
                      {aboutMe !== (settings.aboutMe || "") && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setAboutMe(settings.aboutMe || "");
                            }}
                            className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-lg flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Discard</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAutoSaveSetting({ aboutMe }, { silent: true });
                            }}
                            className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">
                      Share background details, profession, stack, interests, or location
                    </p>
                    <textarea
                      rows={3}
                      value={aboutMe}
                      onChange={(e) => setAboutMe(e.target.value)}
                      placeholder="E.g., Senior software engineer working with React and Python. Located in San Francisco..."
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500/80 text-xs text-zinc-900 dark:text-white rounded-xl outline-none resize-none transition-colors"
                    />
                  </div>

                  {/* How should the AI respond? */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                        How should the AI respond?
                      </label>
                      {respondWay !== (settings.respondWay || "") && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setRespondWay(settings.respondWay || "");
                            }}
                            className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-lg flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Discard</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAutoSaveSetting({ respondWay }, { silent: true });
                            }}
                            className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">
                      Specify tone, formatting preferences, code rules, or response depth
                    </p>
                    <textarea
                      rows={3}
                      value={respondWay}
                      onChange={(e) => setRespondWay(e.target.value)}
                      placeholder="E.g., Be concise and direct. Provide working TypeScript code blocks without excessive explanations..."
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500/80 text-xs text-zinc-900 dark:text-white rounded-xl outline-none resize-none transition-colors"
                    />
                  </div>

                  {/* Preferred Language */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Languages className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">Preferred Language</h4>
                      </div>
                      {preferredLanguage !== (settings.preferredLanguage || settings.language || "English (US)") && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setPreferredLanguage(settings.preferredLanguage || settings.language || "English (US)");
                            }}
                            className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-lg flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Discard</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAutoSaveSetting({ preferredLanguage }, { silent: true });
                            }}
                            className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">Primary language for AI responses</p>
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500/80 text-xs text-zinc-900 dark:text-white rounded-xl outline-none cursor-pointer transition-colors"
                    >
                      <option value="English (US)">English (US)</option>
                      <option value="English (UK)">English (UK)</option>
                      <option value="Spanish">Spanish (Español)</option>
                      <option value="French">French (Français)</option>
                      <option value="German">German (Deutsch)</option>
                      <option value="Hindi">Hindi (हिन्दी)</option>
                      <option value="Japanese">Japanese (日本語)</option>
                      <option value="Chinese">Chinese (中文)</option>
                      <option value="Portuguese">Portuguese (Português)</option>
                      <option value="Auto-Detect">Auto-Detect (Match User Prompt)</option>
                    </select>
                  </div>

                  {/* Response Tone */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">Response Tone</h4>
                      {responseTone !== (settings.responseTone || "Friendly & Conversational") && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setResponseTone(settings.responseTone || "Friendly & Conversational");
                            }}
                            className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-lg flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Discard</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAutoSaveSetting({ responseTone }, { silent: true });
                            }}
                            className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">Select default demeanor for output</p>
                    <select
                      value={responseTone}
                      onChange={(e) => setResponseTone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500/80 text-xs text-zinc-900 dark:text-white rounded-xl outline-none cursor-pointer transition-colors"
                    >
                      <option value="Friendly & Conversational">Friendly & Conversational</option>
                      <option value="Professional & Concise">Professional & Concise</option>
                      <option value="Direct & Technical">Direct & Technical</option>
                      <option value="Creative & Expressive">Creative & Expressive</option>
                      <option value="Academic & Formal">Academic & Formal</option>
                    </select>
                  </div>

                  {/* Writing Style */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">Writing Style</h4>
                      {writingStyle !== (settings.writingStyle || "Detailed Step-by-Step") && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setWritingStyle(settings.writingStyle || "Detailed Step-by-Step");
                            }}
                            className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-lg flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Discard</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAutoSaveSetting({ writingStyle }, { silent: true });
                            }}
                            className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">Select structural format for answers</p>
                    <select
                      value={writingStyle}
                      onChange={(e) => setWritingStyle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500/80 text-xs text-zinc-900 dark:text-white rounded-xl outline-none cursor-pointer transition-colors"
                    >
                      <option value="Detailed Step-by-Step">Detailed Step-by-Step</option>
                      <option value="Bullet Points & Summary">Bullet Points & Summary</option>
                      <option value="Compact & Code-First">Compact & Code-First</option>
                      <option value="Explanatory & Educational">Explanatory & Educational</option>
                    </select>
                  </div>

                  {/* System Persona Prompt */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">System Persona Prompt</h4>
                      {systemPrompt !== (settings.systemPrompt || "You are A-NOVA, a warm, highly intelligent, and conversational AI companion.") && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSystemPrompt(settings.systemPrompt || "You are A-NOVA, a warm, highly intelligent, and conversational AI companion.");
                            }}
                            className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-lg flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Discard</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAutoSaveSetting({ systemPrompt }, { silent: true });
                            }}
                            className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500/80 text-xs text-zinc-900 dark:text-white rounded-xl outline-none resize-none leading-relaxed transition-colors"
                    />
                  </div>

                  {/* Reset to Defaults */}
                  <div className="pt-3 flex items-center justify-start border-t border-zinc-200/80 dark:border-zinc-800/80">
                    <button
                      type="button"
                      onClick={handleResetPersonalization}
                      className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700 active:scale-95 min-h-[40px]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to Defaults</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: NOTIFICATIONS */}
              {activeTab === "notifications" && (
                <motion.div
                  key="tab-notifications"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Notification Preferences</h4>
                    
                    <div className="space-y-2.5">
                      <ToggleSwitch
                        checked={browserNotificationsEnabled}
                        onChange={(val) => {
                          setBrowserNotificationsEnabled(val);
                          handleAutoSaveSetting({ browserNotificationsEnabled: val });
                          if (val && typeof window !== "undefined" && "Notification" in window) {
                            Notification.requestPermission();
                          }
                        }}
                        label="Browser Notifications"
                        description="Alerts when long response finishes in background"
                      />

                      <ToggleSwitch
                        checked={soundEffectsEnabled}
                        onChange={(val) => {
                          setSoundEffectsEnabled(val);
                          handleAutoSaveSetting({ soundEffectsEnabled: val });
                        }}
                        label="Audio Sound Effects"
                        description="Play subtle chime when sending or receiving messages"
                      />

                      <ToggleSwitch
                        checked={productUpdates}
                        onChange={(val) => {
                          setProductUpdates(val);
                          handleAutoSaveSetting({ productUpdates: val });
                        }}
                        label="Product Updates"
                        description="Information about new features and model updates"
                      />

                      <ToggleSwitch
                        checked={securityAlerts}
                        onChange={(val) => {
                          setSecurityAlerts(val);
                          handleAutoSaveSetting({ securityAlerts: val });
                        }}
                        label="Security Alerts"
                        description="Alerts for unusual account or login activity"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 5: VOICE & AUDIO */}
              {activeTab === "voice" && (
                <motion.div
                  key="tab-voice"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {/* SETTING 1: AI VOICE & PERSONALITY */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">AI Voice Engine & Delivery</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Select your preferred AI audio engine and synthesis profile.</p>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {VOICE_PROFILES.map((profile) => {
                        const isSelected = (voiceName || "Nova") === profile.id;
                        const isPreviewing = previewingVoiceId === profile.id;

                        return (
                          <div
                            key={profile.id}
                            onClick={() => {
                              setVoiceName(profile.id);
                              handleAutoSaveSetting({ voiceName: profile.id as any });
                            }}
                            className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-purple-500/10 dark:bg-purple-950/40 border-purple-500/60 dark:border-purple-500/50 shadow-xs ring-1 ring-purple-500/20"
                                : "bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0 pr-2">
                              {/* Abstract AI Avatar Symbol */}
                              <div className={`relative shrink-0 w-10 h-10 rounded-xl border bg-gradient-to-br ${profile.accentGlow} flex items-center justify-center shadow-xs transition-transform group-hover:scale-105`}>
                                {profile.iconType === "core" && (
                                  <Sparkles className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                                )}
                                {profile.iconType === "orbit" && (
                                  <Zap className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                                )}
                                {profile.iconType === "aura" && (
                                  <Volume2 className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                                )}
                                {profile.iconType === "pulse" && (
                                  <Sliders className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                )}
                                {profile.iconType === "vector" && (
                                  <Code className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                                )}
                              </div>

                              {/* AI Voice Details */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white tracking-wide uppercase">
                                    {profile.name}
                                  </span>
                                  {profile.isDefault && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                      Default
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                      <Check className="w-2.5 h-2.5" /> Selected
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11.5px] sm:text-xs text-zinc-600 dark:text-zinc-300 font-medium mt-0.5">
                                  {profile.tagline}
                                </p>
                                <p className="text-[10.5px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                                  {profile.description}
                                </p>
                              </div>
                            </div>

                            {/* Play Preview Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleVoicePreview(profile);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-semibold text-xs transition-all shrink-0 ml-2 ${
                                isPreviewing
                                  ? "bg-purple-600 text-white border-purple-500 shadow-md ring-2 ring-purple-500/30"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700/80"
                              }`}
                              title={isPreviewing ? "Stop preview" : `Play preview for ${profile.name}`}
                            >
                              {isPreviewing ? (
                                <>
                                  <Square className="w-3 h-3 fill-current animate-pulse" />
                                  <span className="text-[11px]">Playing...</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 fill-current" />
                                  <span className="text-[11px]">Play</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SETTING 2: AI VOICE LANGUAGE */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">AI Voice Language</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Choose the language used when the AI speaks its responses.</p>
                    </div>

                    <div className="pt-1">
                      <select
                        value={voiceLanguage}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVoiceLanguage(val);
                          handleAutoSaveSetting({ voiceLanguage: val });
                        }}
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none cursor-pointer transition-colors"
                      >
                        {VOICE_LANGUAGES.map((lang) => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 6: PRIVACY & SECURITY */}
              {activeTab === "privacy" && (
                <motion.div
                  key="tab-privacy"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {/* 1. PASSWORD & AUTHENTICATION */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">Password & Authentication</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (user?.email) {
                            showSuccessNotification(`Password recovery email dispatched to ${user.email}`);
                          } else {
                            showErrorNotification("No email address found for password recovery.");
                          }
                        }}
                        className="text-xs text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 font-medium underline cursor-pointer"
                      >
                        Send Reset Link
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Current Password</label>
                        <div className="relative">
                          <input
                            type={showCurrentPw ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full h-9 pl-3 pr-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none focus:border-sky-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800 dark:hover:text-white"
                          >
                            {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">New Password</label>
                          <div className="relative">
                            <input
                              type={showNewPw ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="••••••••••••"
                              className="w-full h-9 pl-3 pr-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none focus:border-sky-500 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPw(!showNewPw)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800 dark:hover:text-white"
                            >
                              {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Confirm New Password</label>
                          <div className="relative">
                            <input
                              type={showConfirmPw ? "text" : "password"}
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                              placeholder="••••••••••••"
                              className="w-full h-9 pl-3 pr-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none focus:border-sky-500 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPw(!showConfirmPw)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800 dark:hover:text-white"
                            >
                              {showConfirmPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {newPassword && (
                        <div className="p-3 bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Strength: <span className={pwStrength.color}>{pwStrength.label}</span></span>
                            <span className="text-[10px] text-zinc-500 font-mono">{pwStrength.percent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-950 rounded-full overflow-hidden">
                            <div className={`h-full ${pwStrength.bg} transition-all duration-300`} style={{ width: `${pwStrength.percent}%` }} />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handlePasswordUpdate}
                          disabled={updatingPassword || !newPassword}
                          className="px-4 h-8 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-zinc-950 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          {updatingPassword ? "Updating..." : "Update Password"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. TWO-FACTOR AUTHENTICATION & RECOVERY CODES */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">Two-Factor Authentication (2FA)</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorEnabled(!twoFactorEnabled);
                          showSuccessNotification(`Two-Factor Authentication ${!twoFactorEnabled ? "enabled" : "disabled"}.`);
                        }}
                        className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${
                          twoFactorEnabled ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${
                            twoFactorEnabled ? "translate-x-4.5 bg-white dark:bg-zinc-950" : "translate-x-0 bg-zinc-400"
                          }`}
                        />
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      Protect your account with an extra verification layer. Select your preferred two-factor authentication method below.
                    </p>

                    <div className="space-y-3 pt-1">
                      {/* Method 1: Authenticator App */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
                            <QrCode className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-zinc-900 dark:text-white">Authenticator App</p>
                              <span className="text-[9px] px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full font-bold uppercase tracking-wide">
                                Recommended
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">
                              Use an authenticator app to generate time-based verification codes (TOTP).
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                              {["Google Authenticator", "Microsoft Authenticator", "Authy", "1Password"].map((app) => (
                                <span key={app} className="text-[10px] px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 rounded-md font-medium">
                                  {app}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center sm:self-center shrink-0">
                          <span className="text-[10px] px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50 rounded-lg font-semibold uppercase tracking-wider">
                            Coming Soon
                          </span>
                        </div>
                      </div>

                      {/* Method 2: Email Verification (Email OTP) */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-500 dark:text-sky-400 shrink-0 mt-0.5 sm:mt-0">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-white">Email Verification (Email OTP)</p>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                              Receive a one-time security passcode sent directly to your registered email address during login.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center sm:self-center shrink-0">
                          <span className="text-[10px] px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50 rounded-lg font-semibold uppercase tracking-wider">
                            Coming Soon
                          </span>
                        </div>
                      </div>

                      {/* Method 3: SMS Verification (Mobile OTP) */}
                      <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-500 dark:text-purple-400 shrink-0 mt-0.5 sm:mt-0">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-900 dark:text-white">SMS Verification (Mobile OTP)</p>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                              Receive security authentication codes via SMS text message on your verified mobile phone number.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center sm:self-center shrink-0">
                          <span className="text-[10px] px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50 rounded-lg font-semibold uppercase tracking-wider">
                            Coming Soon
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 7: STORAGE & FILES */}
              {activeTab === "storage" && (
                <motion.div
                  key="tab-storage"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <StorageAndFilesTab 
                    sessions={sessions} 
                    onUpdateSessions={onUpdateSessions}
                    showSuccessNotification={showSuccessNotification}
                    showErrorNotification={showErrorNotification}
                    isDark={settings.isDarkMode}
                  />
                </motion.div>
              )}

              {/* TAB 8: ABOUT & SUPPORT */}
              {activeTab === "about" && (
                <motion.div
                  key="tab-about"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center mx-auto shadow-sm">
                      <Info className="w-5 h-5 text-zinc-800 dark:text-white" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">A-NOVA Workspace Platform</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Version 2.5.0</p>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                      Built with React, Express, Supabase Authentication, and Google Gemini Flash models.
                    </p>
                  </div>

                  {/* Help & Support Links */}
                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                      <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Help & Support</h4>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Need assistance with A-NOVA or have account questions? Access our documentation, guides, or contact support.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href="https://ai.google.dev/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Documentation</span>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                      </a>
                      <a
                        href="mailto:support@a-nova.ai"
                        className="px-3.5 py-2.5 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Contact Support</span>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                      </a>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Send Feedback</h4>
                    {feedbackSent ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl font-medium">
                        Thank you! Your feedback has been recorded.
                      </div>
                    ) : (
                      <>
                        <textarea
                          rows={3}
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Share your thoughts or suggest feature improvements..."
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500/80 text-xs text-zinc-900 dark:text-white rounded-xl outline-none resize-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (feedbackText.trim()) {
                              setFeedbackSent(true);
                              setTimeout(() => setFeedbackSent(false), 4000);
                              setFeedbackText("");
                            }
                          }}
                          className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors border border-zinc-200 dark:border-zinc-700/80"
                        >
                          Submit Feedback
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

          {/* AUTO-SAVE FLOATING TOAST INDICATOR */}
          <AnimatePresence>
            {showSavedToastModal && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3.5 py-2 bg-white/95 dark:bg-zinc-900/95 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-xl backdrop-blur-md text-xs font-semibold"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Settings Saved</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* UNSAVED FORM CHANGES CONFIRMATION DIALOG MODAL */}
          <AnimatePresence>
            {showUnsavedGuardModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 text-zinc-900 dark:text-white relative"
                >
                  <div className="flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Unsaved Changes</h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">You have unsaved changes in this form</p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    Would you like to save your changes before leaving this page?
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await handleSaveExplicitForm();
                        setShowUnsavedGuardModal(false);
                        if (pendingNavigation) pendingNavigation();
                      }}
                      className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDiscardPersonalization();
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmNewPassword("");
                        setShowUnsavedGuardModal(false);
                        if (pendingNavigation) pendingNavigation();
                      }}
                      className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs rounded-xl cursor-pointer"
                    >
                      Discard Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUnsavedGuardModal(false)}
                      className="w-full py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-medium text-xs rounded-xl cursor-pointer"
                    >
                      Continue Editing
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* SUBSCRIPTION MODALS & DIALOGS */}
          <AnimatePresence>
            {/* 1. PLAN CONFIRMATION MODAL */}
            {showPlanConfirmModal && planToConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowPlanConfirmModal(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-white"
                >
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                      </div>
                      <h3 className="font-bold text-base">Confirm Plan Change</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPlanConfirmModal(false)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{planToConfirm.emoji}</span>
                        <div>
                          <h4 className="font-bold text-lg">{planToConfirm.name} Plan</h4>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">Monthly Billing</span>
                        </div>
                      </div>
                      <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">{planToConfirm.priceFormatted}</span>
                    </div>

                    <div className="border-t border-zinc-200 dark:border-zinc-800/80 pt-3 space-y-1.5">
                      <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Features included:</p>
                      {planToConfirm.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                          <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300">
                    <span className="text-zinc-500 dark:text-zinc-400">Charging Payment Method:</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">{paymentMethod.provider} ({paymentMethod.details})</span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPlanConfirmModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmPlanSwitch}
                      className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer active:scale-95"
                    >
                      Confirm & Pay {planToConfirm.priceFormatted}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* 2. PAYMENT METHOD MANAGEMENT MODAL */}
            {showPaymentModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowPaymentModal(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="relative z-10 w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-white max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base">Payment Method (India)</h3>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Choose your preferred Indian payment option</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Payment Type Selector Tabs */}
                  <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setSelectedPayType("upi")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        selectedPayType === "upi"
                          ? "bg-sky-600 text-white shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      UPI (BHIM/GPay)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPayType("card")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        selectedPayType === "card"
                          ? "bg-sky-600 text-white shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      Debit / Credit Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPayType("netbanking")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        selectedPayType === "netbanking"
                          ? "bg-sky-600 text-white shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      Net Banking
                    </button>
                  </div>

                  {/* TAB 1: UPI */}
                  {selectedPayType === "upi" && (
                    <div className="space-y-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">UPI App / Provider</label>
                        <select
                          value={upiAppSelect}
                          onChange={(e) => setUpiAppSelect(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                        >
                          <option value="Google Pay">Google Pay (GPay)</option>
                          <option value="PhonePe">PhonePe</option>
                          <option value="Paytm">Paytm UPI</option>
                          <option value="BHIM UPI">BHIM UPI App</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Virtual Payment Address (UPI ID)</label>
                        <input
                          type="text"
                          value={upiIdInput}
                          onChange={(e) => setUpiIdInput(e.target.value)}
                          placeholder="e.g. mobile@upi or username@okaxis"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                        />
                        <p className="text-[10px] text-zinc-500">Fast 1-click autopay supported across all major Indian banks.</p>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CARD */}
                  {selectedPayType === "card" && (
                    <div className="space-y-3.5 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Card Network</label>
                        <select
                          value={cardTypeSelect}
                          onChange={(e) => setCardTypeSelect(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                        >
                          <option value="RuPay Debit Card">RuPay Debit Card</option>
                          <option value="Credit Card (Visa)">Visa Credit / Debit Card</option>
                          <option value="Credit Card (Mastercard)">Mastercard Credit / Debit</option>
                          <option value="American Express">American Express (Amex)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Card Number</label>
                        <input
                          type="text"
                          value={cardNumberInput}
                          onChange={(e) => setCardNumberInput(e.target.value)}
                          placeholder="4532 •••• •••• 8912"
                          maxLength={19}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Expiry Date</label>
                          <input
                            type="text"
                            value={cardExpiryInput}
                            onChange={(e) => setCardExpiryInput(e.target.value)}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">CVV / CVC</label>
                          <input
                            type="password"
                            value={cardCvvInput}
                            onChange={(e) => setCardCvvInput(e.target.value)}
                            placeholder="•••"
                            maxLength={4}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: NET BANKING */}
                  {selectedPayType === "netbanking" && (
                    <div className="space-y-3 pt-1">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Select Indian Bank</label>
                      <select
                        value={netBankSelect}
                        onChange={(e) => setNetBankSelect(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:border-sky-500"
                      >
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="State Bank of India">State Bank of India (SBI)</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                        <option value="Punjab National Bank">Punjab National Bank (PNB)</option>
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePaymentMethod}
                      className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md cursor-pointer active:scale-95"
                    >
                      Save Payment Method
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* 3. CANCEL SUBSCRIPTION CONFIRMATION MODAL */}
            {showCancelModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowCancelModal(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-zinc-900 dark:text-white">Cancel Subscription?</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Are you sure you want to cancel your recurring plan?</p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    Your subscription features will remain fully active until <strong className="text-zinc-900 dark:text-white">{nextBillingDate}</strong>. After this date, your plan will revert to Starter.
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold cursor-pointer"
                    >
                      Keep Subscription
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCancelSubscription}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer active:scale-95"
                    >
                      Confirm Cancel
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          </form>

            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default React.memo(SettingsModalComponent);
