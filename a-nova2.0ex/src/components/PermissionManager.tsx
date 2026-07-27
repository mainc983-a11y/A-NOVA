import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { 
  Mic, 
  Camera, 
  Image as ImageIcon, 
  FileText, 
  Bell, 
  MapPin, 
  Clipboard, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  RefreshCw, 
  Settings as SettingsIcon, 
  Lock,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type PermissionType = 
  | "microphone" 
  | "camera" 
  | "photos" 
  | "files" 
  | "notifications" 
  | "location" 
  | "clipboard";

export type PermissionState = "granted" | "prompt" | "denied" | "unsupported";

export interface PermissionConfig {
  type: PermissionType;
  title: string;
  description: string;
  privacyNote: string;
  deniedTitle: string;
  deniedDescription: string;
  icon: React.ElementType;
  badgeBg: string;
  buttonBg: string;
  accentColor: string;
}

export const PERMISSION_CONFIGS: Record<PermissionType, PermissionConfig> = {
  microphone: {
    type: "microphone",
    title: "Allow A-NOVA to access your Microphone?",
    description: "A-NOVA needs microphone access so you can speak to the AI Voice Assistant and record voice messages.",
    privacyNote: "🔒 Privacy Note: Your microphone is active only while using Voice Mode or recording. Audio is never stored or transmitted without your consent.",
    deniedTitle: "Microphone Access Restricted",
    deniedDescription: "A-NOVA Voice Assistant and Voice Input cannot function without microphone access.",
    icon: Mic,
    badgeBg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    buttonBg: "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25",
    accentColor: "purple"
  },
  camera: {
    type: "camera",
    title: "Allow A-NOVA to access your Camera?",
    description: "A-NOVA needs camera access so you can capture photos and attach live visual snapshots into your chat.",
    privacyNote: "🔒 Privacy Note: Camera feed is rendered strictly locally on your device until you choose to attach a photo.",
    deniedTitle: "Camera Access Restricted",
    deniedDescription: "A-NOVA cannot capture live video or photo snapshots without camera access.",
    icon: Camera,
    badgeBg: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    buttonBg: "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25",
    accentColor: "sky"
  },
  photos: {
    type: "photos",
    title: "Allow A-NOVA to access your Photo Library?",
    description: "A-NOVA needs permission to let you select and attach images from your device photos.",
    privacyNote: "🔒 Privacy Note: A-NOVA only accesses the specific images you explicitly choose to upload.",
    deniedTitle: "Photo Library Access Restricted",
    deniedDescription: "A-NOVA cannot select images from your device gallery without permission.",
    icon: ImageIcon,
    badgeBg: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    buttonBg: "bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-600/25",
    accentColor: "pink"
  },
  files: {
    type: "files",
    title: "Allow A-NOVA to access Document Storage?",
    description: "A-NOVA needs permission to let you select and upload documents, code files, and PDFs into your workspace.",
    privacyNote: "🔒 Privacy Note: Files are processed locally and attached only when explicitly selected by you.",
    deniedTitle: "Document Storage Access Restricted",
    deniedDescription: "A-NOVA cannot attach or read files from your file storage without permission.",
    icon: FileText,
    badgeBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    buttonBg: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25",
    accentColor: "indigo"
  },
  notifications: {
    type: "notifications",
    title: "Allow A-NOVA to send Notifications?",
    description: "Get instant desktop/mobile alerts when long AI responses finish or for important system reminders.",
    privacyNote: "🔒 Privacy Note: Notifications are sent strictly for active chat completions and scheduled updates.",
    deniedTitle: "Notifications Blocked",
    deniedDescription: "A-NOVA cannot alert you when responses finish in the background.",
    icon: Bell,
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    buttonBg: "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/25",
    accentColor: "amber"
  },
  location: {
    type: "location",
    title: "Allow A-NOVA to access your Location?",
    description: "A-NOVA uses your GPS location to provide accurate local weather, search results, and map addresses.",
    privacyNote: "🔒 Privacy Note: Location is queried only on-demand when you trigger location sharing.",
    deniedTitle: "Location Access Restricted",
    deniedDescription: "A-NOVA cannot retrieve your current GPS position or address context.",
    icon: MapPin,
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    buttonBg: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25",
    accentColor: "emerald"
  },
  clipboard: {
    type: "clipboard",
    title: "Allow A-NOVA to access your Clipboard?",
    description: "A-NOVA needs clipboard access to paste copied text or images directly into your prompt area.",
    privacyNote: "🔒 Privacy Note: Clipboard content is read strictly when you press the Paste button.",
    deniedTitle: "Clipboard Access Restricted",
    deniedDescription: "A-NOVA cannot read content from your system clipboard.",
    icon: Clipboard,
    badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    buttonBg: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/25",
    accentColor: "cyan"
  }
};

interface PermissionRequest {
  type: PermissionType;
  onGranted: () => void;
  onDenied?: () => void;
}

interface PermissionContextType {
  requestPermission: (type: PermissionType, onGranted: () => void, onDenied?: () => void) => Promise<void>;
  checkPermissionStatus: (type: PermissionType) => Promise<PermissionState>;
  resetPermission: (type: PermissionType) => void;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

export function usePermissionManager() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissionManager must be used within a PermissionProvider");
  }
  return context;
}

interface PermissionProviderProps {
  children: ReactNode;
  isDark?: boolean;
}

export function PermissionProvider({ children, isDark = true }: PermissionProviderProps) {
  const [activeRequest, setActiveRequest] = useState<PermissionRequest | null>(null);
  const [deniedRequest, setDeniedRequest] = useState<PermissionRequest | null>(null);
  const [unsupportedMsg, setUnsupportedMsg] = useState<string | null>(null);

  // Check browser & localStorage status for permission
  const checkPermissionStatus = useCallback(async (type: PermissionType): Promise<PermissionState> => {
    if (typeof window === "undefined") return "unsupported";

    const saved = localStorage.getItem(`permission_approved_${type}`);

    // Check specific web APIs
    if (type === "notifications") {
      if (!("Notification" in window)) return "unsupported";
      if (Notification.permission === "granted") {
        localStorage.setItem("permission_approved_notifications", "granted");
        return "granted";
      }
      if (Notification.permission === "denied") {
        localStorage.setItem("permission_approved_notifications", "denied");
        return "denied";
      }
    }

    if (type === "clipboard") {
      if (!navigator.clipboard) return "unsupported";
    }

    if (type === "location") {
      if (!navigator.geolocation) return "unsupported";
    }

    if (type === "microphone" || type === "camera") {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return "unsupported";
      }
    }

    // Return saved state if granted or denied
    if (saved === "granted") return "granted";
    if (saved === "denied") return "denied";

    // Query navigator.permissions API if supported
    if (navigator.permissions && navigator.permissions.query) {
      try {
        let queryName: any = type;
        if (type === "photos") queryName = "photos";
        if (type === "files") queryName = "persistent-storage";

        const res = await navigator.permissions.query({ name: queryName });
        if (res.state === "granted") {
          localStorage.setItem(`permission_approved_${type}`, "granted");
          return "granted";
        }
        if (res.state === "denied") {
          localStorage.setItem(`permission_approved_${type}`, "denied");
          return "denied";
        }
      } catch (_) {
        // Mismatch query name fallback
      }
    }

    return "prompt";
  }, []);

  // Primary entrypoint to request permission
  const requestPermission = useCallback(async (
    type: PermissionType,
    onGranted: () => void,
    onDenied?: () => void
  ) => {
    const status = await checkPermissionStatus(type);

    if (status === "granted") {
      onGranted();
      return;
    }

    if (status === "denied") {
      setDeniedRequest({ type, onGranted, onDenied });
      if (onDenied) onDenied();
      return;
    }

    if (status === "unsupported") {
      setUnsupportedMsg(`${PERMISSION_CONFIGS[type].title.replace('Allow A-NOVA to access your ', '').replace('?', '')} is not supported by your browser.`);
      setTimeout(() => setUnsupportedMsg(null), 4000);
      if (onDenied) onDenied();
      return;
    }

    // State is "prompt": Show clean A-NOVA explanation sheet before native prompt
    setActiveRequest({ type, onGranted, onDenied });
  }, [checkPermissionStatus]);

  // Handle clicking "Continue" in pre-permission sheet -> triggers browser native prompt
  const handleContinueNativePermission = async () => {
    if (!activeRequest) return;
    const { type, onGranted, onDenied } = activeRequest;
    setActiveRequest(null);

    try {
      if (type === "microphone") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        localStorage.setItem("permission_approved_microphone", "granted");
        onGranted();
      } else if (type === "camera") {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        localStorage.setItem("permission_approved_camera", "granted");
        onGranted();
      } else if (type === "photos" || type === "files") {
        localStorage.setItem(`permission_approved_${type}`, "granted");
        onGranted();
      } else if (type === "notifications") {
        if (!("Notification" in window)) {
          setUnsupportedMsg("Browser notifications are not supported.");
          setTimeout(() => setUnsupportedMsg(null), 4000);
          return;
        }
        const res = await Notification.requestPermission();
        if (res === "granted") {
          localStorage.setItem("permission_approved_notifications", "granted");
          onGranted();
        } else {
          localStorage.setItem("permission_approved_notifications", "denied");
          setDeniedRequest({ type, onGranted, onDenied });
          if (onDenied) onDenied();
        }
      } else if (type === "location") {
        if (!navigator.geolocation) {
          setUnsupportedMsg("Geolocation is not supported by this browser.");
          setTimeout(() => setUnsupportedMsg(null), 4000);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          () => {
            localStorage.setItem("permission_approved_location", "granted");
            onGranted();
          },
          () => {
            localStorage.setItem("permission_approved_location", "denied");
            setDeniedRequest({ type, onGranted, onDenied });
            if (onDenied) onDenied();
          }
        );
      } else if (type === "clipboard") {
        if (navigator.clipboard) {
          localStorage.setItem("permission_approved_clipboard", "granted");
          onGranted();
        } else {
          setUnsupportedMsg("Clipboard access is not supported.");
          setTimeout(() => setUnsupportedMsg(null), 4000);
        }
      }
    } catch (err) {
      console.warn(`Native permission request error for ${type}:`, err);
      localStorage.setItem(`permission_approved_${type}`, "denied");
      setDeniedRequest({ type, onGranted, onDenied });
      if (onDenied) onDenied();
    }
  };

  // Handle clicking "Not Now" in pre-permission sheet
  const handleDismissPrePermission = () => {
    if (activeRequest?.onDenied) activeRequest.onDenied();
    setActiveRequest(null);
  };

  // Retry permission when in Denied state
  const handleRetryPermission = () => {
    if (!deniedRequest) return;
    const { type, onGranted, onDenied } = deniedRequest;
    localStorage.removeItem(`permission_approved_${type}`);
    setDeniedRequest(null);

    setTimeout(() => {
      requestPermission(type, onGranted, onDenied);
    }, 150);
  };

  const resetPermission = (type: PermissionType) => {
    localStorage.removeItem(`permission_approved_${type}`);
  };

  return (
    <PermissionContext.Provider value={{ requestPermission, checkPermissionStatus, resetPermission }}>
      {children}

      {/* Unsupported Feature Toast */}
      <AnimatePresence>
        {unsupportedMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[10000] px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-xs shadow-2xl flex items-center gap-2.5 max-w-sm text-center"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{unsupportedMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. ChatGPT-Style In-App Explanation Sheet (Pre-Permission Dialog) */}
      <AnimatePresence>
        {activeRequest && (() => {
          const config = PERMISSION_CONFIGS[activeRequest.type];
          const IconComp = config.icon;
          return (
            <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm z-[9999] animate-fade-in text-white select-none">
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl relative ${
                  isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
                }`}
              >
                {/* Header with Icon */}
                <div className="flex items-center gap-3.5 mb-4">
                  <div className={`p-3 rounded-2xl border ${config.badgeBg}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono block">
                      Permission Needed
                    </span>
                    <h3 className="text-sm font-bold tracking-tight">
                      {config.title}
                    </h3>
                  </div>
                </div>

                {/* Explanation Body */}
                <p className={`text-xs leading-relaxed mb-4 font-normal ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                  {config.description}
                </p>

                {/* Privacy Note */}
                <div className={`p-3 rounded-2xl border mb-6 text-[11px] leading-snug ${
                  isDark ? "bg-zinc-900/70 border-zinc-850 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600"
                }`}>
                  {config.privacyNote}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleContinueNativePermission}
                    className={`flex-1 py-3 px-4 text-xs font-semibold rounded-2xl cursor-pointer transition-all active:scale-[0.98] ${config.buttonBg}`}
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissPrePermission}
                    className={`py-3 px-4 text-xs font-medium rounded-2xl cursor-pointer transition-all active:scale-[0.98] border ${
                      isDark 
                        ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850" 
                        : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200"
                    }`}
                  >
                    Not Now
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* 2. Friendly Permission Denied / Settings Guide Modal */}
      <AnimatePresence>
        {deniedRequest && (() => {
          const config = PERMISSION_CONFIGS[deniedRequest.type];
          return (
            <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm z-[9999] animate-fade-in text-white select-none">
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl relative ${
                  isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
                }`}
              >
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 font-mono block">
                      Access Restricted
                    </span>
                    <h3 className="text-sm font-bold tracking-tight">
                      {config.deniedTitle}
                    </h3>
                  </div>
                </div>

                <p className={`text-xs leading-relaxed mb-4 ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                  {config.deniedDescription}
                </p>

                {/* Step-by-Step Settings Instructions */}
                <div className={`p-4 rounded-2xl border mb-6 text-xs space-y-2.5 ${
                  isDark ? "bg-zinc-900/80 border-zinc-800/80 text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-700"
                }`}>
                  <div className="font-semibold text-xs text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <SettingsIcon className="w-3.5 h-3.5 text-purple-400" /> How to enable in browser settings:
                  </div>
                  <ol className="space-y-1.5 pl-1 text-[11px] leading-snug">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-purple-400 shrink-0">1.</span>
                      <span>Click the lock icon (🔒) or site settings icon near the URL bar.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-purple-400 shrink-0">2.</span>
                      <span>Locate <strong className="text-zinc-200 font-semibold">{config.title.replace('Allow A-NOVA to access your ', '').replace('?', '')}</strong> in permissions.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-purple-400 shrink-0">3.</span>
                      <span>Toggle the permission to <strong>Allow</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-purple-400 shrink-0">4.</span>
                      <span>Click <strong>Try Again</strong> below to test access.</span>
                    </li>
                  </ol>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleRetryPermission}
                    className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-2xl cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Try Again
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeniedRequest(null)}
                    className={`py-3 px-4 text-xs font-medium rounded-2xl cursor-pointer transition-all active:scale-[0.98] border ${
                      isDark 
                        ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850" 
                        : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </PermissionContext.Provider>
  );
}
