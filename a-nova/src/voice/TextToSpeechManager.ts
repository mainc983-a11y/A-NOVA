import { resolveVoiceAndAudioParams } from "./voiceResolver";

export interface TTSCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
  onAmplitude?: (volume: number) => void;
}

function stripEmojisForSpeech(text: string): string {
  if (!text) return "";
  try {
    return text
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  } catch (_) {
    return text
      .replace(/[\u1F600-\u1F64F\u1F300-\u1F5FF\u1F680-\u1F6FF\u1F1E0-\u1F1FF\u2600-\u26FF\u2700-\u27BF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

export class TextToSpeechManager {
  private synth: SpeechSynthesis | null = typeof window !== "undefined" ? window.speechSynthesis : null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingActive = false;
  private animFrameId: number | null = null;

  public speak(text: string, callbacks?: TTSCallbacks, voiceName?: string, lang?: string): boolean {
    this.stop();

    const cleanText = stripEmojisForSpeech(text);

    if (!cleanText || !cleanText.trim() || !this.synth) {
      callbacks?.onError?.("Speech synthesis not available");
      return false;
    }

    try {
      this.synth.cancel(); // Cancel any prior speech

      const utterance = new SpeechSynthesisUtterance(cleanText.trim());
      const selectedLang = lang || "en-US";
      utterance.lang = selectedLang;

      const profile = voiceName || "Nova";
      const voices = this.synth.getVoices();
      const resolved = resolveVoiceAndAudioParams(profile, selectedLang, voices);

      if (resolved.voice) {
        utterance.voice = resolved.voice;
      }
      utterance.pitch = resolved.pitch;
      utterance.rate = resolved.rate;

      this.currentUtterance = utterance;
      this.isSpeakingActive = true;

      // Simulated amplitude ticker for speech synthesis (since browser synthesis doesn't expose audio node directly)
      let step = 0;
      const animateAmplitude = () => {
        if (!this.isSpeakingActive) return;
        step += 0.15;
        const simVol = 0.25 + 0.5 * Math.abs(Math.sin(step) * Math.cos(step * 0.7));
        callbacks?.onAmplitude?.(simVol);
        this.animFrameId = requestAnimationFrame(animateAmplitude);
      };

      utterance.onstart = () => {
        callbacks?.onStart?.();
        animateAmplitude();
      };

      utterance.onend = () => {
        this.isSpeakingActive = false;
        if (this.animFrameId !== null) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }
        callbacks?.onAmplitude?.(0);
        callbacks?.onEnd?.();
      };

      utterance.onerror = (e) => {
        console.warn("[TextToSpeechManager] Utterance error:", e);
        this.isSpeakingActive = false;
        if (this.animFrameId !== null) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }
        callbacks?.onAmplitude?.(0);
        callbacks?.onError?.("Speech synthesis error");
      };

      this.synth.speak(utterance);
      return true;
    } catch (err) {
      console.error("[TextToSpeechManager] Speak error:", err);
      this.stop();
      return false;
    }
  }

  public stop() {
    this.isSpeakingActive = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (_) {}
    }

    this.currentUtterance = null;
  }

  public isSpeaking(): boolean {
    return this.isSpeakingActive || (this.synth ? this.synth.speaking : false);
  }
}
