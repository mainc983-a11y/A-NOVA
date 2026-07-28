import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, AlertCircle, Sparkles, AudioLines } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type VoiceState = "idle" | "requesting" | "listening" | "thinking" | "speaking" | "error";

export function useAudioVolume(isActive: boolean) {
  const [volume, setVolume] = useState(0); // 0.0 to 1.0
  const [bars, setBars] = useState<number[]>([0.15, 0.15, 0.15, 0.15, 0.15]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      setVolume(0);
      setBars([0.15, 0.15, 0.15, 0.15, 0.15]);
      return;
    }

    let isMounted = true;

    async function initAudio() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        if (ctx.state === "suspended") {
          await ctx.resume().catch(() => {});
        }

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.65;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVolume = () => {
          if (!isMounted || !analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / (dataArray.length || 1);

          // Calculate sensitivity normalized volume
          const normalizedVol = Math.min(1, Math.max(0, Math.pow(average / 100, 1.2)));
          setVolume(normalizedVol);

          // Get frequency spectrum slices for 5 bars
          const b1 = Math.min(1, (dataArray[2] || 0) / 200);
          const b2 = Math.min(1, (dataArray[5] || 0) / 200);
          const b3 = Math.min(1, (dataArray[8] || 0) / 200);
          const b4 = Math.min(1, (dataArray[12] || 0) / 200);
          const b5 = Math.min(1, (dataArray[16] || 0) / 200);

          setBars([
            Math.max(0.12, b1 * 1.3),
            Math.max(0.12, b2 * 1.4),
            Math.max(0.12, b3 * 1.5),
            Math.max(0.12, b4 * 1.35),
            Math.max(0.12, b5 * 1.2),
          ]);

          animFrameRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();
      } catch (err) {
        console.warn("Unable to capture microphone volume analyzer:", err);
      }
    }

    initAudio();

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [isActive]);

  return { volume, bars };
}

interface VoiceVolumeVisualizerProps {
  state: VoiceState;
  isActive: boolean;
  onOrbClick?: () => void;
  variant?: "compact" | "full";
  errorMessage?: string;
  transcript?: string;
  aiResponseText?: string;
}

export default function VoiceVolumeVisualizer({
  state,
  isActive,
  onOrbClick,
  variant = "full",
  errorMessage,
  transcript,
  aiResponseText,
}: VoiceVolumeVisualizerProps) {
  const { volume, bars } = useAudioVolume(isActive && state === "listening");

  // COMPACT VARIANT (for Chat Input Bar during dictation)
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full font-sans select-none">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
        </span>

        <span className="text-xs font-semibold text-rose-400 font-mono tracking-tight">Listening</span>

        {/* Dynamic Voice Bars reacting to audio volume */}
        <div className="flex items-end gap-1 h-3.5 px-0.5">
          {bars.map((barVal, idx) => (
            <motion.div
              key={idx}
              className="w-0.5 bg-rose-400 rounded-full"
              animate={{ height: `${Math.max(3, barVal * 14)}px` }}
              transition={{ duration: 0.08, ease: "easeOut" }}
            />
          ))}
        </div>
      </div>
    );
  }

  // FULL VARIANT (for Voice Assistant Modal)
  return (
    <div className="relative flex flex-col items-center justify-center my-4 w-full">
      {/* State 1: Error State */}
      {state === "error" || errorMessage ? (
        <div className="space-y-4 max-w-sm text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shadow-2xl">
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-rose-400">Voice Mode Error</h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              {errorMessage || "Speech recognition or audio input encountered an error."}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Animated Waveform & Circular Audio Visualizer Container */}
          <div className="relative flex items-center justify-center my-6 min-h-[160px] sm:min-h-[200px] w-full">
            {/* Requesting Permission State */}
            {state === "requesting" && (
              <>
                <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full bg-amber-500/20 animate-ping opacity-75" />
                <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-amber-500/10 animate-pulse" />
              </>
            )}

            {/* Listening State with Real-Time Audio Volume Waves */}
            {state === "listening" && (
              <>
                {/* Outer dynamic volume wave ring 1 */}
                <motion.div
                  className="absolute rounded-full bg-purple-500/20 blur-sm pointer-events-none"
                  animate={{
                    width: `${160 + volume * 100}px`,
                    height: `${160 + volume * 100}px`,
                    opacity: 0.3 + volume * 0.7,
                  }}
                  transition={{ duration: 0.1, ease: "easeOut" }}
                />
                {/* Outer dynamic volume wave ring 2 */}
                <motion.div
                  className="absolute rounded-full bg-indigo-500/25 blur-xs pointer-events-none"
                  animate={{
                    width: `${130 + volume * 70}px`,
                    height: `${130 + volume * 70}px`,
                    opacity: 0.4 + volume * 0.6,
                  }}
                  transition={{ duration: 0.08, ease: "easeOut" }}
                />
                {/* Outer dynamic volume wave ring 3 */}
                <motion.div
                  className="absolute rounded-full bg-sky-400/20 blur-2xs pointer-events-none"
                  animate={{
                    width: `${110 + volume * 40}px`,
                    height: `${110 + volume * 40}px`,
                    opacity: 0.5 + volume * 0.5,
                  }}
                  transition={{ duration: 0.06, ease: "easeOut" }}
                />
              </>
            )}

            {/* Thinking / Processing State */}
            {state === "thinking" && (
              <>
                <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full bg-purple-600/20 animate-pulse" />
                <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 border-dashed border-purple-500/40 animate-spin duration-1000" />
              </>
            )}

            {/* Speaking State */}
            {state === "speaking" && (
              <>
                <div className="absolute w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 animate-pulse duration-1000" />
                <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full bg-pink-500/20 animate-ping opacity-50" />
              </>
            )}

            {/* Central Interactive Voice Orb Button */}
            <motion.button
              type="button"
              onClick={onOrbClick}
              animate={
                state === "listening"
                  ? { scale: 1 + volume * 0.25 }
                  : state === "idle"
                  ? { scale: [1, 1.03, 1] }
                  : { scale: 1 }
              }
              transition={
                state === "idle"
                  ? { repeat: Infinity, duration: 3, ease: "easeInOut" }
                  : { duration: 0.08, ease: "easeOut" }
              }
              className={`relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center transition-colors duration-300 shadow-2xl cursor-pointer ${
                state === "listening"
                  ? "bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 shadow-purple-500/50"
                  : state === "requesting"
                  ? "bg-gradient-to-tr from-amber-600 to-orange-500 shadow-amber-500/40"
                  : state === "thinking"
                  ? "bg-gradient-to-tr from-purple-700 via-pink-600 to-amber-500 shadow-purple-600/40"
                  : state === "speaking"
                  ? "bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-500 shadow-pink-500/50"
                  : "bg-zinc-800 border border-zinc-700 hover:border-zinc-600"
              }`}
              title={
                state === "speaking"
                  ? "Tap to Interrupt"
                  : state === "listening"
                  ? "Listening... Tap to stop"
                  : "Tap to speak"
              }
            >
              {state === "requesting" && (
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-spin" />
              )}
              {state === "listening" && (
                <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              )}
              {state === "thinking" && (
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-spin" />
              )}
              {state === "speaking" && (
                <AudioLines className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-bounce" />
              )}
              {state === "idle" && (
                <AudioLines className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-400 hover:text-white transition-colors" />
              )}
            </motion.button>
          </div>

          {/* Real-Time Waveform Voice Bars (Below Orb when listening or speaking) */}
          {state === "listening" && (
            <div className="flex items-center justify-center gap-1.5 h-8 my-2">
              {bars.map((barVal, idx) => (
                <motion.div
                  key={idx}
                  className="w-1.5 bg-gradient-to-t from-purple-500 to-sky-400 rounded-full"
                  animate={{ height: `${Math.max(6, barVal * 32)}px` }}
                  transition={{ duration: 0.08, ease: "easeOut" }}
                />
              ))}
            </div>
          )}

          {state === "speaking" && (
            <div className="flex items-center justify-center gap-1.5 h-8 my-2">
              {[0.4, 0.8, 0.5, 0.9, 0.6, 0.8, 0.4].map((defVal, idx) => (
                <motion.div
                  key={idx}
                  className="w-1.5 bg-gradient-to-t from-pink-500 to-purple-400 rounded-full"
                  animate={{
                    height: ["8px", `${defVal * 30}px`, "8px"],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6 + idx * 0.1,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          )}

          {/* Status Badge & Label */}
          <div className="space-y-3 max-w-sm min-h-[4.5rem] flex flex-col items-center justify-center">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  state === "listening"
                    ? "bg-emerald-400 animate-ping"
                    : state === "requesting"
                    ? "bg-amber-400 animate-pulse"
                    : state === "thinking"
                    ? "bg-purple-400 animate-pulse"
                    : state === "speaking"
                    ? "bg-pink-400 animate-bounce"
                    : "bg-zinc-500"
                }`}
              />
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-zinc-300 uppercase font-mono">
                {state === "requesting"
                  ? "Requesting Permission..."
                  : state === "listening"
                  ? volume > 0.15
                    ? "Listening (Speaking...)"
                    : "Listening (Silent...)"
                  : state === "thinking"
                  ? "Processing Response..."
                  : state === "speaking"
                  ? "Speaking..."
                  : "Ready"}
              </span>
            </div>

            {/* Live Captions & Transcripts */}
            {state === "listening" && transcript && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs sm:text-sm text-zinc-200 font-medium italic bg-zinc-900/60 px-4 py-2 rounded-2xl border border-zinc-800/80 max-w-xs sm:max-w-sm truncate"
              >
                "{transcript}"
              </motion.p>
            )}

            {state === "thinking" && (
              <p className="text-xs text-zinc-400 font-sans animate-pulse">
                Analyzing request and building response...
              </p>
            )}

            {state === "speaking" && (
              <div className="space-y-1 text-center">
                <p className="text-xs sm:text-sm text-zinc-200 font-medium line-clamp-3 bg-zinc-900/60 px-4 py-2.5 rounded-2xl border border-zinc-800/80 max-w-xs sm:max-w-sm">
                  {aiResponseText || "A-NOVA is speaking..."}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Tap orb or button below to interrupt
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
