import React from "react";
import { motion } from "motion/react";
import { VoiceState } from "./types";

interface VoiceCenterOrbProps {
  state: VoiceState;
  volume?: number; // 0.0 to 1.0
  onClick?: () => void;
  sizePx?: number;
  className?: string;
}

export const VoiceCenterOrb: React.FC<VoiceCenterOrbProps> = ({
  state,
  volume = 0,
  onClick,
  sizePx = 140,
  className = "",
}) => {
  const safeVol = Math.max(0, Math.min(1, volume));

  return (
    <div
      className={`relative flex items-center justify-center cursor-pointer select-none ${className}`}
      onClick={onClick}
      aria-label="Voice Orb"
      role="button"
    >
      {/* Outer Atmospheric Aura / Pulsing Glow Ring 1 */}
      <motion.div
        className="absolute rounded-full bg-gradient-to-tr from-rose-600/30 via-rose-500/20 to-pink-500/10 blur-2xl pointer-events-none"
        style={{ width: sizePx * 1.8, height: sizePx * 1.8 }}
        animate={
          state === "LISTENING"
            ? { scale: 1 + safeVol * 0.45, opacity: 0.5 + safeVol * 0.5 }
            : state === "SPEAKING"
            ? { scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }
            : state === "PROCESSING" || state === "GENERATING"
            ? { scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3], rotate: [0, 180, 360] }
            : state === "INTERRUPTED"
            ? { scale: 0.8, opacity: 0.2 }
            : { scale: [1, 1.06, 1], opacity: [0.25, 0.4, 0.25] }
        }
        transition={{
          duration: state === "LISTENING" ? 0.08 : state === "PROCESSING" ? 3 : 2.5,
          repeat: state === "LISTENING" || state === "INTERRUPTED" ? 0 : Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Inner Aura Ring 2 */}
      <motion.div
        className="absolute rounded-full bg-rose-500/20 dark:bg-rose-400/25 blur-lg pointer-events-none"
        style={{ width: sizePx * 1.35, height: sizePx * 1.35 }}
        animate={
          state === "LISTENING"
            ? { scale: 1 + safeVol * 0.3, opacity: 0.6 + safeVol * 0.4 }
            : state === "SPEAKING"
            ? { scale: [1, 1.18, 1], opacity: [0.5, 0.8, 0.5] }
            : state === "PROCESSING"
            ? { scale: [1, 1.05, 1], opacity: [0.4, 0.7, 0.4] }
            : state === "INTERRUPTED"
            ? { scale: 0.8, opacity: 0.2 }
            : { scale: [1, 1.04, 1], opacity: [0.3, 0.5, 0.3] }
        }
        transition={{
          duration: state === "LISTENING" ? 0.08 : 2.0,
          repeat: state === "LISTENING" || state === "INTERRUPTED" ? 0 : Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Primary Solid Dynamic Core Orb */}
      <motion.div
        className="relative rounded-full bg-gradient-to-br from-rose-500 via-pink-600 to-rose-700 dark:from-rose-400 dark:via-rose-600 dark:to-pink-700 shadow-2xl shadow-rose-600/40 flex items-center justify-center overflow-hidden"
        style={{ width: sizePx, height: sizePx }}
        animate={
          state === "LISTENING"
            ? { scale: 1 + safeVol * 0.22 }
            : state === "SPEAKING"
            ? { scale: [1, 1.08, 1] }
            : state === "PROCESSING"
            ? { scale: [1, 1.03, 1], rotate: [0, 360] }
            : state === "GENERATING"
            ? { scale: [1, 1.05, 1] }
            : state === "INTERRUPTED"
            ? { scale: 0.85 }
            : state === "ERROR"
            ? { scale: [1, 0.95, 1.05, 1], x: [0, -6, 6, -4, 4, 0] }
            : { scale: [1, 1.03, 1] } // IDLE gentle breathing
        }
        transition={{
          duration:
            state === "LISTENING"
              ? 0.08
              : state === "PROCESSING"
              ? 4
              : state === "SPEAKING"
              ? 0.6
              : state === "ERROR"
              ? 0.4
              : 3.2,
          repeat: state === "LISTENING" || state === "INTERRUPTED" || state === "ERROR" ? 0 : Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Internal Shimmer / Gradient Highlight Overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 rounded-full pointer-events-none"
          animate={
            state === "PROCESSING" || state === "GENERATING"
              ? { rotate: [0, 360] }
              : { opacity: [0.2, 0.5, 0.2] }
          }
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />

        {/* Center Minimal Graphic / State Indicator */}
        <div className="relative z-10 flex items-center justify-center">
          {state === "PROCESSING" || state === "GENERATING" ? (
            <motion.div
              className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <motion.div
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center"
              animate={{ scale: state === "LISTENING" ? 1 + safeVol * 0.2 : 1 }}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
