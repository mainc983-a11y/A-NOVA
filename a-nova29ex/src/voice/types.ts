export type VoiceState =
  | "IDLE"
  | "LISTENING"
  | "PROCESSING"
  | "GENERATING"
  | "SPEAKING"
  | "INTERRUPTED"
  | "TYPING"
  | "ERROR";

export interface AudioMetrics {
  volume: number; // 0.0 to 1.0
  rms: number; // Raw RMS energy
  spectrum: number[]; // Normalized frequency bins (9 bins for waveform display)
}

export interface VoiceEngineConfig {
  silenceThresholdMs?: number; // Time of silence before auto-stop
  volumeThreshold?: number; // Minimum RMS volume to count as speech
  lang?: string;
  autoSubmitOnSilence?: boolean;
}

export type VoiceStateListener = (newState: VoiceState, prevState: VoiceState) => void;
