import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { 
  Send, 
  Paperclip, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  File, 
  X, 
  Copy, 
  Check, 
  Bot, 
  Play, 
  Square,
  AlertCircle,
  FileText,
  User,
  ExternalLink,
  ChevronDown,
  Binary,
  Code,
  Target,
  MessageSquare,
  Menu,
  Plus,
  Camera,
  Image,
  FolderOpen,
  MapPin,
  Loader2
} from "lucide-react";
import { Message, ChatSession, AttachedFile, Settings, User as UserType } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ChatInterfaceProps {
  session: ChatSession | null;
  onSendMessage: (content: string, files: AttachedFile[]) => Promise<void>;
  onSelectModel: (modelName: string) => void;
  loading: boolean;
  onSetChatMode?: (id: string, mode: 'general' | 'math' | 'coding' | 'project') => void;
  settings?: Settings;
  onToggleSidebar?: () => void;
  user?: UserType | null;
}

// Predefined operating options for A-NOVA Workspaces
const MODE_PRESETS = [
  {
    mode: "general" as const,
    emoji: "💬",
    icon: MessageSquare,
    title: "General Dialogue",
    description: "Configures A-NOVA for open-ended conversations, brainstorming, creative drafts, and general queries.",
    color: "border-zinc-800 hover:border-emerald-500/40 text-emerald-400 bg-emerald-950/10",
    label: "General Chat Option"
  },
  {
    mode: "math" as const,
    emoji: "🧮",
    icon: Binary,
    title: "Mathematics & Logic Specialist",
    description: "Optimizes the engine for mathematical proofs, complex calculations, and structured step-by-step logic proof paths.",
    color: "border-zinc-800 hover:border-blue-500/40 text-blue-400 bg-blue-950/10",
    label: "Math Logic Option"
  },
  {
    mode: "coding" as const,
    emoji: "💻",
    icon: Code,
    title: "Complex Coding Workspace",
    description: "Configures the model to focus purely on modular software architecture design, clean TypeScript, and algorithm implementation.",
    color: "border-zinc-800 hover:border-teal-500/40 text-teal-400 bg-teal-950/10",
    label: "Developer Coding Option"
  },
  {
    mode: "project" as const,
    emoji: "🎯",
    icon: Target,
    title: "Project Milestone Planner",
    description: "Optimizes instructions for decomposing complex ideas, creating tasks, checklist milestones, and structured outlines.",
    color: "border-zinc-800 hover:border-indigo-500/40 text-indigo-400 bg-indigo-950/10",
    label: "Project Outline Option"
  }
];

interface AttachedFileWithProgress extends AttachedFile {
  id?: string;
  progress?: number;
}

const CodeBlock = React.memo(function CodeBlock({
  codeText,
  detectedLang,
  blockHashId,
  copiedCodeId,
  copyTextToClipboard
}: {
  codeText: string;
  detectedLang: string;
  blockHashId: string;
  copiedCodeId: string | null;
  copyTextToClipboard: (text: string, blockId: string) => void;
}) {
  const isCopied = copiedCodeId === blockHashId;
  return (
    <div className="my-4 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden font-mono shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800/80 text-[11px] text-zinc-404 font-mono">
        <span className="uppercase font-semibold tracking-wider text-emerald-400">{detectedLang}</span>
        <button
          id={`btn_copy_code_${blockHashId}`}
          type="button"
          onClick={() => copyTextToClipboard(codeText, blockHashId)}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-zinc-805"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      <pre className="p-4 overflow-x-auto text-[12px] text-zinc-300 leading-relaxed max-h-96">
        <code>{codeText}</code>
      </pre>
    </div>
  );
}, (prev, next) => {
  return (
    prev.codeText === next.codeText &&
    prev.detectedLang === next.detectedLang &&
    prev.blockHashId === next.blockHashId &&
    (prev.copiedCodeId === next.copiedCodeId || (prev.copiedCodeId !== prev.blockHashId && next.copiedCodeId !== next.blockHashId))
  );
});

const renderMarkdownParts = (
  rawText: string,
  messageId: string,
  copiedCodeId: string | null,
  copyTextToClipboard: (text: string, blockId: string) => void
) => {
  if (!rawText) return null;

  const parts = rawText.split("```");
  
  return parts.map((part, partIdx) => {
    const isCodeBlock = partIdx % 2 === 1;

    if (isCodeBlock) {
      const lines = part.split("\n");
      const detectedLang = lines[0].trim() || "typescript";
      const codeText = lines.slice(1).join("\n").trim();
      const blockHashId = `${messageId}_code_${partIdx}`;

      return (
        <CodeBlock
          key={blockHashId}
          codeText={codeText}
          detectedLang={detectedLang}
          blockHashId={blockHashId}
          copiedCodeId={copiedCodeId}
          copyTextToClipboard={copyTextToClipboard}
        />
      );
    }

    const textLines = part.split("\n");
    return (
      <div key={`param_${partIdx}`} className="space-y-2 text-zinc-300 antialiased font-sans text-sm md:text-[14.5px] leading-relaxed">
        {textLines.map((line, lineIdx) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return <div key={lineIdx} className="h-2" />;

          const formatInlineStyles = (txt: string) => {
            const boldRegex = /\*\*(.*?)\*\*/g;
            const matches = [...txt.matchAll(boldRegex)];
            if (matches.length === 0) return txt;

            const elements: React.ReactNode[] = [];
            let lastIndex = 0;

            matches.forEach((match, mIdx) => {
              const index = match.index!;
              const boldText = match[1];

              if (index > lastIndex) {
                elements.push(txt.substring(lastIndex, index));
              }
              elements.push(<strong key={mIdx} className="font-semibold text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded border border-emerald-900/35">{boldText}</strong>);
              lastIndex = index + match[0].length;
            });

            if (lastIndex < txt.length) {
              elements.push(txt.substring(lastIndex));
            }

            return elements;
          };

          const formattedSpan = formatInlineStyles(trimmedLine);

          if (
            trimmedLine.startsWith("$$") || 
            trimmedLine.includes("f(x)") || 
            trimmedLine.includes("\\int") || 
            trimmedLine.includes("e^{") || 
            trimmedLine.includes("\\pi") || 
            trimmedLine.startsWith("\\[")
          ) {
            const plainFormula = trimmedLine.replace(/\$\$|\\\[|\\\]/g, "").trim();
            return (
              <div key={lineIdx} className="my-3.5 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center font-mono relative overflow-hidden select-all">
                <div className="absolute top-1.5 left-2 text-[8px] uppercase tracking-widest text-zinc-500 font-mono font-bold">Equation / Calculation Proof</div>
                <div className="text-zinc-100 text-sm italic font-serif pt-2.5 pb-1 font-semibold block text-center max-w-full overflow-x-auto">
                  {plainFormula}
                </div>
              </div>
            );
          }

          if (trimmedLine.startsWith("### ")) {
            return <h4 key={lineIdx} className="text-sm font-bold text-white pt-2.5 pb-0.5 tracking-wide">{formatInlineStyles(trimmedLine.substring(4))}</h4>;
          }
          if (trimmedLine.startsWith("## ")) {
            return <h3 key={lineIdx} className="text-base font-bold text-white pt-3.5 pb-1 tracking-wide border-b border-zinc-850/50">{formatInlineStyles(trimmedLine.substring(3))}</h3>;
          }
          if (trimmedLine.startsWith("# ")) {
            return <h2 key={lineIdx} className="text-lg font-bold text-white pt-4.5 pb-1.5 tracking-wide">{formatInlineStyles(trimmedLine.substring(2))}</h2>;
          }

          if (trimmedLine.startsWith("* ") || trimmedLine.startsWith("- ")) {
            return (
              <div key={lineIdx} className="flex items-start gap-2.5 my-1 pl-1">
                <span className="text-emerald-400 select-none mt-2 shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <div className="text-zinc-300 flex-1">{formatInlineStyles(trimmedLine.substring(2))}</div>
              </div>
            );
          }

          const matchNum = trimmedLine.match(/^(\d+)\.\s+(.*)/);
          if (matchNum) {
            const num = matchNum[1];
            const content = matchNum[2];
            return (
              <div key={lineIdx} className="flex items-start gap-2.5 my-1 pl-1 font-sans">
                <span className="text-emerald-400 font-mono font-bold select-none shrink-0 w-5 text-right">{num}.</span>
                <div className="text-zinc-300 flex-1">{formatInlineStyles(content)}</div>
              </div>
            );
          }

          return <p key={lineIdx} className="mb-1.5">{formattedSpan}</p>;
        })}
      </div>
    );
  });
};

const MessageBubble = memo(function MessageBubble({
  msg,
  isAssistant,
  fontClass,
  sessionMode,
  playingSpeechId,
  speakResponse,
  copiedCodeId,
  copyTextToClipboard,
  userAvatarUrl,
  userDisplayName,
}: {
  msg: any;
  isAssistant: boolean;
  fontClass: string;
  sessionMode: string;
  playingSpeechId: string | null;
  speakResponse: (id: string, text: string) => void;
  copiedCodeId: string | null;
  copyTextToClipboard: (text: string, blockId: string) => void;
  userAvatarUrl?: string;
  userDisplayName?: string;
}) {
  return (
    <motion.div
       id={`msg_bubble_${msg.id}`}
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       className={`flex gap-4 ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      {isAssistant && (
        <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-center shrink-0 shadow-sm shadow-black/20">
          {sessionMode === "math" ? <Binary className="w-4.5 h-4.5 text-blue-400" /> :
           sessionMode === "coding" ? <Code className="w-4.5 h-4.5 text-teal-400" /> :
           sessionMode === "project" ? <Target className="w-4.5 h-4.5 text-indigo-400" /> :
           <Sparkles className="w-4.5 h-4.5 text-emerald-400" />}
        </div>
      )}

      <div className="flex flex-col max-w-[85%] md:max-w-[75%] space-y-1.5">
        <div className={`px-5.5 py-4.5 rounded-3xl relative leading-relaxed tracking-wide ${fontClass} ${
          isAssistant 
            ? "bg-zinc-950/45 border border-zinc-850/60 text-zinc-200 shadow-md shadow-black/10 rounded-tl-sm hover:border-zinc-800/80 transition-all duration-200" 
            : "bg-gradient-to-br from-[#1b3a29] to-[#254f38] border border-[#2d5d42] text-emerald-50 shadow-md shadow-[#0f2117]/20 rounded-tr-sm hover:border-[#387050] transition-all duration-200"
        }`}>
          
          {/* File attachments visual display nested securely inside the bubble container */}
          {msg.attachedFiles && msg.attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 border-b border-white/10 pb-2">
              {msg.attachedFiles.map((file: any, fIdx: number) => {
                const isImage = file.type?.startsWith("image/");
                return (
                  <div key={fIdx} className="flex items-center gap-2 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5 max-w-xs">
                    {isImage && file.dataUrl ? (
                      <img 
                        className="w-14 h-14 object-cover rounded-md border border-white/10"
                        src={file.dataUrl} 
                        alt="attachment preview" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <FileText className="w-6 h-6 text-emerald-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-white truncate max-w-[120px]">{file.name}</p>
                      <p className="text-[8px] text-zinc-400 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Parse content */}
          <div>
            {isAssistant 
              ? renderMarkdownParts(msg.content, msg.id, copiedCodeId, copyTextToClipboard)
              : <p className="text-sm md:text-[14.5px] font-sans pr-2 whitespace-pre-wrap">{msg.content}</p>
            }
          </div>
        </div>

        {/* Bubbles footnote actions */}
        <div className={`flex items-center gap-2 px-1 text-[10px] text-zinc-500 font-mono ${!isAssistant ? "justify-end" : "justify-start"}`}>
          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          
          {isAssistant && (
            <button
              id={`btn_speech_synthesis_${msg.id}`}
              type="button"
              onClick={() => speakResponse(msg.id, msg.content)}
              className={`p-1 rounded cursor-pointer hover:bg-zinc-800 transition-colors ${playingSpeechId === msg.id ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-350"}`}
              title="Speak Response (TTS)"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {!isAssistant && (
        <div className="w-9 h-9 rounded-xl overflow-hidden bg-emerald-700/10 border border-emerald-900/40 flex items-center justify-center shrink-0">
          {userAvatarUrl ? (
            <img 
              className="w-full h-full object-cover" 
              src={userAvatarUrl} 
              alt={userDisplayName || "User"} 
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className="w-5 h-5 text-emerald-400" />
          )}
        </div>
      )}
    </motion.div>
  );
}, (prev, next) => {
  return (
    prev.msg.id === next.msg.id &&
    prev.msg.content === next.msg.content &&
    prev.msg.timestamp === next.msg.timestamp &&
    prev.isAssistant === next.isAssistant &&
    prev.fontClass === next.fontClass &&
    prev.sessionMode === next.sessionMode &&
    prev.playingSpeechId === next.playingSpeechId &&
    prev.copiedCodeId === next.copiedCodeId &&
    prev.userAvatarUrl === next.userAvatarUrl &&
    prev.userDisplayName === next.userDisplayName &&
    JSON.stringify(prev.msg.attachedFiles) === JSON.stringify(next.msg.attachedFiles)
  );
});

export default function ChatInterface({
  session,
  onSendMessage,
  onSelectModel,
  loading,
  onSetChatMode,
  settings,
  onToggleSidebar,
  user
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileWithProgress[]>([]);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  
  // Plus Dropdown Menu and Drag-and-drop states
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [locating, setLocating] = useState(false);

  // Camera capture pipeline states
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [takenPhoto, setTakenPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // High-fidelity Voice Recording states 
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recorderDuration, setRecorderDuration] = useState(0);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const durationIntervalRef = useRef<any>(null);

  // File explorer node triggers
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  
  // Voice Recognition states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Speech Voice synthesize playbacks
  const [playingSpeechId, setPlayingSpeechId] = useState<string | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Scroller view bindings
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, loading]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      stopVoiceOutput();
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
      if (recordingStream) {
        recordingStream.getTracks().forEach(t => t.stop());
      }
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, []);

  // --- COMPONENT HANDLERS FOR CHATGPT+ MENU OPTIONS ---

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (loading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Trigger file managers
  const handleTriggerPhotos = () => {
    setPlusMenuOpen(false);
    photoInputRef.current?.click();
  };

  const handleTriggerDocuments = () => {
    setPlusMenuOpen(false);
    docInputRef.current?.click();
  };

  const handleTriggerFiles = () => {
    setPlusMenuOpen(false);
    fileInputRef.current?.click();
  };

  // Dynamic Location Service with real reverse geocoding via OpenStreetMap Nominatim
  const handleTriggerLocation = () => {
    setPlusMenuOpen(false);
    if (!navigator.geolocation) {
      alert("Host device is not equipped with Geolocation capabilities.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        let addressString = "Offline location coordinates.";
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: {
              "User-Agent": "A-NOVA-Workstation-Browser"
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              addressString = data.display_name;
            }
          }
        } catch (_) {
          addressString = "Coordinates Resolved.";
        }

        setInputText(prev => 
          prev + (prev ? "\n" : "") + 
          `📍 Workstation Geolocation Context:\n` +
          `- Coordinates: Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}\n` +
          `- Accuracy Margin: ~${Math.round(accuracy)}m\n` +
          `- Location Detail: ${addressString}`
        );
        setLocating(false);
      },
      (err) => {
        console.error(err);
        alert(`Geolocation access skipped: ${err.message || "Position unavailable"}.`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );
  };

  // Real-time camera streaming pipeline
  const handleTriggerCamera = async () => {
    setPlusMenuOpen(false);
    setCameraOpen(true);
    setTakenPhoto(null);
    setCameraError(null);
    
    // Clear old streams if any
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      setCameraStream(stream);

      // Bind to video ref with slight delay to ensure render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera source error:", err);
      setCameraError(err.message || "Failed to start camera. Grant browser permissions to captured devices.");
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setTakenPhoto(null);
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setTakenPhoto(dataUrl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const usePhoto = () => {
    if (!takenPhoto) return;
    const fileId = "cam_img_" + Math.random().toString(36).substring(2, 9);
    const newFile: AttachedFileWithProgress = {
      id: fileId,
      name: `Snapshot_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`,
      type: "image/jpeg",
      size: Math.round(takenPhoto.length * 0.75),
      dataUrl: takenPhoto,
      progress: 100
    };
    setAttachedFiles(prev => [...prev, newFile]);
    closeCamera();
  };

  // Real-time Voice Recording pipeline
  const handleTriggerVoiceRecorder = async () => {
    setPlusMenuOpen(false);
    setRecorderOpen(true);
    setRecorderDuration(0);
    setAudioChunks([]);
    setRecordingError(null);

    if (recordingStream) {
      recordingStream.getTracks().forEach(t => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
      
      const options = { mimeType: 'audio/webm' };
      let rec: MediaRecorder;
      try {
        rec = new MediaRecorder(stream, options);
      } catch (e) {
        rec = new MediaRecorder(stream);
      }

      const chunks: Blob[] = [];
      rec.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      rec.onstop = () => {
        setAudioChunks(chunks);
      };

      rec.start(250);
      setMediaRecorder(rec);

      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = setInterval(() => {
        setRecorderDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Audio recording error:", err);
      setRecordingError(err.message || "Failed to locate microphone entry. Reverify hardware availability & permissions.");
    }
  };

  const closeRecorder = () => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
    }
    setRecordingStream(null);
    setMediaRecorder(null);
    setRecorderOpen(false);
  };

  const saveRecordedAudio = () => {
    if (!mediaRecorder) return;
    
    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);

    setTimeout(() => {
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      if (audioBlob.size === 0) {
        alert("Audio data buffer is blank. Capture failed.");
        closeRecorder();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const fileId = "rec_" + Math.random().toString(36).substring(2, 9);
        const mimeExt = mediaRecorder.mimeType?.split(";")[0]?.split("/")[1] || "webm";
        const newVoiceFile: AttachedFileWithProgress = {
          id: fileId,
          name: `VoiceRecord_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${mimeExt}`,
          type: mediaRecorder.mimeType || "audio/webm",
          size: audioBlob.size,
          dataUrl,
          progress: 100
        };

        setAttachedFiles(prev => [...prev, newVoiceFile]);
        closeRecorder();
      };
      reader.readAsDataURL(audioBlob);
    }, 150);
  };

  const toggleSpeechInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not fully supported in this browser. Try opening in Chrome or Safari.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        if (resultText) {
          setInputText(prev => prev + (prev ? " " : "") + resultText);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const speakResponse = useCallback((messageId: string, text: string) => {
    if (!synthRef.current) return;

    if (playingSpeechId === messageId) {
      stopVoiceOutput();
      return;
    }

    stopVoiceOutput();

    const cleanText = text
      .replace(/```[\s\S]*?```/g, "[code segment]")
      .replace(/[*#_`~-]/g, "")
      .slice(0, 400);

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => {
        setPlayingSpeechId(null);
      };
      utterance.onerror = () => {
        setPlayingSpeechId(null);
      };

      currentUtteranceRef.current = utterance;
      setPlayingSpeechId(messageId);
      synthRef.current.speak(utterance);
    } catch (error) {
      console.error("Vocal playback failed:", error);
      setPlayingSpeechId(null);
    }
  }, [playingSpeechId]);

  const stopVoiceOutput = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setPlayingSpeechId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    addFiles(Array.from(files));
  };

  const addFiles = (fileList: File[]) => {
    fileList.forEach(file => {
      if (file.size > 4 * 1024 * 1024) {
        alert(`File ${file.name} exceeds the 4MB payload limit.`);
        return;
      }

      const fileId = "file_" + Math.random().toString(36).substring(2, 9);
      
      // Initialize with basic model, setting progress to 10%
      const newAttachedFile: AttachedFileWithProgress = {
        id: fileId,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: "",
        progress: 10
      };

      setAttachedFiles(prev => [...prev, newAttachedFile]);

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        
        // Progress bar simulation over a short realistic period (e.g. 300-600ms)
        let simProgress = 10;
        const intervalId = setInterval(() => {
          simProgress += Math.floor(Math.random() * 25) + 15;
          if (simProgress >= 100) {
            simProgress = 100;
            clearInterval(intervalId);
          }

          setAttachedFiles(prev =>
            prev.map(item => {
              if (item.id === fileId) {
                return { ...item, dataUrl, progress: simProgress };
              }
              return item;
            })
          );
        }, 100);
      };
      reader.readAsDataURL(file);
    });

    // Reset general and photo/document file inputs if bound
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const removeAttachedFile = (idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Block sending if any file is still uploading
    const isUploading = attachedFiles.some(f => (f.progress ?? 100) < 100);
    if (isUploading) return;
    
    if (!inputText.trim() && attachedFiles.length === 0) return;

    const content = inputText.trim();
    
    // Strip local progress fields prior to sending payload
    const files = attachedFiles.map(({ name, type, size, dataUrl }) => ({
      name,
      type,
      size,
      dataUrl
    }));

    setInputText("");
    setAttachedFiles([]);
    stopVoiceOutput();

    await onSendMessage(content, files);
  };

  const copyTextToClipboard = useCallback((text: string, blockId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(blockId);
    setTimeout(() => setCopiedCodeId(null), 1500);
  }, []);

  const parseAndRenderMarkdown = (rawText: string, messageId: string) => {
    if (!rawText) return null;

    // Split text by standard code segment notations
    const parts = rawText.split("```");
    
    return parts.map((part, partIdx) => {
      const isCodeBlock = partIdx % 2 === 1;

      if (isCodeBlock) {
        const lines = part.split("\n");
        const detectedLang = lines[0].trim() || "typescript";
        const codeText = lines.slice(1).join("\n").trim();
        const blockHashId = `${messageId}_code_${partIdx}`;

        return (
          <div key={blockHashId} className="my-4 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden font-mono shadow-md">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800/80 text-[11px] text-zinc-400 font-mono">
              <span className="uppercase font-semibold tracking-wider text-emerald-400">{detectedLang}</span>
              <button
                id={`btn_copy_code_${blockHashId}`}
                type="button"
                onClick={() => copyTextToClipboard(codeText, blockHashId)}
                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer p-1 rounded hover:bg-zinc-800"
              >
                {copiedCodeId === blockHashId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy code</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 overflow-x-auto text-[12px] text-zinc-300 leading-relaxed max-h-96">
              <code>{codeText}</code>
            </pre>
          </div>
        );
      }

      // Check standard paragraphs, lists, and mathematics matrix notation
      const textLines = part.split("\n");
      return (
        <div key={`param_${partIdx}`} className="space-y-2 text-zinc-350 antialiased font-sans text-sm md:text-[14.5px] leading-relaxed">
          {textLines.map((line, lineIdx) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return <div key={lineIdx} className="h-2" />;

            // Helper to render bold strings styled
            const formatInlineStyles = (txt: string) => {
              const boldRegex = /\*\*(.*?)\*\*/g;
              const matches = [...txt.matchAll(boldRegex)];
              if (matches.length === 0) return txt;

              const elements: React.ReactNode[] = [];
              let lastIndex = 0;

              matches.forEach((match, mIdx) => {
                const index = match.index!;
                const boldText = match[1];

                if (index > lastIndex) {
                  elements.push(txt.substring(lastIndex, index));
                }
                elements.push(<strong key={mIdx} className="font-semibold text-white bg-zinc-900/60 px-1 py-0.5 rounded">{boldText}</strong>);
                lastIndex = index + match[0].length;
              });

              if (lastIndex < txt.length) {
                elements.push(txt.substring(lastIndex));
              }

              return elements;
            };

            const formattedSpan = formatInlineStyles(trimmedLine);

            // Special Renderer: LaTeX Block Math formula notation (e.g. starting with \[, $$, or typical calculation formulas)
            if (
              trimmedLine.startsWith("$$") || 
              trimmedLine.includes("f(x)") || 
              trimmedLine.includes("\\int") || 
              trimmedLine.includes("e^{") || 
              trimmedLine.includes("\\pi") || 
              trimmedLine.startsWith("\\[")
            ) {
              const plainFormula = trimmedLine.replace(/\$\$|\\\[|\\\]/g, "").trim();
              return (
                <div key={lineIdx} className="my-3.5 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center font-mono relative overflow-hidden select-all">
                  <div className="absolute top-1.5 left-2 text-[8px] uppercase tracking-widest text-zinc-500 font-mono font-bold">Equation / Calculation Proof</div>
                  <div className="text-zinc-100 text-sm italic font-serif pt-2.5 pb-1 font-semibold block text-center max-w-full overflow-x-auto">
                    {plainFormula}
                  </div>
                </div>
              );
            }

            // Headings format
            if (trimmedLine.startsWith("### ")) {
              return <h4 key={lineIdx} className="text-sm font-bold text-white pt-2.5 pb-0.5 tracking-wide">{formatInlineStyles(trimmedLine.substring(4))}</h4>;
            }
            if (trimmedLine.startsWith("## ")) {
              return <h3 key={lineIdx} className="text-base font-bold text-white pt-3.5 pb-1 tracking-wide border-b border-zinc-800/50">{formatInlineStyles(trimmedLine.substring(3))}</h3>;
            }
            if (trimmedLine.startsWith("# ")) {
              return <h2 key={lineIdx} className="text-lg font-bold text-white pt-4.5 pb-1.5 tracking-wide">{formatInlineStyles(trimmedLine.substring(2))}</h2>;
            }

            // Bullet elements
            if (trimmedLine.startsWith("* ") || trimmedLine.startsWith("- ")) {
              return (
                <ul key={lineIdx} className="list-disc pl-6 space-y-1 mb-1 bg-transparent">
                  <li className="text-zinc-300 pr-1">{formatInlineStyles(trimmedLine.substring(2))}</li>
                </ul>
              );
            }

            return <p key={lineIdx} className="mb-1.5">{formattedSpan}</p>;
          })}
        </div>
      );
    });
  };

  const handleSelectPreset = (preset: typeof MODE_PRESETS[number]) => {
    if (session && onSetChatMode) {
      // Configure active session category mode option
      onSetChatMode(session.id, preset.mode);
    }
  };

  const currentMode = session?.mode || "general";
  const activePreset = MODE_PRESETS.find(p => p.mode === currentMode) || MODE_PRESETS[0];

  return (
    <div 
      id="chat_workspace" 
      className="flex-1 flex flex-col bg-zinc-900 text-zinc-100 h-screen overflow-hidden relative select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Full-Screen Drag and Drop Area overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-emerald-950/85 backdrop-blur-md border-4 border-dashed border-emerald-500 z-50 flex flex-col items-center justify-center p-6 text-center text-white font-sans pointer-events-none"
          >
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/30 animate-bounce">
              <FolderOpen className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold tracking-tight mb-2 font-sans">Drop files to analyze with A-NOVA</h3>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed font-sans">
              Release to attach documents, PDFs, source code snippets, or pictures directly into the workspace active payload (Max 4MB).
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Geolocating Address Toast */}
      <AnimatePresence>
        {locating && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 bg-emerald-950/90 border border-emerald-800/80 px-4 py-2.5 rounded-2xl text-[11px] text-emerald-350 font-mono flex items-center gap-2 z-50 shadow-2xl backdrop-blur-sm"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Scanning active GPS coordinate satellites...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Capture Modal */}
      <AnimatePresence>
        {cameraOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-850 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl font-sans"
            >
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950">
                <div className="flex items-center gap-2">
                  <Camera className="w-4.5 h-4.5 text-emerald-400" />
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300">A-NOVA Camera Core</span>
                </div>
                <button
                  type="button"
                  onClick={closeCamera}
                  className="p-1 rounded bg-zinc-900 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-zinc-900 flex flex-col items-center justify-center min-h-[300px]">
                {cameraError ? (
                  <div className="text-center p-6 text-zinc-400 max-w-sm space-y-3">
                    <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                    <p className="text-xs font-semibold leading-relaxed">{cameraError}</p>
                    <p className="text-[10px] text-zinc-600 leading-none">Please check your web permissions or browser settings.</p>
                  </div>
                ) : !takenPhoto ? (
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-zinc-800">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 border border-white/5 text-[9px] font-mono tracking-widest text-emerald-400 uppercase rounded font-bold animate-pulse">
                      Live Stream Active
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-zinc-800">
                    <img
                      src={takenPhoto}
                      alt="Captured screenshot"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 border border-emerald-900 text-[9px] font-mono tracking-widest text-emerald-400 uppercase rounded font-bold">
                      Frame Preserved
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeCamera}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
                {!cameraError && (
                  <>
                    {!takenPhoto ? (
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Capture Frame</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setTakenPhoto(null)}
                          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Retake
                        </button>
                        <button
                          type="button"
                          onClick={usePhoto}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                        >
                          <Check className="w-4 h-4" />
                          <span>Attach Photo</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voice Recorder Capture Modal */}
      <AnimatePresence>
        {recorderOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-850 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl font-sans"
            >
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950">
                <div className="flex items-center gap-2">
                  <Mic className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-300">Voice Transcription Core</span>
                </div>
                <button
                  type="button"
                  onClick={closeRecorder}
                  className="p-1 rounded bg-zinc-900 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 bg-zinc-900 text-center flex flex-col items-center justify-center space-y-4">
                {recordingError ? (
                  <div className="p-4 text-zinc-400 space-y-3">
                    <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                    <p className="text-xs font-semibold leading-relaxed">{recordingError}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold">Capturing Stream</p>
                    <div className="text-3xl font-bold text-white font-mono tracking-tight">
                      {Math.floor(recorderDuration / 60).toString().padStart(2, "0")}
                      :
                      {(recorderDuration % 60).toString().padStart(2, "0")}
                    </div>

                    {/* Staggered voice pressure waveform columns */}
                    <div className="flex items-end justify-center gap-1.5 h-16 w-full py-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: mediaRecorder && mediaRecorder.state === "recording" 
                              ? [14, 56, 18, 48, 14, 38][(i % 6)] 
                              : 6,
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.5 + i * 0.08,
                            ease: "easeInOut",
                          }}
                          className="w-1.5 bg-rose-500/85 rounded-full"
                        />
                      ))}
                    </div>

                    <p className="text-[11px] text-zinc-400">Speak clearly. Audio note binary will be parsed inline by Gemini.</p>
                  </>
                )}
              </div>

              <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeRecorder}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                {!recordingError && (
                  <button
                    type="button"
                    onClick={saveRecordedAudio}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    <Check className="w-4 h-4" />
                    <span>Stop & Attach</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Upper navigation header */}
      <header className="p-4 bg-zinc-950/40 border-b border-zinc-900 flex items-center justify-between z-10 h-14 shrink-0">
        {session ? (
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Hamburger Toggle Button */}
            <button
              id="btn_hamburger_toggle_sidebar_mobile"
              type="button"
              onClick={onToggleSidebar}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 active:scale-95 transition-all text-zinc-305 hover:text-white cursor-pointer"
              title="Open menu"
            >
              <Menu className="w-4.5 h-4.5 text-emerald-400" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">A-NOVA Dialog Core</h2>
                {session.mode && (
                  <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border capitalize ${
                    session.mode === "math" ? "border-blue-900 bg-blue-950 text-blue-400" :
                    session.mode === "coding" ? "border-teal-900 bg-teal-950 text-teal-400" :
                    session.mode === "project" ? "border-indigo-900 bg-indigo-950/40 text-indigo-400" :
                    "border-zinc-800 bg-zinc-900 text-zinc-400"
                  }`}>
                    {session.mode} mode
                  </span>
                )}
              </div>
              <h3 className="text-xs font-bold text-zinc-150 max-w-[140px] md:max-w-md truncate font-sans">{session.title}</h3>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="text-xs font-bold tracking-wider text-zinc-450 uppercase font-mono">Initializing A-NOVA ...</span>
          </div>
        )}

        {/* Model logic selectors */}
        {session && (
          <div className="relative col-span-1">
            <select
              id="select_session_model_selector"
              value={session.selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-[10.5px] font-bold px-3 py-1.5 pr-8 rounded-xl hover:border-zinc-750 focus:outline-none transition-colors cursor-pointer appearance-none font-sans"
            >
              <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Advanced Logical Logic)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 pointer-events-none text-zinc-500" />
          </div>
        )}
      </header>

      {/* Primary scrollable dialog container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative scrollbar-thin scrollbar-thumb-zinc-950 scrollbar-track-transparent">
        <AnimatePresence mode="wait">
          {!session || !session.messages || session.messages.length === 0 ? (
            
            /* High-Craft empty state welcome frame containing minimalist greeting */
            <motion.div
              key="chat_landing_screen"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col items-center justify-center text-center px-4 max-w-xl mx-auto my-auto h-[60vh]"
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="w-14 h-14 bg-emerald-600/10 border border-emerald-500/20 rounded-2.5xl flex items-center justify-center shadow-md relative group">
                  <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight font-sans">
                  How can I help you today? 😊
                </h1>
                <p className="text-sm text-zinc-400 font-sans max-w-sm leading-relaxed">
                  I am your conversational intelligence companion. Switch modes to work on mathematics 📐, code design 💻, or interactive projects 🎯!
                </p>
              </div>
            </motion.div>
          ) : (
            /* Standard chat bubble conversations lists */
            <div 
              id="messages_stream_view" 
              className={`${settings?.chatWidth === "full" ? "max-w-none px-4 md:px-12" : "max-w-3xl"} mx-auto space-y-6`}
            >
              {(session.messages || []).map((msg) => {
                const isAssistant = msg.role === "assistant";
                const fontClass = settings?.fontSize === "sm" ? "text-xs md:text-[13px]" : settings?.fontSize === "lg" ? "text-base md:text-[16px]" : "text-sm md:text-[14.5px]";
                
                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isAssistant={isAssistant}
                    fontClass={fontClass}
                    sessionMode={session.mode || "general"}
                    playingSpeechId={playingSpeechId}
                    speakResponse={speakResponse}
                    copiedCodeId={copiedCodeId}
                    copyTextToClipboard={copyTextToClipboard}
                    userAvatarUrl={user?.avatarUrl}
                    userDisplayName={user?.displayName || user?.username}
                  />
                );
              })}
              
              {/* Typing Loader animation */}
              {loading && (
                <div id="ai_typing_skeleton" className="flex gap-4 justify-start">
                  <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4.5 h-4.5 text-emerald-400 animate-spin" />
                  </div>
                  <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2.5xl rounded-tl-sm w-36 flex items-center gap-1.5 py-5 justify-center shadow-inner">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer input bars */}
      <footer className="p-4 bg-gradient-to-t from-zinc-950 to-zinc-950/45 border-t border-zinc-900/80 z-10 shrink-0">
        <div className="max-w-3xl mx-auto">
          
          {/* Files strip */}
          {attachedFiles.length > 0 && (
            <div id="attachments_preview_shelf" className="flex flex-wrap gap-2 mb-3 p-2 bg-zinc-950 border border-zinc-900 rounded-2xl">
              {attachedFiles.map((file, idx) => {
                const isImage = file.type?.startsWith("image/");
                const isUploading = (file.progress ?? 100) < 100;
                return (
                  <div key={idx} className="flex items-center gap-2 bg-zinc-900 px-2.5 py-1.5 rounded-xl border border-zinc-800 text-xs max-w-sm relative group pr-8 font-sans">
                    {isImage && file.dataUrl ? (
                      <img 
                        className="w-10 h-10 object-cover rounded-md"
                        src={file.dataUrl} 
                        alt="Preview" 
                      />
                    ) : (
                      <File className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-zinc-350 truncate max-w-[120px] mb-0.5">{file.name}</p>
                      {isUploading ? (
                        <div className="w-full">
                          <div className="flex items-center justify-between text-[8px] text-emerald-400 font-mono mb-0.5">
                            <span>Uploading...</span>
                            <span>{file.progress}%</span>
                          </div>
                          <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all duration-150" 
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-[9px] text-zinc-500 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                      )}
                    </div>
                    <button
                      id={`btn_remove_attachment_${idx}`}
                      type="button"
                      onClick={() => removeAttachedFile(idx)}
                      className="absolute right-1.5 top-2.5 p-1 text-zinc-500 hover:text-white hover:bg-zinc-805 rounded transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Core Input Panel */}
          <form onSubmit={handleSend} className="relative flex items-center bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus-within:border-emerald-500/80 rounded-2.5xl p-2.5 shadow-2xl transition-all font-sans">
            
            {/* Native OS browsing hooks triggered securely */}
            <input
              type="file"
              ref={photoInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={docInputRef}
              onChange={handleFileChange}
              multiple
              accept=".pdf,.doc,.docx,.txt,.rtf,.md,.csv,.json,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*"
              className="hidden"
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="*"
              className="hidden"
            />
            
            {/* ChatGPT '+' Popover launcher */}
            <div className="relative shrink-0 flex items-center justify-center">
              <button
                id="btn_plus_attachments_launcher"
                type="button"
                disabled={loading}
                onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                className={`p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-zinc-400 hover:text-white disabled:opacity-45 rounded-full cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center justify-center w-9 h-9 ${
                  plusMenuOpen ? "rotate-45 bg-zinc-800 border-zinc-700 text-white" : ""
                }`}
                title="Add attachments (Photos, Documents, Voice Record, Location)"
              >
                <Plus className="w-5 h-5 transition-transform" />
              </button>

              {/* Popover options panel details */}
              <AnimatePresence>
                {plusMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setPlusMenuOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 15 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute bottom-12 left-0 w-64 bg-zinc-950 border border-zinc-850 rounded-2.5xl p-2 shadow-2xl z-50 flex flex-col gap-0.5 text-zinc-200 font-sans backdrop-blur-md"
                    >
                      <div className="px-3 py-1.5 text-[9px] font-bold font-mono tracking-widest text-zinc-500 uppercase border-b border-zinc-900 mb-1">
                        Multimedia Stream Core
                      </div>

                      <button
                        type="button"
                        onClick={handleTriggerCamera}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs hover:bg-zinc-900 text-left text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-98"
                      >
                        <div className="p-1 rounded bg-emerald-600/10 border border-emerald-500/20 text-emerald-400">
                          <Camera className="w-4 h-4" />
                        </div>
                        <span>📷 Camera Source</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTriggerPhotos}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs hover:bg-zinc-900 text-left text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-98"
                      >
                        <div className="p-1 rounded bg-blue-600/10 border border-blue-500/20 text-blue-400">
                          <Image className="w-4 h-4" />
                        </div>
                        <span>🖼️ Photos & Gallery</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTriggerDocuments}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs hover:bg-zinc-900 text-left text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-98"
                      >
                        <div className="p-1 rounded bg-orange-600/10 border border-orange-500/20 text-orange-450">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span>📄 Documents (PDF, DOCX)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTriggerVoiceRecorder}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs hover:bg-zinc-900 text-left text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-98"
                      >
                        <div className="p-1 rounded bg-rose-600/10 border border-rose-500/20 text-rose-450">
                          <Mic className="w-4 h-4" />
                        </div>
                        <span>🎤 Voice recorder clip</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTriggerFiles}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs hover:bg-zinc-900 text-left text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-98"
                      >
                        <div className="p-1 rounded bg-teal-600/10 border border-teal-500/20 text-teal-400">
                          <FolderOpen className="w-4 h-4" />
                        </div>
                        <span>📁 General Files & Code</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTriggerLocation}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs hover:bg-zinc-900 text-left text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-98"
                      >
                        <div className="p-1 rounded bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span>📍 Dynamic Geolocation Map</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <input
              id="chat_text_input_area"
              type="text"
              disabled={loading}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? "Listening with vocoder core..." : `Ask A-NOVA (${activePreset.title})...`}
              className="flex-1 bg-transparent px-3 py-2.5 text-[14px] text-zinc-150 focus:outline-none placeholder-zinc-500 disabled:opacity-45"
              autoComplete="off"
            />

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="btn_toggle_speech_recognition"
                type="button"
                disabled={loading}
                onClick={toggleSpeechInput}
                className={`p-2.5 text-zinc-400 hover:text-zinc-200 rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer ${isListening ? "bg-red-950/40 border border-red-900/60 text-red-400 hover:text-red-350 animate-pulse" : "hover:bg-zinc-900"}`}
                title={isListening ? "Listening (Click to stop)" : "Trigger Speech Recognition"}
              >
                {isListening ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                id="btn_chat_send_submit"
                type="submit"
                disabled={loading || attachedFiles.some(f => (f.progress ?? 100) < 100) || (!inputText.trim() && attachedFiles.length === 0)}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-505 disabled:bg-zinc-900 disabled:text-zinc-600 text-white rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-all"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </div>
          </form>

          {/* Footnotes disclaimer */}
          <p className="text-[10px] text-zinc-600 text-center mt-3 font-mono">
            A-NOVA may produce inaccuracies. Reverify formulas, proofs, or complex algorithm constructs.
          </p>
        </div>
      </footer>

    </div>
  );
}
