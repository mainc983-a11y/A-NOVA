export interface STTCallbacks {
  onInterimResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
  onError?: (error: string) => void;
}

export class SpeechToTextService {
  private recognition: any = null;
  private isListening = false;
  private finalTranscript = "";

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public startListening(callbacks: STTCallbacks, lang = "en-US"): boolean {
    this.stopListening();

    if (!this.isSupported()) {
      callbacks.onError?.("Speech recognition is not supported in this browser environment.");
      return false;
    }

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = lang;

      this.finalTranscript = "";
      this.isListening = true;

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
        console.warn("[SpeechToTextService] Error:", errType);

        if (errType === "no-speech") {
          // 'no-speech' is non-fatal; user was silent. SpeechRecognition will trigger onend and restart.
          return;
        }

        if (errType === "aborted") {
          // Aborted by user or engine reset
          return;
        }

        if (errType === "not-allowed" || errType === "service-not-allowed") {
          callbacks.onError?.("Speech recognition access denied.");
        } else if (errType === "network") {
          callbacks.onError?.("Network connection error during speech recognition.");
        } else if (errType === "audio-capture") {
          callbacks.onError?.("Microphone audio capture error.");
        } else {
          callbacks.onError?.(`Speech recognition notice: ${errType}`);
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          // Safely restart after short timeout to avoid InvalidStateError on Chrome/Safari
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
      console.error("[SpeechToTextService] Failed to start:", err);
      this.stopListening();
      callbacks.onError?.("Failed to start speech recognition.");
      return false;
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

  public validateTranscript(raw: string): string {
    if (!raw || typeof raw !== "string") return "";
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length < 1) return "";
    return trimmed;
  }
}
