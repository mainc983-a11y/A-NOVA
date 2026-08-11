import { transcribeAudioBlob } from "./audioUtils";

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
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public startListening(callbacks: STTCallbacks, lang = "en-US"): boolean {
    this.stopListening();

    this.finalTranscript = "";
    this.isListening = true;

    if (!this.isSupported() || this.isNativeRestricted) {
      // Native SpeechRecognition is restricted or unsupported.
      // We will rely on Gemini audio blob transcription when recording stops.
      return true;
    }

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      const isMobile =
        typeof navigator !== "undefined" &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      this.recognition = new SpeechRecognitionClass();
      // Mobile WebKit (iOS Safari / Android Chrome) fails or aborts if continuous is true
      this.recognition.continuous = !isMobile;
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
          // Mark native speech recognition as restricted in current browser environment.
          // Suppress error banner; fallback seamlessly to Gemini audio transcription.
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
      console.warn("[SpeechToTextService] Native STT start skipped, using Gemini fallback:", err);
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
