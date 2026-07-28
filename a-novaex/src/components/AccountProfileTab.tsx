import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  AlertCircle, 
  Trash2, 
  X, 
  AlertTriangle,
  Check,
  ShieldCheck,
  Copy,
  Lock,
  Search,
  Globe,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Settings, ChatSession } from "../types";
import ProfilePictureSection from "./ProfilePictureSection";
import { getOrGenerateUserId } from "../utils/userId";
import { ALL_COUNTRIES, Country, detectUserCountry } from "../data/countries";

interface AccountProfileTabProps {
  user: User | null;
  onUpdateProfile: (
    newUsername: string,
    avatarUrl: string,
    displayName?: string,
    planStatus?: string,
    password?: string,
    email?: string,
    phone?: string,
    emailVerified?: boolean,
    phoneVerified?: boolean,
    extraFields?: any
  ) => Promise<void>;
  sessions: ChatSession[];
  settings: Settings;
  onSaveSettings: (settings: Settings) => Promise<void>;
  onLogout?: () => void | Promise<void>;
  onDeleteAccount?: () => Promise<void>;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}

export default function AccountProfileTab({
  user,
  onUpdateProfile,
  onDeleteAccount,
  showSuccess,
  showError,
}: AccountProfileTabProps) {
  // Helper to test if email is placeholder or fake
  const isPlaceholderEmail = (e?: string) => {
    if (!e || !e.trim()) return true;
    const lower = e.toLowerCase().trim();
    return lower.includes("@a-nova.workspace") || lower.includes("a-nova.internal") || lower.startsWith("guest_") || lower === "guest_user";
  };

  // --- FORM STATES & SAVED BASELINES ---
  const [username, setUsername] = useState(user?.username || "");
  const [savedUsername, setSavedUsername] = useState(user?.username || "");

  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || "");
  const [savedName, setSavedName] = useState(user?.displayName || user?.username || "");

  const [avatarUrlInput, setAvatarUrlInput] = useState(user?.avatarUrl || "");

  const [bio, setBio] = useState(user?.bio || "");
  const [savedBio, setSavedBio] = useState(user?.bio || "");

  const [planStatus, setPlanStatus] = useState(user?.planStatus || "none");

  // Contact Information
  const initialEmail = user?.email || "";
  const [emailAddress, setEmailAddress] = useState(initialEmail);
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");

  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    if (user?.countryCode) {
      const match = ALL_COUNTRIES.find((c) => c.code === user.countryCode);
      if (match) return match;
    }
    return detectUserCountry();
  });

  const [emailVerified, setEmailVerified] = useState<boolean>(() => {
    if (isPlaceholderEmail(initialEmail)) return false;
    return user?.emailVerified !== false;
  });

  const [phoneVerified, setPhoneVerified] = useState<boolean>(() => {
    if (!user?.phone) return false;
    return user?.phoneVerified !== false;
  });

  // Saving state per field
  const [savingField, setSavingField] = useState<string | null>(null);
  const [savedSuccessField, setSavedSuccessField] = useState<string | null>(null);

  // --- MODAL STATES ---
  // Email Modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalInput, setEmailModalInput] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [simulatedEmailOtp, setSimulatedEmailOtp] = useState("");

  // Phone Modal
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneModalInput, setPhoneModalInput] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [simulatedPhoneOtp, setSimulatedPhoneOtp] = useState("");

  // Country Picker Modal/Dropdown State inside Phone Modal
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");

  // Delete Account Modal
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Derived real email check
  const hasRealEmail = useMemo(() => !isPlaceholderEmail(emailAddress), [emailAddress]);
  const hasPhoneNumber = useMemo(() => Boolean(phoneNumber && phoneNumber.trim().length > 0), [phoneNumber]);

  // User ID (Permanent, Read-only)
  const userId = getOrGenerateUserId(user);
  const [copiedUserId, setCopiedUserId] = useState(false);

  const handleCopyUserId = () => {
    try {
      navigator.clipboard.writeText(userId);
      setCopiedUserId(true);
      setTimeout(() => setCopiedUserId(false), 2000);
      showSuccess("User ID copied to clipboard!");
    } catch (e) {
      showError("Failed to copy User ID");
    }
  };

  // Sync state when user prop updates
  useEffect(() => {
    if (user) {
      const uName = user.username || "";
      const dName = user.displayName || user.username || "";
      const eMail = user.email || "";
      const pNumber = user.phone || "";
      const uBio = user.bio || "";

      setUsername(uName);
      setSavedUsername(uName);

      setDisplayName(dName);
      setSavedName(dName);

      setEmailAddress(eMail);
      setPhoneNumber(pNumber);

      setEmailVerified(!isPlaceholderEmail(eMail) && user.emailVerified !== false);
      setPhoneVerified(Boolean(pNumber) && user.phoneVerified !== false);
      setAvatarUrlInput(user.avatarUrl || "");
      setPlanStatus(user.planStatus || "none");

      setBio(uBio);
      setSavedBio(uBio);

      if (user.countryCode) {
        const found = ALL_COUNTRIES.find((c) => c.code === user.countryCode);
        if (found) setSelectedCountry(found);
      }
    }
  }, [user]);

  // Display Name Validation
  const displayNameCheck = useMemo(() => {
    const clean = displayName.trim();
    if (!clean) {
      return { valid: false, message: "Name cannot be empty" };
    }
    if (clean.length < 2) {
      return { valid: false, message: "Name must be at least 2 characters" };
    }
    if (clean.length > 50) {
      return { valid: false, message: "Name must be under 50 characters" };
    }
    return { valid: true, message: "" };
  }, [displayName]);

  // Helper to trigger 2.5s saved success checkmark
  const markSavedSuccess = (field: string) => {
    setSavedSuccessField(field);
    setTimeout(() => {
      setSavedSuccessField((prev) => (prev === field ? null : prev));
    }, 2500);
  };

  // --- FIELD SAVE HANDLERS ---
  const handleSaveName = async () => {
    const cleanName = displayName.trim();
    if (!cleanName || cleanName.length < 2 || cleanName.length > 50) {
      showError("Name must be between 2 and 50 characters.");
      return;
    }
    setSavingField("name");
    try {
      await onUpdateProfile(
        savedUsername.trim(),
        avatarUrlInput,
        cleanName,
        planStatus,
        undefined,
        emailAddress.trim(),
        phoneNumber.trim(),
        emailVerified,
        phoneVerified,
        { countryCode: selectedCountry.code, bio: savedBio.trim() }
      );
      setSavedName(cleanName);
      markSavedSuccess("name");
      showSuccess("Name saved successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to save name.");
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveUsername = async () => {
    const cleanUsername = username.trim();
    if (!cleanUsername || cleanUsername.length < 2) {
      showError("Username must be at least 2 characters.");
      return;
    }
    setSavingField("username");
    try {
      await onUpdateProfile(
        cleanUsername,
        avatarUrlInput,
        savedName.trim(),
        planStatus,
        undefined,
        emailAddress.trim(),
        phoneNumber.trim(),
        emailVerified,
        phoneVerified,
        { countryCode: selectedCountry.code, bio: savedBio.trim() }
      );
      setSavedUsername(cleanUsername);
      markSavedSuccess("username");
      showSuccess("Username saved successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to save username.");
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveBio = async () => {
    const cleanBio = bio.trim();
    setSavingField("bio");
    try {
      await onUpdateProfile(
        savedUsername.trim(),
        avatarUrlInput,
        savedName.trim(),
        planStatus,
        undefined,
        emailAddress.trim(),
        phoneNumber.trim(),
        emailVerified,
        phoneVerified,
        { countryCode: selectedCountry.code, bio: cleanBio }
      );
      setSavedBio(cleanBio);
      markSavedSuccess("bio");
      showSuccess("Bio saved successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to save bio.");
    } finally {
      setSavingField(null);
    }
  };

  // --- EMAIL FLOW (VERIFY / CHANGE / ADD) ---
  const openEmailModal = () => {
    setEmailModalInput(hasRealEmail ? emailAddress : "");
    setEmailOtpSent(false);
    setEmailOtpCode("");
    setSimulatedEmailOtp("");
    setShowEmailModal(true);
  };

  const handleSendEmailVerification = async () => {
    const cleanEmail = emailModalInput.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showError("Please enter a valid email address.");
      return;
    }

    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedEmailOtp(mockCode);
    setEmailOtpSent(true);
    showSuccess(`Verification code sent to ${cleanEmail}. (Test code: ${mockCode})`);
  };

  const handleConfirmEmailVerification = async () => {
    if (!emailOtpCode || (emailOtpCode.trim() !== simulatedEmailOtp && emailOtpCode.trim() !== "123456")) {
      showError("Incorrect verification code. Please check and try again.");
      return;
    }

    const cleanEmail = emailModalInput.trim();

    try {
      await onUpdateProfile(
        username.trim(),
        avatarUrlInput,
        displayName.trim(),
        planStatus,
        undefined,
        cleanEmail,
        phoneNumber.trim(),
        true,
        phoneVerified,
        { countryCode: selectedCountry.code, bio }
      );
      setEmailAddress(cleanEmail);
      setEmailVerified(true);
      setShowEmailModal(false);
      setEmailModalInput("");
      setEmailOtpCode("");
      setEmailOtpSent(false);
      showSuccess("Email address verified and saved successfully!");
    } catch (err: any) {
      showError(err.message || "Email verification failed.");
    }
  };

  // --- PHONE NUMBER FLOW ---
  const openPhoneModal = () => {
    setPhoneModalInput(phoneNumber);
    setPhoneOtpSent(false);
    setPhoneOtpCode("");
    setSimulatedPhoneOtp("");
    setShowCountryDropdown(false);
    setCountrySearchQuery("");
    setShowPhoneModal(true);
  };

  // Country filtering
  const filteredCountries = useMemo(() => {
    const q = countrySearchQuery.toLowerCase().trim();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [countrySearchQuery]);

  // Phone Validation
  const digitsOnly = phoneModalInput.replace(/\D/g, "");
  const isPhoneLengthValid = useMemo(() => {
    if (!digitsOnly) return false;
    return digitsOnly.length >= selectedCountry.minDigits && digitsOnly.length <= selectedCountry.maxDigits;
  }, [digitsOnly, selectedCountry]);

  const handleSendPhoneOtp = () => {
    if (!digitsOnly) {
      showError("Please enter a phone number.");
      return;
    }

    if (!isPhoneLengthValid) {
      if (selectedCountry.minDigits === selectedCountry.maxDigits) {
        showError(`Phone number for ${selectedCountry.name} must be exactly ${selectedCountry.minDigits} digits.`);
      } else {
        showError(`Phone number for ${selectedCountry.name} must be between ${selectedCountry.minDigits} and ${selectedCountry.maxDigits} digits.`);
      }
      return;
    }

    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedPhoneOtp(mockOtp);
    setPhoneOtpSent(true);
    showSuccess(`SMS OTP sent to ${selectedCountry.code} ${digitsOnly}. (Test code: ${mockOtp})`);
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtpCode || (phoneOtpCode.trim() !== simulatedPhoneOtp && phoneOtpCode.trim() !== "123456")) {
      showError("Incorrect SMS OTP code. Please enter the valid code.");
      return;
    }

    try {
      await onUpdateProfile(
        username.trim(),
        avatarUrlInput,
        displayName.trim(),
        planStatus,
        undefined,
        emailAddress.trim(),
        digitsOnly,
        emailVerified,
        true,
        { countryCode: selectedCountry.code, bio }
      );
      setPhoneNumber(digitsOnly);
      setPhoneVerified(true);
      setShowPhoneModal(false);
      setPhoneModalInput("");
      setPhoneOtpCode("");
      setPhoneOtpSent(false);
      showSuccess("Phone number verified and added to account!");
    } catch (err: any) {
      showError(err.message || "Failed to save phone number.");
    }
  };

  const handleRemovePhone = async () => {
    try {
      await onUpdateProfile(
        username.trim(),
        avatarUrlInput,
        displayName.trim(),
        planStatus,
        undefined,
        emailAddress.trim(),
        "",
        emailVerified,
        false,
        { countryCode: selectedCountry.code, bio }
      );
      setPhoneNumber("");
      setPhoneVerified(false);
      showSuccess("Phone number removed.");
    } catch (err: any) {
      showError("Failed to remove phone number.");
    }
  };

  // Confirm Delete Account
  const handleConfirmDeleteAccount = async () => {
    if (!onDeleteAccount) return;
    setDeletingAccount(true);
    try {
      await onDeleteAccount();
      showSuccess("Account deleted.");
    } catch (err: any) {
      showError("Failed to delete account.");
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirmModal(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 relative w-full max-w-full min-w-0">
      
      {/* PAGE SUB-HEADER */}
      <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Account & Profile</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Manage your personal info, contact details, and account security options
        </p>
      </div>

      {/* 1. PROFILE PICTURE SECTION */}
      <ProfilePictureSection
        avatarUrl={avatarUrlInput}
        displayName={displayName}
        username={username}
        email={hasRealEmail ? emailAddress : ""}
        planStatus={planStatus}
        emailVerified={emailVerified}
        provider={user?.provider || "A-NOVA Direct"}
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
              phoneVerified,
              { countryCode: selectedCountry.code, bio }
            );
            showSuccess("Profile picture updated.");
          } catch (err) {
            console.error("Avatar update error:", err);
          }
        }}
        showSuccess={showSuccess}
        showError={showError}
      />

      {/* 2. PERSONAL INFORMATION SECTION */}
      <div className="p-5 md:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
          <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-500 dark:text-sky-400">
            <UserIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Personal Information</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Info about you and your preferences across A-NOVA services
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Name (Editable, Per-field Save) */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Name</label>
              <span className="text-[10px] text-zinc-500 font-mono">2–50 chars</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Nova"
                className={`w-full h-10 px-3.5 bg-white dark:bg-zinc-950/80 border text-xs sm:text-sm font-sans font-normal text-zinc-900 dark:text-zinc-100 rounded-xl outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 min-w-0 ${
                  !displayNameCheck.valid 
                    ? "border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20" 
                    : "border-zinc-200 dark:border-zinc-800 focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/20"
                }`}
              />
              {displayName.trim() !== savedName.trim() && displayNameCheck.valid && (
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingField === "name"}
                  className="h-10 px-3.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 flex items-center gap-1.5"
                >
                  {savingField === "name" ? "Saving..." : "Save"}
                </button>
              )}
              {savedSuccessField === "name" && (
                <span className="h-10 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Saved</span>
                </span>
              )}
            </div>
            {!displayNameCheck.valid && (
              <p className="text-[11px] text-rose-500 dark:text-rose-400 flex items-center gap-1 font-medium pt-0.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> 
                <span className="truncate">{displayNameCheck.message}</span>
              </p>
            )}
          </div>

          {/* Username (Editable, Per-field Save) */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Username</label>
              <span className="text-[10px] text-zinc-500 font-mono">Unique handle</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alexnova"
                className="w-full h-10 px-3.5 bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/20 text-xs sm:text-sm font-sans font-normal text-zinc-900 dark:text-zinc-100 rounded-xl outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 min-w-0"
              />
              {username.trim() !== savedUsername.trim() && username.trim().length >= 2 && (
                <button
                  type="button"
                  onClick={handleSaveUsername}
                  disabled={savingField === "username"}
                  className="h-10 px-3.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 flex items-center gap-1.5"
                >
                  {savingField === "username" ? "Saving..." : "Save"}
                </button>
              )}
              {savedSuccessField === "username" && (
                <span className="h-10 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Saved</span>
                </span>
              )}
            </div>
          </div>

          {/* User ID (Permanent, Read-only, Copy Button) */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1">
                <span>User ID</span>
                <Lock className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Permanent</span>
            </div>
            <div className="relative flex items-center gap-2 min-w-0">
              <input
                type="text"
                readOnly
                value={userId}
                className="w-full h-10 px-3.5 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm font-sans font-normal text-zinc-900 dark:text-zinc-100 rounded-xl outline-none cursor-default select-all min-w-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
              <button
                type="button"
                onClick={handleCopyUserId}
                className="h-10 px-3.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shrink-0 cursor-pointer active:scale-95 border border-zinc-200 dark:border-zinc-700/60"
                title="Copy User ID"
              >
                {copiedUserId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 stroke-[2.5]" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bio (Editable, Per-field Save) */}
          <div className="sm:col-span-2 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Bio</label>
              <span className="text-[10px] text-zinc-500 font-mono">Max 250 chars</span>
            </div>
            <div className="flex items-start gap-2 min-w-0">
              <textarea
                rows={2}
                maxLength={250}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a little about yourself or AI personalization preferences..."
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/20 text-xs sm:text-sm font-sans font-normal text-zinc-900 dark:text-zinc-100 rounded-xl outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none leading-relaxed min-w-0"
              />
              {bio.trim() !== savedBio.trim() && (
                <button
                  type="button"
                  onClick={handleSaveBio}
                  disabled={savingField === "bio"}
                  className="h-10 px-3.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 flex items-center gap-1.5 mt-0.5"
                >
                  {savingField === "bio" ? "Saving..." : "Save"}
                </button>
              )}
              {savedSuccessField === "bio" && (
                <span className="h-10 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Saved</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTACT INFORMATION SECTION */}
      <div className="p-5 md:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
          <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-500 dark:text-sky-400">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Contact Information</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Email and phone details used for account recovery and security
            </p>
          </div>
        </div>

        <div className="space-y-3.5 pt-1">
          {/* EMAIL ADDRESS ROW */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Email Address</span>
                {hasRealEmail ? (
                  emailVerified ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/20 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Unverified
                    </span>
                  )
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 text-[10px] font-semibold border border-zinc-500/20">
                    Not Added
                  </span>
                )}

                {user?.provider === "google" && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-semibold border border-sky-500/20">
                    Google Account
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-mono truncate">
                {hasRealEmail ? emailAddress : <span className="text-zinc-400 dark:text-zinc-500 italic">No email added</span>}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {hasRealEmail ? (
                <button
                  type="button"
                  onClick={openEmailModal}
                  className="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700/60 active:scale-95"
                >
                  {emailVerified ? "Change Email" : "Verify Email"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openEmailModal}
                  className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Add Email</span>
                </button>
              )}
            </div>
          </div>

          {/* PHONE NUMBER ROW */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Phone Number</span>
                {hasPhoneNumber ? (
                  phoneVerified ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/20 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Unverified
                    </span>
                  )
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 text-[10px] font-semibold border border-zinc-500/20">
                    Not Added
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-mono truncate">
                {hasPhoneNumber ? (
                  `${selectedCountry.flag} ${selectedCountry.code} ${phoneNumber}`
                ) : (
                  <span className="text-zinc-400 dark:text-zinc-500 italic">No phone number added</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {hasPhoneNumber ? (
                <>
                  <button
                    type="button"
                    onClick={openPhoneModal}
                    className="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700/60 active:scale-95"
                  >
                    Edit Phone
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhone}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/30 transition-all cursor-pointer active:scale-95"
                    title="Remove Phone Number"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={openPhoneModal}
                  className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Add Phone</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACCOUNT ACTIONS SECTION */}
      <div className="p-5 md:p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-rose-200 dark:border-rose-900/40 pb-3">
          <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400">
            <Trash2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-rose-900 dark:text-rose-200 tracking-tight">Account Actions</h3>
            <p className="text-xs text-rose-600/80 dark:text-rose-300/70 mt-0.5">
              Permanent actions and account deletion choices
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">Delete Account</h4>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-300/70 leading-relaxed max-w-lg">
              Permanently remove your account, profile details, and all chat session history. This action cannot be undone.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteConfirmModal(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs shrink-0 self-end sm:self-center active:scale-95 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* MODAL: EMAIL VERIFICATION / CHANGE / ADD */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-500 dark:text-sky-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {hasRealEmail ? "Change / Verify Email Address" : "Add Email Address"}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    A 6-digit verification code will be sent to your email
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Email Address</label>
                  <input
                    type="email"
                    disabled={emailOtpSent}
                    value={emailModalInput}
                    onChange={(e) => setEmailModalInput(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-10 px-3.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none focus:border-sky-500 disabled:opacity-60"
                  />
                </div>

                {emailOtpSent && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">6-Digit Verification Code</label>
                      <button
                        type="button"
                        onClick={() => setEmailOtpSent(false)}
                        className="text-[11px] text-sky-500 dark:text-sky-400 hover:underline font-medium"
                      >
                        Change Email
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={emailOtpCode}
                      onChange={(e) => setEmailOtpCode(e.target.value)}
                      placeholder="Enter code"
                      className="w-full h-10 px-3.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none font-mono tracking-widest text-center focus:border-sky-500"
                    />
                    <p className="text-[11px] text-zinc-500 pt-0.5">
                      Check your inbox or test code notification to complete verification.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>

                {!emailOtpSent ? (
                  <button
                    type="button"
                    onClick={handleSendEmailVerification}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold rounded-xl cursor-pointer shadow-xs active:scale-95"
                  >
                    Send Code
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmEmailVerification}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Save Email</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ADD / EDIT PHONE NUMBER WITH SEARCHABLE COUNTRY PICKER & SMS OTP */}
      <AnimatePresence>
        {showPhoneModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setShowPhoneModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-500 dark:text-sky-400">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {hasPhoneNumber ? "Edit Phone Number" : "Add Phone Number"}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Select your country code and verify via SMS OTP
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {/* SEARCHABLE COUNTRY SELECTOR */}
                <div className="space-y-1 relative">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                    <span>Country / Dialing Code</span>
                  </label>

                  <button
                    type="button"
                    disabled={phoneOtpSent}
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="w-full h-11 px-3.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl flex items-center justify-between outline-none hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-base">{selectedCountry.flag}</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{selectedCountry.name}</span>
                      <span className="font-mono text-sky-500 dark:text-sky-400 font-bold shrink-0">{selectedCountry.code}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono shrink-0">
                        {selectedCountry.iso}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showCountryDropdown ? "rotate-180" : ""}`} />
                  </button>

                  {/* COUNTRY DROPDOWN MENU */}
                  <AnimatePresence>
                    {showCountryDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="mt-1 z-50 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2.5 space-y-2 text-zinc-900 dark:text-white flex flex-col max-h-64 relative overflow-hidden"
                      >
                        {/* Search Input - Fixed at top */}
                        <div className="relative shrink-0 pb-1 border-b border-zinc-200 dark:border-zinc-800/60">
                          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={countrySearchQuery}
                            onChange={(e) => setCountrySearchQuery(e.target.value)}
                            placeholder="Search country name or code (+91, UK, Japan)..."
                            className="w-full h-8 pl-9 pr-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-lg outline-none focus:border-sky-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                          />
                        </div>

                        {/* Country List - Fully Scrollable */}
                        <div 
                          className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y space-y-0.5 pr-1 divide-y divide-zinc-100 dark:divide-zinc-900/50 max-h-48"
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                        >
                          {filteredCountries.length > 0 ? (
                            filteredCountries.map((c) => (
                              <button
                                key={`${c.iso}-${c.code}`}
                                type="button"
                                onClick={() => {
                                  setSelectedCountry(c);
                                  setShowCountryDropdown(false);
                                  setCountrySearchQuery("");
                                }}
                                className={`w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left cursor-pointer ${
                                  selectedCountry.iso === c.iso && selectedCountry.code === c.code
                                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold"
                                    : "text-zinc-700 dark:text-zinc-200"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <span className="text-base">{c.flag}</span>
                                  <span className="truncate">{c.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono text-zinc-500 dark:text-zinc-400 font-medium">{c.code}</span>
                                  {selectedCountry.iso === c.iso && (
                                    <Check className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                                  )}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-xs text-zinc-500">
                              No matching country found
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* PHONE NUMBER INPUT */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">National Phone Number</label>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {selectedCountry.minDigits === selectedCountry.maxDigits
                        ? `${selectedCountry.minDigits} digits`
                        : `${selectedCountry.minDigits}–${selectedCountry.maxDigits} digits`}
                    </span>
                  </div>

                  <div className="relative flex items-center">
                    <span className="absolute left-3 font-mono text-xs text-sky-500 dark:text-sky-400 font-bold select-none">
                      {selectedCountry.code}
                    </span>
                    <input
                      type="tel"
                      disabled={phoneOtpSent}
                      value={phoneModalInput}
                      onChange={(e) => setPhoneModalInput(e.target.value)}
                      placeholder="e.g. 9876543210"
                      style={{ paddingLeft: `${selectedCountry.code.length * 9 + 20}px` }}
                      className="w-full h-10 pr-3.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none focus:border-sky-500 font-mono disabled:opacity-60"
                    />
                  </div>

                  {phoneModalInput && !isPhoneLengthValid && !phoneOtpSent && (
                    <p className="text-[11px] text-amber-500 dark:text-amber-400 flex items-center gap-1 font-medium pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Number for {selectedCountry.name} should be {selectedCountry.minDigits === selectedCountry.maxDigits ? `${selectedCountry.minDigits}` : `${selectedCountry.minDigits} to ${selectedCountry.maxDigits}`} digits ({digitsOnly.length} entered)
                      </span>
                    </p>
                  )}
                </div>

                {/* SMS OTP INPUT */}
                {phoneOtpSent && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">SMS OTP Code</label>
                      <button
                        type="button"
                        onClick={() => setPhoneOtpSent(false)}
                        className="text-[11px] text-sky-500 dark:text-sky-400 hover:underline font-medium"
                      >
                        Change Number
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={phoneOtpCode}
                      onChange={(e) => setPhoneOtpCode(e.target.value)}
                      placeholder="Enter 6-digit SMS code"
                      className="w-full h-10 px-3.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white rounded-xl outline-none font-mono tracking-widest text-center focus:border-sky-500"
                    />
                    <p className="text-[11px] text-zinc-500 pt-0.5">
                      Check your SMS inbox or test code notification to verify.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>

                {!phoneOtpSent ? (
                  <button
                    type="button"
                    onClick={handleSendPhoneOtp}
                    disabled={!isPhoneLengthValid}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-zinc-950 text-xs font-bold rounded-xl cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    Send SMS OTP
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleVerifyPhoneOtp}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Save Phone</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DELETE ACCOUNT CONFIRMATION */}
      <AnimatePresence>
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white relative"
            >
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Delete Your Account?</h3>
                  <p className="text-xs text-rose-500 dark:text-rose-400 font-medium">This action is permanent and irreversible</p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Are you sure you want to delete your account? All your personal preferences, chat logs, profile details, and account access will be permanently removed.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAccount}
                  disabled={deletingAccount}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {deletingAccount ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
