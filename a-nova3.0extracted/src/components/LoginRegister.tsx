import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Mail, 
  Key, 
  UserPlus, 
  LogIn, 
  Sparkles, 
  CheckCircle2, 
  Phone, 
  Smartphone, 
  Timer, 
  ArrowLeft, 
  ShieldAlert, 
  Unlock, 
  MessageSquare,
  X,
  RefreshCw,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types";
import { supabase } from "../supabaseClient";

interface LoginRegisterProps {
  onAuthSuccess: (token: string, user: User) => void;
}

export default function LoginRegister({ onAuthSuccess }: LoginRegisterProps) {
  // Navigation states
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isVerifyPending, setIsVerifyPending] = useState(false);
  const [isVerifiedRedirect, setIsVerifiedRedirect] = useState(false);

  // Sub-login tabs: 'email' | 'phone' | 'otp'
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone' | 'otp'>('email');

  // Forgot password tabs: 'email' | 'phone'
  const [forgotMethod, setForgotMethod] = useState<'email' | 'phone'>('email');

  // Input states
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");

  // Status & Feedback states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Verification Pending Screen context
  const [pendingUser, setPendingUser] = useState<{
    id?: string;
    email: string;
    phone: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  } | null>(null);

  // OTP Timer & Expiry Context (5 minutes)
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Simulated SMS Toast Banner Notification State
  const [smsNotification, setSmsNotification] = useState<{
    show: boolean;
    sender: string;
    body: string;
  } | null>(null);

  // Remember me & stay logged in persistence
  const [rememberMe, setRememberMe] = useState(true);

  // Admin Multi-factor Security States
  const [admin2faNeeded, setAdmin2faNeeded] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminMustChangePassword, setAdminMustChangePassword] = useState(false);
  const [adminTempToken, setAdminTempToken] = useState("");

  // Google single sign-on helper simulation states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");

  // Load saved credentials on startup
  useEffect(() => {
    const savedEmail = localStorage.getItem("myai_remember_email");
    const savedPhone = localStorage.getItem("myai_remember_phone");
    if (savedEmail) {
      setEmail(savedEmail);
    }
    if (savedPhone) {
      setPhone(savedPhone);
    }
  }, []);

  // Clean and start standard 5 minutes OTP countdown
  const startOtpCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerSeconds(300); // 5 minutes (300 seconds)
    
    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format countdown into human friendly M:SS representation
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Triggers simulated mobile SMS dispatch notification at top of screen
  const triggerSmsSimulatorToast = (targetPhone: string, code: string) => {
    setSmsNotification({
      show: true,
      sender: "💬 CHAT • MYAI SECURITY",
      body: `YOUR VERIFICATION OTP IS [ ${code} ] - valid for 5 minutes. Do not share this sequence with anyone.`
    });
    setTimeout(() => {
      setSmsNotification(prev => prev ? { ...prev, show: false } : null);
    }, 10000);
  };

  // Monitor incoming link redirects from Email Verifications & Password Recovery
  useEffect(() => {
    const handleUrlRedirects = async () => {
      const hash = window.location.hash;
      const search = window.location.search;
      const pathname = window.location.pathname;

      const isRecovery = hash.includes("type=recovery") || search.includes("type=recovery") || pathname === "/forgot-password" || hash.includes("forgot-password");

      if (isRecovery) {
        setIsForgotPassword(true);
        setIsLogin(false);
        const params = new URLSearchParams(search || (hash.includes("?") ? hash.substring(hash.indexOf("?")) : ""));
        const emailParam = params.get("email");
        if (emailParam) {
          setEmail(emailParam);
        }
        window.history.replaceState(null, "", "/forgot-password");
      } else if (hash.includes("type=signup") || hash.includes("access_token=") || search.includes("code=")) {
        setIsVerifiedRedirect(true);
        const params = new URLSearchParams(search || (hash.includes("?") ? hash.substring(hash.indexOf("?")) : ""));
        let emailParam = params.get("email");
        if (!emailParam && hash.includes("email=")) {
          const matched = hash.match(/email=([^&]+)/);
          if (matched) emailParam = decodeURIComponent(matched[1]);
        }
        if (emailParam) {
          setEmail(emailParam);
        }
        window.history.replaceState(null, "", "/");
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.warn("Signout bypass", e);
        }
      }
    };
    handleUrlRedirects();
  }, []);

  // API Call: Dispatch OTP (SMS Simulator)
  const dispatchPhoneOtp = async (phoneValue: string, isFromRegistration = false) => {
    if (!phoneValue) {
      setError("Please input a valid phone number.");
      return false;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-sms-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneValue, isRegistration: isFromRegistration })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch verification code.");
      
      startOtpCountdown();
      triggerSmsSimulatorToast(phoneValue, data.otp);
      setSuccess(`Simulated SMS OTP sent to ${phoneValue}. Enter authorization digits.`);
      return true;
    } catch (err: any) {
      setError(err.message || "OTP transmission halted.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Resend Email Verification link via Supabase Auth
  const handleResendEmail = async () => {
    const targetEmail = email || pendingUser?.email;
    if (!targetEmail) {
      setError("Email address is needed to resend verification.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (resendError) throw resendError;
      setSuccess("A fresh security sign-up verification link has been sent to your email.");
    } catch (err: any) {
      setError(err.message || "Failed to resend email verification.");
    } finally {
      setLoading(false);
    }
  };

  // Submit flow for Sign Up and Logins
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isLogin) {
      // -------------------- SIGN UP FLOW --------------------
      if (!email || !phone || !username || !password || !confirmPassword) {
        setError("Please supply all registration parameters (email, phone, username, password).");
        return;
      }
      if (password !== confirmPassword) {
        setError("Entered passwords do not align.");
        return;
      }

      setLoading(true);
      try {
        // 1. Instantiate the user inside of Supabase Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              phone,
              username
            }
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        // 2. Provision settings and records in our local Express database
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password, phone })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Local server workspace mapping failed.");
        }

        // 3. Automatically dispatch phone OTP for the newly registered user
        const otpSent = await dispatchPhoneOtp(phone, true);
        if (otpSent) {
          setPendingUser({
            id: data.user.id,
            email,
            phone,
            emailVerified: false,
            phoneVerified: false
          });
          setIsVerifyPending(true);
        }
      } catch (err: any) {
        setError(err.message || "Failed to instantiate account.");
      } finally {
        setLoading(false);
      }

    } else {
      // -------------------- LOGIN FLOWS --------------------
      setLoading(true);
      try {
        if (loginMethod === 'email') {
          // Email + PW
          try {
            await supabase.auth.signInWithPassword({
              email,
              password
            });
          } catch (supabaseErr) {
            console.warn("Supabase auth email logon bypassed/simulated:", supabaseErr);
          }

          // Check with our Express companion server
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });
          const data = await response.json();

          if (!response.ok) {
            if (data.unverified) {
              setPendingUser(data);
              setIsVerifyPending(true);
              dispatchPhoneOtp(data.phone);
              throw new Error("Your account has unverified assets. Phone and Email verification required.");
            }
            throw new Error(data.error || "Handshake login failed on local database.");
          }

          // ADMIN REQUIRE 2FA TRAP
          if (data.require2fa) {
            setAdminEmail(data.email);
            setAdmin2faNeeded(true);
            setSuccess("Two-factor admin token generated successfully! Transmitting simulated SMS OTP.");
            triggerSmsSimulatorToast(data.phone, data.otp);
            startOtpCountdown();
            return;
          }

          // Login OK!
          if (rememberMe) {
            localStorage.setItem("myai_remember_email", email);
          } else {
            localStorage.removeItem("myai_remember_email");
          }

          setSuccess(`Connecting server profile...`);
          setTimeout(() => {
            window.history.pushState({}, "", "/");
            onAuthSuccess(data.token, data.user);
          }, 1000);

        } else if (loginMethod === 'phone') {
          // Phone + PW
          if (!phone || !password) {
            throw new Error("Please fill in both phone and password.");
          }

          // 1. Resolve registered email on server for this phone number
          const resolveRes = await fetch("/api/auth/resolve-phone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone })
          });
          const resolveData = await resolveRes.json();
          if (!resolveRes.ok) {
            throw new Error(resolveData.error || "Could not locate account with this phone number.");
          }

          // 2. Perform authentications standardly with Supabase
          try {
            await supabase.auth.signInWithPassword({
              email: resolveData.email,
              password
            });
          } catch (supabaseErr) {
            console.warn("Supabase phone logon bypassed/simulated:", supabaseErr);
          }

          // 3. Connect local Express companion
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, password })
          });
          const data = await response.json();

          if (!response.ok) {
            if (data.unverified) {
              setPendingUser(data);
              setIsVerifyPending(true);
              dispatchPhoneOtp(data.phone);
              throw new Error("Your authentication requires active verification checks.");
            }
            throw new Error(data.error || "Handshake login failed.");
          }

          // ADMIN REQUIRE 2FA TRAP
          if (data.require2fa) {
            setAdminEmail(data.email);
            setAdmin2faNeeded(true);
            setSuccess("Two-factor admin token generated successfully! Transmitting simulated SMS OTP.");
            triggerSmsSimulatorToast(data.phone, data.otp);
            startOtpCountdown();
            return;
          }

          if (rememberMe) {
            localStorage.setItem("myai_remember_phone", phone);
          } else {
            localStorage.removeItem("myai_remember_phone");
          }

          setSuccess(`Phone ID verified. Logging in...`);
          setTimeout(() => {
            window.history.pushState({}, "", "/");
            onAuthSuccess(data.token, data.user);
          }, 1000);

        } else if (loginMethod === 'otp') {
          // Phone OTP Login Verification
          if (!phone || !otpCode) {
            throw new Error("Phone number and OTP digits are required.");
          }

          const response = await fetch("/api/auth/verify-sms-otp-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, otp: otpCode })
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Incorrect OTP code. Try again.");
          }

          if (rememberMe) {
            localStorage.setItem("myai_remember_phone", phone);
          } else {
            localStorage.removeItem("myai_remember_phone");
          }

          setSuccess(`Simulated SMS OTP authorized. Session established!`);
          setTimeout(() => {
            window.history.pushState({}, "", "/");
            onAuthSuccess(data.token, data.user);
          }, 1000);
        }
      } catch (err: any) {
        setError(err.message || "Authentication aborted.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Verification Screen OTP Check
  const handleVerifyPendingOtp = async () => {
    if (!pendingUser || !otpCode) {
      setError("Please type the 6-digit OTP code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify-sms-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: pendingUser.phone, otp: otpCode, email: pendingUser.email })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Mismatch code.");
      }

      setPendingUser((prev) => prev ? { ...prev, phoneVerified: true } : null);
      setSuccess("Phone verification completed! Verify email to proceed.");
      setOtpCode("");
    } catch (err: any) {
      setError(err.message || "Failed to confirm phone OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Mock confirm email status for instantaneous testing flow
  const handleAutoConfirmEmail = async () => {
    if (!pendingUser) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/simulate-email-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingUser.email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setPendingUser(prev => prev ? { ...prev, emailVerified: true } : null);
      setSuccess("Simulated email verification link click processed!");
    } catch (err: any) {
      setError("Link simulation error on sandbox backend.");
    } finally {
      setLoading(false);
    }
  };

  // Final verification check to sign in after completing uncompleted verifications
  const handleCompleteVerificationLogin = async () => {
    if (!pendingUser) return;
    if (!pendingUser.phoneVerified || !pendingUser.emailVerified) {
      setError("You must verify both email address and phone number to obtain security clear.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Direct login simulation after completing verifications
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingUser.email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        // Fallback or retry
        throw new Error(data.error || "Handshake session retrieval failed.");
      }

      setSuccess("All communication channels verified! Directing to cockpit...");
      setTimeout(() => {
        window.history.pushState({}, "", "/");
        onAuthSuccess(data.token, data.user);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Verification passed but session lookup denied.");
    } finally {
      setLoading(false);
    }
  };

  // Option to change password after confirming email verification
  const handleVerifiedChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please clarify your email account address.");
      return;
    }
    if (!resetNewPassword) {
      setError("Please fill in your desired new password selection.");
      return;
    }
    if (resetNewPassword !== confirmPassword) {
      setError("Entered passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/auth/verify-email-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword: resetNewPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update profile password.");

      setSuccess("Your account password has been updated! Redirecting to login...");
      setTimeout(() => {
        setIsVerifiedRedirect(false);
        setIsLogin(true);
        setPassword(resetNewPassword);
        setResetNewPassword("");
        setConfirmPassword("");
        window.history.pushState({}, "", "/");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An error occurred while saving your password.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot password triggers
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (forgotMethod === 'email') {
      if (!email) {
        setError("Please state your email account.");
        return;
      }
      setLoading(true);
      try {
        // Trigger Supabase background reset with a relative-route fallback redirection URL
        try {
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/forgot-password?email=${encodeURIComponent(email)}`
          });
        } catch (supabaseErr) {
          console.warn("Supabase auth background reset skipped / simulated:", supabaseErr);
        }

        setSuccess("Success! A recovery password email link has been sent. Check your secure account email.");
      } catch (err: any) {
        setError(err.message || "Failed to trigger password reset email.");
      } finally {
        setLoading(false);
      }
    } else {
      // RESET/LOGIN THROUGH PHONE OTP directly bypassing any password fields
      if (!phone || !otpCode) {
        setError("Phone number and 6-digit SMS OTP verification code are required.");
        return;
      }
      setLoading(true);
      try {
        const response = await fetch("/api/auth/verify-sms-otp-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, otp: otpCode })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Incorrect OTP sequence entered.");

        setSuccess("OTP authenticated successfully! Loading your secure profile session...");
        setTimeout(() => {
          setIsForgotPassword(false);
          setOtpCode("");
          window.history.pushState({}, "", "/");
          onAuthSuccess(data.token, data.user);
        }, 1200);
      } catch (err: any) {
        setError(err.message || "Unable to refresh credential access.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Instant pre-verified sandbox profile bypass
  const handleDemoAccess = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    const demoEmail = `demoRobot_${Math.random().toString(36).substring(2, 5)}@myai.com`;
    const demoUser = `AI_Explorer_${Math.random().toString(36).substring(2, 5)}`;
    const demoPassword = "DemoPassword123";
    const demoPhone = "+1555" + Math.floor(1000000 + Math.random() * 9000000);

    try {
      // Register with all flags pre-secured
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, username: demoUser, password: demoPassword, phone: demoPhone })
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(registerData.error || "Demo handshake failed.");
      }

      // Explicitly mark verified in local mock db
      const profileSync = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${registerData.token}`
        },
        body: JSON.stringify({ emailVerified: true, phoneVerified: true })
      });

      const syncResult = await profileSync.json();

      setSuccess("Instant premium sandbox bypass triggered successfully.");
      setTimeout(() => {
        onAuthSuccess(registerData.token, syncResult);
      }, 800);
    } catch (err: any) {
      setError(err.message || "Unable to provision sandbox overrides.");
    } finally {
      setLoading(false);
    }
  };

  // Google federated SSO authentication pipeline
  const handleGoogleSignInSubmit = async (selectedEmail: string) => {
    if (!selectedEmail) return;
    setError("");
    setSuccess("");
    setLoading(true);
    setShowGoogleModal(false);
    try {
      // Simulate Google Identity Auth pipeline
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: selectedEmail, 
          username: selectedEmail.split("@")[0], 
          password: "GoogleOAuthBypassSecretToken123!", 
          phone: "+1555" + Math.floor(1000000 + Math.random() * 9000000)
        })
      });
      let data = await res.json();
      
      // If user account already existed, log in with it pre-secured
      if (!res.ok) {
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: selectedEmail, password: "GoogleOAuthBypassSecretToken123!" })
        });
        data = await loginRes.json();
        
        if (!loginRes.ok) {
          throw new Error(data.error || "Google authorization handshake rejected by platform.");
        }
      }

      // Check if Admin requires 2FA or password changes (via Google SSO too!)
      if (data.require2fa) {
        setAdminEmail(data.email);
        setAdmin2faNeeded(true);
        setSuccess("Google SSO requires Multi-Factor Verification checks!");
        triggerSmsSimulatorToast(data.phone, data.otp);
        startOtpCountdown();
        return;
      }

      setSuccess("Successfully authenticated via Google Identity services!");
      setTimeout(() => {
        onAuthSuccess(data.token, data.user);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Google single sign-on failed.");
    } finally {
      setLoading(false);
    }
  };

  // Admin and Policy verification submit actions
  const handleAdmin2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-admin-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, code: otpCode })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Incorrect security code sequence.");
      }

      setOtpCode("");
      setAdminTempToken(data.token);

      if (data.user.mustChangePassword) {
        setAdminMustChangePassword(true);
        setAdmin2faNeeded(false);
        setSuccess("Administrative password update required on first setup login.");
      } else {
        setSuccess("Security clearance verified! Launching A-NOVA session...");
        setTimeout(() => {
          onAuthSuccess(data.token, data.user);
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to finalize admin authorization.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminPasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetNewPassword) {
      setError("Please input a custom, secure password.");
      return;
    }
    if (resetNewPassword === "Adityaghosh@2007") {
      setError("Your new password must differ from the temporary platform default.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-admin-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, newPassword: resetNewPassword, token: adminTempToken })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Configuration rejected by secure database.");
      }

      setSuccess("Account password changed! Loading Administrative Command Console...");
      setAdminMustChangePassword(false);
      setTimeout(() => {
        onAuthSuccess(adminTempToken, {
          id: "user_admin",
          email: adminEmail,
          username: "admin",
          displayName: "Platform Director",
          avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
          createdAt: new Date().toISOString(),
          emailVerified: true,
          phoneVerified: true,
          role: "admin",
          planStatus: "Plus"
        });
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Administrative passwords updates failed.");
    } finally {
      setLoading(false);
    }
  };

  // RENDERING COMPONENTS

  // Header Logo Component
  const renderHeader = (title: string, subtitle: string) => (
    <div className="flex flex-col items-center mb-6">
      {/* Dynamic Glimmering A-NOVA Custom Logo */}
      <div className="relative w-16 h-16 mb-4 select-none">
        {/* Outer glowing pulse */}
        <div className="absolute inset-x-0 bottom-0 top-1 bg-emerald-500/25 rounded-2xl blur-md animate-pulse" />
        
        {/* Main Logo Container */}
        <div className="relative w-full h-full bg-gradient-to-br from-emerald-600 via-teal-650 to-cyan-500 rounded-2xl flex items-center justify-center border border-emerald-400/25 shadow-lg shadow-emerald-950/40 overflow-hidden">
          {/* Futuristic subtle matrix background lines */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:6px_6px]" />
          
          {/* Stylized typographic A with Nova Star */}
          <div className="flex items-center justify-center relative">
            <span className="text-3xl font-black tracking-tighter text-white font-mono select-none">A</span>
            <Sparkles className="w-4 h-4 text-emerald-250 absolute -top-1 -right-3 animate-pulse" />
          </div>
        </div>
      </div>
      <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent font-sans">
        {title === "Sign in to MyAI" ? "Sign in to A-NOVA" : title === "Create MyAI Account" ? "Create A-NOVA Account" : title}
      </h2>
      <p className="text-[11px] text-zinc-500 mt-1 tracking-wide">{subtitle}</p>
    </div>
  );

  // Return views for Admin policy enforcements
  if (admin2faNeeded) {
    return (
      <div id="auth_container" className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* SMS Simulator Notification Drawer */}
        <AnimatePresence>
          {smsNotification && smsNotification.show && (
            <motion.div
              initial={{ opacity: 0, y: -100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-sm bg-zinc-900 border-2 border-emerald-500 rounded-2xl shadow-xl shadow-black/80 z-50 p-4 shrink-0 overflow-hidden"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400 shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono font-bold">{smsNotification.sender}</h5>
                    <p className="text-xs text-zinc-100 font-medium mt-1 leading-normal select-all">{smsNotification.body}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSmsNotification(null)}
                  className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-700/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl opacity-50" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-8 relative z-10 space-y-6 text-center"
        >
          {renderHeader("MFA Security Clearance", "Provide administrative authorization keys")}

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-red-200 text-xs text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-950/60 rounded-xl text-emerald-300 text-xs text-center font-medium">
              {success}
            </div>
          )}

          <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-2xl text-left space-y-2">
            <h4 className="text-xs font-bold font-mono uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping shrink-0" />
              Simulated OTP Transmission
            </h4>
            <p className="text-[11px] text-zinc-400 leading-normal">
              A temporary authentication code was sent to <span className="text-zinc-300 font-semibold">{adminEmail}</span>. Read the simulation pop-ups to obtain it.
            </p>
          </div>

          <form onSubmit={handleAdmin2faSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-1.5 uppercase tracking-wider text-left">6-Digit Security PIN</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-zinc-500 animate-pulse" />
                <input
                  id="admin-2fa-input"
                  type="text"
                  required
                  maxLength={6}
                  placeholder="XXXXXX"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 text-xs text-zinc-150 rounded-xl outline-none tracking-widest font-mono text-center text-base"
                />
              </div>
            </div>

            <button
              id="btn-admin-verify-mfa"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Grant Access Clearance
                </>
              )}
            </button>
          </form>

          <button
            id="cancel-admin-mfa"
            onClick={() => {
              setAdmin2faNeeded(false);
              setOtpCode("");
              setError("");
              setSuccess("");
            }}
            className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 font-medium underline underline-offset-4 mt-2"
          >
            Cancel Session Request
          </button>
        </motion.div>
      </div>
    );
  }

  if (adminMustChangePassword) {
    return (
      <div id="auth_container" className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-700/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl opacity-50" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-8 relative z-10 space-y-6"
        >
          {renderHeader("Set Executive Password", "Replace default temporary administrative credentials")}

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-red-200 text-xs text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-950/60 rounded-xl text-emerald-300 text-xs text-center font-medium">
              {success}
            </div>
          )}

          <div className="p-4 bg-yellow-950/20 border border-yellow-905/30 rounded-2xl text-left space-y-2">
            <h4 className="text-xs font-bold font-mono uppercase text-yellow-400 tracking-wider flex items-center gap-1.5">
              ⚠️ Security Guideline
            </h4>
            <p className="text-[11px] text-zinc-400 leading-normal">
              You are currently logged in with password <span className="font-mono text-zinc-200 font-semibold select-all">Adityaghosh@2007</span>. Global security protocol mandates replacement before unlocking control consoles.
            </p>
          </div>

          <form onSubmit={handleAdminPasswordChangeSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  id="admin-new-password-field"
                  type="password"
                  required
                  placeholder="Min 8 characters, numbers & symbols"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-150 rounded-xl outline-none focus:border-emerald-500 transition-all font-sans"
                />
              </div>
            </div>

            <button
              id="save-admin-password-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Save Password & Unlock Cockpit
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Return dynamic verification UI redirect view
  if (isVerifiedRedirect) {
    return (
      <div id="auth_container" className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-700/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl opacity-50" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-8 text-center relative z-10"
        >
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-4 text-emerald-400">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-sans">
              Email Verified via Token!
            </h2>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Supabase Auth link confirmation accepted. Your account is verified.
            </p>
          </div>

          <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl text-left text-xs text-zinc-400 space-y-2 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✔</span>
              <span>24hr Token Authenticity: Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✔</span>
              <span>Local Registration Status Sync: Cleared</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-red-200 text-xs text-center mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-950/60 rounded-xl text-emerald-300 text-xs text-center font-medium mb-4">
              {success}
            </div>
          )}

          {/* Password Selection form */}
          <form onSubmit={handleVerifiedChangePassword} className="space-y-4 mb-6">
            <div className="space-y-4 text-left font-sans">
              <div>
                <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">Verified Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-zinc-650" />
                  <input
                    id="verified-email-field"
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-100 rounded-xl outline-none focus:border-emerald-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">Set New Password (Optional)</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 w-4.5 h-4.5 text-zinc-650" />
                  <input
                    id="verified-new-password-field"
                    type="password"
                    placeholder="••••••••••••"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-100 rounded-xl outline-none focus:border-emerald-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 w-4.5 h-4.5 text-zinc-650" />
                  <input
                    id="verified-confirm-password-field"
                    type="password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-100 rounded-xl outline-none focus:border-emerald-500 transition-all font-sans"
                  />
                </div>
              </div>
            </div>

            <button
              id="submit-verified-change-password"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Password & Proceed
                </>
              )}
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-zinc-850"></div>
            <span className="flex-shrink mx-4 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Or</span>
            <div className="flex-grow border-t border-zinc-850"></div>
          </div>

          <button
            id="proceed-after-verified"
            onClick={() => {
              setIsVerifiedRedirect(false);
              setIsLogin(true);
              setResetNewPassword("");
              setConfirmPassword("");
              setSuccess("Account activated. Sign in to initiate dynamic workflows.");
            }}
            className="w-full py-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-medium text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 mt-2"
          >
            <LogIn className="w-4 h-4 text-zinc-500" />
            Proceed with Original Password
          </button>
        </motion.div>
      </div>
    );
  }

  // Return verification pending dual channel screen
  if (isVerifyPending && pendingUser) {
    return (
      <div id="auth_container" className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* SMS Simulator Notification Drawer */}
        <AnimatePresence>
          {smsNotification && smsNotification.show && (
            <motion.div
              initial={{ opacity: 0, y: -100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-sm bg-zinc-900 border-2 border-emerald-500 rounded-2xl shadow-xl shadow-black/80 z-50 p-4 shrink-0 overflow-hidden"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400 shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono font-bold">{smsNotification.sender}</h5>
                    <p className="text-xs text-zinc-100 font-medium mt-1 leading-normal select-all">{smsNotification.body}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSmsNotification(null)}
                  className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-700/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl opacity-50" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-8 relative z-10 space-y-6"
        >
          {renderHeader("Verification Protocol", "Secure dual-channel identity verification required")}

          {/* Verification Status Overview badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center space-y-1.5 transition-colors ${
              pendingUser.emailVerified 
                ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-300" 
                : "bg-zinc-950 border-zinc-800 text-zinc-400"
            }`}>
              <Mail className={`w-5 h-5 ${pendingUser.emailVerified ? "text-emerald-400" : "text-zinc-500"}`} />
              <span className="text-[10px] font-bold font-mono tracking-wider uppercase">Email Status</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40">
                {pendingUser.emailVerified ? "CONFIRMED" : "PENDING LINK"}
              </span>
            </div>

            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center space-y-1.5 transition-colors ${
              pendingUser.phoneVerified 
                ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-300" 
                : "bg-zinc-950 border-zinc-800 text-zinc-400"
            }`}>
              <Smartphone className={`w-5 h-5 ${pendingUser.phoneVerified ? "text-emerald-400" : "text-zinc-500"}`} />
              <span className="text-[10px] font-bold font-mono tracking-wider uppercase">Phone Status</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40">
                {pendingUser.phoneVerified ? "OTP CONFIRMED" : "PENDING OTP"}
              </span>
            </div>
          </div>

          {/* Global verification messages */}
          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-red-200 text-xs text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-950/60 rounded-xl text-emerald-300 text-xs text-center font-medium">
              {success}
            </div>
          )}

          {/* MOBILE FRIENDLY VERIFICATION QUICK BYPASS */}
          <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold font-mono uppercase tracking-wider">Mobile Verification Guard</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Not receiving redirect loops on mobile or within the preview app? Click below to instantly verify both channels and continue.
            </p>
            <button
              id="btn_mobile_quick_verify"
              type="button"
              onClick={async () => {
                setLoading(true);
                setError("");
                setSuccess("");
                try {
                  const targetEmail = pendingUser.email;
                  // Automatically register, confirm channels, and login
                  const response = await fetch("/api/auth/instant-activate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: targetEmail })
                  });
                  const data = await response.json();
                  if (!response.ok) {
                    throw new Error(data.error || "Failed to trigger instant activation on server gateway.");
                  }

                  setPendingUser(prev => prev ? { ...prev, emailVerified: true, phoneVerified: true } : null);
                  setSuccess("Mobile activation completed! Logging in...");
                  setTimeout(() => {
                    window.history.pushState({}, "", "/");
                    onAuthSuccess(data.token, data.user);
                  }, 1000);
                } catch (err: any) {
                  setError(err.message || "Failed to trigger instant activation bypass.");
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full py-2 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 hover:from-emerald-500 hover:to-cyan-400 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              ⚡ Verify Instantly (Mobile Friendly)
            </button>
          </div>

          {/* DUAL WORKSPACE ENERGIZERS */}
          <div className="space-y-4">
            {/* CHANNEL A: Email Link Verification */}
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-850 space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-zinc-300 flex items-center gap-2">
                <span className="w-4 h-4 bg-zinc-850 rounded text-[9px] inline-flex items-center justify-center text-zinc-400">A</span>
                Email Verification
              </h4>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Check <span className="text-zinc-300 font-bold">{pendingUser.email}</span> for a confirmation message. Click inside to activate.
              </p>
              
              <div className="flex gap-2">
                <button
                  id="btn_resend_verification_email"
                  onClick={handleResendEmail}
                  disabled={loading || pendingUser.emailVerified}
                  className="flex-1 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-850 disabled:opacity-40 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 select-none"
                >
                  <RefreshCw className="w-3 h-3" />
                  Resend Link (24h)
                </button>
                <button
                  id="btn_bypass_verification_email"
                  onClick={handleAutoConfirmEmail}
                  disabled={loading || pendingUser.emailVerified}
                  className="flex-1 py-1.5 px-3 bg-emerald-950 hover:bg-emerald-900 border border-emerald-900 disabled:opacity-40 text-emerald-400 hover:text-emerald-300 text-[11px] rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 select-none"
                >
                  <Sparkles className="w-3 h-3" />
                  Bypass Simulation
                </button>
              </div>
            </div>

            {/* CHANNEL B: Phone OTP verification */}
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-850 space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-zinc-300 flex items-center gap-2">
                <span className="w-4 h-4 bg-zinc-850 rounded text-[9px] inline-flex items-center justify-center text-zinc-400">B</span>
                Phone OTP Verification
              </h4>
              <p className="text-[11px] text-zinc-500 leading-normal">
                An activation OTP code was dispatched to <span className="text-zinc-300 font-bold">{pendingUser.phone}</span>. Expires in 5 minutes.
              </p>

              {!pendingUser.phoneVerified ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600 animate-pulse" />
                    <input
                      id="opt-challenge-input"
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Enter 6-digit OTP code"
                      className="w-full pl-9 pr-24 py-2 bg-zinc-950 border border-zinc-800 text-xs text-zinc-150 rounded-lg outline-none tracking-widest font-mono"
                    />
                    <div className="absolute right-2 top-2 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Timer className="w-3 h-3 shrink-0" />
                      <span>{formatTime(timerSeconds)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      id="btn-verify-challenge-otp"
                      onClick={handleVerifyPendingOtp}
                      disabled={loading || otpCode.length < 6}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white font-bold text-[11px] rounded-lg transition-all"
                    >
                      Verify OTP
                    </button>
                    <button
                      id="btn-resend-challenge-sms"
                      onClick={() => dispatchPhoneOtp(pendingUser.phone)}
                      disabled={loading || timerSeconds > 240}
                      className="py-1.5 px-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-[11px] rounded-lg hover:border-zinc-700 transition"
                    >
                      Resend SMS
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Phone connection successfully validated</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              id="finalize-verification-login-btn"
              onClick={handleCompleteVerificationLogin}
              disabled={loading || !pendingUser.phoneVerified || !pendingUser.emailVerified}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              Complete Verification & Sign In
            </button>

            <button
              id="back-to-auth-entry"
              onClick={() => {
                setIsVerifyPending(false);
                setPendingUser(null);
                setError("");
                setSuccess("");
              }}
              className="w-full py-1 text-center text-xs text-zinc-500 hover:text-zinc-300 font-medium underline underline-offset-4 cursor-pointer focus:outline-none"
            >
              Back to Login Selection
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Return forgot password view
  if (isForgotPassword) {
    return (
      <div id="auth_container" className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* SMS Simulator banner overlay for Forgot Password Phone OTP */}
        <AnimatePresence>
          {smsNotification && smsNotification.show && (
            <motion.div
              initial={{ opacity: 0, y: -100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -100 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-sm bg-zinc-900 border-2 border-emerald-500 rounded-2xl shadow-xl shadow-black/80 z-50 p-4 shrink-0 overflow-hidden"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400 shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono font-bold">{smsNotification.sender}</h5>
                    <p className="text-xs text-zinc-100 font-medium mt-1 leading-normal select-all">{smsNotification.body}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSmsNotification(null)}
                  className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-700/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl opacity-50" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-8 relative z-10"
        >
          {renderHeader("Password Recovery", "Obtain password reset clearance")}

          {/* Recovery Selector Tabs */}
          <div className="flex p-0.5 bg-zinc-950 border border-zinc-850 rounded-xl mb-5">
            <button
              id="tab-recover-email"
              type="button"
              onClick={() => {
                setForgotMethod('email');
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                forgotMethod === 'email' ? "bg-zinc-900 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Email Reset
            </button>
            <button
              id="tab-recover-phone"
              type="button"
              onClick={() => {
                setForgotMethod('phone');
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-all ${
                forgotMethod === 'phone' ? "bg-zinc-900 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Phone OTP Reset
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-red-200 text-xs text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-950/30 border border-emerald-950/60 rounded-xl text-emerald-300 text-xs text-center font-medium">
              {success}
            </div>
          )}

          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            {forgotMethod === 'email' ? (
              <div className="space-y-4 font-sans">
                <div>
                  <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">Registered Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-zinc-600" />
                    <input
                      id="recover-email-input"
                      type="email"
                      required
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-100 rounded-xl outline-none focus:border-emerald-500 transition-all font-sans"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">Verified Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4.5 h-4.5 text-zinc-600" />
                    <input
                      id="recover-phone-input"
                      type="tel"
                      required
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-32 py-2.5 bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 rounded-xl outline-none focus:border-emerald-500 transition-all font-medium"
                    />
                    <button
                      id="btn-trigger-otp-recover"
                      type="button"
                      disabled={loading || !phone}
                      onClick={() => dispatchPhoneOtp(phone)}
                      className="absolute right-2 top-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 text-[10px] rounded-lg text-emerald-400 hover:bg-zinc-850 font-bold"
                    >
                      Transmit OTP
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-1.5 uppercase tracking-wider font-mono">6-Digit SMS OTP</label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-zinc-600" />
                    <input
                      id="recover-otp-input"
                      type="text"
                      required
                      maxLength={6}
                      placeholder="XXXXXX"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-805 text-xs text-zinc-150 rounded-xl outline-none tracking-widest font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              id="btn-recover-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  {forgotMethod === 'email' ? "Submit Email Recovery Link" : "Verify OTP and Sign In"}
                </>
              )}
            </button>
          </form>

          <button
            id="back-to-auth-login"
            onClick={() => {
              setIsForgotPassword(false);
              setIsLogin(true);
              window.history.pushState({}, "", "/");
              setError("");
              setSuccess("");
            }}
            className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 font-medium underline underline-offset-4 mt-5 block"
          >
            Back to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  // DEFAULT REGISTER AND LOGIN STANDARD FORMS
  return (
    <div id="auth_container" className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Google Identity Single Sign-On Validation Dialog Modal Overlay */}
      <AnimatePresence>
        {showGoogleModal && (
          <div id="google_sso_overlay" className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 space-y-4 text-left relative z-10"
            >
              <button 
                id="close-google-sso"
                onClick={() => setShowGoogleModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.137 4.114a5.83 5.83 0 0 1-5.83-5.83c0-3.22 2.61-5.83 5.83-5.83 1.493 0 2.855.563 3.896 1.493l3.054-3.054C19.014 3.42 15.82 2 12.24 2a10.03 10.03 0 0 0-10 10 10.03 10.03 0 0 0 10 10c5.556 0 10.185-4.028 10.185-10 0-.648-.065-1.287-.185-1.715H12.24Z" />
                </svg>
                <h4 className="text-sm font-bold text-zinc-100 font-sans tracking-tight">Google Federated SSO</h4>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                Authenticate instantly on the local sandbox workspace using Google's federated sign-on protocol. Choose a default developer credential profile or declare a custom email address below.
              </p>

              {/* Default profiles selectors */}
              <div className="space-y-2 mt-2">
                <button
                  type="button"
                  onClick={() => handleGoogleSignInSubmit("mainc983@gmail.com")}
                  className="w-full p-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-750 rounded-xl flex items-center justify-between text-xs text-zinc-350 transition-all font-sans text-left cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-200">System Executive Director</span>
                    <span className="text-[10px] text-zinc-500 font-mono mt-0.5">mainc983@gmail.com</span>
                  </div>
                  <span className="text-[9px] text-emerald-400 font-bold border border-emerald-950 bg-emerald-950/20 px-2 py-0.5 rounded-md">Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGoogleSignInSubmit("tester_portal@gmail.com")}
                  className="w-full p-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-750 rounded-xl flex items-center justify-between text-xs text-zinc-350 transition-all font-sans text-left cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-200">Mock Sandbox Operator</span>
                    <span className="text-[10px] text-zinc-500 font-mono mt-0.5">operator@google.com</span>
                  </div>
                  <span className="text-[9px] text-zinc-400 font-bold border border-zinc-800 bg-zinc-900 px-2 py-0.5 rounded-md">Tester</span>
                </button>
              </div>

              {/* Custom login gateway */}
              <div className="pt-3.5 border-t border-zinc-850 space-y-2.5">
                <label className="block text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider">Custom Profile Identification</label>
                <div className="flex gap-2">
                  <input
                    id="txt-google-sso-custom-email-addr"
                    type="email"
                    placeholder="name@example.com"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-805 text-xs text-zinc-200 rounded-xl outline-none focus:border-emerald-500 transition-all font-sans"
                  />
                  <button
                    id="submit-google-sso-custom-action"
                    type="button"
                    onClick={() => handleGoogleSignInSubmit(googleEmailInput)}
                    disabled={!googleEmailInput.includes("@")}
                    className="px-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:from-zinc-850 disabled:to-zinc-850 disabled:text-zinc-655 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Authorize
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Simulated SMS Notification Banner Overlay Drawer */}
      <AnimatePresence>
        {smsNotification && smsNotification.show && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-sm bg-zinc-900 border-2 border-emerald-500 rounded-2xl shadow-xl shadow-black/80 z-50 p-4 shrink-0 overflow-hidden"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono font-bold">{smsNotification.sender}</h5>
                  <p className="text-xs text-zinc-100 font-medium mt-1 leading-normal select-all">{smsNotification.body}</p>
                </div>
              </div>
              <button 
                onClick={() => setSmsNotification(null)}
                className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-700/10 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl opacity-50" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-8 relative z-10"
      >
        {renderHeader(
          isLogin ? "Sign in to MyAI" : "Create MyAI Account", 
          "Experience advanced secure workspace channels"
        )}

        {/* SUB LOGIN METHODS SEGMENT CONTROL SCREEN */}
        {isLogin && (
          <div className="flex p-0.5 bg-zinc-950 border border-zinc-850 rounded-xl mb-5">
            <button
              id="sub-tab-email"
              type="button"
              onClick={() => {
                setLoginMethod('email');
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-1.5 text-[9px] uppercase tracking-wider font-mono font-bold rounded-lg transition-all ${
                loginMethod === 'email' ? "bg-zinc-900 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Email & Pass
            </button>
            <button
              id="sub-tab-phone"
              type="button"
              onClick={() => {
                setLoginMethod('phone');
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-1.5 text-[9px] uppercase tracking-wider font-mono font-bold rounded-lg transition-all ${
                loginMethod === 'phone' ? "bg-zinc-900 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Phone & Pass
            </button>
            <button
              id="sub-tab-otp"
              type="button"
              onClick={() => {
                setLoginMethod('otp');
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-1.5 text-[9px] uppercase tracking-wider font-mono font-bold rounded-lg transition-all ${
                loginMethod === 'otp' ? "bg-zinc-900 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Phone OTP
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-red-200 text-xs text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-950/30 border border-emerald-950/60 rounded-xl text-emerald-300 text-xs text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <span>{success}</span>
          </div>
        )}

        {/* AUTH FORMS SYSTEM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field - visible in register and email login */}
          {(!isLogin || loginMethod === 'email') && (
            <div>
              <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  id="primary-auth-email"
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-150 rounded-xl outline-none focus:border-emerald-500 transition-all font-sans"
                />
              </div>
            </div>
          )}

          {/* Phone field - visible in register, phone login, and otp login */}
          {(!isLogin || loginMethod === 'phone' || loginMethod === 'otp') && (
            <div>
              <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  id="primary-auth-phone"
                  type="tel"
                  required
                  placeholder="+1 (555) 012-3456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-24 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-150 rounded-xl outline-none focus:border-emerald-500 transition-all font-sans font-medium"
                />
                
                {/* OTP Dispatch button inside Input frame (only for OTP login method) */}
                {isLogin && loginMethod === 'otp' && (
                  <button
                    id="btn-dispatch-otp-sub"
                    type="button"
                    disabled={loading || !phone}
                    onClick={() => dispatchPhoneOtp(phone)}
                    className="absolute right-2 top-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-[9px] font-bold text-emerald-400 hover:text-emerald-300 select-none cursor-pointer"
                  >
                    Send OTP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Username handle - only visible in registers */}
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">Username Handle</label>
              <div className="relative">
                <UserPlus className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  id="primary-auth-username"
                  type="text"
                  required
                  placeholder="UniqueUsername"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-150 rounded-xl outline-none focus:border-emerald-500 transition-all font-sans"
                />
              </div>
            </div>
          )}

          {/* Standard password field - only in email & phone login, and registers */}
          {(loginMethod !== 'otp' || !isLogin) && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider">Secret Password</label>
                {isLogin && (
                  <button
                    id="link-trigger-forgot-pw"
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      window.history.pushState({}, "", "/forgot-password");
                      setError("");
                      setSuccess("");
                    }}
                    className="text-[10px] text-zinc-500 hover:text-emerald-400 font-semibold underline underline-offset-2 select-none"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Key className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  id="primary-auth-password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-150 rounded-xl outline-none focus:border-emerald-500 transition-all font-sans"
                />
              </div>
            </div>
          )}

          {/* Phone OTP entry code field - visible in OTP Login tab */}
          {isLogin && loginMethod === 'otp' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider">6-Digit OTP Code</label>
                {timerSeconds > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 animate-spin" />
                    {formatTime(timerSeconds)}
                  </span>
                )}
              </div>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  id="primary-auth-otp"
                  type="text"
                  required
                  maxLength={6}
                  placeholder="XXXXXX"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 text-xs text-zinc-150 rounded-xl outline-none tracking-widest font-mono"
                />
              </div>
            </div>
          )}

          {/* Confirm password field - only in register */}
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-bold font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  id="primary-auth-confirm-pw"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-150 rounded-xl outline-none focus:border-emerald-500 transition-all font-sans"
                />
              </div>
            </div>
          )}

          {/* Remember Me & Stay Logged In Options */}
          {isLogin && (
            <div className="flex items-center justify-between py-1.5 text-xs text-zinc-400 font-sans">
              <label id="lbl-remember-me" className="flex items-center gap-2 select-none cursor-pointer hover:text-zinc-300">
                <input
                  id="chk-remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 accent-emerald-500"
                />
                <span>Remember Me</span>
              </label>
              <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium select-none">
                <span className="w-1.5 h-1.5 bg-emerald-550 rounded-full animate-pulse" />
                <span>Stay Logged In</span>
              </div>
            </div>
          )}

          {/* Submission CTA */}
          <button
            id="btn_submit_sign"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:from-zinc-800 disabled:to-zinc-850 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-xl hover:shadow-emerald-950/20 active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In Protocol</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Register Assets</span>
              </>
            )}
          </button>
        </form>

        {/* Continue with Google Block */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-zinc-800/60" />
          <span className="flex-shrink mx-2.5 text-[8px] text-zinc-500 uppercase tracking-widest font-mono select-none">Or federated authorization standard</span>
          <div className="flex-grow border-t border-zinc-800/60" />
        </div>

        <button
          id="btn_continue_google_sso"
          type="button"
          onClick={() => {
            setShowGoogleModal(true);
            setGoogleEmailInput("");
            setError("");
            setSuccess("");
          }}
          className="w-full py-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-200 hover:text-white text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 select-none"
        >
          {/* Custom vector SVG Logo design for Google inside bounds */}
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.137 4.114a5.83 5.83 0 0 1-5.83-5.83c0-3.22 2.61-5.83 5.83-5.83 1.493 0 2.855.563 3.896 1.493l3.054-3.054C19.014 3.42 15.82 2 12.24 2a10.03 10.03 0 0 0-10 10 10.03 10.03 0 0 0 10 10c5.556 0 10.185-4.028 10.185-10 0-.648-.065-1.287-.185-1.715H12.24Z" />
          </svg>
          <span className="font-sans">Continue with Google Identity</span>
        </button>

        {/* Toggle Mode */}
        <div className="text-center mt-5 text-[11px] text-zinc-500 select-none font-medium">
          {isLogin ? "Join the sandbox grid?" : "Have registered signatures already?"}{" "}
          <button
            id="btn_toggle_primary_form"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setSuccess("");
            }}
            className="text-emerald-400 hover:text-emerald-350 font-bold underline underline-offset-4 cursor-pointer focus:outline-none"
          >
            {isLogin ? "Register here" : "Sign in here"}
          </button>
        </div>

        {/* Separator */}
        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-zinc-800/80" />
          <span className="flex-shrink mx-3 text-[9px] text-zinc-500 uppercase tracking-widest font-mono select-none">Sandbox Entrance</span>
          <div className="flex-grow border-t border-zinc-800/80" />
        </div>

        {/* Instant Sandbox Override Bypass Key */}
        <button
          id="btn_quick_companion_entry"
          onClick={handleDemoAccess}
          disabled={loading}
          className="w-full py-2 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900 rounded-xl text-zinc-300 hover:text-emerald-400 text-[11px] font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 select-none"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          Instant Demo Companion Entry
        </button>
      </motion.div>
    </div>
  );
}
