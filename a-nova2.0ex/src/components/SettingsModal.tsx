import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  ChevronLeft,
  ArrowLeft,
  Sliders, 
  Volume2, 
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
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Settings, User as UserType, ChatSession } from "../types";
import UserAvatar from "./UserAvatar";
import ProfilePictureSection from "./ProfilePictureSection";

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
  onLogout?: () => void | Promise<void>;
  onDeleteAccount?: () => Promise<void>;
}

export type TabCategory = 
  | "account" 
  | "subscription"
  | "appearance" 
  | "chat" 
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
  const [planStatus, setPlanStatus] = useState<string>(user?.planStatus || "Standard Tier (₹199/mo)");
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
      setPlanStatus(user.planStatus || "Plus Tier");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  }, [isOpen, user]);

  // Appearance
  const [theme, setTheme] = useState<'system' | 'dark' | 'light'>(settings.theme || 'dark');
  const [chatWidth, setChatWidth] = useState<'standard' | 'full'>(settings.chatWidth || 'standard');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>(settings.fontSize || 'md');
  const [messageDensity, setMessageDensity] = useState<'comfortable' | 'compact' | 'spacious'>(settings.messageDensity || 'comfortable');
  const [accentColor, setAccentColor] = useState<'cyan' | 'purple' | 'emerald' | 'rose' | 'amber' | 'blue'>(settings.accentColor || 'cyan');
  const [enableAnimations, setEnableAnimations] = useState(settings.enableAnimations !== false);

  // Chat preferences
  const [defaultModel, setDefaultModel] = useState(settings.defaultModel || "gemini-3.6-flash");
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt || "You are A-NOVA, a warm, highly intelligent, and conversational AI companion.");
  const [aboutMe, setAboutMe] = useState(settings.aboutMe || "");
  const [respondWay, setRespondWay] = useState(settings.respondWay || "");
  const [memoryEnabled, setMemoryEnabled] = useState(settings.memoryEnabled !== false);
  const [customInstructionsEnabled, setCustomInstructionsEnabled] = useState(settings.customInstructionsEnabled !== false);
  const [autoScroll, setAutoScroll] = useState(settings.autoScroll !== false);
  const [codeFormatting, setCodeFormatting] = useState(settings.codeFormatting !== false);
  const [markdownEnabled, setMarkdownEnabled] = useState(settings.markdownEnabled !== false);
  const [enterToSend, setEnterToSend] = useState(settings.enterToSend !== false);
  const [responseStreaming, setResponseStreaming] = useState(settings.responseStreaming !== false);
  const [historyDisabled, setHistoryDisabled] = useState(settings.historyDisabled === true);

  // Voice & Audio
  const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled || false);
  const [voiceName, setVoiceName] = useState(settings.voiceName || "Zephyr");
  const [speechSpeed, setSpeechSpeed] = useState<number>(settings.speechSpeed || 1.0);
  const [micSettingsEnabled, setMicSettingsEnabled] = useState(settings.micSettingsEnabled !== false);
  const [voiceLanguage, setVoiceLanguage] = useState(settings.voiceLanguage || "en-US");

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

  // Unsaved Changes Tracking
  const isDirty = useMemo(() => {
    const initialUsername = user?.username || "";
    const initialDisplayName = user?.displayName || user?.username || "";
    const initialEmail = user?.email || "";
    const initialPhone = user?.phone || (user as any)?.phoneNumber || "";
    const initialAvatar = user?.avatarUrl || "";

    const profileChanged = 
      username !== initialUsername ||
      displayName !== initialDisplayName ||
      emailAddress !== initialEmail ||
      phoneNumber !== initialPhone ||
      avatarUrlInput !== initialAvatar;

    const settingsChanged = 
      theme !== (settings.theme || 'dark') ||
      accentColor !== (settings.accentColor || 'cyan') ||
      chatWidth !== (settings.chatWidth || 'standard') ||
      fontSize !== (settings.fontSize || 'md') ||
      messageDensity !== (settings.messageDensity || 'comfortable') ||
      enableAnimations !== (settings.enableAnimations !== false) ||
      defaultModel !== (settings.defaultModel || "gemini-3.6-flash") ||
      systemPrompt !== (settings.systemPrompt || "You are A-NOVA, a warm, highly intelligent, and conversational AI companion.") ||
      aboutMe !== (settings.aboutMe || "") ||
      respondWay !== (settings.respondWay || "") ||
      memoryEnabled !== (settings.memoryEnabled !== false) ||
      customInstructionsEnabled !== (settings.customInstructionsEnabled !== false) ||
      autoScroll !== (settings.autoScroll !== false) ||
      codeFormatting !== (settings.codeFormatting !== false) ||
      markdownEnabled !== (settings.markdownEnabled !== false) ||
      enterToSend !== (settings.enterToSend !== false) ||
      responseStreaming !== (settings.responseStreaming !== false) ||
      historyDisabled !== (settings.historyDisabled === true) ||
      voiceEnabled !== (settings.voiceEnabled || false) ||
      voiceName !== (settings.voiceName || "Zephyr") ||
      speechSpeed !== (settings.speechSpeed || 1.0) ||
      micSettingsEnabled !== (settings.micSettingsEnabled !== false) ||
      voiceLanguage !== (settings.voiceLanguage || "en-US") ||
      browserNotificationsEnabled !== (settings.browserNotificationsEnabled !== false) ||
      soundEffectsEnabled !== (settings.soundEffectsEnabled !== false) ||
      productUpdates !== (settings.productUpdates !== false) ||
      securityAlerts !== (settings.securityAlerts !== false) ||
      customApiKey !== (settings.customApiKey || "") ||
      twoFactorEnabled !== (settings.twoFactorEnabled || false);

    return profileChanged || settingsChanged;
  }, [
    user, username, displayName, emailAddress, phoneNumber, avatarUrlInput,
    theme, accentColor, chatWidth, fontSize, messageDensity, enableAnimations,
    defaultModel, systemPrompt, aboutMe, respondWay, memoryEnabled, customInstructionsEnabled,
    autoScroll, codeFormatting, markdownEnabled, enterToSend, responseStreaming, historyDisabled,
    voiceEnabled, voiceName, speechSpeed, micSettingsEnabled, voiceLanguage,
    browserNotificationsEnabled, soundEffectsEnabled, productUpdates, securityAlerts,
    customApiKey, twoFactorEnabled, settings
  ]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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

      await onSaveSettings({
        defaultModel,
        systemPrompt,
        aboutMe,
        respondWay,
        voiceEnabled,
        voiceName: voiceName as any,
        isDarkMode: theme === "dark" || (theme === "system" && settings.isDarkMode),
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

      showSuccessNotification("Settings saved successfully.");
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      console.error(err);
      showErrorNotification(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const NAV_ITEMS: { id: TabCategory; label: string; icon: any; badge?: string }[] = [
    { id: "account", label: "Account & Profile", icon: User },
    { id: "subscription", label: "Subscription / Plan", icon: CreditCard, badge: planStatus },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "chat", label: "Chat & AI Model", icon: MessageSquare },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "voice", label: "Voice & Audio", icon: Volume2 },
    { id: "privacy", label: "Privacy & Security", icon: ShieldCheck },
    { id: "storage", label: "Storage & Files", icon: HardDrive, badge: chatStats.formattedStorage },
    { id: "about", label: "About & Support", icon: Info }
  ];

  // Helper toggle switch component optimized for touch
  const ToggleSwitch = ({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) => (
    <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/60 transition-all min-h-[52px]">
      <div className="pr-3 min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-semibold text-zinc-100">{label}</p>
        {description && <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 leading-snug">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-sky-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div id="settings_modal_wrapper" className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 lg:p-6 overflow-hidden select-none">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose} 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" 
      />

      <motion.div
        id="settings_modal_body"
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-full h-[100dvh] w-[100vw] max-w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl sm:h-auto sm:max-h-[88vh] bg-zinc-950 border-0 sm:border border-zinc-800/90 rounded-none sm:rounded-3xl shadow-2xl relative z-10 flex flex-col overflow-hidden font-sans text-zinc-100"
      >
        {/* UNIFIED SETTINGS INDEX PAGE (All Devices: Mobile, Tablet, Desktop) */}
        <div className={`flex flex-col h-full h-[100dvh] sm:h-auto w-full bg-zinc-950 text-white overflow-hidden ${mobileView === "menu" ? "flex" : "hidden"}`}>
          {/* Fixed Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 border-b border-zinc-800/80 sticky top-0 bg-zinc-950/95 z-30 backdrop-blur-md pt-[max(14px,env(safe-area-inset-top))]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-sm">
                <Sliders className="w-4 h-4 text-sky-400" />
              </div>
              <h2 className="font-bold text-base sm:text-lg tracking-tight text-white">Settings</h2>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
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
              <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/80 divide-y divide-zinc-800/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setActiveTab("account"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                      <User className="w-4.5 h-4.5 text-sky-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white">Account & Profile</p>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">Name, email, avatar & password</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("subscription"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4.5 h-4.5 text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white">Subscription / Plan</p>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">Active Plan: {planStatus}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                      Active
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                  </div>
                </button>
              </div>
            </div>

            {/* GROUP 2: PREFERENCES & AI */}
            <div className="space-y-1.5">
              <p className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">Preferences & AI</p>
              <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/80 divide-y divide-zinc-800/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setActiveTab("appearance"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Palette className="w-4.5 h-4.5 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white">Appearance</p>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">Theme ({theme}), accent color, density</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("chat"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4.5 h-4.5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white">Chat & AI Model</p>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">Model: {defaultModel.replace('gemini-', '')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("chat"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <FileText className="w-4.5 h-4.5 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white">Personalization & Custom Instructions</p>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">About me & response style preferences</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("voice"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                      <Volume2 className="w-4.5 h-4.5 text-rose-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white">Voice & Audio</p>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">TTS Profile: {voiceName} ({speechSpeed}x)</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                </button>
              </div>
            </div>

            {/* GROUP 3: NOTIFICATIONS & PRIVACY */}
            <div className="space-y-1.5">
              <p className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">Notifications & Privacy</p>
              <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/80 divide-y divide-zinc-800/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setActiveTab("notifications"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                      <Bell className="w-4.5 h-4.5 text-yellow-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white">Notifications</p>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">Alerts, sound effects, security</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("privacy"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4.5 h-4.5 text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white">Privacy & Security</p>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">API keys, active sessions, 2FA</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("privacy"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Database className="w-4.5 h-4.5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white">Data Controls & Clear History</p>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">Export data backup, clear chats</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                </button>
              </div>
            </div>

            {/* GROUP 4: APP & SUPPORT */}
            <div className="space-y-1.5">
              <p className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">App & Support</p>
              <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/80 divide-y divide-zinc-800/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setActiveTab("storage"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                      <HardDrive className="w-4.5 h-4.5 text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white">Storage & Cache</p>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">Usage: {chatStats.formattedStorage}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("about"); setMobileView("content"); }}
                  className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-800/50 transition-colors text-left min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0">
                      <Info className="w-4.5 h-4.5 text-zinc-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white">About, Help & Feedback</p>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">v2.5.0 • Support, shortcuts & feedback</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
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
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs sm:text-sm font-bold cursor-pointer transition-all active:scale-[0.98] min-h-[48px]"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* UNIFIED DEDICATED CATEGORY PAGE (All Devices: Mobile, Tablet, Desktop) */}
        <div className={`flex-1 flex flex-col min-w-0 w-full h-full h-[100dvh] sm:h-auto bg-zinc-900 overflow-hidden ${mobileView === "content" ? "flex" : "hidden"}`}>
          
          {/* Section Header */}
          <div className="px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/95 sticky top-0 z-30 shrink-0 backdrop-blur-md pt-[max(14px,env(safe-area-inset-top))]">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (activeSubPage !== "main") {
                    setActiveSubPage("main");
                  } else {
                    setMobileView("menu");
                  }
                }}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl cursor-pointer transition-colors shrink-0 active:scale-95 text-xs sm:text-sm font-semibold min-h-[40px]"
                aria-label="Back to Settings menu"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-200" />
                <span>Settings</span>
              </button>

              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base md:text-lg tracking-tight text-white flex items-center gap-2 truncate">
                  {activeSubPage === "change-password" 
                    ? "Change Password" 
                    : NAV_ITEMS.find(n => n.id === activeTab)?.label}
                </h3>
              </div>
            </div>

            <button 
              type="button"
              onClick={onClose} 
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Close Settings"
            >
              <X className="w-5 h-5" />
            </button>
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
                <motion.div
                  key={activeSubPage === "change-password" ? "sub-change-password" : "tab-account"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-5"
                >
                  {activeSubPage === "change-password" ? (
                    /* DEDICATED CHANGE PASSWORD SCREEN (ChatGPT Settings Style) */
                    <div className="space-y-5">
                      {/* Header with Back Button */}
                      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentPassword("");
                              setNewPassword("");
                              setConfirmNewPassword("");
                              setActiveSubPage("main");
                            }}
                            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium active:scale-95 shadow-sm"
                          >
                            <ArrowLeft className="w-4 h-4 text-zinc-400" />
                            <span>Back</span>
                          </button>
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                              <span>Change Password</span>
                            </h3>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              Ensure your account stays safe by choosing a strong, unique password.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Current Password Field */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2 shadow-sm">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-zinc-200">Current Password</label>
                            <span className="text-[10px] text-zinc-500 font-mono">Required</span>
                          </div>
                          <div className="relative">
                            <input
                              type={showCurrentPw ? "text" : "password"}
                              required
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Enter current password"
                              className="w-full h-10 pl-3.5 pr-10 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-xs text-white rounded-xl outline-none transition-all duration-200 placeholder:text-zinc-600"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPw(!showCurrentPw)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors cursor-pointer"
                              title={showCurrentPw ? "Hide password" : "Show password"}
                            >
                              {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* New Password & Confirmation Container */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4.5 shadow-sm">
                          {/* New Password Field */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-zinc-200">New Password</label>
                              {pwStrength.label && (
                                <span className={`text-[11px] font-bold ${pwStrength.color}`}>
                                  Strength: {pwStrength.label}
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type={showNewPw ? "text" : "password"}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                className="w-full h-10 pl-3.5 pr-10 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-xs text-white rounded-xl outline-none transition-all duration-200 placeholder:text-zinc-600"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPw(!showNewPw)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors cursor-pointer"
                                title={showNewPw ? "Hide password" : "Show password"}
                              >
                                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>

                            {/* Password Strength Progress Meter */}
                            {newPassword && (
                              <div className="space-y-1 pt-1">
                                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden flex gap-1 p-0.5 border border-zinc-800/80">
                                  <div className={`h-full rounded-full transition-all duration-300 ${pwStrength.percent >= 33 ? pwStrength.bg : 'bg-transparent'} flex-1`} />
                                  <div className={`h-full rounded-full transition-all duration-300 ${pwStrength.percent >= 66 ? pwStrength.bg : 'bg-transparent'} flex-1`} />
                                  <div className={`h-full rounded-full transition-all duration-300 ${pwStrength.percent >= 100 ? pwStrength.bg : 'bg-transparent'} flex-1`} />
                                </div>
                              </div>
                            )}

                            {/* Live Validation Checklist */}
                            <div className="mt-3 p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800/80 space-y-2">
                              <p className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                                Password Requirements
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                                {passwordRequirements.map((req) => (
                                  <div key={req.id} className="flex items-center gap-2 text-[11px] transition-colors duration-200">
                                    {req.met ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    ) : (
                                      <div className="w-3.5 h-3.5 rounded-full border border-zinc-700/80 shrink-0" />
                                    )}
                                    <span className={req.met ? "text-emerald-300 font-medium" : "text-zinc-400"}>
                                      {req.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Confirm New Password Field */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-zinc-200">Confirm New Password</label>
                              {passwordsMatch && (
                                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                                </span>
                              )}
                              {passwordMismatch && (
                                <span className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type={showConfirmPw ? "text" : "password"}
                                required
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                placeholder="Re-enter new password"
                                className={`w-full h-10 pl-3.5 pr-10 bg-zinc-900/90 border ${
                                  passwordsMatch
                                    ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20'
                                    : passwordMismatch
                                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20'
                                    : 'border-zinc-800 hover:border-zinc-700/80 focus:border-sky-500 focus:ring-sky-500/20'
                                } focus:ring-2 text-xs text-white rounded-xl outline-none transition-all duration-200 placeholder:text-zinc-600`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPw(!showConfirmPw)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors cursor-pointer"
                                title={showConfirmPw ? "Hide password" : "Show password"}
                              >
                                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Dedicated Action Buttons on Password Page */}
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/80">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentPassword("");
                              setNewPassword("");
                              setConfirmNewPassword("");
                              setActiveSubPage("main");
                            }}
                            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-medium cursor-pointer transition-all active:scale-95 shadow-sm"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handlePasswordUpdate}
                            disabled={updatingPassword || !currentPassword || !allPasswordRequirementsMet || !passwordsMatch}
                            className={`px-5 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all duration-200 ${
                              updatingPassword || !currentPassword || !allPasswordRequirementsMet || !passwordsMatch
                                ? 'bg-zinc-800 text-zinc-500 border border-zinc-800 cursor-not-allowed opacity-60'
                                : 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer active:scale-95 shadow-sky-600/20'
                            }`}
                          >
                            {updatingPassword ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Updating Password...</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                <span>Update Password</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* MAIN ACCOUNT & PROFILE PAGE */
                    <>
                      {/* Modern Profile Picture & Account Header */}
                      <ProfilePictureSection
                        avatarUrl={avatarUrlInput}
                        displayName={displayName}
                        username={username}
                        email={emailAddress}
                        planStatus={planStatus}
                        emailVerified={emailVerified}
                        provider={user?.provider || "Supabase Auth"}
                        onAvatarChange={async (newAvatarUrl: string) => {
                          setAvatarUrlInput(newAvatarUrl);
                          try {
                            await onUpdateProfile(
                              username.trim(),
                              newAvatarUrl,
                              displayName.trim(),
                              planStatus,
                              undefined,
                              emailAddress.trim(),
                              phoneNumber.trim(),
                              emailVerified,
                              phoneVerified
                            );
                          } catch (e) {
                            console.error("Avatar sync failed:", e);
                          }
                        }}
                        showSuccess={showSuccessNotification}
                        showError={showErrorNotification}
                      />

                      {/* Personal Information Form */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Personal Information</h4>
                            <p className="text-[11px] text-zinc-400 mt-0.5">Manage your personal identification and contact details</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                          {/* Username */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-medium text-zinc-300">Username</label>
                              <span className="text-[10px] text-zinc-500 font-mono">Required</span>
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g. alex_nova"
                                className={`w-full h-10 px-3.5 bg-zinc-900/90 border ${
                                  !isValidUsername ? 'border-rose-500/80 focus:ring-rose-500/20' : 'border-zinc-800 hover:border-zinc-700/80 focus:border-sky-500 focus:ring-sky-500/20'
                                } focus:ring-2 text-xs text-white rounded-xl outline-none transition-all duration-200 placeholder:text-zinc-600`}
                              />
                            </div>
                            {!isValidUsername && (
                              <p className="text-[10px] text-rose-400 flex items-center gap-1 font-medium pt-0.5">
                                <AlertCircle className="w-3 h-3" /> Username cannot be empty
                              </p>
                            )}
                          </div>

                          {/* Display Name */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-medium text-zinc-300">Display Name</label>
                              <span className="text-[10px] text-zinc-500 font-mono">Public</span>
                            </div>
                            <div className="relative">
                              <input
                                type="text"
                                required
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="e.g. Alex Nova"
                                className="w-full h-10 px-3.5 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-xs text-white rounded-xl outline-none transition-all duration-200 placeholder:text-zinc-600"
                              />
                            </div>
                          </div>

                          {/* Email Address */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-medium text-zinc-300">Email Address</label>
                              {emailVerified ? (
                                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Verified
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-400 font-medium">Unverified</span>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type="email"
                                required
                                value={emailAddress}
                                onChange={(e) => setEmailAddress(e.target.value)}
                                placeholder="alex@example.com"
                                className={`w-full h-10 px-3.5 bg-zinc-900/90 border ${
                                  !isValidEmail ? 'border-rose-500/80 focus:ring-rose-500/20' : 'border-zinc-800 hover:border-zinc-700/80 focus:border-sky-500 focus:ring-sky-500/20'
                                } focus:ring-2 text-xs text-white rounded-xl outline-none transition-all duration-200 placeholder:text-zinc-600`}
                              />
                            </div>
                            {!isValidEmail && (
                              <p className="text-[10px] text-rose-400 flex items-center gap-1 font-medium pt-0.5">
                                <AlertCircle className="w-3 h-3" /> Please enter a valid email address
                              </p>
                            )}
                          </div>

                          {/* Phone Number */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-medium text-zinc-300">Phone Number</label>
                              <span className="text-[10px] text-zinc-500 font-mono">Optional</span>
                            </div>
                            <div className="relative">
                              <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                                className="w-full h-10 px-3.5 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-xs text-white rounded-xl outline-none transition-all duration-200 placeholder:text-zinc-600"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Password & Security Section (ChatGPT style trigger) */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3.5 shadow-sm">
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Password & Security</h4>
                            <p className="text-[11px] text-zinc-400 mt-0.5">Manage your account authentication and password</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/90 hover:border-zinc-700/80 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                              <Lock className="w-4 h-4 text-sky-400" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white">Password</p>
                              <p className="text-[11px] text-zinc-400">Change your password to keep your account secure</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentPassword("");
                              setNewPassword("");
                              setConfirmNewPassword("");
                              setActiveSubPage("change-password");
                            }}
                            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-zinc-700/80 shadow-sm shrink-0"
                          >
                            <span>Change Password</span>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>

                      {/* Account Actions / Danger Zone */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3.5 shadow-sm">
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Account Actions</h4>
                            <p className="text-[11px] text-zinc-400 mt-0.5">Manage session status or remove your account permanently</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            {onLogout && (
                              <button
                                type="button"
                                onClick={() => {
                                  onLogout();
                                  onClose();
                                }}
                                className="w-full sm:w-auto px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-600 text-zinc-200 hover:text-white text-xs font-medium rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
                              >
                                <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Log Out</span>
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteAccount(true)}
                            className="w-full sm:w-auto px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Account</span>
                          </button>
                        </div>
                      </div>

                      {/* Confirmation Dialog Modal for Account Deletion */}
                      <AnimatePresence>
                        {confirmDeleteAccount && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 text-white"
                            >
                              <div className="flex items-center gap-3 text-rose-400">
                                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl shrink-0">
                                  <Trash2 className="w-5 h-5 text-rose-400" />
                                </div>
                                <div>
                                  <h3 className="text-base font-bold text-white">Delete Account Permanently?</h3>
                                  <p className="text-xs text-zinc-400 mt-0.5">This action cannot be undone.</p>
                                </div>
                              </div>

                              <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
                                All your personal settings, saved conversations, uploaded files, and account data will be permanently wiped from our systems.
                              </p>

                              <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteAccount(false)}
                                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl cursor-pointer transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDeleteAccountAction}
                                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20 transition-all active:scale-95"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Yes, Delete My Account</span>
                                </button>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </motion.div>
              )}

              {/* TAB 2: SUBSCRIPTION / PLAN */}
              {activeTab === "subscription" && (
                <motion.div
                  key="tab-subscription"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-6"
                >
                  {/* Current Plan & Status Header Card */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 space-y-5 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Current Subscription</span>
                          {subStatus === "active" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Cancelled / Inactive
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-baseline gap-3 pt-1">
                          <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                            <span>{ANOVA_PRICING_PLANS.find(p => p.id === selectedPlanId)?.emoji}</span>
                            <span>{ANOVA_PRICING_PLANS.find(p => p.id === selectedPlanId)?.name} Plan</span>
                          </h3>
                          <span className="text-lg font-bold text-purple-400">
                            {ANOVA_PRICING_PLANS.find(p => p.id === selectedPlanId)?.priceFormatted}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {subStatus === "active" ? (
                          <button
                            type="button"
                            onClick={() => setShowCancelModal(true)}
                            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all cursor-pointer active:scale-95"
                          >
                            Cancel Subscription
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleReactivateSubscription}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                          >
                            Reactivate Subscription
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Subscription Quick Info Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Next Billing Date</span>
                        <p className="text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          <span>{nextBillingDate}</span>
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Auto-Renew Status</span>
                        <p className="text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                          <RefreshCw className={`w-3.5 h-3.5 ${autoRenew ? 'text-emerald-400' : 'text-zinc-500'}`} />
                          <span>{autoRenew ? "Enabled (Auto)" : "Disabled"}</span>
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Payment Method</span>
                        <p className="text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-1.5 truncate">
                          <CreditCard className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate">{paymentMethod.provider} ({paymentMethod.details})</span>
                        </p>
                      </div>
                    </div>

                    {/* Auto-Renew Toggle Switch */}
                    <div className="pt-2">
                      <ToggleSwitch
                        checked={autoRenew}
                        onChange={(val) => {
                          setAutoRenew(val);
                          if (val) {
                            showSuccessNotification("Auto-renew enabled. Subscription will automatically renew on " + nextBillingDate);
                          } else {
                            showSuccessNotification("Auto-renew disabled. Plan will remain active until " + nextBillingDate);
                          }
                        }}
                        label="Auto-Renew Subscription"
                        description={`Automatically charge saved payment method on ${nextBillingDate}`}
                      />
                    </div>
                  </div>

                  {/* Section 2: Choose / Upgrade Plan (All 5 Plans) */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span>A-NOVA Official Plans & Pricing</span>
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Choose the plan that fits your AI workflow. All prices in Indian Rupees (₹).
                      </p>
                    </div>

                    {/* 5 Plans Responsive Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ANOVA_PRICING_PLANS.map((plan) => {
                        const isCurrent = selectedPlanId === plan.id && subStatus === "active";
                        return (
                          <div
                            key={plan.id}
                            className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between relative ${
                              isCurrent 
                                ? `${plan.borderActive} ring-1 ring-purple-500/30 shadow-lg shadow-purple-500/5` 
                                : "bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700/80"
                            }`}
                          >
                            {plan.badgeLabel && (
                              <span className={`absolute -top-2.5 right-4 px-2.5 py-0.5 text-[10px] font-bold rounded-full border shadow-sm ${plan.bgBadge}`}>
                                {plan.badgeLabel}
                              </span>
                            )}

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{plan.emoji}</span>
                                  <h5 className="font-bold text-base text-white">{plan.name}</h5>
                                </div>
                                {isCurrent && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                                    Current Plan
                                  </span>
                                )}
                              </div>

                              <div className="flex items-baseline gap-1 pt-1">
                                <span className="text-2xl font-black text-white tracking-tight">{plan.priceFormatted}</span>
                              </div>

                              <div className="border-t border-zinc-800/80 pt-3 space-y-2">
                                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Features included:</p>
                                <ul className="space-y-2">
                                  {plan.features.map((feat, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                      <span>{feat}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <div className="pt-5 mt-auto">
                              {isCurrent ? (
                                <button
                                  type="button"
                                  disabled
                                  className="w-full py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-semibold cursor-not-allowed border border-zinc-700/50 flex items-center justify-center gap-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Active Plan</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPlanToConfirm(plan);
                                    setShowPlanConfirmModal(true);
                                  }}
                                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer ${plan.buttonBg}`}
                                >
                                  {plan.price > (ANOVA_PRICING_PLANS.find(p => p.id === selectedPlanId)?.price || 0) 
                                    ? `Upgrade to ${plan.name}` 
                                    : `Switch to ${plan.name}`}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 3: Payment Method Management */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-sky-400" />
                          <span>Saved Payment Method</span>
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Supported payment methods in India (UPI, Cards, Net Banking, RuPay)
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowPaymentModal(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 text-xs font-semibold transition-all cursor-pointer active:scale-95 shrink-0"
                      >
                        Change Payment Method
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                          <CreditCard className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-white">
                            {paymentMethod.provider} • {paymentMethod.type}
                          </p>
                          <p className="text-xs text-zinc-400 font-mono mt-0.5">{paymentMethod.details}</p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 self-start sm:self-center">
                        Default Billing
                      </span>
                    </div>

                    {/* Accepted India Payment Method Badges */}
                    <div className="pt-2 space-y-2">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Accepted Payment Options in India:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {["PhonePe", "Google Pay", "Paytm", "BHIM UPI", "RuPay", "Visa", "Mastercard", "Amex", "Net Banking"].map((item, idx) => (
                          <span key={idx} className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Billing History & GST Invoice Download */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-400" />
                          <span>Billing History & GST Invoices</span>
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Download official tax invoices with 18% GST details for your accounting.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {billingHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/60 transition-all gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs sm:text-sm font-bold text-white truncate">{item.planName}</p>
                                <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {item.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
                                {item.id} • {item.date}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-0 border-zinc-800/60 pt-2 sm:pt-0">
                            <span className="text-xs sm:text-sm font-extrabold text-white">₹{item.amountINR}.00</span>
                            <button
                              type="button"
                              onClick={() => handleDownloadGSTInvoice(item)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-all active:scale-95 cursor-pointer"
                              title="Download GST Invoice PDF/Text"
                            >
                              <FileDown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span>GST Invoice</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: APPEARANCE */}
              {activeTab === "appearance" && (
                <motion.div
                  key="tab-appearance"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {/* Theme Mode Selection */}
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Color Theme</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: 'dark', label: 'Dark Mode', icon: Moon },
                        { id: 'light', label: 'Light Mode', icon: Sun },
                        { id: 'system', label: 'System Default', icon: Monitor }
                      ].map((tm) => {
                        const IconComp = tm.icon;
                        const isSelected = theme === tm.id;
                        return (
                          <button
                            key={tm.id}
                            type="button"
                            onClick={() => setTheme(tm.id as any)}
                            className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-zinc-800 border-sky-500/60 text-white font-semibold shadow-sm' 
                                : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                            }`}
                          >
                            <IconComp className={`w-4.5 h-4.5 ${isSelected ? "text-sky-400" : ""}`} />
                            <span>{tm.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accent Color Palette */}
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Accent Color</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {[
                        { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-500' },
                        { id: 'purple', name: 'Purple', bg: 'bg-purple-500' },
                        { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-500' },
                        { id: 'rose', name: 'Rose', bg: 'bg-rose-500' },
                        { id: 'amber', name: 'Amber', bg: 'bg-amber-500' },
                        { id: 'blue', name: 'Blue', bg: 'bg-blue-500' }
                      ].map((col) => {
                        const isSelected = accentColor === col.id;
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => setAccentColor(col.id as any)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-zinc-800 border-sky-500/60 text-white font-semibold' 
                                : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                            }`}
                          >
                            <span className={`w-3 h-3 rounded-full ${col.bg} shrink-0`} />
                            <span className="truncate">{col.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Typography & Density */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                      <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Font Size</h4>
                      <div className="flex gap-2">
                        {[
                          { id: 'sm', label: 'Small' },
                          { id: 'md', label: 'Medium' },
                          { id: 'lg', label: 'Large' }
                        ].map((sz) => (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => setFontSize(sz.id as any)}
                            className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                              fontSize === sz.id 
                                ? 'bg-zinc-800 border-sky-500/60 text-white font-semibold' 
                                : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {sz.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                      <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Message Density</h4>
                      <div className="flex gap-2">
                        {[
                          { id: 'compact', label: 'Compact' },
                          { id: 'comfortable', label: 'Comfort' },
                          { id: 'spacious', label: 'Spacious' }
                        ].map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setMessageDensity(d.id as any)}
                            className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                              messageDensity === d.id 
                                ? 'bg-zinc-800 border-sky-500/60 text-white font-semibold' 
                                : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Motion & Layout */}
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4">
                    <ToggleSwitch 
                      checked={enableAnimations}
                      onChange={setEnableAnimations}
                      label="Interface Animations"
                      description="Enable smooth UI transitions and state animations"
                    />

                    <div className="border-t border-zinc-800/80 pt-3.5 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-medium text-white">Workspace Width</h4>
                        <p className="text-[11px] text-zinc-400">Toggle standard centered column or full width layout</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setChatWidth('standard')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-xl border cursor-pointer transition-colors ${
                            chatWidth === 'standard' ? 'bg-zinc-800 border-sky-500/60 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => setChatWidth('full')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-xl border cursor-pointer transition-colors ${
                            chatWidth === 'full' ? 'bg-zinc-800 border-sky-500/60 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          Full Width
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
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
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Default Model</h4>
                    <select
                      value={defaultModel}
                      onChange={(e) => setDefaultModel(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-sky-500/80 text-xs text-white rounded-xl outline-none cursor-pointer transition-colors"
                    >
                      <option value="gemini-3.6-flash">Gemini 3.6 Flash (Ultra fast response)</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep reasoning & code)</option>
                      <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Compact model)</option>
                    </select>
                  </div>

                  {/* Chat Option Toggles */}
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Conversation Preferences</h4>
                    
                    <div className="space-y-2.5">
                      <ToggleSwitch
                        checked={!historyDisabled}
                        onChange={(val) => setHistoryDisabled(!val)}
                        label="Save Chat History"
                        description="Store conversation sessions in history sidebar"
                      />
                      <ToggleSwitch
                        checked={autoScroll}
                        onChange={setAutoScroll}
                        label="Auto-Scroll on Response"
                        description="Automatically scroll workspace down when AI responds"
                      />
                      <ToggleSwitch
                        checked={codeFormatting}
                        onChange={setCodeFormatting}
                        label="Code Syntax Highlighting"
                        description="Format code blocks with copy button and highlighting"
                      />
                      <ToggleSwitch
                        checked={markdownEnabled}
                        onChange={setMarkdownEnabled}
                        label="Rich Markdown Formatting"
                        description="Render bold text, lists, and formatting in chat"
                      />
                      <ToggleSwitch
                        checked={enterToSend}
                        onChange={setEnterToSend}
                        label="Press Enter to Send Message"
                        description="Use Shift+Enter for new lines, Enter to submit"
                      />
                      <ToggleSwitch
                        checked={responseStreaming}
                        onChange={setResponseStreaming}
                        label="Response Streaming"
                        description="Stream output in real-time as generated"
                      />
                    </div>
                  </div>

                  {/* System Persona */}
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">System Persona</h4>
                    <textarea
                      rows={3}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-sky-500/80 text-xs text-white rounded-xl outline-none resize-none leading-relaxed transition-colors"
                    />
                  </div>

                  {/* Custom Instructions */}
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Custom Instructions</h4>
                        <p className="text-[11px] text-zinc-400">Personalize responses to your preferences</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={customInstructionsEnabled}
                        onClick={() => setCustomInstructionsEnabled(!customInstructionsEnabled)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          customInstructionsEnabled ? 'bg-sky-500' : 'bg-zinc-700'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                          customInstructionsEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {customInstructionsEnabled && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-400 mb-1">What should AI know about you?</label>
                          <textarea
                            rows={2}
                            value={aboutMe}
                            onChange={(e) => setAboutMe(e.target.value)}
                            placeholder="E.g. Senior software developer working with React..."
                            className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 focus:border-sky-500/80 text-xs text-white rounded-xl outline-none resize-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-400 mb-1">How should AI respond?</label>
                          <textarea
                            rows={2}
                            value={respondWay}
                            onChange={(e) => setRespondWay(e.target.value)}
                            placeholder="E.g. Clear, concise code snippets without redundant explanations..."
                            className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 focus:border-sky-500/80 text-xs text-white rounded-xl outline-none resize-none transition-colors"
                          />
                        </div>
                      </div>
                    )}
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
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Notification Preferences</h4>
                    
                    <div className="space-y-2.5">
                      <ToggleSwitch
                        checked={browserNotificationsEnabled}
                        onChange={(val) => {
                          setBrowserNotificationsEnabled(val);
                          if (val && typeof window !== "undefined" && "Notification" in window) {
                            Notification.requestPermission();
                          }
                        }}
                        label="Browser Notifications"
                        description="Alerts when long response finishes in background"
                      />

                      <ToggleSwitch
                        checked={soundEffectsEnabled}
                        onChange={setSoundEffectsEnabled}
                        label="Audio Sound Effects"
                        description="Play subtle chime when sending or receiving messages"
                      />

                      <ToggleSwitch
                        checked={productUpdates}
                        onChange={setProductUpdates}
                        label="Product Updates"
                        description="Information about new features and model updates"
                      />

                      <ToggleSwitch
                        checked={securityAlerts}
                        onChange={setSecurityAlerts}
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
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4">
                    <ToggleSwitch
                      checked={voiceEnabled}
                      onChange={setVoiceEnabled}
                      label="Text-to-Speech"
                      description="Read AI responses aloud using speech synthesis"
                    />

                    {voiceEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">Voice Profile</label>
                          <select
                            value={voiceName}
                            onChange={(e) => setVoiceName(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 text-xs text-white rounded-xl outline-none cursor-pointer transition-colors"
                          >
                            <option value="Zephyr">Zephyr (Clear & Natural)</option>
                            <option value="Kore">Kore (Soft & Friendly)</option>
                            <option value="Puck">Puck (Upbeat)</option>
                            <option value="Charon">Charon (Deep Tone)</option>
                            <option value="Fenrir">Fenrir (Professional)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">Speech Speed ({speechSpeed}x)</label>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={speechSpeed}
                            onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500 mt-2.5"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4">
                    <ToggleSwitch
                      checked={micSettingsEnabled}
                      onChange={setMicSettingsEnabled}
                      label="Voice Dictation"
                      description="Speech-to-text dictation button in chat input"
                    />

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">Dictation Language</label>
                      <select
                        value={voiceLanguage}
                        onChange={(e) => setVoiceLanguage(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 text-xs text-white rounded-xl outline-none cursor-pointer transition-colors"
                      >
                        <option value="en-US">English (United States)</option>
                        <option value="es-ES">Spanish (Español)</option>
                        <option value="fr-FR">French (Français)</option>
                        <option value="de-DE">German (Deutsch)</option>
                        <option value="ja-JP">Japanese (日本語)</option>
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
                  {/* Active Sessions */}
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Active Device Sessions</h4>
                    
                    <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Laptop className="w-4.5 h-4.5 text-zinc-300 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-white">Web Browser Session</p>
                          <p className="text-[11px] text-zinc-400 font-mono">Current Session • Workspace Container</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-medium">
                        Active
                      </span>
                    </div>
                  </div>

                  {/* API Key Override */}
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-zinc-300" />
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Custom Gemini API Key</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setApiKeyVisible(!apiKeyVisible)}
                        className="text-xs text-zinc-400 hover:text-white font-medium transition-colors"
                      >
                        {apiKeyVisible ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400">Optional custom key override for higher request limits</p>
                    <input
                      type={apiKeyVisible ? "text" : "password"}
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-sky-500/80 text-xs text-white font-mono rounded-xl outline-none transition-colors"
                    />
                  </div>

                  {/* Data Management Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5">
                      <h4 className="text-xs font-semibold text-white">Export Backup</h4>
                      <p className="text-[11px] text-zinc-400">Download a full JSON copy of chats and settings</p>
                      <button
                        type="button"
                        onClick={handleExportData}
                        className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-medium rounded-xl flex items-center justify-center gap-2 text-zinc-200 cursor-pointer transition-colors"
                      >
                        <FileDown className="w-4 h-4 text-zinc-300" />
                        <span>Download JSON</span>
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5">
                      <h4 className="text-xs font-semibold text-white">Clear History</h4>
                      <p className="text-[11px] text-zinc-400">Permanently delete all chat message history</p>
                      {confirmClearHistory ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleClearAllHistory}
                            className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmClearHistory(false)}
                            className="px-3 py-2 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmClearHistory(true)}
                          className="w-full py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete All Chats</span>
                        </button>
                      )}
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
                  className="space-y-5"
                >
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Storage Usage</h4>
                      <span className="text-xs font-medium text-sky-400 font-mono">{chatStats.formattedStorage} / 500 MB</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/80">
                      <div 
                        className="h-full bg-sky-500 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.max(2, Math.min(100, (chatStats.totalBytes / (500 * 1024 * 1024)) * 100))}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {chatStats.totalFiles} attached document(s) across {chatStats.totalChats} conversation(s)
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Uploaded Attachments</h4>
                    
                    {chatStats.uploadedFilesList.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-zinc-800/80 rounded-2xl">
                        <File className="w-7 h-7 text-zinc-600 mx-auto mb-2" />
                        <p className="text-xs font-medium text-zinc-400">No file attachments found</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Files attached in chat sessions will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {chatStats.uploadedFilesList.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <File className="w-4 h-4 text-zinc-300 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-white truncate">{file.name}</p>
                                <p className="text-[10px] text-zinc-400">Session: {file.sessionTitle}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-medium text-zinc-400 shrink-0">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto shadow-sm">
                      <Info className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-base font-semibold text-white">A-NOVA Workspace Platform</h3>
                    <p className="text-xs text-zinc-400 font-mono">Version 2.5.0</p>
                    <p className="text-[11px] text-zinc-400 max-w-md mx-auto leading-relaxed">
                      Built with React, Express, Supabase Authentication, and Google Gemini Flash models.
                    </p>
                  </div>

                  {/* Keyboard Shortcuts */}
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <Command className="w-4 h-4 text-sky-400" />
                      <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Keyboard Shortcuts</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {[
                        { key: "Cmd / Ctrl + K", desc: "Open Command Palette" },
                        { key: "Cmd / Ctrl + /", desc: "Focus Chat Input" },
                        { key: "Cmd / Ctrl + Shift + O", desc: "New Conversation" },
                        { key: "Cmd / Ctrl + ,", desc: "Open Settings" },
                        { key: "Shift + Enter", desc: "Insert New Line" },
                        { key: "Esc", desc: "Close Active Modal" },
                      ].map((sc, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs">
                          <span className="text-zinc-300">{sc.desc}</span>
                          <kbd className="px-2 py-1 bg-zinc-800 text-zinc-400 font-mono text-[10px] rounded-lg border border-zinc-700/60 shrink-0">{sc.key}</kbd>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Help & Support Links */}
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-sky-400" />
                      <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Help & Support</h4>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Need assistance with A-NOVA or have account questions? Access our documentation, guides, or contact support.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href="https://ai.google.dev/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Documentation</span>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                      </a>
                      <a
                        href="mailto:support@a-nova.ai"
                        className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Contact Support</span>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                      </a>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Send Feedback</h4>
                    {feedbackSent ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-medium">
                        Thank you! Your feedback has been recorded.
                      </div>
                    ) : (
                      <>
                        <textarea
                          rows={3}
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Share your thoughts or suggest feature improvements..."
                          className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-sky-500/80 text-xs text-white rounded-xl outline-none resize-none transition-colors"
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
                          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors border border-zinc-700/80"
                        >
                          Submit Feedback
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Bottom Action Footer Bar */}
            {activeSubPage === "main" && (
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2 sm:gap-3 mt-auto sticky bottom-0 bg-zinc-900/95 backdrop-blur-md py-3 px-2 sm:px-4 shrink-0 z-20 pb-[max(12px,env(safe-area-inset-bottom))]">
                <div className="flex items-center gap-2 text-xs">
                  {isDirty ? (
                    <span className="flex items-center gap-1.5 text-amber-400 font-medium text-[11px] bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Unsaved changes
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-zinc-400 font-medium text-[11px] bg-zinc-800/60 border border-zinc-700/60 px-2.5 py-1 rounded-full whitespace-nowrap">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>All saved</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 sm:px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800/80 rounded-xl text-xs font-medium cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isDirty || saving}
                    className={`px-4 sm:px-5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all duration-200 ${
                      !isDirty || saving
                        ? 'bg-zinc-800 text-zinc-500 border border-zinc-800 cursor-not-allowed opacity-60'
                        : 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer active:scale-95 shadow-sky-600/20'
                    }`}
                  >
                    {saving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

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
                  className="relative z-10 w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 text-white"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      </div>
                      <h3 className="font-bold text-base">Confirm Plan Change</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPlanConfirmModal(false)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{planToConfirm.emoji}</span>
                        <div>
                          <h4 className="font-bold text-lg">{planToConfirm.name} Plan</h4>
                          <span className="text-xs text-zinc-400">Monthly Billing</span>
                        </div>
                      </div>
                      <span className="text-xl font-extrabold text-purple-400">{planToConfirm.priceFormatted}</span>
                    </div>

                    <div className="border-t border-zinc-800/80 pt-3 space-y-1.5">
                      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Features included:</p>
                      {planToConfirm.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 flex items-center justify-between text-xs text-zinc-300">
                    <span className="text-zinc-400">Charging Payment Method:</span>
                    <span className="font-semibold text-white">{paymentMethod.provider} ({paymentMethod.details})</span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPlanConfirmModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold cursor-pointer"
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
                  className="relative z-10 w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-sky-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base">Payment Method (India)</h3>
                        <p className="text-[11px] text-zinc-400">Choose your preferred Indian payment option</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Payment Type Selector Tabs */}
                  <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setSelectedPayType("upi")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        selectedPayType === "upi"
                          ? "bg-sky-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
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
                          : "text-zinc-400 hover:text-white"
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
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Net Banking
                    </button>
                  </div>

                  {/* TAB 1: UPI */}
                  {selectedPayType === "upi" && (
                    <div className="space-y-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-300">UPI App / Provider</label>
                        <select
                          value={upiAppSelect}
                          onChange={(e) => setUpiAppSelect(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
                        >
                          <option value="Google Pay">Google Pay (GPay)</option>
                          <option value="PhonePe">PhonePe</option>
                          <option value="Paytm">Paytm UPI</option>
                          <option value="BHIM UPI">BHIM UPI App</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-300">Virtual Payment Address (UPI ID)</label>
                        <input
                          type="text"
                          value={upiIdInput}
                          onChange={(e) => setUpiIdInput(e.target.value)}
                          placeholder="e.g. mobile@upi or username@okaxis"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
                        />
                        <p className="text-[10px] text-zinc-500">Fast 1-click autopay supported across all major Indian banks.</p>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: CARD */}
                  {selectedPayType === "card" && (
                    <div className="space-y-3.5 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-300">Card Network</label>
                        <select
                          value={cardTypeSelect}
                          onChange={(e) => setCardTypeSelect(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
                        >
                          <option value="RuPay Debit Card">RuPay Debit Card</option>
                          <option value="Credit Card (Visa)">Visa Credit / Debit Card</option>
                          <option value="Credit Card (Mastercard)">Mastercard Credit / Debit</option>
                          <option value="American Express">American Express (Amex)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-300">Card Number</label>
                        <input
                          type="text"
                          value={cardNumberInput}
                          onChange={(e) => setCardNumberInput(e.target.value)}
                          placeholder="4532 •••• •••• 8912"
                          maxLength={19}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-300">Expiry Date</label>
                          <input
                            type="text"
                            value={cardExpiryInput}
                            onChange={(e) => setCardExpiryInput(e.target.value)}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-300">CVV / CVC</label>
                          <input
                            type="password"
                            value={cardCvvInput}
                            onChange={(e) => setCardCvvInput(e.target.value)}
                            placeholder="•••"
                            maxLength={4}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: NET BANKING */}
                  {selectedPayType === "netbanking" && (
                    <div className="space-y-3 pt-1">
                      <label className="text-xs font-semibold text-zinc-300">Select Indian Bank</label>
                      <select
                        value={netBankSelect}
                        onChange={(e) => setNetBankSelect(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-sky-500"
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

                  <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold cursor-pointer"
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
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="relative z-10 w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 text-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">Cancel Subscription?</h3>
                      <p className="text-xs text-zinc-400">Are you sure you want to cancel your recurring plan?</p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800">
                    Your subscription features will remain fully active until <strong className="text-white">{nextBillingDate}</strong>. After this date, your plan will revert to Starter.
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold cursor-pointer"
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

        </div>
      </motion.div>
    </div>
  );
}
