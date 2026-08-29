import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, X, Sparkles } from "lucide-react";
import { VoiceState, AudioMetrics } from "./types";
import { VoiceCenterOrb } from "./VoiceCenterOrb";

export interface VoiceOverlayScreenProps {
  isOpen: boolean;
  state: VoiceState;
  audioMetrics: AudioMetrics;
  inputText?: string;
  errorMessage?: string | null;
  onClose: () => void;
  onOrbClick: () => void;
  onCancel: () => void;
}

export const VoiceOverlayScreen: React.FC<VoiceOverlayScreenProps> = ({
  isOpen,
  state,
  audioMetrics,
  inputText = "",
  errorMessage,
  onClose,
  onOrbClick,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-zinc-950/95 dark:bg-black/95 backdrop-blur-3xl text-white select-none p-6 sm:p-10"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Top Header Bar */}
        <div className="w-full max-w-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-zinc-400 font-medium text-sm sm:text-base">
            <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>Voice Assistant</span>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 flex items-center justify-center transition-colors text-zinc-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            aria-label="Close Voice Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center Area with Orb */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 my-auto w-full max-w-xl">
          <VoiceCenterOrb
            state={state}
            volume={audioMetrics.volume}
            onClick={onOrbClick}
            sizePx={160}
          />

          {/* Live Transcript Display (when text is recognized) */}
          {inputText && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-zinc-300 text-base sm:text-lg max-w-md line-clamp-3 font-normal px-4"
            >
              "{inputText}"
            </motion.p>
          )}

          {/* Error Message Display if any */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm text-center max-w-sm"
            >
              {errorMessage}
            </motion.div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="w-full max-w-xl flex items-center justify-center gap-6 pb-4">
          <button
            onClick={onOrbClick}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 ${
              state === "LISTENING"
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 focus:ring-rose-500/50 scale-105"
                : "bg-zinc-800 hover:bg-zinc-700 text-white focus:ring-zinc-600/50"
            }`}
            aria-label={state === "LISTENING" ? "Stop Listening" : "Start Listening"}
          >
            {state === "LISTENING" ? (
              <MicOff className="w-7 h-7" />
            ) : (
              <Mic className="w-7 h-7" />
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
