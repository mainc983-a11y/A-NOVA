import React, { useState, useEffect, useRef } from "react";
import { 
  Lock, 
  Mail, 
  Phone, 
  ChevronDown, 
  User, 
  ArrowLeft, 
  RefreshCw, 
  Check, 
  Copy, 
  Eye, 
  EyeOff,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as AppUser } from "../types";
import { supabase } from "../supabaseClient";

interface LoginRegisterProps {
  onAuthSuccess: (token: string, user: AppUser) => void;
}

type Mode = "signin" | "signup" | "forgot" | "otp_verify_signup" | "otp_verify_reset";

const COUNTRY_CODES = [
  { code: "+1", label: "US (+1)" },
  { code: "+91", label: "IN (+91)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "AU (+61)" },
  { code: "+81", label: "JP (+81)" },
  { code: "+49", label: "DE (+49)" },
  { code: "+33", label: "FR (+33)" },
  { code: "+65", label: "SG (+65)" },
  { code: "+971", label: "AE (+971)" },
  { code: "+86", label: "CN (+86)" }
];

export default function LoginRegister({ onAuthSuccess }: LoginRegisterProps) {
  // Nav module context modes
  const [mode, setMode] = useState<Mode>("signin");
  const [activeTab, setActiveTab] = useState<"email" | "mobile">("email");

  // Email Sign In credentials state
  const [emailLoginEmail, setEmailLoginEmail] = useState("");
  const [emailLoginPassword, setEmailLoginPassword] = useState("");

  // Mobile Sign In credentials state
  const [mobileLoginPhone, setMobileLoginPhone] = useState("");
  const [mobileLoginCountryCode, setMobileLoginCountryCode] = useState("+1");
  const [mobileLoginPassword, setMobileLoginPassword] = useState("");

  // Create Account credentials state
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  // Forgot / Reset Password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // OTP inputs grid
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // UI status feedbacks
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Timers and testers helpers
  const [cooldown, setCooldown] = useState(0);
  const [expiry, setExpiry] = useState(600); // 10 minutes clock

  // Cooldown tracker
  useEffect(() => {
    if (cooldown > 0) {
      const interval = setInterval(() => setCooldown(c => c - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [cooldown]);

  // Expiry tracker
  useEffect(() => {
    const otpVerifySelected = mode === "otp_verify_signup" || mode === "otp_verify_reset";
    if (otpVerifySelected) {
      const interval = setInterval(() => {
        setExpiry(exp => {
          if (exp <= 1) {
            setError("The code has expired. Please request a new code.");
            return 0;
          }
          return exp - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [mode]);

  const handleOtpChange = (val: string, index: number) => {
    const digit = val.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otpDigits];
    newOtp[index] = digit;
    setOtpDigits(newOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        const newOtp = [...otpDigits];
        newOtp[index - 1] = "";
        setOtpDigits(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().replace(/[^0-9]/g, "");
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const clearOtp = () => {
    setOtpDigits(Array(6).fill(""));
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const getFullPhone = () => {
    return mobileLoginCountryCode + mobileLoginPhone.replace(/[^0-9]/g, "");
  };

  const extractError = (data: any, fallback: string) => {
    if (!data) return fallback;
    if (data.detail) {
      if (typeof data.detail === "object") {
        return data.detail.error || data.detail.detail || JSON.stringify(data.detail);
      }
      return data.detail;
    }
    return data.error || data.message || fallback;
  };

  // SIGN IN SUBMIT (Password implementation)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const isEmailMode = activeTab === "email";
    if (isEmailMode) {
      if (!emailLoginEmail.trim()) {
        setError("Please enter your email address.");
        return;
      }
      if (!emailLoginEmail.includes("@")) {
        setError("Please enter a valid email format containing '@'.");
        return;
      }
      if (!emailLoginPassword) {
        setError("Please enter your password.");
        return;
      }
    } else {
      if (!mobileLoginPhone.trim()) {
        setError("Please enter your mobile number.");
        return;
      }
      if (mobileLoginPhone.replace(/[^0-9]/g, "").length < 7) {
        setError("Please enter a valid mobile number (at least 7 digits).");
        return;
      }
      if (!mobileLoginPassword) {
        setError("Please enter your password.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {};
      if (isEmailMode) {
        payload.email = emailLoginEmail.trim();
        payload.password = emailLoginPassword;
      } else {
        payload.phone = mobileLoginCountryCode + mobileLoginPhone.replace(/[^0-9]/g, "");
        payload.password = mobileLoginPassword;
      }

      console.log("[AUTH DEBUG] Attempting sign-in with payload:", { ...payload, password: "[REDACTED]" });

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      console.log("[AUTH DEBUG] Sign-in response status:", response.status, "data:", data);

      if (!response.ok) {
        const errorDetail = data.detail;
        if (response.status === 403 && (data.unverified || (errorDetail && typeof errorDetail === "object" && errorDetail.unverified))) {
          console.log("[AUTH DEBUG] User is unverified. Transitioning to signup verification OTP mode.");
          setMode("otp_verify_signup");
          setExpiry(600);
          setSuccess("Please verify your account to continue.");
          return;
        }
        throw new Error(extractError(data, "Incorrect login credentials."));
      }

      // Safeguard against missing credentials in payload response
      if (!data.token || !data.user) {
        throw new Error("Missing authentication token or user profile in server response.");
      }

      setSuccess("Welcome back. Loading your workspace...");
      console.log("[AUTH DEBUG] Successful authentication. Loading workspace...");

      setTimeout(() => {
        try {
          console.log("[AUTH DEBUG] Invoking parent onAuthSuccess callback.");
          onAuthSuccess(data.token, data.user);
        } catch (callbackErr: any) {
          console.error("[AUTH DEBUG] Error loading workspace after login success:", callbackErr);
          setError("Failed to synchronize your workspace settings: " + callbackErr.message);
          setLoading(false);
        }
      }, 800);

    } catch (err: any) {
      console.error("[AUTH DEBUG] Exception occurred during sign in:", err);
      setError(err.message || "Failed to sign in.");
      setLoading(false);
    } finally {
      // In success case, we keep the loader animation on screen until page redirects, 
      // in error/unverified cases we must let loading switch to false.
    }
  };

  // SIGN UP SUBMIT
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!signupUsername.trim() || !signupEmail.trim() || !signupPassword || !signupConfirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (!signupEmail.includes("@") || signupEmail.length < 5) {
      setError("Please provide a valid email format containing '@'.");
      return;
    }
    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: signupUsername.trim(),
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        phone: signupPhone ? (mobileLoginCountryCode + signupPhone.replace(/[^0-9]/g, "")) : ""
      };

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractError(data, "Failed to create account."));
      }

      // If development mode auto-verified the account, bypass OTP verification screen and log in instantly
      if (data.user && data.user.emailVerified) {
        setSuccess("Account registered! Opening your workspace...");
        setTimeout(() => {
          onAuthSuccess(data.token, data.user);
        }, 800);
        return;
      }

      setMode("otp_verify_signup");
      setExpiry(600);
      setSuccess("Account registered successfully! Please enter your verification code.");

    } catch (err: any) {
      setError(err.message || "Signup process failed.");
    } finally {
      setLoading(false);
    }
  };

  // VERIFY OTP (Login or Signup Activation flows)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const code = otpDigits.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const isSignupVerify = mode === "otp_verify_signup";
      const isEmail = activeTab === "email" || isSignupVerify;
      
      const targetUrl = isEmail ? "/api/auth/verify-email-otp" : "/api/auth/verify-sms-otp-login";
      const payload: any = { otp: code };
      if (isEmail) {
        payload.email = isSignupVerify ? signupEmail.trim() : emailLoginEmail.trim();
      } else {
        payload.phone = mobileLoginCountryCode + mobileLoginPhone.replace(/[^0-9]/g, "");
      }

      console.log("[AUTH DEBUG] Submitting OTP verification:", targetUrl, "payload:", payload);

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      console.log("[AUTH DEBUG] OTP verification response:", response.status, data);

      if (!response.ok) {
        throw new Error(extractError(data, "Invalid dynamic verification code."));
      }

      if (!data.token || !data.user) {
        throw new Error("Missing authentication token or user profile in server response.");
      }

      setSuccess("Successfully verified. Synchronizing A-NOVA Workspace...");
      
      setTimeout(() => {
        try {
          console.log("[AUTH DEBUG] Invoking parent onAuthSuccess from OTP.");
          onAuthSuccess(data.token, data.user);
        } catch (callbackErr: any) {
          console.error("[AUTH DEBUG] Error loading workspace after OTP success:", callbackErr);
          setError("Failed to synchronize your workspace settings: " + callbackErr.message);
          setLoading(false);
        }
      }, 800);

    } catch (err: any) {
      console.error("[AUTH DEBUG] Exception occurred during OTP verify:", err);
      setError(err.message || "Verification failed. Check the code and retry.");
      clearOtp();
      setLoading(false);
    } finally {
      // Allow ending state
    }
  };

  // FORGOT PASSWORD SUBMIT
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      setError("Please provide a valid registered email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractError(data, "Password reset initiation failed."));
      }

      setMode("otp_verify_reset");
      setExpiry(600);
      setSuccess("A recovery verification code has been dispatched.");

    } catch (err: any) {
      setError(err.message || "Failed to initiate recovery process.");
    } finally {
      setLoading(false);
    }
  };

  // COMPLETE PASSWORD RESET SUBMIT
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const code = otpDigits.join("");
    if (code.length < 6) {
      setError("Please complete the validation OTP code.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), otp: code, newPassword })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractError(data, "Could not reset password."));
      }

      setSuccess("Password successfully changed.");
      setTimeout(() => {
        setMode("signin");
        setNewPassword("");
        clearOtp();
      }, 1500);

    } catch (err: any) {
      setError(err.message || "Could not complete update.");
    } finally {
      setLoading(false);
    }
  };

  // RESEND OTP TRIGGER
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setError("");
    setSuccess("");

    try {
      const isSignupVerify = mode === "otp_verify_signup";
      const isForgot = mode === "otp_verify_reset";
      const isEmailMode = activeTab === "email" || isSignupVerify || isForgot;
      
      const targetUrl = isForgot 
        ? "/api/auth/forgot-password" 
        : (isEmailMode ? "/api/auth/send-email-otp" : "/api/auth/send-sms-otp");

      let payload: any = {};
      if (isEmailMode) {
        if (isForgot) {
          payload.email = forgotEmail.trim();
        } else if (isSignupVerify) {
          payload.email = signupEmail.trim();
        } else {
          payload.email = emailLoginEmail.trim();
        }
      } else {
        payload.phone = mobileLoginCountryCode + mobileLoginPhone.replace(/[^0-9]/g, "");
      }

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(extractError(data, "Dispatched resend aborted."));
      }

      setCooldown(60);
      setExpiry(600);
      setSuccess("A new verification code has been dispatched.");

    } catch (err: any) {
      setError(err.message || "Could not resend code.");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="min-h-screen bg-[#070708] flex flex-col items-center justify-center p-4 relative overflow-y-auto selection:bg-emerald-500/20 selection:text-emerald-300 font-sans">
      
      {/* Absolute clean backdrop design */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-500/5 to-teal-500/5 rounded-full blur-[140px] pointer-events-none select-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-[340px] backdrop-blur-md bg-zinc-900/35 border border-zinc-800/40 rounded-2xl shadow-[0_24px_50px_rgba(0,0,0,0.4)] p-5 relative z-10"
      >
        {/* Header Block with simple typography, 30% smaller size, reminiscent of Notion/ChatGPT */}
        <div className="flex flex-col items-center text-center mb-5 select-none">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center mb-3 shadow-[0_2px_10px_rgba(255,255,255,0.05)]">
            <span className="text-zinc-950 font-bold text-xs tracking-tight font-sans">A</span>
          </div>
          <h1 className="text-sm font-semibold tracking-wide text-zinc-100">A-NOVA</h1>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            {mode === "signin" && "Welcome back"}
            {mode === "signup" && "Create your account"}
            {mode === "forgot" && "Reset your password"}
            {(mode === "otp_verify_login" || mode === "otp_verify_signup" || mode === "otp_verify_reset") && "Verify your identity"}
          </p>
        </div>

        {/* Dynamic State Overlay Toastings */}
        {error && (
          <div className="mb-3.5 p-2 bg-red-950/25 border border-red-900/30 rounded-lg text-red-300 text-[10px] text-center flex items-center justify-center gap-1.5 font-medium leading-relaxed">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-3.5 p-2 bg-emerald-950/25 border border-emerald-900/30 rounded-lg text-emerald-300 text-[10px] text-center flex items-center justify-center gap-1.5 font-medium leading-relaxed">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
            <span>{success}</span>
          </div>
        )}


        {/* ==================== SCREEN: SIGN IN SCREEN ==================== */}
        {mode === "signin" && (
          <div className="space-y-3.5">
            
            {/* Quick Custom Modern Segmented Tabs selection for Email vs Mobile */}
            <div className="flex p-0.5 bg-zinc-950 border border-zinc-800/50 rounded-lg select-none">
              <button
                type="button"
                onClick={() => { 
                  setActiveTab("email"); 
                  setError(""); 
                  setSuccess(""); 
                  // Clear mobile login states when switching to email login
                  setMobileLoginPhone("");
                  setMobileLoginPassword("");
                }}
                className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-all ${activeTab === "email" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => { 
                  setActiveTab("mobile"); 
                  setError(""); 
                  setSuccess(""); 
                  // Clear email login states when switching to mobile login
                  setEmailLoginEmail("");
                  setEmailLoginPassword("");
                }}
                className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-all ${activeTab === "mobile" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Mobile Number
              </button>
            </div>

            <form onSubmit={handleSignIn} className="space-y-3">
              
              {/* Conditional Address Element rendering */}
              {activeTab === "email" ? (
                <div className="space-y-1">
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      id="signin-email"
                      type="email"
                      required
                      placeholder="Email address"
                      value={emailLoginEmail}
                      onChange={(e) => setEmailLoginEmail(e.target.value)}
                      className="w-full pl-8.5 pr-3.5 py-2 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-zinc-100 text-[11px] text-zinc-200 rounded-lg outline-none transition-all placeholder:text-zinc-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex gap-1.5">
                    {/* Compact simple premium Dropdown dropdown selector */}
                    <div className="relative shrink-0">
                      <select
                        value={mobileLoginCountryCode}
                        onChange={(e) => setMobileLoginCountryCode(e.target.value)}
                        className="appearance-none bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-zinc-100 pl-3 pr-6 py-2 text-[11px] text-zinc-300 rounded-lg outline-none cursor-pointer transition-all"
                      >
                        {COUNTRY_CODES.map((code) => (
                          <option key={code.code} value={code.code} className="bg-zinc-900 text-zinc-200">
                            {code.code}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-2.5 h-2.5 text-zinc-500 absolute right-2.5 top-3.5 pointer-events-none" />
                    </div>

                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                      <input
                        id="signin-mobile"
                        type="tel"
                        required
                        placeholder="Mobile number"
                        value={mobileLoginPhone}
                        onChange={(e) => setMobileLoginPhone(e.target.value)}
                        className="w-full pl-8.5 pr-3.5 py-2 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-zinc-100 text-[11px] text-zinc-200 rounded-lg outline-none transition-all placeholder:text-zinc-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password slot */}
              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Password"
                    value={activeTab === "email" ? emailLoginPassword : mobileLoginPassword}
                    onChange={(e) => {
                      if (activeTab === "email") {
                        setEmailLoginPassword(e.target.value);
                      } else {
                        setMobileLoginPassword(e.target.value);
                      }
                    }}
                    className="w-full pl-8.5 pr-8.5 py-2 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-zinc-100 text-[11px] text-zinc-200 rounded-lg outline-none transition-all placeholder:text-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition-all outline-none"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Action grid button triggers, 20% smaller layout sizing */}
              <div className="space-y-2 pt-1">
                <button
                  id="btn-signin"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-zinc-100 hover:bg-zinc-50 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-medium text-[11px] rounded-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center shadow-sm"
                >
                  {loading ? (
                    <span className="w-3.5 h-3.5 border-1.5 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>
            </form>

            {/* Links, highly clean and minimal spacing */}
            <div className="flex items-center justify-between text-[10px] pt-2 text-zinc-500 font-normal">
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                className="hover:text-zinc-200 underline underline-offset-2 transition-all cursor-pointer bg-transparent border-none p-0"
              >
                Forgot Password?
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}
                className="text-zinc-200 hover:text-zinc-100 font-medium transition-all cursor-pointer bg-transparent border-none p-0"
              >
                Create Account
              </button>
            </div>
          </div>
        )}


        {/* ==================== SCREEN: SIGN UP SCREEN ==================== */}
        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <div className="space-y-1">
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                <input
                  id="signup-username"
                  type="text"
                  required
                  placeholder="Username"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  className="w-full pl-8.5 pr-3.5 py-2 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-zinc-100 text-[11px] text-zinc-200 rounded-lg outline-none transition-all placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                <input
                  id="signup-email"
                  type="email"
                  required
                  placeholder="Email address"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full pl-8.5 pr-3.5 py-2 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-zinc-100 text-[11px] text-zinc-200 rounded-lg outline-none transition-all placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                <input
                  id="signup-phone"
                  type="tel"
                  placeholder="Mobile number (optional)"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  className="w-full pl-8.5 pr-3.5 py-2 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-zinc-100 text-[11px] text-zinc-200 rounded-lg outline-none transition-all placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                <input
                  id="signup-password"
                  type="password"
                  required
                  placeholder="Password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full pl-8.5 pr-3.5 py-2 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-zinc-100 text-[11px] text-zinc-200 rounded-lg outline-none transition-all placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Check className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                <input
                  id="signup-confirm"
                  type="password"
                  required
                  placeholder="Confirm password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  className="w-full pl-8.5 pr-3.5 py-2 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-zinc-100 text-[11px] text-zinc-200 rounded-lg outline-none transition-all placeholder:text-zinc-500"
                />
              </div>
            </div>

            <button
              id="btn-signup-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-zinc-100 hover:bg-zinc-50 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-medium text-[11px] rounded-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center shadow-sm mt-3"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-1.5 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>

            <div className="text-center text-[10px] text-zinc-500 pt-2 select-none font-normal">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setMode("signin"); setError(""); setSuccess(""); }}
                className="text-zinc-250 hover:text-zinc-100 underline underline-offset-2 font-medium transition-all bg-transparent border-0 cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        )}


        {/* ==================== SCREEN: FORGOT PASSWORD SCREEN ==================== */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <div className="space-y-1">
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  placeholder="Email address"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full pl-8.5 pr-3.5 py-2 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-zinc-100 text-[11px] text-zinc-200 rounded-lg outline-none transition-all placeholder:text-zinc-500"
                />
              </div>
            </div>

            <button
              id="btn-forgot-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-zinc-100 hover:bg-zinc-50 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-medium text-[11px] rounded-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center shadow-sm"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-1.5 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
              ) : (
                "Continue"
              )}
            </button>

            <button
              type="button"
              onClick={() => { setMode("signin"); setError(""); setSuccess(""); }}
              className="w-full text-center text-[10px] text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer bg-transparent border-none mt-1 animate-pulse"
            >
              Back to Sign In
            </button>
          </form>
        )}


        {/* ==================== SCREEN: VERIFY OTP SCREEN (Shared) ==================== */}
      {(mode === "otp_verify_signup" || mode === "otp_verify_reset") && (
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-medium text-zinc-500 font-mono tracking-wider">
                Expires in {formatTime(expiry)}
              </span>
            </div>

            <form 
              onSubmit={
                mode === "otp_verify_reset" ? handleResetPassword : handleVerifyOtp
              } 
              className="space-y-3.5"
            >
              
              {/* Structured Premium Numeric Grid Cells */}
              <div className="flex justify-between gap-1.5 py-1">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    maxLength={1}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="w-10 h-10 text-center text-xs font-semibold font-mono bg-zinc-950 border border-zinc-800 hover:border-zinc-700/80 focus:border-zinc-300 text-zinc-100 rounded-lg outline-none focus:ring-1 focus:ring-zinc-100/5 transition-all duration-150"
                  />
                ))}
              </div>

              {/* Password update fields if in recovery workflow */}
              {mode === "otp_verify_reset" && (
                <div className="space-y-1 pt-1 border-t border-zinc-800/50 mt-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      id="reset-newpassword"
                      type="password"
                      required
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-8.5 pr-3.5 py-2 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80 focus:border-zinc-100 text-[11px] text-zinc-200 rounded-lg outline-none transition-all placeholder:text-zinc-500"
                    />
                  </div>
                </div>
              )}

              {/* Resend and Actions utilities */}
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>Didn't receive code?</span>
                <button
                  type="button"
                  disabled={cooldown > 0}
                  onClick={handleResendOtp}
                  className="text-zinc-200 hover:text-zinc-100 font-semibold disabled:text-zinc-650 flex items-center gap-1 transition-all bg-transparent border-0 outline-none cursor-pointer"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${cooldown > 0 ? "animate-spin text-zinc-600" : ""}`} />
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                </button>
              </div>

              <button
                id="btn-otp-verify-submit"
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-zinc-100 hover:bg-zinc-50 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-medium text-[11px] rounded-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center shadow-sm"
              >
                {loading ? (
                  <span className="w-3.5 h-3.5 border-1.5 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
                ) : (
                  mode === "otp_verify_reset" ? "Reset Password" : "Verify Code"
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => { setMode("signin"); setError(""); setSuccess(""); }}
              className="w-full text-center text-[10px] text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer bg-transparent border-none mt-1"
            >
              Cancel Verification
            </button>
          </div>
        )}

      </motion.div>

      <div className="mt-8 text-[9px] font-medium text-zinc-650 tracking-widest uppercase select-none font-mono">
        A-NOVA Core
      </div>
    </div>
  );
}
