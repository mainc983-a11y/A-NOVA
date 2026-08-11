import React from "react";
import { VoiceCenterOrb } from "../voice/VoiceCenterOrb";
import { VoiceState } from "../voice/types";

export function LiveWaveformInputBar({
  isActive = false,
  isSpeaking = false,
  colorClass = "bg-rose-500 dark:bg-rose-400",
  textLabel,
}: {
  isActive?: boolean;
  isSpeaking?: boolean;
  colorClass?: string;
  textLabel?: string;
}) {
  return null;
}

export interface VoiceVolumeVisualizerProps {
  isActive: boolean;
  state?: any;
  variant?: "full" | "floating" | "compact";
  minimal?: boolean;
  onOrbClick?: () => void;
  onClose?: () => void;
  aiResponseText?: string;
}

export default function VoiceVolumeVisualizer({
  isActive,
  state = "IDLE",
  variant = "full",
  minimal = false,
  onOrbClick,
  aiResponseText,
}: VoiceVolumeVisualizerProps) {
  let mappedState: VoiceState = "IDLE";
  
  if (typeof state === "string") {
    const upper = state.toUpperCase();
    if (upper === "LISTENING" || upper === "PROCESSING" || upper === "SPEAKING" || upper === "ERROR" || upper === "GENERATING" || upper === "INTERRUPTED" || upper === "TYPING") {
      mappedState = upper as VoiceState;
    } else if (state === "thinking") {
      mappedState = "PROCESSING";
    }
  }

  if (variant === "compact" || minimal) {
    return (
      <div className="flex flex-col items-center justify-center p-2">
        <VoiceCenterOrb state={mappedState} onClick={onOrbClick} sizePx={140} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <VoiceCenterOrb state={mappedState} onClick={onOrbClick} sizePx={160} />
      {aiResponseText && (
        <p className="mt-4 text-center text-sm text-zinc-300 max-w-sm line-clamp-2 font-medium">
          {aiResponseText}
        </p>
      )}
    </div>
  );
}
