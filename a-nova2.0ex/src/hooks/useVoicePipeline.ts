import { useVoiceEngine } from "../voice/useVoiceEngine";
import type { PermissionType } from "../components/PermissionManager";

export interface UseVoicePipelineProps {
  setInputText: (text: string) => void;
  onSendMessage?: (text: string, attachments?: any) => Promise<void> | void;
  requestPermission?: (
    type: PermissionType,
    onSuccess: () => void,
    onError?: () => void
  ) => Promise<void>;
  [key: string]: any;
}

export function useVoicePipeline({
  setInputText,
  onSendMessage,
  attachedFiles,
  requestPermission,
}: UseVoicePipelineProps) {
  const engine = useVoiceEngine({
    onTranscriptChange: (text) => {
      setInputText(text);
    },
    onSendMessage: async (text) => {
      const transcript = text.trim();
      if (!transcript) return;

      setInputText(transcript);

      try {
        if (onSendMessage) {
          await onSendMessage(transcript, attachedFiles);
        }
      } finally {
        setInputText("");
      }
    },
    requestPermission,
  });

  return {
    voiceState: engine.voiceState,
    isListening: engine.voiceState === "LISTENING",
    isVoiceAssistantActive: engine.isVoiceOverlayOpen,
    isVoiceAssistantOpen: engine.isVoiceOverlayOpen,
    voiceAssistantState: engine.voiceState,
    voiceErrorMsg: engine.errorMessage,
    voiceTranscript: engine.inputText,
    voiceAiResponseText: "",
    isDictationListening: engine.voiceState === "LISTENING",
    recordingError: engine.errorMessage,
    setRecordingError: () => {},
    toggleSpeechInput: engine.toggleListening,
    openVoiceAssistantMode: engine.openVoiceOverlay,
    closeVoiceAssistantMode: engine.closeVoiceOverlay,
    stopVoiceAssistant: engine.stopVoiceSession,
    startVoiceAssistantListening: engine.startListeningSession,
    handleInterruptVoiceAssistant: engine.handleInterrupt,
    handleMicToggle: engine.toggleListening,
    handleVoiceSubmit: () => engine.submitTranscript(),
    toggleDictation: engine.toggleListening,
    stopDictation: engine.stopVoiceSession,
    audioMetrics: engine.audioMetrics,
    engine,
  };
}
