import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
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
}

export const PERMISSION_CONFIGS: Record<PermissionType, PermissionConfig> = {
  microphone: {
    type: "microphone",
    title: "Microphone Access Required",
    description: "Microphone access is required for voice input.",
    privacyNote: "",
    deniedTitle: "Microphone Access Required",
    deniedDescription: "Microphone permission denied."
  },
  camera: {
    type: "camera",
    title: "Camera Access Required",
    description: "Camera access is required to capture photos.",
    privacyNote: "",
    deniedTitle: "Camera Access Required",
    deniedDescription: "Camera permission denied."
  },
  photos: {
    type: "photos",
    title: "Photo Library Access Required",
    description: "Photo library access is required.",
    privacyNote: "",
    deniedTitle: "Photo Library Access Required",
    deniedDescription: "Photo library permission denied."
  },
  files: {
    type: "files",
    title: "Document Storage Access Required",
    description: "Storage access is required.",
    privacyNote: "",
    deniedTitle: "Document Storage Access Required",
    deniedDescription: "Storage permission denied."
  },
  notifications: {
    type: "notifications",
    title: "Notification Permission Required",
    description: "Notifications permission is required.",
    privacyNote: "",
    deniedTitle: "Notifications Blocked",
    deniedDescription: "Notification permission denied."
  },
  location: {
    type: "location",
    title: "Location Access Required",
    description: "Location access is required.",
    privacyNote: "",
    deniedTitle: "Location Access Restricted",
    deniedDescription: "Location permission denied."
  },
  clipboard: {
    type: "clipboard",
    title: "Clipboard Access Required",
    description: "Clipboard access is required.",
    privacyNote: "",
    deniedTitle: "Clipboard Access Restricted",
    deniedDescription: "Clipboard permission denied."
  }
};

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

export function PermissionProvider({ children }: PermissionProviderProps) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(prev => (prev === msg ? null : prev));
    }, 3000);
  };

  const checkPermissionStatus = useCallback(async (type: PermissionType): Promise<PermissionState> => {
    if (typeof window === "undefined") return "unsupported";

    if (type === "notifications") {
      if (!("Notification" in window)) return "unsupported";
      if (Notification.permission === "granted") return "granted";
      if (Notification.permission === "denied") return "denied";
      return "prompt";
    }

    if (type === "microphone" || type === "camera") {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return "unsupported";
      }
    }

    if (type === "location") {
      if (!navigator.geolocation) return "unsupported";
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        let queryName: any = type;
        if (type === "microphone" || type === "camera") {
          queryName = type;
        }
        const res = await navigator.permissions.query({ name: queryName });
        if (res.state === "granted") return "granted";
        if (res.state === "denied") return "denied";
        return "prompt";
      } catch (_) {}
    }

    return "prompt";
  }, []);

  const requestPermission = useCallback(async (
    type: PermissionType,
    onGranted: () => void,
    onDenied?: () => void
  ) => {
    try {
      if (type === "microphone") {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showToast("Microphone is not supported by your browser.");
          if (onDenied) onDenied();
          return;
        }
        onGranted();
      } else if (type === "camera") {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showToast("Camera is not supported by your browser.");
          if (onDenied) onDenied();
          return;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          onGranted();
        } catch (err: any) {
          console.warn("Camera permission denied:", err);
          showToast("Camera permission denied.");
          if (onDenied) onDenied();
        }
      } else if (type === "notifications") {
        if (!("Notification" in window)) {
          showToast("Notifications are not supported by your browser.");
          if (onDenied) onDenied();
          return;
        }
        const res = await Notification.requestPermission();
        if (res === "granted") {
          onGranted();
        } else {
          showToast("Notification permission denied.");
          if (onDenied) onDenied();
        }
      } else if (type === "location") {
        if (!navigator.geolocation) {
          showToast("Location is not supported by your browser.");
          if (onDenied) onDenied();
          return;
        }
        navigator.geolocation.getCurrentPosition(
          () => onGranted(),
          () => {
            showToast("Location permission denied.");
            if (onDenied) onDenied();
          }
        );
      } else {
        // Photos, Files, Clipboard - handled directly via native OS pickers
        onGranted();
      }
    } catch (err) {
      console.warn(`Permission request error for ${type}:`, err);
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} permission denied.`);
      if (onDenied) onDenied();
    }
  }, []);

  const resetPermission = (_type: PermissionType) => {};

  return (
    <PermissionContext.Provider value={{ requestPermission, checkPermissionStatus, resetPermission }}>
      {children}

      {/* Small Toast / Snackbar for Denied or Unsupported Permissions */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 rounded-full bg-zinc-900 border border-zinc-700/80 text-zinc-100 text-xs shadow-xl flex items-center gap-2 max-w-sm text-center font-sans font-medium"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </PermissionContext.Provider>
  );
}

