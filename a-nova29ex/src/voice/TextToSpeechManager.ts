import { resolveVoiceAndAudioParams } from "./voiceResolver";
import { fetchGeminiTtsAudio } from "./audioUtils";

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
  private audioElem: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingActive = false;
  private animFrameId: number | null = null;

  public async speak(text: string, callbacks?: TTSCallbacks, voiceName?: string, lang?: string): Promise<boolean> {
    this.stop();

    const cleanText = stripEmojisForSpeech(text);
    if (!cleanText || !cleanText.trim()) {
      callbacks?.onError?.("Speech text is empty");
      return false;
    }

    this.isSpeakingActive = true;

    // Helper for amplitude animation
    let step = 0;
    const animateAmplitude = () => {
      if (!this.isSpeakingActive) return;
      step += 0.15;
      const simVol = 0.25 + 0.5 * Math.abs(Math.sin(step) * Math.cos(step * 0.7));
      callbacks?.onAmplitude?.(simVol);
      this.animFrameId = requestAnimationFrame(animateAmplitude);
    };

    // 1. Primary Engine: Gemini TTS API via server (bypasses browser restricted Google speech services)
    try {
      const geminiResult = await fetchGeminiTtsAudio(cleanText, voiceName || "Zephyr");
      if (geminiResult && geminiResult.audioUrl && this.isSpeakingActive) {
        const audio = new Audio(geminiResult.audioUrl);
        this.audioElem = audio;

        audio.onplay = () => {
          callbacks?.onStart?.();
          animateAmplitude();
        };

        audio.onended = () => {
          this.isSpeakingActive = false;
          if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
          }
          callbacks?.onAmplitude?.(0);
          callbacks?.onEnd?.();
          URL.revokeObjectURL(geminiResult.audioUrl);
          this.audioElem = null;
        };

        audio.onerror = (e) => {
          console.warn("[TextToSpeechManager] Audio element playback error:", e);
          URL.revokeObjectURL(geminiResult.audioUrl);
          this.audioElem = null;
          // Fallback to browser synthesis if audio playback failed
          this.fallbackBrowserSpeak(cleanText, callbacks, voiceName, lang, animateAmplitude);
        };

        try {
          await audio.play();
          return true;
        } catch (playErr) {
          console.warn("[TextToSpeechManager] Audio autoplay restricted or blocked:", playErr);
          // Fallback to browser synthesis
          this.fallbackBrowserSpeak(cleanText, callbacks, voiceName, lang, animateAmplitude);
          return true;
        }
      }
    } catch (apiErr) {
      console.warn("[TextToSpeechManager] Gemini TTS API error, falling back to browser synthesis:", apiErr);
    }

    // 2. Fallback Engine: Browser SpeechSynthesis (safely guarded against Google Speech Service restriction errors)
    return this.fallbackBrowserSpeak(cleanText, callbacks, voiceName, lang, animateAmplitude);
  }

  private fallbackBrowserSpeak(
    cleanText: string,
    callbacks?: TTSCallbacks,
    voiceName?: string,
    lang?: string,
    animateAmplitude?: () => void
  ): boolean {
    if (!this.synth) {
      this.isSpeakingActive = false;
      callbacks?.onError?.("Speech synthesis not available");
      return false;
    }

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
      this.synth.cancel();

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

      utterance.onstart = () => {
        callbacks?.onStart?.();
        if (animateAmplitude) animateAmplitude();
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

      utterance.onerror = (e: any) => {
        console.warn("[TextToSpeechManager] Fallback SpeechSynthesis utterance error:", e);
        this.isSpeakingActive = false;
        if (this.animFrameId !== null) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }
        callbacks?.onAmplitude?.(0);
        callbacks?.onError?.("Speech synthesis fallback issue");
      };

      this.synth.speak(utterance);
      return true;
    } catch (err) {
      console.error("[TextToSpeechManager] Fallback speak error:", err);
      this.stop();
      callbacks?.onError?.("Speech synthesis fallback failed");
      return false;
    }
  }

  public stop() {
    this.isSpeakingActive = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audioElem) {
      try {
        this.audioElem.pause();
        this.audioElem.currentTime = 0;
      } catch (_) {}
      this.audioElem = null;
    }

    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (_) {}
    }

    this.currentUtterance = null;
  }

  public isSpeaking(): boolean {
    return (
      this.isSpeakingActive ||
      (this.audioElem ? !this.audioElem.paused : false) ||
      (this.synth ? this.synth.speaking : false)
    );
  }
}
