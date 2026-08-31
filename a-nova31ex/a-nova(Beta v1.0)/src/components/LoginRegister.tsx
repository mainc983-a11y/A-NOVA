import React, { useState, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../supabaseClient";
import { apiFetch } from "../apiClient";
import { motion, AnimatePresence } from "motion/react";
import AnovaLogo from "./AnovaLogo";
import { InternationalPhoneInput, PhoneInputChangePayload } from "./InternationalPhoneInput";
import { 
  X, 
  Mail, 
  Lock,
  Eye,
  EyeOff,
  ArrowRight, 
  AlertCircle, 
  CheckCircle,
  Phone,
  ArrowLeft,
  Edit2,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  UserPlus
} from "lucide-react";

interface LoginRegisterProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAuthSuccess: (token: string, user: any) => void;
  initialRegistering?: boolean;
}

type AuthMode = 
  | "options"             // Step 1: Enter email & social options
  | "password-login"      // Step 2A: Email exists -> enter password
  | "no-account"          // Step 2B: Email does not exist -> prompt to Sign up
  | "signup"              // Step 2C: Create account (Email, Password, Confirm Password)
  | "forgot-password-sent"// Forgot password email dispatched confirmation
  | "reset-password"      // Reset password flow (new password & confirm)
  | "phone";              // Phone OTP auth flow

function LoginRegisterComponent({ 
  isOpen = true, 
  onClose, 
  onAuthSuccess,
  initialRegistering = false 
}: LoginRegisterProps) {
  // Main view modes
  const [mode, setMode] = useState<AuthMode>(initialRegistering ? "signup" : "options");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field validation errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  // Phone auth state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [phoneValidationError, setPhoneValidationError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Async & UI status states
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Reset token from URL query if user clicked a recovery link
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);

  // Input refs
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const signupPasswordInputRef = useRef<HTMLInputElement>(null);

  const isAnyLoading = emailLoading || googleLoading || phoneLoading;

  // Email format validator
  const validateEmailFormat = (str: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(str.trim());
  };

  const isEmailValid = validateEmailFormat(email);

  // Check URL on mount for password recovery tokens
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const isRecovery = searchParams.get("type") === "recovery" || hashParams.get("type") === "recovery";
      const token = searchParams.get("token") || hashParams.get("access_token");
      const urlEmail = searchParams.get("email");

      if (isRecovery) {
        if (token) setRecoveryToken(token);
        if (urlEmail) setEmail(urlEmail);
        setMode("reset-password");
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      clearMessages();
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setEmailLoading(false);
      setGoogleLoading(false);
      setPhoneLoading(false);
      setResendTimer(0);

      // Check if URL has recovery parameter, otherwise reset to options or initial mode
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const isRecovery = searchParams.get("type") === "recovery" || hashParams.get("type") === "recovery";
      if (!isRecovery) {
        setMode(initialRegistering ? "signup" : "options");
      }
    }
  }, [isOpen, initialRegistering]);

  // Resend Countdown Timer effect
  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  // Auto-focus management
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (mode === "options") {
        emailInputRef.current?.focus();
      } else if (mode === "password-login") {
        passwordInputRef.current?.focus();
      } else if (mode === "signup") {
        signupPasswordInputRef.current?.focus();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isOpen, mode]);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
  };

  // --- STEP 1: Email Check (ChatGPT-style progressive sign-in) ---
  const handleEmailContinue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (emailLoading || googleLoading || phoneLoading) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setEmailError("Please enter your email address.");
      return;
    }

    if (!validateEmailFormat(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    clearMessages();
    setEmailLoading(true);

    try {
      // Check whether an account exists for this email
      const res = await apiFetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail })
      }, "LoginRegister:checkEmail");

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to verify email account.");
      }

      if (data.exists) {
        // Email exists -> prompt for password login
        setMode("password-login");
        setPassword("");
      } else {
        // Email does NOT exist -> show sign up option
        setMode("no-account");
      }
    } catch (err: any) {
      console.error("[CHECK EMAIL ERROR]", err);
      setErrorMessage(err.message || "Failed to connect to authentication server. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  // --- STEP 2A: Password Login for Existing Users ---
  const handlePasswordLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailLoading || isAnyLoading) return;

    const trimmedEmail = email.trim().toLowerCase();
    if (!password) {
      setPasswordError("Please enter your password.");
      return;
    }

    clearMessages();
    setEmailLoading(true);

    try {
      // 1. Try Supabase Password Login if configured
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: password
          });

          if (!error && data?.session) {
            const token = data.session.access_token;
            const user = {
              id: data.user.id,
              email: data.user.email,
              username: data.user.email?.split("@")[0] || "user",
              displayName: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "User",
              avatarUrl: data.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.user.id}`,
              createdAt: data.user.created_at,
              emailVerified: true
            };

            localStorage.setItem("a_nova_auth_token", token);
            localStorage.setItem("a_nova_user_data", JSON.stringify(user));
            localStorage.setItem("a_nova_remembered_email", trimmedEmail);
            onAuthSuccess(token, user);
            return;
          }
        } catch (supaErr) {
          console.warn("[SUPABASE LOGIN NOTICE] Falling back to primary auth API:", supaErr);
        }
      }

      // 2. Primary / Local Backend Login Endpoint
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password: password
        })
      }, "LoginRegister:passwordLogin");

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || "Incorrect password. Please try again or reset it.");
      }

      localStorage.setItem("a_nova_auth_token", resData.token);
      localStorage.setItem("a_nova_user_data", JSON.stringify(resData.user));
      localStorage.setItem("a_nova_remembered_email", trimmedEmail);
      onAuthSuccess(resData.token, resData.user);
    } catch (err: any) {
      console.error("[PASSWORD LOGIN ERROR]", err);
      setErrorMessage(err.message || "Invalid email or password.");
    } finally {
      setEmailLoading(false);
    }
  };

  // --- FORGOT PASSWORD HANDLER ---
  const handleForgotPassword = async () => {
    if (emailLoading) return;
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !validateEmailFormat(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address first.");
      return;
    }

    clearMessages();
    setEmailLoading(true);

    try {
      const redirectUrl = window.location.origin && !window.location.origin.includes("localhost")
        ? window.location.origin
        : "https://a-nova.vercel.app/";

      // 1. Trigger Supabase Password Reset if available
      if (isSupabaseConfigured) {
        try {
          await supabase.auth.resetPasswordForEmail(trimmedEmail, {
            redirectTo: `${redirectUrl}?type=recovery`
          });
        } catch (supaErr) {
          console.warn("[SUPABASE FORGOT PASSWORD NOTICE]:", supaErr);
        }
      }

      // 2. Trigger Backend Password Reset Dispatcher
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail })
      }, "LoginRegister:forgotPassword");

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch password reset email.");
      }

      setResendTimer(60);
      setMode("forgot-password-sent");
      setSuccessMessage("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      console.error("[FORGOT PASSWORD ERROR]", err);
      setErrorMessage(err.message || "Failed to send password reset email. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  // --- STEP 2C: Account Sign Up with Password Confirmation ---
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailLoading || isAnyLoading) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !validateEmailFormat(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setPasswordError("Password is required.");
      return;
    }

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      return;
    }

    clearMessages();
    setEmailLoading(true);

    try {
      // 1. Supabase Sign Up if configured
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email: trimmedEmail,
            password: password
          });
          if (error && !error.message.includes("already registered")) {
            console.warn("[SUPABASE SIGNUP NOTICE]:", error.message);
          }
        } catch (supaErr) {
          console.warn("[SUPABASE SIGNUP NOTICE]:", supaErr);
        }
      }

      // 2. Local / Server Database Registration
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password: password,
          username: trimmedEmail.split("@")[0]
        })
      }, "LoginRegister:register");

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || "Failed to create account. Please try again.");
      }

      localStorage.setItem("a_nova_auth_token", resData.token);
      localStorage.setItem("a_nova_user_data", JSON.stringify(resData.user));
      localStorage.setItem("a_nova_remembered_email", trimmedEmail);
      onAuthSuccess(resData.token, resData.user);
    } catch (err: any) {
      console.error("[SIGNUP ERROR]", err);
      setErrorMessage(err.message || "Failed to create account. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  // --- PASSWORD RECOVERY UPDATE ---
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailLoading) return;

    if (!password) {
      setPasswordError("New password is required.");
      return;
    }

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      return;
    }

    clearMessages();
    setEmailLoading(true);

    try {
      // 1. Update password in Supabase if session exists
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.auth.updateUser({ password: password });
          if (error) console.warn("[SUPABASE UPDATE PASSWORD]:", error.message);
        } catch (supaErr) {
          console.warn("[SUPABASE UPDATE PASSWORD]:", supaErr);
        }
      }

      // 2. Update password on server
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token: recoveryToken,
          newPassword: password
        })
      }, "LoginRegister:resetPassword");

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      localStorage.setItem("a_nova_auth_token", data.token);
      localStorage.setItem("a_nova_user_data", JSON.stringify(data.user));
      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      console.error("[RESET PASSWORD ERROR]", err);
      setErrorMessage(err.message || "Failed to reset password. Please request a new link.");
    } finally {
      setEmailLoading(false);
    }
  };

  // --- GOOGLE OAUTH SIGN-IN ---
 const handleGoogleLogin = async () => {
  if (googleLoading || emailLoading || phoneLoading) return;

  clearMessages();
  setGoogleLoading(true);

  try {
    if (!isSupabaseConfigured) {
      console.error("[GOOGLE LOGIN] Supabase is NOT configured");
      setErrorMessage(
        "Google login is unavailable because Supabase is not configured."
      );
      return;
    }

    const redirectUrl = window.location.origin;

    console.log("[GOOGLE LOGIN] Supabase configured:", isSupabaseConfigured);
    console.log("[GOOGLE LOGIN] Redirect URL:", redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          prompt: "select_account"
        }
      }
   });

    if (error) {
      console.error("[GOOGLE LOGIN ERROR]", error);
      throw new Error(error.message || "Google Sign-In failed.");
    }

    console.log("[GOOGLE LOGIN] OAuth request successful");
  } catch (err: any) {
    console.error("[GOOGLE LOGIN ERROR]", err);
    setErrorMessage(
      err?.message || "Google Sign-In is temporarily unavailable."
    );
  } finally {
    setGoogleLoading(false);
  }
};
  // --- PHONE AUTH HANDLERS ---
  const handlePhoneInputChange = (payload: PhoneInputChangePayload) => {
    setPhoneNumber(payload.rawInput);
    setPhoneE164(payload.e164);
    setIsPhoneValid(payload.isValid);
    setPhoneValidationError(payload.error);
  };

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

  if (!isOpen) return null;

  return (
    <div id="login_sheet_portal" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none touch-action-manipulation">
      
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "linear" }}
        onClick={onClose}
        style={{ willChange: "opacity" }}
        className="absolute inset-0 bg-black/70 cursor-pointer"
      />

      {/* Bottom Sheet / Modal Card */}
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
            {mode === "options" && "Sign in or create account"}
            {mode === "password-login" && "Enter your password"}
            {mode === "no-account" && "Create your account"}
            {mode === "signup" && "Create your account"}
            {mode === "forgot-password-sent" && "Check your inbox"}
            {mode === "reset-password" && "Set new password"}
            {mode === "phone" && "Phone Sign In"}
          </h2>

          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
            {mode === "options" && "Log in or sign up to access your AI workspace across devices."}
            {mode === "password-login" && "Enter the password associated with your account."}
            {mode === "no-account" && "No account exists for this email yet. Sign up to get started."}
            {mode === "signup" && "Enter a password to complete your account setup."}
            {mode === "forgot-password-sent" && `We sent a password reset link to ${email}.`}
            {mode === "reset-password" && "Enter and confirm your new password."}
            {mode === "phone" && "Enter your mobile number to receive a verification code."}
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

        {/* --- VIEW 1: Initial Email & SSO Options (ChatGPT Style Step 1) --- */}
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
              onClick={() => { clearMessages(); setMode("phone"); }}
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

            {/* Step 1 Email Entry Form */}
            <form onSubmit={handleEmailContinue} className="space-y-3" noValidate>
              <div>
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
                  placeholder="Email address"
                  autoComplete="email"
                  disabled={isAnyLoading}
                  required
                  className={`w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/80 border ${
                    emailError 
                      ? "border-rose-500 focus:ring-rose-500/30" 
                      : "border-zinc-300 dark:border-zinc-700 focus:ring-sky-500/30"
                  } rounded-2xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition disabled:opacity-50`}
                />

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
                    <span>Checking account...</span>
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

        {/* --- VIEW 2A: Password Login for Existing Account --- */}
        {mode === "password-login" && (
          <div className="space-y-4">
            {/* Email identifier badge with Edit action */}
            <div className="flex items-center justify-between p-2.5 px-3.5 bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl text-xs">
              <div className="flex items-center gap-2 overflow-hidden text-zinc-700 dark:text-zinc-300">
                <Mail className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                <span className="truncate font-medium">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => { clearMessages(); setMode("options"); }}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-2"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            <form onSubmit={handlePasswordLoginSubmit} className="space-y-3">
              <div>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    id="login_password_input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Password"
                    autoComplete="current-password"
                    disabled={emailLoading}
                    required
                    className={`w-full px-4 py-3 pr-11 bg-zinc-50 dark:bg-zinc-800/80 border ${
                      passwordError
                        ? "border-rose-500 focus:ring-rose-500/30"
                        : "border-zinc-300 dark:border-zinc-700 focus:ring-sky-500/30"
                    } rounded-2xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition disabled:opacity-50`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {passwordError && (
                  <p className="mt-1.5 text-[11px] font-medium text-rose-500 flex items-center gap-1 px-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{passwordError}</span>
                  </p>
                )}
              </div>

              {/* Forgot password trigger */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={emailLoading}
                  className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={emailLoading || !password}
                className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white font-semibold text-xs sm:text-sm rounded-full transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <span>Continue</span>
                )}
              </button>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => { clearMessages(); setMode("options"); }}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to email</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- VIEW 2B: Email Not Found Prompt (ChatGPT Style No-Account State) --- */}
        {mode === "no-account" && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl text-center space-y-2">
              <div className="w-10 h-10 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-full flex items-center justify-center mx-auto">
                <UserPlus className="w-5 h-5" />
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                No account found for <span className="font-semibold text-zinc-900 dark:text-white">{email}</span>
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Would you like to sign up and create a new account with this email?
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => { clearMessages(); setMode("signup"); }}
                className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white font-semibold text-xs sm:text-sm rounded-full transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Sign up</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => { clearMessages(); setMode("options"); }}
                className="w-full py-2.5 px-4 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Use a different email</span>
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW 2C: Account Sign Up Form --- */}
        {mode === "signup" && (
          <div className="space-y-3.5">
            <form onSubmit={handleSignUpSubmit} className="space-y-3" noValidate>
              {/* Email field (editable) */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1 px-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="name@example.com"
                  autoComplete="email"
                  disabled={emailLoading}
                  required
                  className={`w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border ${
                    emailError ? "border-rose-500" : "border-zinc-300 dark:border-zinc-700 focus:ring-sky-500/30"
                  } rounded-2xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition`}
                />
                {emailError && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500 px-1">{emailError}</p>
                )}
              </div>

              {/* Password field */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1 px-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    ref={signupPasswordInputRef}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    disabled={emailLoading}
                    required
                    className={`w-full px-4 py-2.5 pr-11 bg-zinc-50 dark:bg-zinc-800/80 border ${
                      passwordError ? "border-rose-500" : "border-zinc-300 dark:border-zinc-700 focus:ring-sky-500/30"
                    } rounded-2xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500 px-1">{passwordError}</p>
                )}
              </div>

              {/* Confirm Password field */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1 px-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPasswordError) setConfirmPasswordError(null);
                    }}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    disabled={emailLoading}
                    required
                    className={`w-full px-4 py-2.5 pr-11 bg-zinc-50 dark:bg-zinc-800/80 border ${
                      confirmPasswordError ? "border-rose-500" : "border-zinc-300 dark:border-zinc-700 focus:ring-sky-500/30"
                    } rounded-2xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer p-1"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPasswordError && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500 px-1">{confirmPasswordError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={emailLoading || !email || !password || !confirmPassword}
                className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white font-semibold text-xs sm:text-sm rounded-full transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {emailLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <span>Create account</span>
                )}
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => { clearMessages(); setMode("options"); }}
                  className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => { clearMessages(); setMode("options"); }}
                  className="text-sky-600 dark:text-sky-400 hover:underline font-medium cursor-pointer"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- VIEW 3: Password Reset Sent State --- */}
        {mode === "forgot-password-sent" && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <Mail className="w-6 h-6" />
            </div>

            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl space-y-1.5 text-xs">
              <p className="font-semibold text-zinc-900 dark:text-white">
                Password reset email sent. Check your inbox.
              </p>
              <p className="text-zinc-500 dark:text-zinc-400">
                Click the secure link inside the email to set a new password for <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={emailLoading || resendTimer > 0}
                className="w-full py-2.5 px-4 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline"
              >
                {resendTimer > 0 ? `Resend reset email (${resendTimer}s)` : "Resend email"}
              </button>

              <button
                type="button"
                onClick={() => { clearMessages(); setMode("password-login"); }}
                className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white font-semibold text-xs sm:text-sm rounded-full transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW 4: Reset Password (New Password & Confirm) --- */}
        {mode === "reset-password" && (
          <div className="space-y-3.5">
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1 px-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    disabled={emailLoading}
                    required
                    className={`w-full px-4 py-2.5 pr-11 bg-zinc-50 dark:bg-zinc-800/80 border ${
                      passwordError ? "border-rose-500" : "border-zinc-300 dark:border-zinc-700 focus:ring-sky-500/30"
                    } rounded-2xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500 px-1">{passwordError}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1 px-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPasswordError) setConfirmPasswordError(null);
                    }}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    disabled={emailLoading}
                    required
                    className={`w-full px-4 py-2.5 pr-11 bg-zinc-50 dark:bg-zinc-800/80 border ${
                      confirmPasswordError ? "border-rose-500" : "border-zinc-300 dark:border-zinc-700 focus:ring-sky-500/30"
                    } rounded-2xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 transition`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPasswordError && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500 px-1">{confirmPasswordError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={emailLoading || !password || !confirmPassword}
                className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white font-semibold text-xs sm:text-sm rounded-full transition cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {emailLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    <span>Updating password...</span>
                  </div>
                ) : (
                  <span>Update password & sign in</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* --- VIEW 5: Phone Number Verification Flow --- */}
        {mode === "phone" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                onClick={() => { clearMessages(); setMode("options"); }}
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
