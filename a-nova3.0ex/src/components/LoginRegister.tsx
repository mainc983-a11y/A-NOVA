import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, 
  Sparkles, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle,
  UserPlus,
  LogIn,
  Layers,
  Cpu,
  Globe,
  Radio,
  ExternalLink
} from "lucide-react";

interface LoginRegisterProps {
  onAuthSuccess: (token: string, user: any) => void;
}

export default function LoginRegister({ onAuthSuccess }: LoginRegisterProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleTabChange = (tab: "login" | "signup") => {
    setActiveTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data && data.session) {
        const userToken = data.session.access_token;
        const activeUser = {
          id: data.session.user.id,
          email: data.session.user.email || "",
          username: data.session.user.user_metadata?.username || data.session.user.email?.split("@")[0] || "user",
          displayName: data.session.user.user_metadata?.displayName || data.session.user.user_metadata?.username || data.session.user.email?.split("@")[0] || "user",
          createdAt: data.session.user.created_at || new Date().toISOString(),
          planStatus: "Plus",
          role: "user"
        };
        
        onAuthSuccess(userToken, activeUser);
      } else {
        setErrorMessage("Successfully logged in but no active session found. Please try again.");
      }
    } catch (err: any) {
      console.error("[AUTH ERROR] Login failed:", err);
      setErrorMessage(err.message || "Invalid credentials. Please attempt again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err.message || "Google Single Sign-On failed.");
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setErrorMessage("Please complete all registration fields.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data && data.session) {
        // Explicitly clear session to prevent client-side auto-login
        await supabase.auth.signOut();
      }

      setSuccessMessage("Check your email and confirm your account before logging in.");
      setPassword("");
      setConfirmPassword("");
      setActiveTab("login");
    } catch (err: any) {
      console.error("[AUTH ERROR] Registration failed:", err);
      setErrorMessage(err.message || "Sign up was unsuccessful. Please check input formats.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      id="login_page_container"
      className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-y-auto font-sans text-white md:p-8 select-none"
    >
      {/* Background stars animation and noise filter layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(9,9,11,0.4)_0%,rgba(9,9,11,0.95)_100%)] z-0" />
      
      {/* Absolute floating gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-900/15 rounded-full blur-[50px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-purple-900/10 rounded-full blur-[50px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-900/5 rounded-full blur-[50px] pointer-events-none" />

      {/* Futuristic Background Circuit/AI elements with pure CSS animations to avoid JS lag */}
      <div className="absolute inset-0 opacity-15 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-12 left-10 w-24 h-24 border border-zinc-800 rounded-full flex items-center justify-center">
          <Cpu className="w-5 h-5 text-cyan-400 rotate-45" />
        </div>
        <div className="absolute bottom-16 right-12 w-32 h-32 border border-zinc-850 rounded-full flex items-center justify-center">
          <Radio className="w-6 h-6 text-purple-400" />
        </div>
        <div className="absolute top-1/3 right-1/10 w-16 h-16 border border-zinc-800 rounded-lg" />
        <div className="absolute bottom-1/3 left-1/10 w-20 h-20 border border-zinc-800 rounded-xl" />
      </div>

      <div className="w-full max-w-xl flex flex-col items-center z-10">
        
        {/* Generative Interactive Top A-Nova Logo */}
        <div className="flex flex-col items-center mb-8 text-center select-none">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="relative w-20 h-20 mb-4 cursor-pointer group"
          >
            {/* Cyber Glow Backdrop rings */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 rounded-3xl blur-md opacity-40 group-hover:opacity-60 transition duration-300" />
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-2xl opacity-80" />
            
            {/* Inner Dark core */}
            <div className="relative w-full h-full bg-zinc-950 rounded-2xl flex items-center justify-center border border-zinc-800/80">
              <span className="text-4xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 font-display">
                A
              </span>
              <Sparkles className="w-5 h-5 text-cyan-300 absolute -top-1.5 -right-1.5 animate-pulse" />
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl md:text-4xl font-black font-display tracking-tight text-white mb-2"
          >
            A-NOVA
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm font-light text-zinc-400 tracking-widest uppercase flex items-center justify-center gap-2"
          >
            <span className="h-[1px] w-8 bg-zinc-800" />
            The Future of Intelligence
            <span className="h-[1px] w-8 bg-zinc-800" />
          </motion.p>
        </div>

        {/* glassmorphism Card container - wider and sleeker */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/85 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden"
        >
          {/* Custom micro header line */}
          <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 w-full" />

          {/* Authentication tabs navigation */}
          <div className="flex border-b border-zinc-800 p-3 bg-zinc-950/40">
            <button
              id="tab_select_signin"
              type="button"
              onClick={() => handleTabChange("login")}
              className={`flex-1 py-3 text-xs font-semibold tracking-wide font-display rounded-1.5xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "login" 
                  ? "bg-zinc-800/80 text-cyan-400 border border-zinc-700/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LogIn className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'login' ? 'translate-x-0' : '-translate-x-0.5'}`} />
              Sign In to Workspace
            </button>
            <button
              id="tab_select_signup"
              type="button"
              onClick={() => handleTabChange("signup")}
              className={`flex-1 py-3 text-xs font-semibold tracking-wide font-display rounded-1.5xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "signup" 
                  ? "bg-zinc-800/80 text-purple-400 border border-zinc-700/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <UserPlus className={`w-4 h-4 transition-transform duration-300 ${activeTab === 'signup' ? 'scale-110' : 'scale-100'}`} />
              Create Neural Account
            </button>
          </div>

          <div className="p-8">
            {/* Status alerts */}
            <AnimatePresence mode="wait">
              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="p-4 mb-6 bg-red-950/20 border border-red-800/40 rounded-2xl text-red-400 text-xs flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block mb-0.5">Authentication Error</span>
                    <p className="opacity-95 text-[11px] leading-relaxed">{errorMessage}</p>
                    {errorMessage.toLowerCase().includes("invalid login credentials") && (
                      <p className="mt-2 text-zinc-400 text-[10px] leading-relaxed border-t border-red-900/30 pt-1.5">
                        <strong className="text-zinc-200">Note:</strong> If you recently updated your Supabase connection, credentials from different databases do not carry over. Please select the <span className="font-semibold text-purple-400 hover:underline cursor-pointer" onClick={() => handleTabChange("signup")}>"Create Neural Account"</span> tab to sign up your first admin user.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {successMessage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="p-4 mb-6 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl text-emerald-400 text-xs flex items-start gap-3"
                >
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block mb-0.5">Authorization Updated</span>
                    <p className="opacity-95 text-[11px] leading-relaxed">{successMessage}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={activeTab === "login" ? handleLogin : handleSignup} className="space-y-5">
              {/* Email Address */}
              <div>
                <label className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest mb-2 font-medium">
                  Workspace Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-4.5 w-4.5 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@a-nova.com"
                    className="w-full pl-11 pr-4 py-3 bg-zinc-950/70 border border-zinc-800/90 rounded-2xl text-xs text-white placeholder-zinc-600 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 focus:outline-none transition-all font-sans duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest font-medium">
                    Account Security Password
                  </label>
                  {activeTab === "login" && (
                    <button 
                      type="button" 
                      onClick={() => setErrorMessage("Please check your email client or password vault. Email password recovery can be executed directly from your Supabase admin directory.")}
                      className="text-[10px] text-cyan-400/80 hover:text-cyan-400 font-mono transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4.5 w-4.5 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-11 pr-11 py-3 bg-zinc-950/70 border border-zinc-800/90 rounded-2xl text-xs text-white placeholder-zinc-600 focus:border-purple-505/80 focus:ring-1 focus:ring-purple-500/30 focus:outline-none transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Signup registration only) */}
              {activeTab === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2">
                    <label className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest mb-2 font-medium">
                      Confirm Account Security Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-4.5 w-4.5 text-zinc-500" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type your secure password"
                        className="w-full pl-11 pr-11 py-3 bg-zinc-950/70 border border-zinc-800/90 rounded-2xl text-xs text-white placeholder-zinc-650 focus:border-purple-505/80 focus:ring-1 focus:ring-purple-500/30 focus:outline-none transition-all duration-200"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Main Submit Button with smooth premium hover, click animations and gradients */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-5 mt-6 bg-gradient-to-r ${
                  activeTab === "login" 
                    ? "from-cyan-500 via-blue-600 to-indigo-600 shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]" 
                    : "from-purple-600 via-indigo-600 to-blue-600 shadow-[0_0_20px_rgba(147,51,234,0.25)] hover:shadow-[0_0_25px_rgba(147,51,234,0.4)]"
                } text-white font-semibold text-xs tracking-wider uppercase font-display rounded-2xl border border-white/10 flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] cursor-pointer`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{activeTab === "login" ? "Initialize Agent Session" : "Provision Security Profile"}</span>
                    <ArrowRight className="w-4.5 h-4.5" />
                  </>
                )}
              </button>
            </form>

            {errorMessage && (
              <p id="form_error_small_message" className="mt-3 text-center text-xs text-red-400 font-mono transition-all duration-200">
                Error: {errorMessage}
              </p>
            )}

            {/* Google Single-Sign-On */}
            <div className="relative my-7">
              <div className="absolute inset-y-1/2 left-0 right-0 h-[1px] bg-zinc-800" />
              <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-widest">
                <span className="px-4 bg-zinc-900/10 backdrop-blur text-zinc-500">Or continue with SSO</span>
              </div>
            </div>

            <button
              id="google-sso-action-button"
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 rounded-2xl text-xs font-semibold hover:border-zinc-700 transition duration-200 select-none cursor-pointer text-zinc-300"
            >
              {/* Beautiful Google Vector icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" width="24" height="24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Authenticate with Google Cloud</span>
            </button>
          </div>
        </motion.div>

        {/* Dynamic legal & status footers */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center space-y-3"
        >
          <p className="text-[10px] text-zinc-550 font-mono tracking-wide flex items-center justify-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-zinc-600 animate-pulse" />
            Workspace Node ID: <span className="text-zinc-400 font-bold select-text">a-nova-node-2026-prod</span>
          </p>

          <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-500 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> Connection: Verified
            </span>
            <span className="h-[12px] w-[1px] bg-zinc-800" />
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition duration-150 flex items-center gap-0.5">
              Powered by Supabase <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
