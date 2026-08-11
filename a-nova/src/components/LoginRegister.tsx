import React, { useState, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { apiFetch } from "../apiClient";
import { motion, AnimatePresence } from "motion/react";
import AnovaLogo from "./AnovaLogo";
import { InternationalPhoneInput, PhoneInputChangePayload } from "./InternationalPhoneInput";
import { 
  X, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle,
  Phone,
  ArrowLeft,
  Edit2,
  RefreshCw
} from "lucide-react";

interface LoginRegisterProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAuthSuccess: (token: string, user: any) => void;
  initialRegistering?: boolean;
}

function LoginRegisterComponent({ 
  isOpen = true, 
  onClose, 
  onAuthSuccess 
}: LoginRegisterProps) {
  // Main view modes: "options" (Email entry & provider options), "email" (OTP verification), "phone" (Phone OTP)
  const [mode, setMode] = useState<"options" | "email" | "phone">("options");

  // Form state - Email (strictly empty by default, no prefill)
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  // Phone auth state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [phoneValidationError, setPhoneValidationError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handlePhoneInputChange = (payload: PhoneInputChangePayload) => {
    setPhoneNumber(payload.rawInput);
    setPhoneE164(payload.e164);
    setIsPhoneValid(payload.isValid);
    setPhoneValidationError(payload.error);
  };

  // Email OTP state
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Async & UI status states - separate loading state per auth provider
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState<(() => void) | null>(null);

  const isAnyLoading = emailLoading || googleLoading || phoneLoading;

  // Email validation regex helper
  const validateEmailFormat = (str: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(str.trim());
  };

  const isEmailValid = validateEmailFormat(email);

  // Reset/Initialize state when modal opens (never prefill email field)
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setEmailError(null);
      setErrorMessage(null);
      setSuccessMessage(null);
      setCanRetry(null);
      setMode("options");
      setEmailOtpCode("");
      setOtpCode("");
      setOtpSent(false);
      setEmailLoading(false);
      setGoogleLoading(false);
      setPhoneLoading(false);
      setResendTimer(0);
    }
  }, [isOpen]);

  // Resend Countdown Timer effect
  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  // Auto-focus management for OTP input screen
  useEffect(() => {
    if (isOpen && mode === "email") {
      const timer = setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode]);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmailError(null);
    setCanRetry(null);
  };

  const resetAllFormStates = () => {
    clearMessages();
    setOtpSent(false);
    setOtpCode("");
    setEmailOtpCode("");
    setEmailLoading(false);
    setGoogleLoading(false);
    setPhoneLoading(false);
    setResendTimer(0);
  };

  // Step 1: Send Email OTP & Navigate directly to OTP verification screen
  const handleEmailContinue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (emailLoading || googleLoading || phoneLoading) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setEmailError("Email address is required.");
      return;
    }

    if (!validateEmailFormat(trimmedEmail)) {
      setEmailError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    clearMessages();
    setEmailLoading(true);

    const executeSendOtp = async () => {
      setEmailLoading(true);
      setErrorMessage(null);
      setCanRetry(null);

      try {
        const res = await apiFetch("/api/auth/send-email-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail })
        }, "LoginRegister:sendEmailOtp");

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to send verification code.");
        }

        setMode("email");
        setEmailOtpCode("");
        setResendTimer(60);
        setSuccessMessage(`A 6-digit verification code was sent to ${trimmedEmail}`);
      } catch (err: any) {
        console.error("[AUTH SEND OTP ERROR]", err);
        setErrorMessage(err.message || "Network issue sending verification code. Please try again.");
        setCanRetry(() => executeSendOtp);
      } finally {
        setEmailLoading(false);
      }
    };

    await executeSendOtp();
  };

  // Step 2: Verify Email OTP Code -> Log in existing user or automatically create new account
  const handleVerifyEmailOtpDirect = async (codeToVerify: string) => {
    if (emailLoading) return;

    const cleanCode = codeToVerify.replace(/\D/g, "").slice(0, 6);
    if (cleanCode.length < 4) {
      setErrorMessage("Please enter the full 6-digit verification code.");
      return;
    }

    clearMessages();
    setEmailLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    const executeVerify = async () => {
      setEmailLoading(true);
      setErrorMessage(null);
      setCanRetry(null);

      try {
        const res = await apiFetch("/api/auth/verify-email-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: cleanEmail, 
            otp: cleanCode 
          })
        }, "LoginRegister:verifyEmailOtp");

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || "Verification failed. Incorrect or expired code.");
        }

        // Store active session details
        localStorage.setItem("a_nova_auth_token", resData.token);
        localStorage.setItem("a_nova_user_data", JSON.stringify(resData.user));
        localStorage.setItem("a_nova_remembered_email", cleanEmail);

        // Instantly sign user in & redirect
        onAuthSuccess(resData.token, resData.user);
      } catch (err: any) {
        console.error("[VERIFY EMAIL OTP ERROR]", err);
        setErrorMessage(err.message || "Invalid or expired verification code.");
        setCanRetry(() => () => handleVerifyEmailOtpDirect(cleanCode));
      } finally {
        setEmailLoading(false);
      }
    };

    await executeVerify();
  };

  const handleVerifyEmailOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyEmailOtpDirect(emailOtpCode);
  };

  // Resend Email OTP
  const handleResendEmailOtp = async () => {
    if (emailLoading || resendTimer > 0) return;

    clearMessages();
    setEmailLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await apiFetch("/api/auth/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail })
      }, "LoginRegister:resendEmailOtp");

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to resend verification code.");
      }

      setEmailOtpCode("");
      setResendTimer(60);
      setSuccessMessage(`A new 6-digit verification code was sent to ${cleanEmail}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to resend verification code.");
    } finally {
      setEmailLoading(false);
    }
  };

  // OTP Input Change & Auto-Submit on 6 digits
  const handleOtpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanDigits = rawVal.replace(/\D/g, "").slice(0, 6);
    setEmailOtpCode(cleanDigits);
    if (errorMessage) setErrorMessage(null);

    if (cleanDigits.length === 6 && !emailLoading) {
      handleVerifyEmailOtpDirect(cleanDigits);
    }
  };

  // OTP Clipboard Paste Handler
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const cleanDigits = pastedText.replace(/\D/g, "").slice(0, 6);
    if (cleanDigits) {
      setEmailOtpCode(cleanDigits);
      if (errorMessage) setErrorMessage(null);
      if (cleanDigits.length === 6 && !emailLoading) {
        handleVerifyEmailOtpDirect(cleanDigits);
      }
    }
  };

  // Google OAuth Sign-In (completely isolated from Email flow)
  const handleGoogleLogin = async () => {
    if (googleLoading || emailLoading || phoneLoading) return;

    clearMessages();
    setGoogleLoading(true);

    try {
      if (isSupabaseConfigured) {
        const redirectUrl = window.location.origin;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl,
            scopes: "openid email profile",
            queryParams: { access_type: "offline", prompt: "consent" }
          }
        });
        if (error) {
          throw new Error(error.message || "Google Sign-In failed.");
        }
        return;
      }

      const googleEmail = "google.user@gmail.com";
      const userDisplayName = "Google User";
      const googleId = "google_user_default";
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=google_user`;

      const syncRes = await apiFetch("/api/auth/google-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail,
          displayName: userDisplayName,
          avatarUrl: avatarUrl,
          googleId: googleId,
          provider: "google"
        })
      }, "LoginRegister:handleGoogleLogin");

      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData.token && syncData.user) {
          localStorage.setItem("a_nova_auth_token", syncData.token);
          localStorage.setItem("a_nova_user_data", JSON.stringify(syncData.user));
          localStorage.setItem("a_nova_remembered_email", syncData.user.email);
          onAuthSuccess(syncData.token, syncData.user);
          return;
        }
      }

      throw new Error("Failed to process Google authentication profile.");
    } catch (err: any) {
      setErrorMessage(err?.message || "Google Sign-In is temporarily unavailable.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Phone Auth Step 1: Send SMS OTP
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneLoading) return;

    if (!phoneE164 || !isPhoneValid) {
      setErrorMessage(phoneValidationError || "Please enter a valid mobile number.");
      return;
    }

    clearMessages();
    setPhoneLoading(true);

    try {
      const res = await apiFetch("/api/auth/send-sms-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneE164 })
      }, "LoginRegister:sendSmsOtp");

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to send verification code.");
      }

      setOtpSent(true);
      setSuccessMessage(`Verification code sent to ${phoneE164}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send verification code.");
    } finally {
      setPhoneLoading(false);
    }
  };

  // Phone Auth Step 2: Verify SMS OTP
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneLoading) return;

    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    clearMessages();
    setPhoneLoading(true);

    try {
      const res = await apiFetch("/api/auth/verify-sms-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneE164, otp: otpCode.trim() })
      }, "LoginRegister:verifySmsOtp");

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Verification failed. Incorrect or expired code.");
      }

      localStorage.setItem("a_nova_auth_token", resData.token);
      localStorage.setItem("a_nova_user_data", JSON.stringify(resData.user));
      onAuthSuccess(resData.token, resData.user);
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid or expired verification code.");
    } finally {
      setPhoneLoading(false);
    }
  };

  // Back Navigation & Preserve Email
  const handleBackNavigation = () => {
    clearMessages();
    if (mode === "phone") {
      setMode("options");
      setOtpSent(false);
      setOtpCode("");
    } else if (mode === "email") {
      setMode("options");
      // preserve entered `email` in state
    }
  };

  const handleEditEmail = () => {
    clearMessages();
    setMode("options");
    // preserve entered `email` in state
  };

  if (!isOpen) return null;

  return (
    <div id="login_sheet_portal" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none touch-action-manipulation">
      
      {/* Backdrop overlay - optimized GPU fade without backdrop-blur repaint overhead */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "linear" }}
        onClick={onClose}
        style={{ willChange: "opacity" }}
        className="absolute inset-0 bg-black/70 cursor-pointer"
      />

      {/* Bottom Sheet / Modal Card - hardware accelerated translation */}
      <motion.div
        initial={{ y: 32, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: "transform, opacity" }}
        className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800/80 shadow-2xl overflow-hidden p-6 sm:p-8 z-10 text-zinc-900 dark:text-zinc-100 max-h-[92vh] flex flex-col justify-between transform-gpu"
      >
          {/* Mobile grab bar */}
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto -mt-2 mb-4 sm:hidden shrink-0" />

          {/* Close (X) button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Modal Header */}
          <div className="text-center mt-1 mb-5">
            <div className="flex justify-center mb-3">
              <AnovaLogo size="sm" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-zinc-900 dark:text-white">
              {mode === "options" && "Welcome back"}
              {mode === "phone" && "Phone Sign In"}
              {mode === "email" && "Check your inbox"}
            </h2>

            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {mode === "options" && "Log in or sign up to sync chats and preferences across devices."}
              {mode === "phone" && "Enter your mobile number to receive a verification code."}
              {mode === "email" && `Enter the 6-digit code sent to ${email}`}
            </p>
          </div>

          {/* Inline Error Banner */}
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {canRetry && (
                <button
                  type="button"
                  onClick={() => canRetry()}
                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 font-semibold rounded-lg text-[11px] flex items-center gap-1 shrink-0 transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
            </motion.div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {/* MODE 1: Email Entry & Social SSO Options */}
          {mode === "options" && (
            <div className="space-y-3">
              {/* Google Auth Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isAnyLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {googleLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    <span>Connecting to Google...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Phone Auth Button */}
              <button
                type="button"
                onClick={() => { resetAllFormStates(); setMode("phone"); }}
                disabled={isAnyLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Phone className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
                <span>Continue with Phone</span>
              </button>

              {/* OR Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-mono">
                  <span className="bg-white dark:bg-zinc-900 px-3 text-zinc-400">OR</span>
                </div>
              </div>

              {/* Direct Email Entry Form (Email → OTP flow) */}
              <form onSubmit={handleEmailContinue} className="space-y-3" noValidate>
                <div>
                  <div className="relative">
                    <input
                      ref={emailInputRef}
                      id="login_email_input"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Enter your email"
                      autoComplete="email"
                      disabled={isAnyLoading}
                      required
                      className={`w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/80 border ${
                        emailError 
                          ? "border-rose-500 focus:ring-rose-500/30" 
                          : "border-zinc-300 dark:border-zinc-700 focus:ring-sky-500/30"
                      } rounded-2xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition disabled:opacity-50`}
                    />
                  </div>

                  {/* Inline Email Validation Error */}
                  {emailError && (
                    <p className="mt-1.5 text-[11px] font-medium text-rose-500 flex items-center gap-1 px-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{emailError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isAnyLoading || !isEmailValid}
                  className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white font-semibold text-xs sm:text-sm rounded-full transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emailLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      <span>Sending verification code...</span>
                    </div>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* MODE 2: Email OTP Verification Screen */}
          {mode === "email" && (
            <div className="space-y-3.5">
              {/* Verification OTP Form */}
              <form onSubmit={handleVerifyEmailOtpSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 text-center">
                    6-Digit Verification Code
                  </label>
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={emailOtpCode}
                    onChange={handleOtpInputChange}
                    onPaste={handleOtpPaste}
                    placeholder=""
                    disabled={emailLoading}
                    autoFocus
                    required
                    className="w-full text-center tracking-[0.35em] font-mono text-base sm:text-lg py-2.5 px-4 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={emailLoading || emailOtpCode.replace(/\D/g, "").length < 4}
                  className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white font-semibold text-xs sm:text-sm rounded-full transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emailLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      <span>Verifying code...</span>
                    </div>
                  ) : (
                    <span>Verify & Continue</span>
                  )}
                </button>

                <div className="flex items-center justify-between pt-0.5 text-xs">
                  <button
                    type="button"
                    onClick={handleBackNavigation}
                    className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendEmailOtp}
                    disabled={emailLoading || resendTimer > 0}
                    className="text-sky-600 dark:text-sky-400 hover:underline font-medium cursor-pointer disabled:opacity-50 disabled:no-underline"
                  >
                    {resendTimer > 0 ? `Resend code (${resendTimer}s)` : "Resend Code"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MODE 3: Phone Number Verification */}
          {mode === "phone" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={handleBackNavigation}
                  className="p-1 rounded-full text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Phone Authentication</span>
              </div>

              {!otpSent ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Phone Number
                    </label>
                    <InternationalPhoneInput
                      value={phoneNumber}
                      onChange={handlePhoneInputChange}
                      disabled={phoneLoading}
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={phoneLoading || !isPhoneValid}
                    className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white font-semibold text-xs sm:text-sm rounded-full transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {phoneLoading ? (
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      <span>Send Verification Code</span>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Enter Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode("");
                          clearMessages();
                        }}
                        className="text-[11px] font-medium text-sky-500 hover:underline cursor-pointer"
                      >
                        Change Number
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      disabled={phoneLoading}
                      required
                      className="w-full text-center tracking-[0.2em] font-mono text-lg py-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition disabled:opacity-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={phoneLoading || !otpCode}
                    className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white font-semibold text-xs sm:text-sm rounded-full transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {phoneLoading ? (
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      <span>Verify & Continue</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Footer terms notice */}
          <div className="mt-6 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
            By continuing, you agree to A-NOVA's Terms of Service and Privacy Policy.
          </div>

        </motion.div>
      </div>
    );
}

export default React.memo(LoginRegisterComponent);
