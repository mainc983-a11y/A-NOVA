import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { 
  Send, 
  Paperclip, 
  Mic, 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  FileText,
  ChevronDown,
  Binary,
  Code,
  Target,
  MessageSquare,
  Menu,
  Plus,
  Camera,
  Image,
  MapPin,
  Loader2,
  Volume2,
  VolumeX,
  PlusCircle,
  User,
  ArrowUp,
  Brain,
  Grid,
  Zap,
  Info,
  HelpCircle,
  Eye,
  Volume,
  FileCheck
} from "lucide-react";
import { Message, ChatSession, AttachedFile, Settings, User as UserType } from "../types";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

// Robust client-side file text extractor supporting PDF, DOCX, XLSX, CSV, code files
const extractTextFromFile = async (file: File): Promise<string> => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    if (['txt', 'py', 'js', 'ts', 'java', 'cpp', 'html', 'css', 'csv'].includes(ext)) {
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => resolve("");
      reader.readAsText(file);
    } 
    else if (ext === 'docx') {
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const mammothParser = mammoth || (mammoth as any).default;
          if (mammothParser && typeof mammothParser.extractRawText === 'function') {
            const result = await mammothParser.extractRawText({ arrayBuffer });
            resolve(result.value || "");
          } else {
            resolve("");
          }
        } catch (err) {
          console.error("Mammoth DOCX parsing failed:", err);
          resolve("");
        }
      };
      reader.onerror = () => resolve("");
      reader.readAsArrayBuffer(file);
    }
    else if (ext === 'xlsx' || ext === 'xls') {
      reader.onload = () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          let fullText = "";
          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            if (csv && csv.trim()) {
              fullText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
            }
          });
          resolve(fullText);
        } catch (err) {
          console.error("XLSX parsing failed:", err);
          resolve("");
        }
      };
      reader.onerror = () => resolve("");
      reader.readAsArrayBuffer(file);
    }
    else {
      resolve("");
    }
  });
};

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

const MODE_PRESETS = [
  {
    mode: "general" as const,
    emoji: "💬",
    icon: MessageSquare,
    title: "General Dialogue",
    description: "Configures A-NOVA for open-ended conversations, brainstorming, and creative drafts.",
    color: "from-blue-500 to-indigo-500",
    accent: "bg-blue-500/10 border-blue-500/30 text-blue-400"
  },
  {
    mode: "math" as const,
    emoji: "🧮",
    icon: Binary,
    title: "Mathematics Core",
    description: "Optimizes the engine for formal logic proofs, complex calculations, and structured proof paths.",
    color: "from-purple-500 to-blue-500",
    accent: "bg-purple-500/10 border-purple-500/30 text-purple-400"
  },
  {
    mode: "coding" as const,
    emoji: "💻",
    icon: Code,
    title: "Code Intelligence",
    description: "Tailors syntax formats, structural compilation feedback, and modular system layouts.",
    color: "from-emerald-500 to-teal-500",
    accent: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
  },
  {
    mode: "project" as const,
    emoji: "🎯",
    icon: Target,
    title: "Strategic Blueprint",
    description: "Optimizes outlining complex objectives, timeline milestones, and tactical checklists.",
    color: "from-rose-500 to-pink-500",
    accent: "bg-rose-500/10 border-rose-500/30 text-rose-400"
  }
];

interface AttachedFileWithProgress extends AttachedFile {
  id?: string;
  progress?: number;
}

// Compact code copy block wrapper
const CodeBlock = memo(function CodeBlock({
  codeText,
  detectedLang,
  copiedCodeId,
  onCopy,
  isDark
}: {
  codeText: string;
  detectedLang: string;
  copiedCodeId: string | null;
  onCopy: (text: string) => void;
  isDark: boolean;
}) {
  const isCopied = copiedCodeId === codeText;
  return (
    <div className={`my-4 rounded-xl border overflow-hidden font-mono shadow-sm ${
      isDark ? "border-zinc-805 bg-zinc-950" : "border-zinc-200 bg-zinc-100"
    }`}>
      <div className={`flex items-center justify-between px-4 py-2 border-b text-[10px] font-mono select-none ${
        isDark ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-zinc-150 border-zinc-200 text-zinc-500"
      }`}>
        <span className="uppercase font-bold tracking-widest text-sky-500">{detectedLang}</span>
        <button
          type="button"
          onClick={() => onCopy(codeText)}
          className="flex items-center gap-1 hover:text-sky-500 transition-colors cursor-pointer p-0.5 rounded"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-bold">COPIED</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>COPY</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[12px] leading-relaxed font-mono max-h-96 select-text">
        <code className={isDark ? "text-zinc-250" : "text-zinc-800"}>{codeText}</code>
      </pre>
    </div>
  );
});

// Parser for Markdown components with tables
function parseAndRenderMarkdown(
  rawText: string,
  messageId: string,
  copiedCodeId: string | null,
  onCopy: (text: string) => void,
  isDark: boolean
) {
  if (!rawText) return null;
  const parts = rawText.split("```");
  
  return parts.map((part, index) => {
    const isCode = index % 2 === 1;
    if (isCode) {
      const lines = part.split("\n");
      const lang = lines[0].trim() || "typescript";
      const code = lines.slice(1).join("\n").trim();
      return (
        <CodeBlock
          key={`${messageId}_code_${index}`}
          codeText={code}
          detectedLang={lang}
          copiedCodeId={copiedCodeId}
          onCopy={onCopy}
          isDark={isDark}
        />
      );
    }

    // Paragraph formats
    const lines = part.split("\n");
    return (
      <div key={`${messageId}_text_${index}`} className="space-y-2 font-sans">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={lIdx} className="h-2" />;

          // Headers
          if (trimmed.startsWith("### ")) {
            return (
              <h4 key={lIdx} className={`text-xs font-bold uppercase tracking-wider font-mono pt-3 pb-0.5 ${
                isDark ? "text-white" : "text-zinc-900"
              }`}>
                {formatBoldText(trimmed.substring(4), isDark)}
              </h4>
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h3 key={lIdx} className={`text-sm font-bold tracking-tight pt-4 pb-1 border-b font-display ${
                isDark ? "text-white border-zinc-900" : "text-zinc-900 border-zinc-200"
              }`}>
                {formatBoldText(trimmed.substring(3), isDark)}
              </h3>
            );
          }
          if (trimmed.startsWith("# ")) {
            return (
              <h2 key={lIdx} className={`text-base font-bold tracking-tight pt-5 pb-1.5 border-b font-display ${
                isDark ? "text-white border-zinc-900" : "text-zinc-900 border-zinc-200"
              }`}>
                {formatBoldText(trimmed.substring(2), isDark)}
              </h2>
            );
          }

          // Bullet structures
          if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
            return (
              <div key={lIdx} className="flex items-start gap-2 pl-1 my-1">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-sky-505 shrink-0" />
                <span className={isDark ? "text-zinc-300" : "text-zinc-800"}>
                  {formatBoldText(trimmed.substring(2), isDark)}
                </span>
              </div>
            );
          }

          // Numbers list structures
          const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numberMatch) {
            const num = numberMatch[1];
            const textValue = numberMatch[2];
            return (
              <div key={lIdx} className="flex items-start gap-2 pl-1 my-1">
                <span className="font-mono text-xs text-sky-500 font-bold shrink-0">{num}.</span>
                <span className={isDark ? "text-zinc-300" : "text-zinc-800"}>
                  {formatBoldText(textValue, isDark)}
                </span>
              </div>
            );
          }

          return (
            <p key={lIdx} className={`text-sm leading-relaxed ${
              isDark ? "text-zinc-300" : "text-zinc-800"
            }`}>
              {formatBoldText(trimmed, isDark)}
            </p>
          );
        })}
      </div>
    );
  });
}

function formatBoldText(text: string, isDark: boolean) {
  const matches = [...text.matchAll(/\*\*(.*?)\*\*/g)];
  if (matches.length === 0) return text;
  
  const chunks: React.ReactNode[] = [];
  let lastIdx = 0;
  
  matches.forEach((match, index) => {
    const textIndex = match.index!;
    const placeholder = match[1];
    if (textIndex > lastIdx) {
      chunks.push(text.substring(lastIdx, textIndex));
    }
    chunks.push(
      <strong key={index} className={`font-semibold ${isDark ? "text-white" : "text-zinc-905"}`}>
        {placeholder}
      </strong>
    );
    lastIdx = textIndex + match[0].length;
  });

  if (lastIdx < text.length) {
    chunks.push(text.substring(lastIdx));
  }
  return chunks;
}

// Conversation-first minimalist bubble layout
const MessageBubble = memo(function MessageBubble({
  msg,
  isAssistant,
  playingSpeechId,
  speakResponse,
  copiedCodeId,
  copyTextToClipboard,
  userAvatarUrl,
  userDisplayName,
  isDark
}: {
  msg: Message;
  isAssistant: boolean;
  playingSpeechId: string | null;
  speakResponse: (id: string, text: string) => void;
  copiedCodeId: string | null;
  copyTextToClipboard: (text: string) => void;
  userAvatarUrl?: string;
  userDisplayName?: string;
  isDark: boolean;
}) {
  const isSpeaking = playingSpeechId === msg.id;

  return (
    <div className={`p-4 md:p-6 transition-colors border-b ${
      isAssistant 
        ? isDark ? "bg-zinc-900/10 border-zinc-900/60" : "bg-zinc-100/30 border-zinc-200/50"
        : "bg-transparent border-transparent"
    }`}>
      <div className="max-w-2xl mx-auto flex gap-4">
        
        {/* Profile Avatar elements */}
        {isAssistant ? (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-505 via-indigo-505 to-purple-605 flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="User Avatar" className="w-full h-full object-cover block" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-4 h-4 text-zinc-400 dark:text-zinc-650" />
            )}
          </div>
        )}

        {/* Content body mapping */}
        <div className="flex-1 min-w-0 space-y-2">
          
          <div className="flex items-center justify-between">
            <span className={`text-[12px] font-bold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
              {isAssistant ? "A-NOVA" : (userDisplayName || "Companion")}
            </span>
            <span className="text-[9px] text-zinc-400 font-mono">
              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
            </span>
          </div>

          {/* Render files attached in this specific history log */}
          {msg.attachedFiles && msg.attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 font-sans">
              {msg.attachedFiles.map((f, i) => (
                <div 
                  key={i} 
                  className={`border p-2 rounded-xl flex items-center gap-2.5 max-w-xs shadow-sm bg-zinc-100/50 dark:bg-zinc-900/40 ${
                    isDark ? "border-zinc-855" : "border-zinc-210"
                  }`}
                >
                  {f.type?.startsWith("image/") && f.dataUrl ? (
                    <img src={f.dataUrl} alt={f.name} className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <FileText className="w-4 h-4 text-sky-500" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-[10px] font-bold truncate ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>{f.name}</p>
                    <p className="text-[8px] text-zinc-450 font-mono tracking-wide">{(f.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Message Core Body parsed */}
          <div className="select-text pt-0.5">
            {isAssistant ? (
              parseAndRenderMarkdown(msg.content, msg.id, copiedCodeId, copyTextToClipboard, isDark)
            ) : (
              <p className={`whitespace-pre-wrap text-[14.5px] leading-relaxed font-sans ${
                isDark ? "text-zinc-100" : "text-zinc-900"
              }`}>{msg.content}</p>
            )}
          </div>

          {/* Voice Narrator controls */}
          {isAssistant && msg.content && (
            <div className="flex items-center gap-3 pt-2 text-[9px] uppercase font-mono tracking-wider">
              <button
                type="button"
                onClick={() => speakResponse(msg.id, msg.content)}
                className={`flex items-center gap-1.5 py-0.5 px-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-all cursor-pointer ${
                  isSpeaking ? "text-rose-505" : "text-zinc-400 hover:text-sky-500"
                }`}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-3 h-3 animate-pulse text-rose-500" />
                    <span className="font-bold text-rose-500">Mute Dictation</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3 text-zinc-405" />
                    <span>Read Aloud</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => copyTextToClipboard(msg.content)}
                className="flex items-center gap-1.5 py-0.5 px-2 text-zinc-400 hover:text-sky-500 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-all cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Body</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
});

const DEFAULT_PROMPTS_MAP = {
  general: [
    { text: "Brainstorm 5 innovative features for a wellness SaaS application", title: "SaaS Ideation" },
    { text: "Write an elegant outreach message to a strategic partnership manager", title: "Outreach Copy" },
    { text: "Explain blockchain decentralization ledger using simple analogies", title: "Explain Easy" }
  ],
  math: [
    { text: "Prove why the sum of two odd integers is always even with formal notation", title: "Integer Proof" },
    { text: "Help formulate the mathematical proof that primes are infinitely many", title: "Prime Infinitude" },
    { text: "Write the matrix calculation steps for a 2D affine coordinates rotation", title: "Affine rotation" }
  ],
 math_procodes: [
    { text: "Write a high-performance Python function to compute the Fibonacci sequence", title: "Fast Fibonacci" }
  ],
  coding: [
    { text: "Analyze a React custom hook for infinite states re-renders and leak risk", title: "React Audit" },
    { text: "Refactor a Python handler script to make it asynchronous with async/await", title: "Async Python" },
    { text: "Design a relational database ledger structure for a payment wallet", title: "Ledger Schema" }
  ],
  project: [
    { text: "Draft a 30-60-90 day strategic execution map for launching a SaaS alpha", title: "Launch Blueprint" },
    { text: "Detail a checklist of dependencies to safely migrate a database to Postgres", title: "DB Migration" },
    { text: "Describe a risk-mitigation framework when moving to microservice queues", title: "Risk Matrix" }
  ]
};

const ChatInterface = React.memo(function ChatInterface({
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

  // Layout menus
  const [modelDropdownActive, setModelDropdownActive] = useState(false);
  const [expandInputActive, setExpandInputActive] = useState(false);
  
  // Audio state
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recorderDuration, setRecorderDuration] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [speakingTextId, setSpeakingTextId] = useState<string | null>(null);

  // Camera screenshot state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [takenPhoto, setTakenPhoto] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);

  // HTML Element Refs
  const containerScrollerRef = useRef<HTMLDivElement | null>(null);
  const voiceSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const durationIntervalRef = useRef<any>(null);

  // File trigger references
  const mainFileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaInputRef = useRef<HTMLTextAreaElement | null>(null);

  const isDark = settings?.isDarkMode ?? true;

  const AVAILABLE_MODELS = [
    { id: "gemini-3.5-flash", name: "A-Nova Core (Fastest)", tag: "3.5 Flash", default: true },
    { id: "gemini-3.1-pro-preview", name: "Complexity Reasoner", tag: "3.1 Pro" },
    { id: "gemini-3.1-flash-lite", name: "Logical Standard", tag: "3.1 Lite" }
  ];

  const currentModelStr = settings?.defaultModel || "gemini-3.5-flash";
  const activeModelObj = AVAILABLE_MODELS.find(m => m.id === currentModelStr) || AVAILABLE_MODELS[0];

  useEffect(() => {
    if (typeof window !== "undefined") {
      voiceSynthesisRef.current = window.speechSynthesis;
    }
    return () => {
      stopSpeakingAction();
      cleanupCameraStream();
      cleanupRecorderStream();
    };
  }, []);

  // Autofit scrolling on message content updates
  useEffect(() => {
    if (containerScrollerRef.current) {
      containerScrollerRef.current.scrollTop = containerScrollerRef.current.scrollHeight;
    }
  }, [session?.messages, loading]);

  const cleanupCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
    }
    setCameraStream(null);
  };

  const cleanupRecorderStream = () => {
    if (recordingStream) {
      recordingStream.getTracks().forEach(t => t.stop());
    }
    setRecordingStream(null);
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
  };

  const processFilesAttachment = (files: File[]) => {
    const SUPPORTED_EXTENSIONS = [
      "pdf", "doc", "docx", "txt", "csv", "xlsx", 
      "png", "jpg", "jpeg", "webp", 
      "py", "js", "ts", "java", "cpp", "html", "css"
    ];

    files.forEach(async (file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (!SUPPORTED_EXTENSIONS.includes(ext) && !file.type.startsWith('image/')) {
        setValidationError(`Unsupported format '.${ext}'. Supports PDF, DOC/DOCX, XLSX, CSV, code files.`);
        setTimeout(() => setValidationError(null), 5000);
        return;
      }

      if (file.size > 4 * 1024 * 1024) {
        setValidationError("Files must be under 4MB limit format boundary.");
        setTimeout(() => setValidationError(null), 5000);
        return;
      }

      let fileType = file.type;
      if (ext === 'ts') {
        fileType = 'text/plain';
      } else if (['docx'].includes(ext)) {
        fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (['xlsx'].includes(ext)) {
        fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (!fileType) {
        fileType = 'text/plain';
      }

      const uniqueId = "at_" + Math.random().toString(36).substring(2, 8);
      const newFile: AttachedFileWithProgress = {
        id: uniqueId,
        name: file.name,
        type: fileType,
        size: file.size,
        dataUrl: "",
        progress: 10
      };

      setAttachedFiles(prev => [...prev, newFile]);

      // Progress Simulation
      let curPrg = 10;
      const intrv = setInterval(() => {
        curPrg += 15;
        if (curPrg >= 90) curPrg = 90;
        setAttachedFiles(prev => prev.map(f => {
          if (f.id === uniqueId) return { ...f, progress: curPrg };
          return f;
        }));
      }, 50);

      try {
        let extractedText = "";
        if (!fileType.startsWith('image/') && fileType !== 'application/pdf') {
          extractedText = await extractTextFromFile(file);
        }

        const dataUrl = await new Promise<string>((resVal) => {
          const reader = new FileReader();
          reader.onload = () => resVal(reader.result as string);
          reader.onerror = () => resVal("");
          reader.readAsDataURL(file);
        });

        clearInterval(intrv);
        setAttachedFiles(prev => prev.map(f => {
          if (f.id === uniqueId) {
            return { ...f, dataUrl, text: extractedText, progress: 100 };
          }
          return f;
        }));
      } catch (err) {
        clearInterval(intrv);
        setValidationError(`Failed to read file ${file.name}`);
        setAttachedFiles(prev => prev.filter(f => f.id !== uniqueId));
      }
    });
  };

  // Osm based Address reversed geocoding Location Locker
  const triggerLocationGeocode = () => {
    if (!navigator.geolocation) {
      alert("GPS tracker is not supported by this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let finalReadableAddress = "Coordinates Locked";

        try {
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { "User-Agent": "A-Nova-2026-Platform" }
          });
          if (resp.ok) {
            const geocodeObj = await resp.json();
            if (geocodeObj && geocodeObj.display_name) {
              finalReadableAddress = geocodeObj.display_name;
            }
          }
        } catch (_) {}

        setInputText(prev => prev + (prev ? "\n" : "") + 
          `📍 Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}\n- Address: ${finalReadableAddress}`
        );
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        alert(`Location lock failed: ${err.message}`);
      }
    );
  };

  // Screenshot routines
  const openCameraHandler = async () => {
    setCameraOpen(true);
    setTakenPhoto(null);
    setCameraError(null);
    cleanupCameraStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (e: any) {
      setCameraError("Camera access rejected.");
    }
  };

  const captureFrameScreenshot = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setTakenPhoto(canvas.toDataURL("image/jpeg"));
      }
    } catch (_) {}
  };

  const useSnappedScreenshot = () => {
    if (!takenPhoto) return;
    const mockFile: AttachedFileWithProgress = {
      id: "raw_cam_" + Math.random().toString(36).substring(2, 6),
      name: `Snapshot_${Date.now()}.jpg`,
      type: "image/jpeg",
      size: Math.round(takenPhoto.length * 0.75),
      dataUrl: takenPhoto,
      progress: 100
    };
    setAttachedFiles(prev => [...prev, mockFile]);
    cleanupCameraStream();
    setCameraOpen(false);
  };

  // Audio recording handlers
  const openAudioRecorder = async () => {
    setRecorderOpen(true);
    setRecorderDuration(0);
    setAudioChunks([]);
    setRecordingError(null);
    cleanupRecorderStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
      
      const media = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      media.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      
      media.onstop = () => setAudioChunks(chunks);
      media.start(250);
      setMediaRecorder(media);

      durationIntervalRef.current = setInterval(() => {
        setRecorderDuration(p => p + 1);
      }, 1000);
    } catch (e) {
      setRecordingError("Microphone input activation failed.");
    }
  };

  const saveCapturedVoiceBlob = () => {
    if (!mediaRecorder) return;
    if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);

    setTimeout(() => {
      const voiceBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      if (voiceBlob.size === 0) {
        setRecorderOpen(false);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const fileId = "audio_v_" + Math.random().toString(36).substring(2, 6);
        setAttachedFiles(prev => [...prev, {
          id: fileId,
          name: `VoiceNote_${Date.now()}.webm`,
          type: mediaRecorder.mimeType || "audio/webm",
          size: voiceBlob.size,
          dataUrl: reader.result as string,
          progress: 100
        }]);
        setRecorderOpen(false);
      };
      reader.readAsDataURL(voiceBlob);
    }, 100);
  };

  const stopSpeakingAction = useCallback(() => {
    if (voiceSynthesisRef.current) voiceSynthesisRef.current.cancel();
    setSpeakingTextId(null);
  }, []);

  const handleToggleVocalSpeech = useCallback((msgId: string, plainText: string) => {
    if (!voiceSynthesisRef.current) return;
    if (speakingTextId === msgId) {
      stopSpeakingAction();
      return;
    }
    stopSpeakingAction();

    const textToSpeakInput = plainText
      .replace(/```[\s\S]*?```/g, "[code block]")
      .replace(/[*_#`~-]/g, "")
      .slice(0, 300);

    try {
      const vocalUtterance = new SpeechSynthesisUtterance(textToSpeakInput);
      vocalUtterance.onend = () => setSpeakingTextId(null);
      vocalUtterance.onerror = () => setSpeakingTextId(null);
      setSpeakingTextId(msgId);
      voiceSynthesisRef.current.speak(vocalUtterance);
    } catch (_) {
      setSpeakingTextId(null);
    }
  }, [speakingTextId, stopSpeakingAction]);

  const toggleSpeechInput = () => {
    if (typeof window === "undefined") return;
    const SpeechComp = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechComp) {
      alert("Speech recognition API is unavailable in this browser.");
      return;
    }

    if (isListening) {
      if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechComp();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (ev: any) => {
        const textVal = ev.results[0][0].transcript;
        if (textVal) {
          setInputText(prev => prev + (prev ? " " : "") + textVal);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (_) {
      setIsListening(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFilesAttachment(Array.from(e.target.files));
    }
  };

  const copyCodeAction = useCallback((textCode: string) => {
    navigator.clipboard.writeText(textCode);
    setCopiedCodeId(textCode);
    setTimeout(() => setCopiedCodeId(null), 2000);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!loading) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (loading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFilesAttachment(Array.from(e.dataTransfer.files));
    }
  };

  const submitSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    const isAttachmentUploading = attachedFiles.some(f => (f.progress ?? 100) < 100);
    if (isAttachmentUploading) return;

    const payloadText = inputText.trim();
    if (!payloadText && attachedFiles.length === 0) return;

    setInputText("");
    const attachmentsCopy = [...attachedFiles];
    setAttachedFiles([]);
    
    await onSendMessage(payloadText, attachmentsCopy);
  };

  // Choose prompts pre-fills
  const handleSelectPreset = (modeId: 'general' | 'math' | 'coding' | 'project') => {
    if (session && onSetChatMode) {
      onSetChatMode(session.id, modeId);
    }
  };

  const sessionMode = session?.mode || "general";
  const activePreset = MODE_PRESETS.find(p => p.mode === sessionMode) || MODE_PRESETS[0];

  return (
    <div 
      id="chat_workspace_pane"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col h-screen relative transition-colors duration-300 ${
        isDark ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900"
      }`}
    >
      {/* File dragging blur overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-sky-500/10 backdrop-blur-xs flex flex-col items-center justify-center border-2 border-dashed border-sky-500 z-50">
          <Paperclip className="w-12 h-12 text-sky-505 animate-bounce mb-3" />
          <p className="text-sm font-bold text-sky-550 dark:text-sky-400 font-display">Drop files directly to index</p>
          <p className="text-xs text-zinc-400 mt-1">PDF, Document spreadsheets, pictures or source-code files</p>
        </div>
      )}

      {/* Modern Compact Header */}
      <header className={`h-15 flex items-center justify-between px-4 border-b shrink-0 ${
        isDark ? "bg-zinc-950/80 border-zinc-900" : "bg-white/80 border-zinc-200"
      }`}>
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              id="sidebar_toggle_mobile"
              type="button"
              onClick={onToggleSidebar}
              className={`p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer ${
                isDark ? "text-zinc-400 hover:text-white" : "text-zinc-550 hover:text-zinc-900"
              }`}
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Core mode status indicators */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold select-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 tracking-wide font-display">
              <span>{activePreset.emoji}</span>
              <span className={isDark ? "text-zinc-200" : "text-zinc-800"}>{activePreset.title}</span>
            </span>
            
            {/* Quick Mode Preset Toggles */}
            <div className="hidden sm:flex items-center gap-1">
              {MODE_PRESETS.map((it) => (
                <button
                  key={it.mode}
                  type="button"
                  onClick={() => handleSelectPreset(it.mode)}
                  className={`p-1.5 rounded-lg transition-all text-xs cursor-pointer ${
                    sessionMode === it.mode
                      ? isDark ? "text-sky-400 bg-sky-500/10" : "text-sky-600 bg-sky-500/10"
                      : "text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200"
                  }`}
                  title={it.title}
                >
                  <it.icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected LLM Model controller */}
        <div className="flex items-center gap-2 relative">
          <button
            id="btn_model_dropdown"
            type="button"
            onClick={() => setModelDropdownActive(!modelDropdownActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold tracking-wide transition-all select-none cursor-pointer ${
              isDark 
                ? "bg-zinc-900/60 border-zinc-850 text-zinc-350 hover:text-white hover:border-zinc-700" 
                : "bg-zinc-100 border-zinc-220 text-zinc-700 hover:text-zinc-950 hover:border-zinc-300"
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-sky-505" />
            <span>{activeModelObj.tag}</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${modelDropdownActive ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {modelDropdownActive && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className={`absolute right-0 top-full mt-1 w-56 rounded-xl border shadow-xl z-50 p-1.5 ${
                  isDark ? "bg-zinc-950 border-zinc-850" : "bg-white border-zinc-200"
                }`}
              >
                <div className="text-[9px] font-bold text-zinc-405 font-mono uppercase px-2 py-1 select-none">
                  AI Orchestrator Modals
                </div>
                {AVAILABLE_MODELS.map(model => {
                  const isCurrent = currentModelStr === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        onSelectModel(model.id);
                        setModelDropdownActive(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? isDark ? "bg-zinc-900 text-sky-400 font-medium" : "bg-zinc-100 text-sky-600 font-medium"
                          : isDark ? "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                      }`}
                    >
                      <span className="truncate">{model.name}</span>
                      {isCurrent && <Check className="w-3 h-3 text-sky-505" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Conversational Container */}
      <div 
        ref={containerScrollerRef}
        className="flex-1 overflow-y-auto selection:bg-sky-500/20"
      >
        {!session || !session.messages || session.messages.length === 0 ? (
          /* Stately Welcome Empty State */
          <div className="max-w-xl mx-auto px-4 py-16 md:py-24 flex flex-col items-center justify-center text-center space-y-6 select-none h-full">
            <div className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-555 via-indigo-605 to-purple-655 shadow-sm">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>

            <div className="space-y-2">
              <h1 className={`text-2xl md:text-3xl font-extrabold font-display tracking-tight leading-tight ${
                isDark ? "text-white" : "text-zinc-900"
              }`}>
                How can I help today?
              </h1>
              <p className="text-zinc-400 text-xs max-w-sm mx-auto leading-relaxed">
                Ask questions, solve problems, write code, analyze files, or start a project.
              </p>
            </div>

            {!session && (
              <div className="pt-2 animate-pulse">
                <span className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 text-[10px] font-mono">
                  ⚠️ Select or create "+ New chat" in sidebar to activate
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Active Conversational Feed */
          <div className="w-full py-4">
            {(session.messages || []).map((msg) => {
              const isAssistant = msg.role === "assistant";
              return (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isAssistant={isAssistant}
                  playingSpeechId={speakingTextId}
                  speakResponse={handleToggleVocalSpeech}
                  copiedCodeId={copiedCodeId}
                  copyTextToClipboard={copyCodeAction}
                  userAvatarUrl={user?.avatarUrl}
                  userDisplayName={user?.displayName || user?.username || user?.email}
                  isDark={isDark}
                />
              );
            })}

            {/* Responsive thought/pulsing loader */}
            {loading && (
              <div className={`p-4 md:p-6 border-b ${
                isDark ? "bg-zinc-900/5 border-zinc-900/40" : "bg-zinc-50/10 border-zinc-150/40"
              }`}>
                <div className="max-w-2xl mx-auto flex gap-4 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-900 border dark:border-zinc-800 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-sky-500 animate-spin" />
                  </div>
                  <div className="flex-1 space-y-1 pt-1.5">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 tracking-widest uppercase font-mono">
                      <Loader2 className="w-3 h-3 animate-spin text-sky-505" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unified Input area */}
      <footer className={`p-4 border-t shrink-0 ${
        isDark ? "bg-zinc-950/40 border-zinc-900" : "bg-zinc-50/30 border-zinc-150"
      }`}>
        <div className="max-w-2xl mx-auto space-y-3">
          
          {/* Active file index list */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 py-1 max-h-32 overflow-y-auto">
              {attachedFiles.map((f, i) => {
                const isImg = f.type?.startsWith("image/") && f.dataUrl;
                const isUploading = (f.progress ?? 100) < 100;

                return (
                  <div 
                    key={f.id || i}
                    className={`relative p-1.5 pr-8 rounded-xl border flex items-center gap-2 max-w-xs shrink-0 bg-white dark:bg-zinc-900 shadow-sm ${
                      isDark ? "border-zinc-800 text-zinc-300" : "border-zinc-200 text-zinc-800"
                    }`}
                  >
                    {isImg ? (
                      <div className="w-7 h-7 rounded overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800">
                        <img src={f.dataUrl} alt="Preview thumbnail" className="w-full h-full object-cover block" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 bg-sky-500/10 text-sky-505 rounded flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold truncate">{f.name}</p>
                      {isUploading ? (
                        <p className="text-[8px] font-mono text-sky-550 animate-pulse"> indexing {f.progress}%</p>
                      ) : (
                        <p className="text-[8px] text-zinc-450 font-mono font-semibold uppercase">{(f.size / 1024).toFixed(1)} KB</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-1 leading-none top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-red-500/10 text-zinc-400 hover:text-red-500 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Validation warnings */}
          {validationError && (
            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-[11px] font-semibold rounded-xl font-mono">
              <Info className="w-3.5 h-3.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Dynamic Expandable text area input bar */}
          <form 
            onSubmit={submitSendMessage}
            className={`relative rounded-2xl border transition-all ${
              isDark 
                ? "bg-zinc-900/60 border-zinc-850 focus-within:border-zinc-700 focus-within:bg-zinc-900" 
                : "bg-white border-zinc-200 focus-within:border-zinc-300 focus-within:bg-zinc-50/50"
            }`}
          >
            <textarea
              ref={textareaInputRef}
              rows={expandInputActive || inputText.split("\n").length > 2 ? 6 : 1}
              placeholder={session ? "Message A-NOVA..." : "Select or create new chat to message..."}
              disabled={!session || loading}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitSendMessage(e);
                }
              }}
              className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none placeholder-zinc-450 dark:placeholder-zinc-500 font-sans resize-none block"
            />

            {/* Inputs controls panel bar */}
            <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-transparent dark:border-transparent">
              <div className="flex items-center gap-1.5">
                
                {/* 1. Add File Index buttons */}
                <button
                  type="button"
                  disabled={!session || loading}
                  onClick={() => mainFileInputRef.current?.click()}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-550 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                  title="Attach file"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={mainFileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* 2. Audio Voice Notes record */}
                <button
                  type="button"
                  disabled={!session || loading}
                  onClick={openAudioRecorder}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-550 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                  title="Record audio snippet"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>

                {/* 3. Dictate Speech to Text */}
                <button
                  type="button"
                  disabled={!session || loading}
                  onClick={toggleSpeechInput}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isListening 
                      ? "text-rose-500 bg-rose-500/10" 
                      : isDark ? "text-zinc-405 hover:text-white hover:bg-zinc-800" : "text-zinc-550 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                  title="Dictate voice script"
                >
                  <Mic className="w-3.5 h-3.5 shrink-0" />
                </button>

                {/* 4. Snap Photo screenshot */}
                <button
                  type="button"
                  disabled={!session || loading}
                  onClick={openCameraHandler}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-550 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                  title="Snap photo layout"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>

                {/* 5. Geolocation coords reverase */}
                <button
                  type="button"
                  disabled={!session || loading || locating}
                  onClick={triggerLocationGeocode}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    locating
                      ? "text-sky-505 animate-pulse"
                      : isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-550 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                  title="Attach localized coordinate address details"
                >
                  <MapPin className="w-3.5 h-3.5" />
                </button>

                {/* 6. Toggle vertical row size textarea */}
                <button
                  type="button"
                  disabled={!session || loading}
                  onClick={() => setExpandInputActive(!expandInputActive)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer hidden sm:block ${
                    expandInputActive 
                      ? "text-sky-500 bg-sky-500/10" 
                      : isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-550 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                  title="Expand script size row"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action Submit messaging indicator buttons */}
              <button
                type="submit"
                disabled={!session || loading || (!inputText.trim() && attachedFiles.length === 0)}
                className={`p-2 rounded-xl flex items-center justify-center transition-all scroll-smooth select-none ${
                  (!inputText.trim() && attachedFiles.length === 0) || loading || !session
                    ? "text-zinc-400 bg-transparent block"
                    : "bg-sky-505 dark:bg-sky-550 hover:opacity-95 text-white shadow-xs scale-100 hover:scale-[1.02] cursor-pointer"
                }`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </div>
          </form>

          {/* SaaS privacy indicator */}
          <div className="text-center">
            <span className="text-[10px] text-zinc-405 dark:text-zinc-550 font-mono tracking-wide leading-none select-none">
              A-Nova utilizes Gemini models & encrypted cloud storage workspace
            </span>
          </div>

        </div>
      </footer>

      {/* Floating Photo snapping popup dashboard */}
      <AnimatePresence>
        {cameraOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs z-999 animate-fade-in text-white select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-3xl p-5 border shadow-2xl relative ${
                isDark ? "bg-zinc-950 border-zinc-850" : "bg-white border-zinc-205 text-zinc-800"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  cleanupCameraStream();
                  setCameraOpen(false);
                }}
                className="absolute right-4 top-4 p-1 rounded-full text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-sm font-bold font-display mb-3">Snapshot camera frame</h3>

              {cameraError ? (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-550/20 text-red-500 text-xs font-semibold font-mono">
                  {cameraError}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-2xl bg-black border overflow-hidden">
                    {!takenPhoto ? (
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img 
                        src={takenPhoto} 
                        alt="Snapped result preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>

                  <div className="flex justify-end gap-2 text-xs">
                    {!takenPhoto ? (
                      <button
                        type="button"
                        onClick={captureFrameScreenshot}
                        className="py-1.5 px-3 bg-sky-505 dark:bg-sky-550 text-white font-semibold rounded-xl flex items-center gap-1.5 hover:opacity-95 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Take Picture</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setTakenPhoto(null)}
                          className={`py-1.5 px-3 font-semibold rounded-xl cursor-pointer ${
                            isDark ? "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800" : "bg-zinc-100 hover:bg-zinc-200"
                          }`}
                        >
                          Retake
                        </button>
                        <button
                          type="button"
                          onClick={useSnappedScreenshot}
                          className="py-1.5 px-3 bg-emerald-505 text-white font-semibold rounded-xl flex items-center gap-1 cursor-pointer hover:opacity-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Use photo</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Voice Note capture recorder popup modal */}
        {recorderOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs z-999 animate-fade-in text-white select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl relative ${
                isDark ? "bg-zinc-950 border-zinc-850" : "bg-white border-zinc-205 text-zinc-800"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  cleanupRecorderStream();
                  setRecorderOpen(false);
                }}
                className="absolute right-4 top-4 p-1 rounded-full text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-sm font-bold font-display mb-3">Record voice note</h3>

              {recordingError ? (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-550/20 text-red-500 text-xs font-semibold font-mono">
                  {recordingError}
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="p-6 rounded-2xl bg-zinc-900/40 dark:bg-zinc-900/20 flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center animate-pulse">
                      <Mic className="w-6 h-6 text-rose-500" />
                    </div>
                    <p className="text-sm font-bold font-mono tracking-widest text-[#E11D48]">
                      {Math.floor(recorderDuration / 60)}:{(recorderDuration % 60).toString().padStart(2, "0")}
                    </p>
                    <p className="text-[10px] text-zinc-400">Capturing frequency stream...</p>
                  </div>

                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        cleanupRecorderStream();
                        setRecorderOpen(false);
                      }}
                      className={`py-1.5 px-3 font-semibold rounded-xl cursor-pointer ${
                        isDark ? "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800" : "bg-zinc-100 hover:bg-zinc-200"
                      }`}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={saveCapturedVoiceBlob}
                      className="py-1.5 px-3 bg-rose-550 hover:bg-rose-500 text-white font-semibold rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Note</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default ChatInterface;
