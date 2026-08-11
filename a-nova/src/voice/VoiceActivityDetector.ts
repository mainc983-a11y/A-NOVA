import { AudioMetrics } from "./types";

export interface VADCallbacks {
  onMetricsUpdate: (metrics: AudioMetrics) => void;
  onSilenceDetected: () => void;
  onSpeechDetected: () => void;
}

export class VoiceActivityDetector {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private isAnalyzing = false;

  private silenceStartTime: number | null = null;
  private speechDetected = false;

  private silenceThresholdMs = 2200;
  private speechVolumeThreshold = 0.04;

  constructor(silenceThresholdMs = 2200, speechVolumeThreshold = 0.04) {
    this.silenceThresholdMs = silenceThresholdMs;
    this.speechVolumeThreshold = speechVolumeThreshold;
  }

  public start(stream: MediaStream, callbacks: VADCallbacks): boolean {
    this.stop();

    try {
      const AudioCtxClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return false;

      this.audioCtx = new AudioCtxClass();
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.75;

      this.source = this.audioCtx.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      this.isAnalyzing = true;
      this.silenceStartTime = null;
      this.speechDetected = false;

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const analyzeFrame = () => {
        if (!this.isAnalyzing || !this.analyser) return;

        // On mobile Safari/Chrome, AudioContext can start or revert to suspended state
        if (this.audioCtx && this.audioCtx.state === "suspended") {
          this.audioCtx.resume().catch(() => {});
        }

        this.analyser.getByteFrequencyData(dataArray);

        // Compute RMS energy
        let sumSquare = 0;
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i] / 255;
          sumSquare += val * val;
          sum += val;
        }
        const rms = Math.sqrt(sumSquare / bufferLength);
        const normalizedVol = Math.min(1, Math.max(0, rms * 2.8));

        // Get 9 spectrum bins for waveform
        const specBins: number[] = [];
        const step = Math.max(1, Math.floor(bufferLength / 9));
        for (let i = 0; i < 9; i++) {
          const rawBin = dataArray[i * step] || 0;
          const normBin = Math.min(1, Math.max(0.08, (rawBin / 255) * 2.2));
          specBins.push(normBin);
        }

        callbacks.onMetricsUpdate({
          volume: normalizedVol,
          rms,
          spectrum: specBins,
        });

        // Speech & Silence detection
        if (normalizedVol > this.speechVolumeThreshold) {
          if (!this.speechDetected) {
            this.speechDetected = true;
            callbacks.onSpeechDetected();
          }
          this.silenceStartTime = null;
        } else {
          if (this.speechDetected) {
            if (this.silenceStartTime === null) {
              this.silenceStartTime = Date.now();
            } else if (
              Date.now() - this.silenceStartTime >=
              this.silenceThresholdMs
            ) {
              callbacks.onSilenceDetected();
              this.silenceStartTime = null; // Prevent repeated triggers
            }
          }
        }

        this.animFrameId = requestAnimationFrame(analyzeFrame);
      };

      analyzeFrame();
      return true;
    } catch (err) {
      console.error("[VoiceActivityDetector] Failed to start:", err);
      this.stop();
      return false;
    }
  }

  public stop() {
    this.isAnalyzing = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.source) {
      try {
        this.source.disconnect();
      } catch (_) {}
      this.source = null;
    }

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (_) {}
      this.analyser = null;
    }

    if (this.audioCtx) {
      try {
        if (this.audioCtx.state !== "closed") {
          this.audioCtx.close().catch(() => {});
        }
      } catch (_) {}
      this.audioCtx = null;
    }

    this.silenceStartTime = null;
    this.speechDetected = false;
  }
}
