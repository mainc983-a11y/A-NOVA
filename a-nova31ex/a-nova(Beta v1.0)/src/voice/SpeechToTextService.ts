import { transcribeAudioBlob } from "./audioUtils";

export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|Tablet|Silk/i.test(ua);
  const isTouch = Boolean(
    ("maxTouchPoints" in navigator && navigator.maxTouchPoints > 0) ||
    ("ontouchstart" in window)
  );
  const isSmallScreen = typeof window !== "undefined" && window.innerWidth <= 768;
  return isMobileUA || (isTouch && isSmallScreen);
}

export interface STTCallbacks {
  onInterimResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
  onError?: (error: string) => void;
}

export class SpeechToTextService {
  private recognition: any = null;
  private isListening = false;
  private isNativeRestricted = false;
  private finalTranscript = "";

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    // On mobile devices, never use browser SpeechRecognition to prevent Chrome Google Speech Recognition popups
    if (isMobileDevice()) return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public startListening(callbacks: STTCallbacks, lang = "en-US"): boolean {
    this.stopListening();

    this.finalTranscript = "";
    this.isListening = true;

    // Mobile devices strictly use native MediaDevices microphone capture + backend transcription pipeline.
    // Do NOT instantiate webkitSpeechRecognition or trigger Chrome's Google Speech Recognition on mobile.
    if (isMobileDevice() || !this.isSupported() || this.isNativeRestricted) {
      return true;
    }

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = lang;

      this.recognition.onresult = (event: any) => {
        if (!this.isListening) return;
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            this.finalTranscript += transcriptPiece + " ";
          } else {
            interim += transcriptPiece;
          }
        }

        const currentInterim = (this.finalTranscript + interim).trim();
        if (currentInterim && this.isListening) {
          callbacks.onInterimResult?.(currentInterim);
        }
      };

      this.recognition.onerror = (event: any) => {
        const errType = event?.error;
        console.warn("[SpeechToTextService] Native STT warning:", errType);

        if (
          errType === "service-not-allowed" ||
          errType === "not-allowed" ||
          errType === "network" ||
          errType === "audio-capture"
        ) {
          this.isNativeRestricted = true;
          try {
            if (this.recognition) {
              this.recognition.onend = null;
              this.recognition.stop();
            }
          } catch (_) {}
          return;
        }

        if (errType === "no-speech" || errType === "aborted") {
          return;
        }
      };

      this.recognition.onend = () => {
        if (this.isListening && !this.isNativeRestricted) {
          setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                this.recognition.start();
              } catch (_) {}
            }
          }, 150);
        }
      };

      this.recognition.start();
      return true;
    } catch (err) {
      console.warn("[SpeechToTextService] Native STT start skipped, using backend transcription fallback:", err);
      this.isNativeRestricted = true;
      return true;
    }
  }

  public stopListening(): string {
    this.isListening = false;

    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.stop();
      } catch (_) {}
      this.recognition = null;
    }

    const validated = this.validateTranscript(this.finalTranscript);
    this.finalTranscript = "";
    return validated;
  }

  public async transcribeBlob(blob: Blob): Promise<string> {
    return await transcribeAudioBlob(blob);
  }

  public validateTranscript(raw: string): string {
    if (!raw || typeof raw !== "string") return "";
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length < 1) return "";
    return trimmed;
  }
}
