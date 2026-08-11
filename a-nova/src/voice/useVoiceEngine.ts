import { useState, useEffect, useRef, useCallback } from "react";
import { VoiceState, AudioMetrics } from "./types";
import { VoiceStateMachine } from "./VoiceStateMachine";
import { VoiceActivityDetector } from "./VoiceActivityDetector";
import { VoiceRecorder } from "./VoiceRecorder";
import { SpeechToTextService } from "./SpeechToTextService";
import { TextToSpeechManager } from "./TextToSpeechManager";

export interface UseVoiceEngineProps {
  onSendMessage?: (text: string) => Promise<void> | void;
  onTranscriptChange?: (text: string) => void;
  requestPermission?: (type: string, onSuccess: () => void, onError?: () => void) => void;
}

export function useVoiceEngine({ onSendMessage, onTranscriptChange, requestPermission }: UseVoiceEngineProps = {}) {
  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [isVoiceOverlayOpen, setIsVoiceOverlayOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>({
    volume: 0,
    rms: 0,
    spectrum: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Core Engine Instances
  const stateMachineRef = useRef<VoiceStateMachine>(new VoiceStateMachine());
  const vadRef = useRef<VoiceActivityDetector>(new VoiceActivityDetector(2000, 0.04));
  const recorderRef = useRef<VoiceRecorder>(new VoiceRecorder());
  const sttRef = useRef<SpeechToTextService>(new SpeechToTextService());
  const ttsRef = useRef<TextToSpeechManager>(new TextToSpeechManager());

  const currentTranscriptRef = useRef<string>("");
  const isSubmittingRef = useRef<boolean>(false);
  const lastMetricsTimeRef = useRef<number>(0);

  // Sync state machine to React state safely
  useEffect(() => {
    const sm = stateMachineRef.current;
    const unsubscribe = sm.subscribe((newState) => {
      setVoiceState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Full Cleanup Handler
  const cleanupVoiceSession = useCallback(() => {
    vadRef.current.stop();
    recorderRef.current.stopAndRelease();
    const finalSttText = sttRef.current.stopListening();
    ttsRef.current.stop();
    setAudioMetrics({
      volume: 0,
      rms: 0,
      spectrum: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
    });
    return finalSttText;
  }, []);

  // Stop Session & Return to Idle (Triggered when user taps stop or silence is detected)
  const stopVoiceSession = useCallback(async () => {
    stateMachineRef.current.transitionTo("PROCESSING");
    vadRef.current.stop();
    const finalSttText = sttRef.current.stopListening();
    const audioBlob = await recorderRef.current.stopRecording();
    recorderRef.current.stopAndRelease();
    ttsRef.current.stop();

    setAudioMetrics({
      volume: 0,
      rms: 0,
      spectrum: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
    });

    let textToSet = (finalSttText || currentTranscriptRef.current || "").trim();

    // If native WebSpeech didn't return text (e.g., Chrome restricted Google Speech Service),
    // transcribe recorded microphone audio blob directly via Gemini API server route!
    if (!textToSet && audioBlob && audioBlob.size > 200) {
      try {
        const geminiTranscript = await sttRef.current.transcribeBlob(audioBlob);
        if (geminiTranscript) {
          textToSet = geminiTranscript.trim();
        }
      } catch (err) {
        console.warn("[useVoiceEngine] Gemini audio transcription error:", err);
      }
    }

    stateMachineRef.current.transitionTo("IDLE");

    if (textToSet) {
      setInputText(textToSet);
      onTranscriptChange?.(textToSet);
    }
  }, [onTranscriptChange]);

  // Submit Final Transcript Automatically
  const submitTranscript = useCallback(
    async (rawText?: string) => {
      if (isSubmittingRef.current) return;

      stateMachineRef.current.transitionTo("PROCESSING");
      vadRef.current.stop();
      const finalSttText = sttRef.current.stopListening();
      const audioBlob = await recorderRef.current.stopRecording();
      recorderRef.current.stopAndRelease();
      ttsRef.current.stop();

      setAudioMetrics({
        volume: 0,
        rms: 0,
        spectrum: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
      });

      let textToSubmit = rawText !== undefined ? rawText : (inputText || finalSttText || currentTranscriptRef.current);
      textToSubmit = (textToSubmit || "").trim();

      if (!textToSubmit && audioBlob && audioBlob.size > 200) {
        try {
          const geminiTranscript = await sttRef.current.transcribeBlob(audioBlob);
          if (geminiTranscript) {
            textToSubmit = geminiTranscript.trim();
          }
        } catch (err) {
          console.warn("[useVoiceEngine] Gemini audio transcription error:", err);
        }
      }

      const validText = sttRef.current.validateTranscript(textToSubmit);

      if (!validText) {
        stateMachineRef.current.transitionTo("IDLE");
        return;
      }

      isSubmittingRef.current = true;
      setInputText("");
      currentTranscriptRef.current = "";

      try {
        if (onSendMessage) {
          await onSendMessage(validText);
        }
        stateMachineRef.current.transitionTo("IDLE");
      } catch (err: any) {
        console.error("[useVoiceEngine] Send error:", err);
        setErrorMessage("Failed to send voice message.");
        stateMachineRef.current.transitionTo("ERROR");
      } finally {
        isSubmittingRef.current = false;
        setInputText("");
        currentTranscriptRef.current = "";
      }
    },
    [inputText, onSendMessage]
  );

  // Start Voice Listening Session
  const startListeningSession = useCallback(async () => {
    isSubmittingRef.current = false;

    // Interrupt any speaking first
    if (ttsRef.current.isSpeaking()) {
      ttsRef.current.stop();
      stateMachineRef.current.transitionTo("INTERRUPTED");
    }

    cleanupVoiceSession();
    setErrorMessage(null);

    const performStart = async () => {
      stateMachineRef.current.transitionTo("LISTENING");
      currentTranscriptRef.current = "";

      // Acquire mic stream
      const stream = await recorderRef.current.acquireMicrophone({
        onError: (msg) => {
          setErrorMessage(msg);
          stateMachineRef.current.transitionTo("ERROR");
        },
        onDisconnected: () => {
          stopVoiceSession();
        },
      });

      if (!stream) {
        return;
      }

      // Start Recording
      recorderRef.current.startRecording();

      // Start VAD analysis
      vadRef.current.start(stream, {
        onMetricsUpdate: (metrics) => {
          const now = Date.now();
          if (now - lastMetricsTimeRef.current >= 40) {
            lastMetricsTimeRef.current = now;
            setAudioMetrics(metrics);
          }
        },
        onSpeechDetected: () => {
          // User started speaking
        },
        onSilenceDetected: () => {
          // Silence detected -> stop listening, convert recorded audio blob or send
          stopVoiceSession();
        },
      });

      // Start STT Speech Recognition
      sttRef.current.startListening({
        onInterimResult: (text) => {
          if (isSubmittingRef.current) return;
          currentTranscriptRef.current = text;
        },
        onFinalResult: (text) => {
          if (isSubmittingRef.current) return;
          currentTranscriptRef.current = text;
        },
        onError: (err) => {
          console.warn("[STT] Warning:", err);
        },
      });
    };

    if (requestPermission) {
      requestPermission("microphone", performStart, () => {
        setErrorMessage("Microphone permission denied.");
        stateMachineRef.current.transitionTo("ERROR");
      });
    } else {
      await performStart();
    }
  }, [cleanupVoiceSession, requestPermission, stopVoiceSession]);

  // Interruption logic (tapping orb or mic during AI speaking)
  const handleInterrupt = useCallback(() => {
    ttsRef.current.stop();
    stateMachineRef.current.transitionTo("INTERRUPTED");
    startListeningSession();
  }, [startListeningSession]);

  // Main Toggle Action
  const toggleListening = useCallback(() => {
    const currentState = stateMachineRef.current.getState();

    if (currentState === "LISTENING") {
      // User tapped stop -> stop listening, process recorded audio
      stopVoiceSession();
    } else if (currentState === "SPEAKING") {
      handleInterrupt();
    } else {
      startListeningSession();
    }
  }, [handleInterrupt, startListeningSession, stopVoiceSession]);

  // Open Full Voice Assistant Overlay
  const openVoiceOverlay = useCallback(() => {
    setIsVoiceOverlayOpen(true);
  }, []);

  // Close Full Voice Assistant Overlay
  const closeVoiceOverlay = useCallback(() => {
    setIsVoiceOverlayOpen(false);
    stopVoiceSession();
  }, [stopVoiceSession]);

  // Speak AI Response Text with Output Amplitude Mapping
  const speakResponse = useCallback((text: string, voiceName?: string) => {
    if (!text || !text.trim()) return;

    stateMachineRef.current.transitionTo("SPEAKING");

    ttsRef.current.speak(text, {
      onAmplitude: (vol) => {
        const now = Date.now();
        if (now - lastMetricsTimeRef.current >= 40) {
          lastMetricsTimeRef.current = now;
          setAudioMetrics((prev) => ({ ...prev, volume: vol }));
        }
      },
      onEnd: () => {
        stateMachineRef.current.transitionTo("IDLE");
      },
      onError: () => {
        stateMachineRef.current.transitionTo("IDLE");
      },
    }, voiceName);
  }, []);

  // Unmount safety
  useEffect(() => {
    return () => {
      cleanupVoiceSession();
    };
  }, [cleanupVoiceSession]);

  return {
    voiceState,
    isVoiceOverlayOpen,
    inputText,
    audioMetrics,
    errorMessage,
    setInputText,
    toggleListening,
    startListeningSession,
    stopVoiceSession,
    handleInterrupt,
    openVoiceOverlay,
    closeVoiceOverlay,
    speakResponse,
    submitTranscript,
  };
}
