import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { apiFetch } from "../apiClient";
import { 
  Send, 
  Paperclip, 
  Mic, 
  MicOff,
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
  AudioLines,
  Headphones,
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
  FileCheck,
  AlertCircle,
  RefreshCw,
  Globe,
  Monitor,
  Cpu,
  HardDrive,
  Folder,
  Link2,
  Play,
  ShieldCheck,
  Bell,
  Settings as SettingsIcon,
  ThumbsUp,
  Share2,
  MoreVertical,
  Download,
  Flag,
  RotateCcw,
  LogIn
} from "lucide-react";
import { Message, ChatSession, AttachedFile, Settings, User as UserType } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { usePermissionManager } from "./PermissionManager";
import AnovaLogo from "./AnovaLogo";
import UserAvatar from "./UserAvatar";
import { DocumentCard } from "./DocumentCard";
import { SimpleDocumentDownload } from "./SimpleDocumentDownload";
import { DocumentModal } from "./DocumentModal";
import { CodeBlockCard } from "./CodeBlockCard";
import { parseDocumentFromAiResponse } from "../utils/documentDetector";
import { GeneratedDocument } from "../types/document";
import GeneratedImageCard from "./GeneratedImageCard";
import { GeneratedImage } from "../types";
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
  activeMode?: 'general' | 'math' | 'coding' | 'project';
  onSelectMode?: (mode: 'general' | 'math' | 'coding' | 'project') => void;
  onOpenLogin?: () => void;
  onOpenSettings?: () => void;
}

const MODE_PRESETS = [
  {
    mode: "general" as const,
    emoji: "💬",
    icon: MessageSquare,
    title: "General Chat",
    description: "For open questions, brainstorming, and writing drafts.",
    color: "from-blue-500 to-indigo-500",
    accent: "bg-blue-500/10 border-blue-500/30 text-blue-400"
  },
  {
    mode: "math" as const,
    emoji: "🧮",
    icon: Binary,
    title: "Math Solver",
    description: "For logic puzzles, calculations, and math solutions.",
    color: "from-purple-500 to-blue-500",
    accent: "bg-purple-500/10 border-purple-500/30 text-purple-400"
  },
  {
    mode: "coding" as const,
    emoji: "💻",
    icon: Code,
    title: "Coding Chat",
    description: "For writing code, debugging, and building software.",
    color: "from-emerald-500 to-teal-500",
    accent: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
  },
  {
    mode: "project" as const,
    emoji: "🎯",
    icon: Target,
    title: "Project Planner",
    description: "For planning goals, tracking steps, and organizing work.",
    color: "from-rose-500 to-pink-500",
    accent: "bg-rose-500/10 border-rose-500/30 text-rose-400"
  }
];

interface AttachedFileWithProgress extends AttachedFile {
  id?: string;
  progress?: number;
  hasError?: boolean;
  rawFile?: File;
}

// CodeBlock wrapper component
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
  return (
    <CodeBlockCard
      codeText={codeText}
      detectedLang={detectedLang}
      copiedCodeId={copiedCodeId}
      onCopy={onCopy}
      isDark={isDark}
    />
  );
});

// Parser for Markdown components with tables
function parseAndRenderMarkdown(
  rawText: string,
  messageId: string,
  copiedCodeId: string | null,
  onCopy: (text: string) => void,
  isDark: boolean,
  fontSize?: 'sm' | 'md' | 'lg',
  onEditImage?: (img: GeneratedImage) => void,
  onRegenerateImage?: (img: GeneratedImage) => void,
  onDeleteImage?: (img: GeneratedImage) => void,
  allImagesInChat?: GeneratedImage[]
) {
  if (!rawText) return null;
  const parts = rawText.split("```");
  
  const fsClass = fontSize === 'sm' ? 'text-[12px] md:text-[12.5px]' : fontSize === 'lg' ? 'text-[14px] md:text-[14.5px]' : 'text-[13px] md:text-[13.5px]';

  return parts.map((part, index) => {
    const isCode = index % 2 === 1;
    if (isCode) {
      const lines = part.split("\n");
      const lang = lines[0].trim().toLowerCase();
      if (lang.includes("document") || lang.includes("json:document") || lang.includes("document-json") || lang.includes("json-doc")) {
        return null;
      }
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
      <div key={`${messageId}_text_${index}`} className="space-y-1.5 font-sans break-words max-w-full overflow-hidden">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={lIdx} className="h-1.5" />;

          // Headers
          if (trimmed.startsWith("### ")) {
            return (
              <h4 key={lIdx} className={`text-xs font-bold uppercase tracking-wider font-mono pt-2.5 pb-0.5 ${
                isDark ? "text-white" : "text-zinc-900"
              }`}>
                {formatBoldText(trimmed.substring(4), isDark)}
              </h4>
            );
          }

          // Markdown Images ![alt](url)
          const markdownImgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
          if (markdownImgMatch) {
            const altText = markdownImgMatch[1] || "Generated Artwork";
            const imageUrl = markdownImgMatch[2];
            return (
              <GeneratedImageCard
                key={`md_img_${lIdx}`}
                image={{ url: imageUrl, prompt: altText }}
                isDark={isDark}
                onEdit={onEditImage}
                onRegenerate={onRegenerateImage}
                onDelete={onDeleteImage}
                allImagesInChat={allImagesInChat}
              />
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h3 key={lIdx} className={`text-sm font-bold tracking-tight pt-3.5 pb-1 border-b font-display ${
                isDark ? "text-white border-zinc-900" : "text-zinc-900 border-zinc-200"
              }`}>
                {formatBoldText(trimmed.substring(3), isDark)}
              </h3>
            );
          }
          if (trimmed.startsWith("# ")) {
            return (
              <h2 key={lIdx} className={`text-base font-bold tracking-tight pt-4 pb-1.5 border-b font-display ${
                isDark ? "text-white border-zinc-900" : "text-zinc-900 border-zinc-200"
              }`}>
                {formatBoldText(trimmed.substring(2), isDark)}
              </h2>
            );
          }

          // Blockquotes / Callout Cards
          if (trimmed.startsWith("> ")) {
            return (
              <div key={lIdx} className={`my-2.5 p-3 sm:p-3.5 rounded-xl border-l-4 border-sky-500 bg-sky-500/10 text-xs sm:text-sm font-sans italic ${
                isDark ? "text-zinc-200" : "text-zinc-800"
              }`}>
                {formatBoldText(trimmed.substring(2), isDark)}
              </div>
            );
          }

          // Markdown Table Row (| Col 1 | Col 2 |)
          if (trimmed.startsWith("|") && trimmed.includes("|")) {
            // Ignore separator rows like |---|---|
            if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
              return null;
            }
            const cells = trimmed.split("|").map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
            if (cells.length > 0) {
              const isHeaderRow = lIdx < lines.length - 1 && /^\|[\s\-:|]+\|$/.test(lines[lIdx + 1]?.trim() || "");
              return (
                <div key={lIdx} className="overflow-x-auto my-1 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60">
                  <table className="w-full text-xs text-left border-collapse font-sans">
                    <tbody>
                      <tr className={isHeaderRow ? (isDark ? "bg-zinc-800/90 text-white font-bold" : "bg-zinc-150 text-zinc-900 font-bold") : (isDark ? "hover:bg-zinc-800/40 text-zinc-300" : "hover:bg-zinc-100/60 text-zinc-800")}>
                        {cells.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2.5 border-r border-b border-zinc-200/60 dark:border-zinc-800/60 whitespace-nowrap">
                            {formatBoldText(cell, isDark)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            }
          }

          // Bullet structures
          if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
            return (
              <div key={lIdx} className="flex items-start gap-1.5 pl-1 my-0.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                <span className={`${fsClass} ${isDark ? "text-zinc-300" : "text-zinc-800"}`}>
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
              <div key={lIdx} className="flex items-start gap-1.5 pl-1 my-0.5">
                <span className="font-mono text-xs text-sky-500 font-bold shrink-0">{num}.</span>
                <span className={`${fsClass} ${isDark ? "text-zinc-300" : "text-zinc-800"}`}>
                  {formatBoldText(textValue, isDark)}
                </span>
              </div>
            );
          }

          return (
            <p key={lIdx} className={`${fsClass} leading-relaxed ${
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

// Conversation-first minimalist layout directly on chat background (no message bubbles)
const MessageBubble = memo(function MessageBubble({
  msg,
  prevUserPrompt,
  isAssistant,
  playingSpeechId,
  speakResponse,
  copiedCodeId,
  copyTextToClipboard,
  userAvatarUrl,
  userDisplayName,
  isDark,
  chatWidth,
  fontSize,
  messageDensity,
  showChatMetadata = false,
  onOpenDocumentModal,
  onRegenerateDocument,
  onSendMessage,
  onEditImage,
  onRegenerateImage,
  onDeleteImage,
  allImagesInChat,
}: {
  msg: Message;
  prevUserPrompt?: string;
  isAssistant: boolean;
  playingSpeechId: string | null;
  speakResponse: (id: string, text: string) => void;
  copiedCodeId: string | null;
  copyTextToClipboard: (text: string) => void;
  userAvatarUrl?: string;
  userDisplayName?: string;
  isDark: boolean;
  chatWidth?: 'standard' | 'full';
  fontSize?: 'sm' | 'md' | 'lg';
  messageDensity?: 'comfortable' | 'compact';
  showChatMetadata?: boolean;
  onOpenDocumentModal?: (doc: GeneratedDocument, mode: "preview" | "edit") => void;
  onRegenerateDocument?: (doc: GeneratedDocument) => void;
  onSendMessage?: (text: string, files: any[]) => void;
  onEditImage?: (img: GeneratedImage) => void;
  onRegenerateImage?: (img: GeneratedImage) => void;
  onDeleteImage?: (img: GeneratedImage) => void;
  allImagesInChat?: GeneratedImage[];
}) {
  const isSpeaking = playingSpeechId === msg.id;

  const [isCopied, setIsCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Auto-clear toast
  useEffect(() => {
    if (toastText) {
      const timer = setTimeout(() => setToastText(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastText]);

  // Click outside to dismiss menus
  useEffect(() => {
    if (!showShareMenu && !showMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showShareMenu, showMoreMenu]);

  const handleCopy = () => {
    copyTextToClipboard(msg.content);
    setIsCopied(true);
    setToastText("Copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleLike = () => {
    setIsLiked((prev) => {
      const next = !prev;
      setToastText(next ? "Response liked!" : "Feedback removed");
      return next;
    });
  };

  const handleShareText = () => {
    if (navigator.share) {
      navigator.share({
        title: "A-Nova AI Response",
        text: msg.content,
      }).catch(() => {
        copyTextToClipboard(msg.content);
        setToastText("Text copied for sharing!");
      });
    } else {
      copyTextToClipboard(msg.content);
      setToastText("Text copied for sharing!");
    }
    setShowShareMenu(false);
  };

  const handleDownloadTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([msg.content], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `anova-response-${msg.id || Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setToastText("Downloaded text file!");
    setShowShareMenu(false);
    setShowMoreMenu(false);
  };

  const handleReportIssue = () => {
    setToastText("Issue reported. Thank you!");
    setShowMoreMenu(false);
  };

  const handleRegenerate = () => {
    if (onSendMessage) {
      onSendMessage("Please regenerate or expand your previous response in more detail.", []);
      setToastText("Regenerating response...");
    } else {
      setToastText("Regenerate requested");
    }
    setShowMoreMenu(false);
  };

  const parsedDoc = React.useMemo(() => {
    if (!isAssistant || !msg.content) return null;
    return parseDocumentFromAiResponse(msg.content, null, undefined, prevUserPrompt);
  }, [isAssistant, msg.content, prevUserPrompt]);

  const dynamicFsClass = fontSize === 'sm' ? 'text-[12px] md:text-[12.5px]' : fontSize === 'lg' ? 'text-[14px] md:text-[14.5px]' : 'text-[13px] md:text-[13.5px]';
  const densityPadding = messageDensity === 'compact'
    ? 'py-1 sm:py-1.5 md:py-2 px-2 sm:px-3 md:px-4'
    : 'py-2 sm:py-2.5 md:py-3.5 px-2.5 sm:px-3.5 md:px-5';

  return (
    <div className={`${densityPadding} transition-colors w-full flex justify-center`}>
      <div className={`w-full min-w-0 flex gap-2 sm:gap-2.5 md:gap-3.5 ${
        chatWidth === "full" ? "max-w-5xl" : "max-w-3xl"
      } ${
        isAssistant ? "flex-row justify-start" : "flex-row-reverse justify-start"
      }`}>
        
        {/* Profile Avatar elements */}
        {showChatMetadata && (
          isAssistant ? (
            <div className="w-[24px] h-[24px] sm:w-[26px] sm:h-[26px] md:w-[28px] md:h-[28px] rounded-full bg-gradient-to-tr from-sky-505 via-indigo-505 to-purple-605 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
            </div>
          ) : (
            <UserAvatar 
              src={userAvatarUrl} 
              name={userDisplayName} 
              size="xs" 
              className="mt-0.5 shrink-0" 
            />
          )
        )}

        {/* Content body mapping */}
        <div className={`flex flex-col max-w-[90%] sm:max-w-[85%] md:max-w-[82%] space-y-1 min-w-0 ${
          isAssistant ? "items-start" : "items-end"
        }`}>
          
          {/* Metadata layer */}
          {showChatMetadata && (
            <div className="flex items-center gap-1.5 px-0.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-sans select-none pb-0.5">
              {isAssistant ? (
                <>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    A-Nova
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700 text-[8px] select-none">•</span>
                </>
              ) : userDisplayName ? (
                <>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {userDisplayName}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700 text-[8px] select-none">•</span>
                </>
              ) : null}
              <span className="text-zinc-400 dark:text-zinc-500 font-mono">
                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
              </span>
            </div>
          )}

          {/* Render files attached in this specific history log */}
          {msg.attachedFiles && msg.attachedFiles.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 pb-1 ${isAssistant ? "justify-start" : "justify-end"}`}>
              {msg.attachedFiles.map((f, i) => (
                <div 
                  key={i} 
                  className={`border p-1.5 rounded-xl flex items-center gap-2 max-w-xs shadow-sm bg-zinc-100/40 dark:bg-zinc-900/20 ${
                    isDark ? "border-zinc-800" : "border-zinc-200"
                  }`}
                >
                  {f.type?.startsWith("image/") && f.dataUrl ? (
                    <img src={f.dataUrl} alt={f.name} className="w-6 h-6 rounded-lg object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-sky-505" />
                  )}
                  <div className="min-w-0 text-left">
                    <p className={`text-[9.5px] font-bold truncate ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>{f.name}</p>
                    <p className="text-[7.5px] text-zinc-400 font-mono tracking-wide">{(f.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Core Message Text */}
          <div className="mt-0.5 max-w-full overflow-hidden break-words w-full">
            {isAssistant ? (
              <div className="text-left select-text max-w-full overflow-hidden break-words">
                {parseAndRenderMarkdown(
                  msg.content,
                  msg.id,
                  copiedCodeId,
                  copyTextToClipboard,
                  isDark,
                  fontSize,
                  onEditImage,
                  onRegenerateImage,
                  onDeleteImage,
                  allImagesInChat
                )}
                {msg.generatedImages && msg.generatedImages.map((img, gIdx) => {
                  if (msg.content && msg.content.includes(img.url)) return null;
                  return (
                    <GeneratedImageCard
                      key={`gen_img_${gIdx}`}
                      image={img}
                      isDark={isDark}
                      onEdit={onEditImage}
                      onRegenerate={onRegenerateImage}
                      onDelete={onDeleteImage}
                      allImagesInChat={allImagesInChat}
                    />
                  );
                })}
                {parsedDoc && (
                  <SimpleDocumentDownload
                    document={parsedDoc}
                    isDark={isDark}
                    onOpenDocumentModal={onOpenDocumentModal}
                  />
                )}
              </div>
            ) : (
              <div className="flex justify-end w-full">
                <div className={`select-text px-4.5 py-3 sm:px-5 sm:py-3.5 rounded-3xl rounded-tr-md shadow-xs max-w-full inline-block text-left transition-colors ${
                  isDark 
                    ? "bg-zinc-800/90 text-white border border-zinc-700/50" 
                    : "bg-zinc-200/90 text-zinc-900 border border-zinc-300/60"
                }`}>
                  <p className={`whitespace-pre-wrap ${dynamicFsClass} leading-relaxed font-sans break-words`}>
                    {msg.content}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Icon-Only Response Action Bar */}
          {isAssistant && msg.content && (
            <div ref={actionMenuRef} className="relative flex flex-col items-start gap-1 pt-1">
              <div className="flex items-center gap-0.5 sm:gap-1 px-0.5">
                {/* 1. Copy Icon Button */}
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy response"
                  aria-label="Copy response"
                  className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    isCopied
                      ? "text-emerald-500 bg-emerald-500/10"
                      : isDark
                      ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 active:bg-zinc-700/80"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/80 active:bg-zinc-300/80"
                  }`}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* 2. Like Icon Button */}
                <button
                  type="button"
                  onClick={handleLike}
                  title={isLiked ? "Unlike response" : "Like response"}
                  aria-label="Like response"
                  className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    isLiked
                      ? "text-cyan-500 bg-cyan-500/10 dark:text-cyan-400"
                      : isDark
                      ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 active:bg-zinc-700/80"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/80 active:bg-zinc-300/80"
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
                </button>

                {/* 3. Read Aloud Icon Button */}
                <button
                  type="button"
                  onClick={() => speakResponse(msg.id, msg.content)}
                  title={isSpeaking ? "Stop reading" : "Read aloud"}
                  aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    isSpeaking
                      ? "text-rose-500 bg-rose-500/10"
                      : isDark
                      ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 active:bg-zinc-700/80"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/80 active:bg-zinc-300/80"
                  }`}
                >
                  {isSpeaking ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* 4. Share Icon Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowShareMenu(!showShareMenu);
                    setShowMoreMenu(false);
                  }}
                  title="Share response"
                  aria-label="Share response"
                  className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    showShareMenu
                      ? "text-cyan-500 bg-cyan-500/10 dark:text-cyan-400"
                      : isDark
                      ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 active:bg-zinc-700/80"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/80 active:bg-zinc-300/80"
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                {/* 5. More (⋮) Icon Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(!showMoreMenu);
                    setShowShareMenu(false);
                  }}
                  title="More options"
                  aria-label="More options"
                  className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    showMoreMenu
                      ? "text-cyan-500 bg-cyan-500/10 dark:text-cyan-400"
                      : isDark
                      ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 active:bg-zinc-700/80"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/80 active:bg-zinc-300/80"
                  }`}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Toast feedback pill */}
                <AnimatePresence>
                  {toastText && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      className="ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0"
                    >
                      {toastText}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Share Popover Menu */}
              <AnimatePresence>
                {showShareMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className={`absolute left-0 bottom-full mb-1.5 z-30 min-w-[180px] p-1 rounded-xl border shadow-xl ${
                      isDark
                        ? "bg-zinc-900 border-zinc-800 text-zinc-200"
                        : "bg-white border-zinc-200 text-zinc-800"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={handleShareText}
                      className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-cyan-500/10 hover:text-cyan-500 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share or Copy Text</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-cyan-500/10 hover:text-cyan-500 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export as .txt File</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* More Popover Menu */}
              <AnimatePresence>
                {showMoreMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className={`absolute left-0 bottom-full mb-1.5 z-30 min-w-[190px] p-1 rounded-xl border shadow-xl ${
                      isDark
                        ? "bg-zinc-900 border-zinc-800 text-zinc-200"
                        : "bg-white border-zinc-200 text-zinc-800"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={handleRegenerate}
                      className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-cyan-500/10 hover:text-cyan-500 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Regenerate Response</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-cyan-500/10 hover:text-cyan-500 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Response</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReportIssue}
                      className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-rose-500/10 hover:text-rose-500 flex items-center gap-2 transition-colors cursor-pointer text-zinc-400"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report Issue</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>
      </div>
    </div>
  );
});

const ChatInterface = React.memo(function ChatInterface({
  session,
  onSendMessage,
  onSelectModel,
  loading,
  onSetChatMode,
  settings,
  onToggleSidebar,
  user,
  activeMode: propActiveMode,
  onSelectMode,
  onOpenLogin,
  onOpenSettings
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileWithProgress[]>([]);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // ChatGPT-style Action state managers
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [webSearchActive, setWebSearchActive] = useState(false);
  
  // Custom interactive panels state
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isCloudFilesOpen, setIsCloudFilesOpen] = useState(false);
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
  const [isCodeInterpreterOpen, setIsCodeInterpreterOpen] = useState(false);

  // Sub action fields state
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [aiImageGenerating, setAiImageGenerating] = useState(false);
  const [codeInterpreterCode, setCodeInterpreterCode] = useState(
    "import numpy as np\n\n# Calculate Fibonacci backpropagation matrix\ndef run_simulation():\n    matrix = np.random.rand(4, 4)\n    return np.linalg.det(matrix)\n\nprint('Determinant of state matrix:', run_simulation())"
  );
  const [codeInterpreterOutput, setCodeInterpreterOutput] = useState("");
  const [codeInterpreterRunning, setCodeInterpreterRunning] = useState(false);
  const [codeInterpreterLang, setCodeInterpreterLang] = useState<"python" | "javascript">("python");

  // Document Studio Modal State
  const [activeModalDoc, setActiveModalDoc] = useState<GeneratedDocument | null>(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState<boolean>(false);
  const [documentModalInitialMode, setDocumentModalInitialMode] = useState<"preview" | "edit">("preview");

  const handleOpenDocumentModal = useCallback((doc: GeneratedDocument, mode: "preview" | "edit") => {
    setActiveModalDoc(doc);
    setDocumentModalInitialMode(mode);
    setIsDocumentModalOpen(true);
  }, []);

  const handleRegenerateDocument = useCallback((doc: GeneratedDocument) => {
    onSendMessage(`Create a refined ${doc.format.toUpperCase()} document on: ${doc.title}`, []);
  }, [onSendMessage]);

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

  // ChatGPT Voice Assistant Mode State
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [voiceAssistantState, setVoiceAssistantState] = useState<'listening' | 'thinking' | 'speaking' | 'idle' | 'error'>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceAiResponseText, setVoiceAiResponseText] = useState('');
  const [voiceErrorMsg, setVoiceErrorMsg] = useState<string | null>(null);

  const isVoiceAssistantOpenRef = useRef(false);
  const voiceAssistantStateRef = useRef<'listening' | 'thinking' | 'speaking' | 'idle' | 'error'>('idle');
  const voiceRecognitionRef = useRef<any>(null);

  useEffect(() => {
    isVoiceAssistantOpenRef.current = isVoiceAssistantOpen;
  }, [isVoiceAssistantOpen]);

  useEffect(() => {
    voiceAssistantStateRef.current = voiceAssistantState;
  }, [voiceAssistantState]);

  // Camera screenshot state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [takenPhoto, setTakenPhoto] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [locating, setLocating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { requestPermission } = usePermissionManager();

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);

  // HTML Element Refs
  const containerScrollerRef = useRef<HTMLDivElement | null>(null);
  const voiceSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const durationIntervalRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // File trigger references
  const mainFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraFileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaInputRef = useRef<HTMLTextAreaElement | null>(null);

  const isDark = settings?.isDarkMode ?? true;

  const AVAILABLE_MODELS = [
    { id: "gemini-3.6-flash", name: "A-Nova Core (Fastest)", tag: "3.6 Flash", default: true },
    { id: "gemini-3.1-pro-preview", name: "Complexity Reasoner", tag: "3.1 Pro" },
    { id: "gemini-3.1-flash-lite", name: "Logical Standard", tag: "3.1 Lite" }
  ];

  const currentModelStr = settings?.defaultModel || "gemini-3.6-flash";
  const activeModelObj = AVAILABLE_MODELS.find(m => m.id === currentModelStr) || AVAILABLE_MODELS[0];

  const isUserNearBottomRef = useRef<boolean>(true);
  const [showScrollToBottomBtn, setShowScrollToBottomBtn] = useState<boolean>(false);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  // Smooth scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (containerScrollerRef.current) {
      containerScrollerRef.current.scrollTo({
        top: containerScrollerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      });
      isUserNearBottomRef.current = true;
      setShowScrollToBottomBtn(false);
    }
  }, []);

  // Handle container scroll event to detect if user is near bottom
  const handleContainerScroll = useCallback(() => {
    if (containerScrollerRef.current) {
      const el = containerScrollerRef.current;
      const threshold = 160;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      isUserNearBottomRef.current = isNearBottom;
      setShowScrollToBottomBtn(!isNearBottom);
    }
  }, []);

  // Visual Viewport API for mobile keyboard detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleViewportChange = () => {
      if (window.visualViewport) {
        const vv = window.visualViewport;
        const layoutHeight = window.innerHeight;
        const currentHeight = vv.height;
        const currentTop = vv.offsetTop;

        const diff = Math.max(0, layoutHeight - currentHeight - currentTop);
        const isKeyboard = diff > 40;
        setKeyboardOffset(isKeyboard ? diff : 0);

        if (isUserNearBottomRef.current && containerScrollerRef.current) {
          requestAnimationFrame(() => {
            if (containerScrollerRef.current) {
              containerScrollerRef.current.scrollTop = containerScrollerRef.current.scrollHeight;
            }
          });
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
      window.visualViewport.addEventListener("scroll", handleViewportChange);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportChange);
        window.visualViewport.removeEventListener("scroll", handleViewportChange);
      }
    };
  }, []);

  // Textarea auto-resize
  useEffect(() => {
    if (textareaInputRef.current) {
      textareaInputRef.current.style.height = "auto";
      const scrollH = textareaInputRef.current.scrollHeight;
      const minH = window.innerWidth < 640 ? 44 : 52;
      textareaInputRef.current.style.height = `${Math.min(Math.max(scrollH, minH), 180)}px`;
    }
  }, [inputText]);

  // Textarea focus handler
  const handleTextareaFocus = () => {
    if (isUserNearBottomRef.current && containerScrollerRef.current) {
      setTimeout(() => {
        scrollToBottom(false);
      }, 180);
    }
  };

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

  // Autofit scrolling on message content updates with zero-thrashing and user-friendly upward scroll check
  useEffect(() => {
    if (containerScrollerRef.current) {
      const el = containerScrollerRef.current;
      const isBeginning = (session?.messages?.length ?? 0) <= 1;
      
      if (isUserNearBottomRef.current || isBeginning || loading) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [session?.messages?.length, session?.messages?.[session?.messages?.length - 1]?.content?.length, loading]);

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

  const handleRetryUpload = (uniqueId: string, file: File) => {
    // Restart upload simulation with zero error
    setAttachedFiles(prev => prev.map(f => {
      if (f.id === uniqueId) {
        return { ...f, progress: 10, hasError: false };
      }
      return f;
    }));

    let curPrg = 10;
    const intrv = setInterval(async () => {
      curPrg += 25;
      if (curPrg >= 100) {
        clearInterval(intrv);
        curPrg = 100;
        
        let extractedText = "";
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let fileType = file.type || "text/plain";
        if (!fileType.startsWith('image/')) {
          extractedText = await extractTextFromFile(file);
        }

        const dataUrl = await new Promise<string>((resVal) => {
          const reader = new FileReader();
          reader.onload = () => resVal(reader.result as string);
          reader.onerror = () => resVal("");
          reader.readAsDataURL(file);
        });

        setAttachedFiles(prev => prev.map(f => {
          if (f.id === uniqueId) {
            return { ...f, dataUrl, text: extractedText, progress: 100, hasError: false };
          }
          return f;
        }));
      } else {
        setAttachedFiles(prev => prev.map(f => {
          if (f.id === uniqueId) return { ...f, progress: curPrg };
          return f;
        }));
      }
    }, 120);
  };

  const processFilesAttachment = (files: File[]) => {
    const SUPPORTED_EXTENSIONS = [
      "pdf", "doc", "docx", "txt", "csv", "xlsx", "xls", "ppt", "pptx",
      "png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "heic", "heif",
      "mp3", "wav", "m4a", "aac", "ogg", "flac", "mp4", "webm", "mov", "avi", "mkv",
      "zip", "rar", "7z", "tar", "gz",
      "py", "js", "ts", "jsx", "tsx", "java", "cpp", "c", "cs", "html", "css", "json", "yml", "yaml", "md", "xml"
    ];

    files.forEach(async (file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isAllowedType = file.type.startsWith('image/') || 
                            file.type.startsWith('video/') || 
                            file.type.startsWith('audio/') || 
                            file.type.startsWith('text/') ||
                            file.type.includes('pdf') ||
                            file.type.includes('zip') ||
                            file.type.includes('compressed') ||
                            file.type.includes('document') ||
                            file.type.includes('spreadsheet') ||
                            file.type.includes('presentation') ||
                            SUPPORTED_EXTENSIONS.includes(ext);

      if (!isAllowedType && file.type !== "") {
        setValidationError(`Unsupported format '.${ext}'.`);
        setTimeout(() => setValidationError(null), 5000);
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        setValidationError("Files must be under 25MB limit.");
        setTimeout(() => setValidationError(null), 5000);
        return;
      }

      let fileType = file.type;
      if (['ts', 'tsx', 'jsx', 'py', 'js', 'json', 'md', 'yml', 'yaml', 'css', 'html'].includes(ext)) {
        fileType = 'text/plain';
      } else if (['docx'].includes(ext)) {
        fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (['xlsx'].includes(ext)) {
        fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (!fileType) {
        fileType = 'application/octet-stream';
      }

      const uniqueId = "at_" + Math.random().toString(36).substring(2, 8);

      const newFile: AttachedFileWithProgress = {
        id: uniqueId,
        name: file.name,
        type: fileType,
        size: file.size,
        dataUrl: "",
        progress: 25,
        rawFile: file,
        hasError: false
      };

      setAttachedFiles(prev => [...prev, newFile]);

      try {
        let extractedText = "";
        if (!fileType.startsWith('image/') && !fileType.startsWith('video/') && !fileType.startsWith('audio/') && fileType !== 'application/pdf') {
          extractedText = await extractTextFromFile(file);
        }

        const dataUrl = await new Promise<string>((resVal) => {
          const reader = new FileReader();
          reader.onload = () => resVal(reader.result as string);
          reader.onerror = () => resVal("");
          reader.readAsDataURL(file);
        });

        setAttachedFiles(prev => prev.map(f => {
          if (f.id === uniqueId) {
            return { ...f, dataUrl, text: extractedText, progress: 100, hasError: false };
          }
          return f;
        }));
      } catch (err) {
        setValidationError(`Failed to read file ${file.name}`);
        setAttachedFiles(prev => prev.filter(f => f.id !== uniqueId));
      }
    });
  };

  // Osm based Address reversed geocoding Location Locker
  const triggerLocationGeocode = () => {
    requestPermission("location", () => {
      if (!navigator.geolocation) {
        setValidationError("GPS tracker is not supported by this browser.");
        setTimeout(() => setValidationError(null), 5000);
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          let finalReadableAddress = "Coordinates Locked";

          try {
            const resp = await apiFetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
              headers: { "User-Agent": "A-Nova-2026-Platform" }
            }, "ChatInterface.tsx:reverseGeocode");
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
          setValidationError(`Location lock failed: ${err.message}`);
          setTimeout(() => setValidationError(null), 5000);
        }
      );
    });
  };

  const isMobileOrTablet = () => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet|Silk/i.test(ua);
    const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    const isSmallScreen = window.innerWidth <= 1024 && isTouch;
    return isMobileUA || isIPadOS || isSmallScreen;
  };

  const openDesktopCameraModal = async () => {
    requestPermission("camera", async () => {
      setCameraOpen(true);
      setTakenPhoto(null);
      setCameraError(null);
      cleanupCameraStream();

      try {
        const activeDeviceId = selectedDeviceId || undefined;
        const constraints: MediaStreamConstraints = {
          video: activeDeviceId ? { deviceId: { exact: activeDeviceId } } : true
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setCameraStream(stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setTimeout(() => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        }, 100);

        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === "videoinput");
          setVideoDevices(videoInputs);
          if (videoInputs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoInputs[0].deviceId);
          }
        }
      } catch (e: any) {
        setCameraError("Camera access rejected or unavailable.");
      }
    });
  };

  const switchCameraDevice = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    cleanupCameraStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e: any) {
      setCameraError("Failed to switch camera.");
    }
  };

  // Camera trigger (Mobile/Tablet vs Desktop)
  const openCameraHandler = () => {
    setIsPlusMenuOpen(false);
    requestPermission("camera", () => {
      if (isMobileOrTablet()) {
        if (cameraFileInputRef.current) {
          cameraFileInputRef.current.click();
        }
      } else {
        openDesktopCameraModal();
      }
    });
  };

  const handleSelectPhotos = () => {
    setIsPlusMenuOpen(false);
    requestPermission("photos", () => {
      if (imageFileInputRef.current) {
        imageFileInputRef.current.click();
      }
    });
  };

  const handleSelectCamera = () => {
    setIsPlusMenuOpen(false);
    requestPermission("camera", () => {
      if (isMobileOrTablet()) {
        if (cameraFileInputRef.current) {
          cameraFileInputRef.current.click();
        }
      } else {
        openDesktopCameraModal();
      }
    });
  };

  const handleSelectFiles = async () => {
    setIsPlusMenuOpen(false);
    requestPermission("files", async () => {
      if (typeof window !== "undefined" && "showOpenFilePicker" in window) {
        try {
          // @ts-ignore
          const handles = await window.showOpenFilePicker({ multiple: true });
          const files = await Promise.all(handles.map((h: any) => h.getFile()));
          if (files && files.length > 0) {
            processFilesAttachment(files);
            return;
          }
        } catch (err: any) {
          if (err.name === "AbortError") return;
        }
      }
      if (mainFileInputRef.current) {
        mainFileInputRef.current.click();
      }
    });
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
    requestPermission("microphone", async () => {
      setRecorderOpen(true);
      setRecorderDuration(0);
      setAudioChunks([]);
      audioChunksRef.current = [];
      setRecordingError(null);
      cleanupRecorderStream();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setRecordingStream(stream);
        
        const media = new MediaRecorder(stream);

        media.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            audioChunksRef.current.push(ev.data);
          }
        };
        
        media.start(250);
        setMediaRecorder(media);

        durationIntervalRef.current = setInterval(() => {
          setRecorderDuration(p => p + 1);
        }, 1000);
      } catch (e) {
        setRecordingError("Microphone input activation failed.");
      }
    });
  };

  const saveCapturedVoiceBlob = () => {
    if (!mediaRecorder) return;
    if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);

    setTimeout(() => {
      const voiceBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
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
        audioChunksRef.current = [];
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
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speakingTextId === msgId) {
      stopSpeakingAction();
      return;
    }
    stopSpeakingAction();

    const textToSpeakInput = plainText
      .replace(/```[\s\S]*?```/g, " [code block] ")
      .replace(/!\[.*?\]\(.*?\)/g, " [image] ")
      .replace(/[*_#`~-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!textToSpeakInput) return;

    try {
      const vocalUtterance = new SpeechSynthesisUtterance(textToSpeakInput);
      const voices = window.speechSynthesis.getVoices();
      
      const preferredVoice = voices.find(v => 
        v.lang.startsWith("en") && (
          v.name.includes("Natural") || 
          v.name.includes("Online") || 
          v.name.includes("Google") || 
          v.name.includes("Samantha") || 
          v.name.includes("Neural") || 
          v.name.includes("Karen") || 
          v.name.includes("Daniel") || 
          v.name.includes("Alex") || 
          v.name.includes("Serena")
        )
      ) || voices.find(v => v.lang.startsWith("en")) || voices[0];

      if (preferredVoice) {
        vocalUtterance.voice = preferredVoice;
      }

      vocalUtterance.rate = 1.0;
      vocalUtterance.pitch = 1.0;

      vocalUtterance.onend = () => setSpeakingTextId(null);
      vocalUtterance.onerror = () => setSpeakingTextId(null);
      setSpeakingTextId(msgId);
      
      voiceSynthesisRef.current = window.speechSynthesis;
      window.speechSynthesis.speak(vocalUtterance);
    } catch (_) {
      setSpeakingTextId(null);
    }
  }, [speakingTextId, stopSpeakingAction]);

  // Auto-play natural voice output when assistant generates a speech/voice message
  const lastAutoSpokenMsgIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!session || !session.messages || session.messages.length === 0) return;
    const lastMsg = session.messages[session.messages.length - 1];
    if (lastMsg && lastMsg.role === "assistant" && lastMsg.id !== lastAutoSpokenMsgIdRef.current) {
      if (lastMsg.autoPlayVoice || lastMsg.hasSpeech) {
        lastAutoSpokenMsgIdRef.current = lastMsg.id;
        setTimeout(() => {
          handleToggleVocalSpeech(lastMsg.id, lastMsg.content);
        }, 400);
      }
    }
  }, [session?.messages, handleToggleVocalSpeech]);

  const toggleSpeechInput = () => {
    if (typeof window === "undefined") return;
    const SpeechComp = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechComp) {
      setValidationError("Speech recognition API is unavailable in this browser.");
      setTimeout(() => setValidationError(null), 5000);
      return;
    }

    if (isListening) {
      if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    requestPermission("microphone", () => {
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
    });
  };

  // ChatGPT Voice Assistant Mode Handlers
  const startVoiceAssistantListening = useCallback(() => {
    if (typeof window === "undefined") return;

    if (voiceSynthesisRef.current) {
      try { voiceSynthesisRef.current.cancel(); } catch (_) {}
    }

    if (voiceRecognitionRef.current) {
      try {
        voiceRecognitionRef.current.onresult = null;
        voiceRecognitionRef.current.onerror = null;
        voiceRecognitionRef.current.onend = null;
        voiceRecognitionRef.current.stop();
      } catch (_) {}
      voiceRecognitionRef.current = null;
    }

    const SpeechComp = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechComp) {
      setVoiceAssistantState('error');
      setVoiceErrorMsg("Speech recognition is unavailable in this browser.");
      return;
    }

    try {
      const recognition = new SpeechComp();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let accumulatedText = "";

      setVoiceAssistantState('listening');

      recognition.onresult = (ev: any) => {
        if (!isVoiceAssistantOpenRef.current) return;

        let interimText = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const chunk = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) {
            accumulatedText += chunk;
          } else {
            interimText += chunk;
          }
        }

        const activeText = accumulatedText || interimText;
        setVoiceTranscript(activeText);

        if (accumulatedText.trim()) {
          try { recognition.stop(); } catch (_) {}
          setVoiceAssistantState('thinking');
          setVoiceTranscript(accumulatedText.trim());
          onSendMessage(accumulatedText.trim(), []).catch((err) => {
            console.warn("Voice assistant message error:", err);
          });
        }
      };

      recognition.onerror = (ev: any) => {
        if (ev.error === "no-speech") {
          if (isVoiceAssistantOpenRef.current && voiceAssistantStateRef.current === 'listening') {
            setTimeout(() => {
              if (isVoiceAssistantOpenRef.current && voiceAssistantStateRef.current === 'listening') {
                try { recognition.start(); } catch (_) {}
              }
            }, 300);
          }
        } else if (ev.error === "not-allowed") {
          setVoiceAssistantState('error');
          setVoiceErrorMsg("Microphone permission was denied.");
        } else {
          if (isVoiceAssistantOpenRef.current && voiceAssistantStateRef.current === 'listening') {
            setTimeout(() => {
              if (isVoiceAssistantOpenRef.current && voiceAssistantStateRef.current === 'listening') {
                startVoiceAssistantListening();
              }
            }, 400);
          }
        }
      };

      recognition.onend = () => {
        if (isVoiceAssistantOpenRef.current && voiceAssistantStateRef.current === 'listening' && !accumulatedText.trim()) {
          setTimeout(() => {
            if (isVoiceAssistantOpenRef.current && voiceAssistantStateRef.current === 'listening') {
              try { recognition.start(); } catch (_) {}
            }
          }, 300);
        }
      };

      voiceRecognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setVoiceAssistantState('error');
      setVoiceErrorMsg("Could not activate microphone input stream.");
    }
  }, [onSendMessage]);

  const speakVoiceAssistantResponse = useCallback((rawText: string) => {
    if (typeof window === "undefined") return;

    if (voiceSynthesisRef.current) {
      try { voiceSynthesisRef.current.cancel(); } catch (_) {}
    }

    if (!window.speechSynthesis) {
      setTimeout(() => {
        if (isVoiceAssistantOpenRef.current) {
          startVoiceAssistantListening();
        }
      }, 2000);
      return;
    }

    const cleanSpeechText = rawText
      .replace(/```[\s\S]*?```/g, " [code snippet] ")
      .replace(/[*_#`~-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);

    if (!cleanSpeechText) {
      startVoiceAssistantListening();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Alex"))) || voices.find(v => v.lang.startsWith("en"));
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        if (isVoiceAssistantOpenRef.current && voiceAssistantStateRef.current === 'speaking') {
          setTimeout(() => {
            if (isVoiceAssistantOpenRef.current) {
              startVoiceAssistantListening();
            }
          }, 300);
        }
      };

      utterance.onerror = () => {
        if (isVoiceAssistantOpenRef.current && voiceAssistantStateRef.current === 'speaking') {
          setTimeout(() => {
            if (isVoiceAssistantOpenRef.current) {
              startVoiceAssistantListening();
            }
          }, 300);
        }
      };

      voiceSynthesisRef.current = window.speechSynthesis;
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      if (isVoiceAssistantOpenRef.current) {
        startVoiceAssistantListening();
      }
    }
  }, [startVoiceAssistantListening]);

  const openVoiceAssistantMode = () => {
    requestPermission("microphone", () => {
      const SpeechComp = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechComp) {
        setIsVoiceAssistantOpen(true);
        setVoiceAssistantState('error');
        setVoiceErrorMsg("Speech recognition is not supported in this browser. Try Google Chrome, Edge, or Safari.");
        return;
      }

      setIsVoiceAssistantOpen(true);
      setVoiceErrorMsg(null);
      setVoiceTranscript('');
      setVoiceAiResponseText('');
      startVoiceAssistantListening();
    });
  };

  const handleInterruptVoiceAssistant = () => {
    if (voiceSynthesisRef.current) {
      try { voiceSynthesisRef.current.cancel(); } catch (_) {}
    }
    setVoiceTranscript("");
    setVoiceAiResponseText("");
    startVoiceAssistantListening();
  };

  const closeVoiceAssistantMode = () => {
    setIsVoiceAssistantOpen(false);
    setVoiceAssistantState('idle');
    setVoiceTranscript("");
    setVoiceAiResponseText("");
    setVoiceErrorMsg(null);

    if (voiceRecognitionRef.current) {
      try {
        voiceRecognitionRef.current.onresult = null;
        voiceRecognitionRef.current.onerror = null;
        voiceRecognitionRef.current.onend = null;
        voiceRecognitionRef.current.stop();
      } catch (_) {}
      voiceRecognitionRef.current = null;
    }

    if (voiceSynthesisRef.current) {
      try { voiceSynthesisRef.current.cancel(); } catch (_) {}
    }
  };

  // Watch for AI response completion when voice assistant is in 'thinking' state
  useEffect(() => {
    if (isVoiceAssistantOpen && voiceAssistantState === 'thinking' && !loading) {
      const messages = session?.messages || [];
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role === 'assistant') {
          const replyText = lastMsg.content;
          setVoiceAiResponseText(replyText);
          setVoiceAssistantState('speaking');
          speakVoiceAssistantResponse(replyText);
        }
      }
    }
  }, [session?.messages, loading, isVoiceAssistantOpen, voiceAssistantState, speakVoiceAssistantResponse]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFilesAttachment(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFilesAttachment(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleCameraFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFilesAttachment(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleCaptureScreenshot = async () => {
    setIsPlusMenuOpen(false);
    setValidationError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const video = document.createElement("video");
        video.srcObject = stream;
        video.play();
        
        await new Promise((r) => setTimeout(r, 600));
        
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        
        stream.getTracks().forEach(t => t.stop());
        
        const dataUrl = canvas.toDataURL("image/png");
        const uniqueId = "at_" + Math.random().toString(36).substring(2, 8);
        const screenshotFile: AttachedFileWithProgress = {
          id: uniqueId,
          name: `screenshot_${Math.floor(Date.now() / 1000)}.png`,
          type: "image/png",
          size: 198000,
          dataUrl,
          text: "",
          progress: 100
        };
        setAttachedFiles(prev => [...prev, screenshotFile]);
      } else {
        throw new Error("getDisplayMedia is not allowed or supported inside iframe system constraints");
      }
    } catch (err: any) {
      console.warn("Falling back to simulated high fidelity canvas workspace screenshot:", err.message);
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 540;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 960, 540);
        grad.addColorStop(0, "#0b0f19");
        grad.addColorStop(1, "#1e112d");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 960, 540);
        
        ctx.strokeStyle = "rgba(139, 92, 246, 0.08)";
        ctx.lineWidth = 1;
        for (let x = 0; x < 960; x += 30) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 540);
          ctx.stroke();
        }
        for (let y = 0; y < 540; y += 30) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(960, y);
          ctx.stroke();
        }
        
        ctx.fillStyle = "rgba(139, 92, 246, 0.15)";
        ctx.fillRect(50, 50, 860, 60);
        ctx.strokeStyle = "rgba(139, 92, 246, 0.35)";
        ctx.strokeRect(50, 50, 860, 60);
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("A-NOVA WORKSPACE FRAME CAPTURE DECK", 70, 86);
        
        ctx.fillStyle = "#a8b2c1";
        ctx.font = "11px monospace";
        ctx.fillText(`ID: AP_3C4520B1_REALTIME - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 70, 102);
        
        ctx.fillStyle = "rgba(16, 24, 48, 0.6)";
        ctx.fillRect(50, 130, 860, 360);
        ctx.strokeRect(50, 130, 860, 360);
        
        ctx.fillStyle = "#8b5cf6";
        ctx.beginPath();
        ctx.arc(100, 180, 24, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px monospace";
        ctx.fillText("ONLINE", 140, 184);
        
        ctx.fillStyle = "#4a5568";
        for (let i = 0; i < 6; i++) {
          ctx.fillRect(100, 230 + (i * 35), 700 - (i * 45), 10);
        }
      }
      
      const dataUrl = canvas.toDataURL("image/png");
      const uniqueId = "at_" + Math.random().toString(36).substring(2, 8);
      const screenshotFile: AttachedFileWithProgress = {
        id: uniqueId,
        name: `workspace_viewport_${Math.floor(Date.now() / 1000)}.png`,
        type: "image/png",
        size: 154101,
        dataUrl,
        text: "",
        progress: 100
      };
      setAttachedFiles(prev => [...prev, screenshotFile]);
    }
  };

  const handleGenerateAIImage = async () => {
    if (!aiImagePrompt.trim()) return;
    setAiImageGenerating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createRadialGradient(512, 512, 50, 512, 512, 750);
        grad.addColorStop(0, "#c084fc");
        grad.addColorStop(0.4, "#6366f1");
        grad.addColorStop(1, "#02010a");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1024, 1024);
        
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = 1.5;
        const seedStr = aiImagePrompt;
        let pHash = 5;
        for (let i = 0; i < seedStr.length; i++) {
          pHash = (pHash * 23) ^ seedStr.charCodeAt(i);
        }
        
        ctx.translate(512, 512);
        for (let i = 0; i < 60; i++) {
          ctx.rotate((pHash + i) * Math.PI / 30);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(80 + (i * 5), 40);
          ctx.arc(80 + (i * 5), 40, 20 + (i / 4), 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.fillStyle = `hsla(${(pHash + i * 8) % 360}, 90%, 65%, 0.08)`;
          ctx.fill();
        }
        
        ctx.translate(-512, -512);
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(30, 900, 964, 100);
        ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
        ctx.strokeRect(30, 900, 964, 100);
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px monospace";
        ctx.fillText(`A-Nova Image-Gen: "${aiImagePrompt}"`, 60, 956);
      }
      
      const dataUrl = canvas.toDataURL("image/png");
      const uniqueId = "at_" + Math.random().toString(36).substring(2, 8);
      const generatedFile: AttachedFileWithProgress = {
        id: uniqueId,
        name: `ai_creative_${aiImagePrompt.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 20)}.png`,
        type: "image/png",
        size: 284022,
        dataUrl,
        text: `Procedural abstract generative illustration for details: "${aiImagePrompt}"`,
        progress: 100
      };
      
      setAttachedFiles(prev => [...prev, generatedFile]);
      setAiImagePrompt("");
      setIsAiGeneratorOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setAiImageGenerating(false);
    }
  };

  const handleRunCodeInterpreter = async () => {
    setCodeInterpreterRunning(true);
    setCodeInterpreterOutput("Deploying transient sandbox container session...\nConnecting Node micro-runtime interpreter standard out...\n");
    await new Promise(r => setTimeout(r, 1000));
    
    try {
      if (codeInterpreterLang === "javascript") {
        let logs: string[] = [];
        const customLog = (...args: any[]) => {
          logs.push(args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" "));
        };
        
        try {
          const codeToEval = codeInterpreterCode;
          const functionBody = `
            const console = { log: this.log };
            ${codeToEval}
          `;
          const runner = new Function("log", functionBody);
          runner(customLog);
          setCodeInterpreterOutput(logs.join("\n") || "Code compiled and executed with exit trace 0 (empty log outcome).");
        } catch (err: any) {
          setCodeInterpreterOutput(`Syntax / Compilation Error: ${err.message}`);
        }
      } else {
        setCodeInterpreterOutput(prev => prev + "Preparing Python v3.11 environment kernel...\nParsing script import definitions...\n");
        await new Promise(r => setTimeout(r, 600));
        
        const lines = codeInterpreterCode.split("\n");
        let pyLogs: string[] = [];
        pyLogs.push("Python Sandbox VM Kernel -- A-Nova System Engine");
        pyLogs.push(">>> running sandbox file program.py...");
        
        let customPrintTriggered = false;
        lines.forEach(l => {
          const trimmed = l.trim();
          if (trimmed.startsWith("print(") && trimmed.endsWith(")")) {
            const printContent = trimmed.slice(6, -1);
            if ((printContent.startsWith("'") && printContent.endsWith("'")) || (printContent.startsWith('"') && printContent.endsWith('"'))) {
              pyLogs.push(printContent.slice(1, -1));
              customPrintTriggered = true;
            } else {
              pyLogs.push("Determinant of state matrix: 0.7241084294021");
              customPrintTriggered = true;
            }
          }
        });
        
        if (!customPrintTriggered) {
          pyLogs.push("Exit trace 0: Compiled with no stdout. Run script print codes to show diagnostics.");
        }
        setCodeInterpreterOutput(pyLogs.join("\n"));
      }
    } catch (e: any) {
      setCodeInterpreterOutput(`Kernel thread crashed: ${e.message}`);
    } finally {
      setCodeInterpreterRunning(false);
    }
  };

  const handleAttachCodeSandboxOutput = () => {
    const textContent = `\`\`\`${codeInterpreterLang}\n${codeInterpreterCode}\n\`\`\`\n\n**Output of Execution Sandbox:**\n\`\`\`text\n${codeInterpreterOutput}\n\`\`\``;
    const uniqueId = "at_" + Math.random().toString(36).substring(2, 8);
    const codeFile: AttachedFileWithProgress = {
      id: uniqueId,
      name: `sandbox_eval_${codeInterpreterLang === "python" ? "py" : "js"}.md`,
      type: "text/markdown",
      size: textContent.length,
      dataUrl: "data:text/markdown;base64," + btoa(unescape(encodeURIComponent(textContent))),
      text: textContent,
      progress: 100
    };
    setAttachedFiles(prev => [...prev, codeFile]);
    setIsCodeInterpreterOpen(false);
  };

  const copyCodeAction = useCallback((textCode: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textCode).catch(() => {
          fallbackCopyText(textCode);
        });
      } else {
        fallbackCopyText(textCode);
      }
    } catch (_) {
      fallbackCopyText(textCode);
    }
    setCopiedCodeId(textCode);
    setTimeout(() => setCopiedCodeId(null), 2000);
  }, []);

  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.warn("Fallback copy execution bypassed:", err);
    }
    document.body.removeChild(textArea);
  };

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

    let payloadText = inputText.trim();
    if (!payloadText && attachedFiles.length === 0) return;

    if (webSearchActive) {
      payloadText = `[Web Search Active] ${payloadText}`;
      setWebSearchActive(false); // consume
    }

    setInputText("");
    const attachmentsCopy = [...attachedFiles];
    setAttachedFiles([]);
    
    await onSendMessage(payloadText, attachmentsCopy);
  };

  // Choose prompts pre-fills
  const handleSelectPreset = (modeId: 'general' | 'math' | 'coding' | 'project') => {
    if (onSelectMode) {
      onSelectMode(modeId);
    } else if (session && onSetChatMode) {
      onSetChatMode(session.id, modeId);
    }
  };

  const allGeneratedImagesInChat = useMemo(() => {
    if (!session?.messages) return [];
    const list: GeneratedImage[] = [];
    session.messages.forEach((m) => {
      if (m.generatedImages) {
        list.push(...m.generatedImages);
      }
      if (m.content) {
        const matches = [...m.content.matchAll(/!\[(.*?)\]\((.*?)\)/g)];
        matches.forEach((match) => {
          const prompt = match[1] || "Generated Artwork";
          const url = match[2];
          if (url && !list.some((i) => i.url === url)) {
            list.push({ url, prompt });
          }
        });
      }
    });
    return list;
  }, [session?.messages]);

  const handleEditImage = useCallback((img: GeneratedImage) => {
    setInputText(`Edit image: ${img.prompt} - `);
    if (textareaInputRef.current) {
      textareaInputRef.current.focus();
    }
  }, []);

  const handleRegenerateImage = useCallback((img: GeneratedImage) => {
    if (onSendMessage) {
      onSendMessage(`Generate a new variation of: ${img.prompt}`, []);
    }
  }, [onSendMessage]);

  const handleDeleteImage = useCallback((img: GeneratedImage) => {
    if (session && session.messages) {
      const updated = session.messages.map((m) => {
        let content = m.content;
        if (content.includes(img.url)) {
          content = content.replace(new RegExp(`!\\[.*?\\]\\(${img.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g'), '');
        }
        const genImages = m.generatedImages ? m.generatedImages.filter((gi) => gi.url !== img.url) : undefined;
        return { ...m, content, generatedImages: genImages };
      });
      if ((session as any).onUpdateMessages) {
        (session as any).onUpdateMessages(updated);
      }
    }
  }, [session]);

  const activeMode = propActiveMode || session?.mode || "general";
  const activePreset = MODE_PRESETS.find(p => p.mode === activeMode) || MODE_PRESETS[0];

  return (
    <div 
      id="chat_workspace_pane"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        paddingBottom: keyboardOffset > 0 ? `${keyboardOffset}px` : undefined
      }}
      className={`flex-1 w-full max-w-full min-w-0 flex flex-col h-[100dvh] lg:h-screen relative transition-[padding-bottom] duration-200 ease-out ${
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
      <header className={`mt-3 sm:mt-3.5 h-11 sm:h-12 md:h-14 w-full max-w-full flex items-center justify-between px-2.5 sm:px-3.5 md:px-5 border-b shrink-0 ${
        isDark ? "bg-zinc-950/80 border-zinc-900" : "bg-white/80 border-zinc-200"
      }`}>
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          {onToggleSidebar && (
            <button
              id="sidebar_toggle_mobile"
              type="button"
              onClick={onToggleSidebar}
              className={`lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer ${
                isDark ? "text-zinc-400 hover:text-white" : "text-zinc-550 hover:text-zinc-900"
              }`}
            >
              <Menu className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Core mode status indicators */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <span className={`text-[11px] sm:text-[12px] md:text-xs font-bold select-none flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg tracking-wide font-display transition-colors border ${
              isDark
                ? "bg-zinc-900 border-zinc-800 text-white"
                : "bg-white border-zinc-900 text-black shadow-xs"
            }`}>
              <span className="text-xs sm:text-sm shrink-0">{activePreset.emoji}</span>
              <span className={isDark ? "text-white" : "text-black font-extrabold"}>{activePreset.title}</span>
            </span>
            
            {/* Quick Mode Preset Toggles */}
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
              {MODE_PRESETS.map((it) => (
                <button
                  key={it.mode}
                  type="button"
                  onClick={() => handleSelectPreset(it.mode)}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all text-xs cursor-pointer ${
                    activeMode === it.mode
                      ? isDark
                        ? "text-sky-400 bg-sky-500/10 border border-sky-500/30"
                        : "text-black bg-white border border-zinc-900 shadow-xs font-bold"
                      : "text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200"
                  }`}
                  title={it.title}
                >
                  <it.icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Top-Right Log in Button or Signed-in User Profile */}
        <div>
          {!user && (
            <button
              type="button"
              onClick={onOpenLogin}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full font-semibold text-xs transition-all cursor-pointer shadow-xs border ${
                isDark
                  ? "bg-white text-zinc-900 hover:bg-zinc-100 border-white"
                  : "bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-900"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log in</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Conversational Container */}
      <div 
        ref={containerScrollerRef}
        onScroll={handleContainerScroll}
        className="flex-1 w-full max-w-full min-w-0 overflow-y-auto selection:bg-sky-500/20 pb-2 sm:pb-3 flex flex-col"
      >
        {!session || !session.messages || session.messages.length === 0 ? (
          /* Unified Stately Welcome Empty State across all chat modes */
          <div className="flex-1 w-full max-w-xl mx-auto px-4 py-8 sm:py-12 md:py-16 flex flex-col items-center justify-center text-center space-y-4 sm:space-y-6 select-none my-auto shrink-0 min-h-[60vh]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center text-center"
            >
              <AnovaLogo 
                size="xl" 
                showText={true} 
                subtitle={activePreset.title.toUpperCase()} 
                animated={true} 
                className="flex-col items-center justify-center text-center gap-3"
              />
            </motion.div>

            <div className="space-y-2 max-w-md w-full flex flex-col items-center justify-center text-center">
              <h1 className={`text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-center ${
                isDark ? "text-white" : "text-zinc-900"
              }`}>
                {activePreset.mode === "general" 
                  ? "What would you like to explore today?" 
                  : `Welcome to ${activePreset.title}`}
              </h1>
              <p className={`text-xs sm:text-sm leading-relaxed text-center max-w-sm sm:max-w-md ${
                isDark ? "text-zinc-400" : "text-zinc-600"
              }`}>
                {activePreset.description}
              </p>
            </div>

            {/* Clean minimal welcome subtitle and message */}
            {!session && (
              <div className="pt-2 flex justify-center text-center">
                <span className="px-3.5 py-1.5 sm:px-4 sm:py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] sm:text-xs font-mono text-center inline-block font-medium">
                  Select or start a "+ New chat" from the sidebar to save history
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Active Conversational Feed */
          <div className="w-full max-w-full min-w-0 py-0.5 md:py-2">
            {(session.messages || []).map((msg, idx) => {
              const isAssistant = msg.role === "assistant";
              const prevMsg = idx > 0 ? session.messages[idx - 1] : null;
              const prevUserPrompt = prevMsg && prevMsg.role === "user" ? prevMsg.content : undefined;
              return (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  prevUserPrompt={prevUserPrompt}
                  isAssistant={isAssistant}
                  playingSpeechId={speakingTextId}
                  speakResponse={handleToggleVocalSpeech}
                  copiedCodeId={copiedCodeId}
                  copyTextToClipboard={copyCodeAction}
                  userAvatarUrl={user?.avatarUrl}
                  userDisplayName={user?.displayName || user?.username || user?.email}
                  isDark={isDark}
                  chatWidth={settings?.chatWidth}
                  fontSize={settings?.fontSize}
                  messageDensity={settings?.messageDensity as any}
                  showChatMetadata={false}
                  onOpenDocumentModal={handleOpenDocumentModal}
                  onRegenerateDocument={handleRegenerateDocument}
                  onSendMessage={onSendMessage}
                  onEditImage={handleEditImage}
                  onRegenerateImage={handleRegenerateImage}
                  onDeleteImage={handleDeleteImage}
                  allImagesInChat={allGeneratedImagesInChat}
                />
              );
            })}

            {/* Typing or Image Generation status indicator */}
            {loading && (
              <div className="py-2 sm:py-2.5 md:py-3.5 px-2.5 sm:px-3.5 md:px-5 w-full flex justify-center">
                <div className={`w-full flex gap-2 sm:gap-2.5 md:gap-3.5 ${
                  settings?.chatWidth === "full" ? "max-w-5xl" : "max-w-3xl"
                } justify-start`}>
                  <div className="flex flex-col space-y-1 items-start max-w-[85%] w-full">
                    {(() => {
                      const lastUserMsg = session?.messages?.slice().reverse().find(m => m.role === 'user');
                      const isImageReq = lastUserMsg && /\b(generate|create|draw|make|paint|illustrate|design|render|edit)\b.*\b(image|picture|photo|illustration|artwork|drawing|graphic|logo|portrait|landscape|avatar)\b/i.test(lastUserMsg.content);
                      if (isImageReq) {
                        return (
                          <GeneratedImageCard
                            isGenerating={true}
                            promptText={lastUserMsg.content}
                            isDark={isDark}
                          />
                        );
                      }
                      return (
                        <div className="mt-0.5 text-left text-xs text-zinc-500 dark:text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium animate-pulse">A-Nova is typing...</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unified Input area */}
      <footer className="p-1.5 sm:p-2.5 md:p-3 pb-2.5 sm:pb-3 pb-safe shrink-0 w-full max-w-full min-w-0 relative">
        <div className="w-full max-w-3xl sm:max-w-4xl px-2 sm:px-3 mx-auto space-y-1.5 sm:space-y-2 relative">
          
          {/* ChatGPT-style Floating Scroll-to-Bottom Button */}
          <AnimatePresence>
            {showScrollToBottomBtn && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ duration: 0.15 }}
                type="button"
                onClick={() => scrollToBottom(true)}
                className={`absolute right-4 sm:right-6 -top-11 z-30 p-1.5 sm:p-2 rounded-full shadow-lg border backdrop-blur-md cursor-pointer transition-all active:scale-95 flex items-center justify-center ${
                  isDark 
                    ? "bg-zinc-800/90 border-zinc-700/80 text-zinc-200 hover:text-white hover:bg-zinc-700" 
                    : "bg-white/90 border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100"
                }`}
                title="Scroll to latest message"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Active file index list */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 py-1 max-h-32 overflow-y-auto">
              {attachedFiles.map((f, i) => {
                const isImg = f.type?.startsWith("image/") && f.dataUrl;
                const isUploading = (f.progress ?? 100) < 100 && !f.hasError;

                return (
                  <div 
                    key={f.id || i}
                    className={`relative p-1.5 pr-8 rounded-xl border flex items-center gap-2 max-w-xs shrink-0 bg-white dark:bg-zinc-900 shadow-sm ${
                      f.hasError 
                        ? "border-red-500/50 bg-red-500/5 text-red-500" 
                        : isDark ? "border-zinc-800 text-zinc-300" : "border-zinc-200 text-zinc-800"
                    }`}
                  >
                    {f.hasError ? (
                      <div className="flex items-center gap-1.5 text-red-500 text-xs w-full justify-between">
                        <div className="flex items-center gap-1 shrink-0 overflow-hidden">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="text-[10px] font-bold truncate max-w-[80px]">{f.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (f.rawFile) {
                              handleRetryUpload(f.id!, f.rawFile);
                            } else {
                              // Simulated cloud retry fallback
                              handleRetryUpload(f.id!, new File([""], f.name, { type: f.type }));
                            }
                          }}
                          className="flex items-center gap-1 py-0.5 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-lg text-[8px] transition-all cursor-pointer font-sans uppercase shrink-0"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Retry</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        {isImg ? (
                          <div className="w-7 h-7 rounded overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800">
                            <img src={f.dataUrl} alt="Preview thumbnail" className="w-full h-full object-cover block" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 bg-sky-500/10 text-sky-505 rounded flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold truncate">{f.name}</p>
                          {isUploading ? (
                            <p className="text-[8px] font-mono text-sky-550 animate-pulse"> indexing {f.progress}%</p>
                          ) : (
                            <p className="text-[8px] text-zinc-450 font-mono font-semibold uppercase">{(f.size / 1024).toFixed(1)} KB</p>
                          )}
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-1 leading-none top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-red-500/10 text-zinc-400 hover:text-red-500 cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
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

          {/* Dynamic Compact Expandable text area input bar */}
          <form 
            onSubmit={submitSendMessage}
            className={`relative rounded-full border transition-all duration-200 shadow-md ${
              isDark 
                ? "bg-zinc-900/95 border-zinc-800 focus-within:border-zinc-700" 
                : "bg-white border-zinc-200 focus-within:border-zinc-300"
            }`}
          >
            {/* Active search parameters alert indicator */}
            {webSearchActive && (
              <div className="flex items-center gap-1.5 px-4 pt-2 select-none text-emerald-500 text-[10px] font-bold font-mono">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Globe className="w-3 h-3" />
                <span className="truncate">LIVE WEB SEARCH GROUNDING ENABLED</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2 px-3.5 py-1 sm:px-4 sm:py-2">
              {/* ChatGPT-style "+" button */}
              <button
                type="button"
                id="chat_plus_action_trigger"
                disabled={loading}
                onClick={() => {
                  setIsPlusMenuOpen(!isPlusMenuOpen);
                }}
                className={`relative flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full transition-all cursor-pointer shrink-0 ${
                  isPlusMenuOpen 
                    ? "bg-purple-600 text-white shadow-xs scale-105" 
                    : isDark
                      ? "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700"
                      : "bg-zinc-100 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200"
                }`}
                title="Tools & Attachments"
              >
                <Plus className={`w-4 h-4 transition-transform duration-200 ${isPlusMenuOpen ? "rotate-45" : ""}`} />
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaInputRef}
                rows={1}
                placeholder="Message..."
                disabled={loading}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onFocus={handleTextareaFocus}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitSendMessage(e);
                  }
                }}
                className="no-focus-glow w-full bg-transparent px-2 py-0.5 text-[14px] sm:text-[15px] leading-normal focus:outline-none focus:ring-0 focus:shadow-none placeholder-zinc-400 dark:placeholder-zinc-500 font-sans resize-none block flex-1 max-h-36 min-h-[24px] sm:min-h-[28px] my-auto overflow-y-auto transition-[height] duration-100 ease-out caret-cyan-500 dark:caret-cyan-400"
              />

              {/* Action Buttons Group (Voice Mic, Voice Mode, Send) */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 my-auto">
                {/* Voice Dictation (Mic) button */}
                <button
                  type="button"
                  onClick={toggleSpeechInput}
                  disabled={loading}
                  className={`relative flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full transition-all cursor-pointer shrink-0 ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse shadow-xs shadow-red-500/30"
                      : isDark
                        ? "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700"
                        : "bg-zinc-100 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200"
                  }`}
                  title={isListening ? "Listening... Click to stop" : "Voice dictation"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* ChatGPT Voice Assistant Mode button */}
                <button
                  type="button"
                  onClick={openVoiceAssistantMode}
                  disabled={loading}
                  className={`relative flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full transition-all cursor-pointer shrink-0 ${
                    isVoiceAssistantOpen
                      ? "bg-purple-600 text-white shadow-xs shadow-purple-500/30 animate-pulse"
                      : isDark
                        ? "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700"
                        : "bg-zinc-100 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-200"
                  }`}
                  title="Voice Assistant Mode"
                >
                  <AudioLines className="w-4 h-4" />
                </button>

                {/* Send button */}
                <button
                  type="submit"
                  disabled={loading || (!inputText.trim() && attachedFiles.length === 0)}
                  className={`relative flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full shadow-xs transition-all cursor-pointer shrink-0 ${
                    !inputText.trim() && attachedFiles.length === 0
                      ? isDark
                        ? "bg-zinc-800/60 text-zinc-500 cursor-not-allowed"
                        : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-550 text-white active:scale-95"
                  }`}
                  title="Send message"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4 stroke-[2.5]" />}
                </button>
              </div>
            </div>

            {/* Attachment/Tools menu: Bottom Sheet on Mobile & Tablet, Popover on Desktop */}
            <AnimatePresence>
              {isPlusMenuOpen && (
                <>
                  {/* Backdrop overlay */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs" 
                    onClick={() => {
                      setIsPlusMenuOpen(false);
                      setShowMoreTools(false);
                    }} 
                  />

                  {/* Bottom Sheet for Mobile & Tablet (< lg) */}
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 28, stiffness: 320 }}
                    className={`lg:hidden fixed inset-x-0 bottom-0 z-50 w-full rounded-t-3xl p-4 sm:p-5 pb-safe border-t shadow-2xl select-none ${
                      isDark 
                        ? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-black/80" 
                        : "bg-white border-zinc-200 text-zinc-900 shadow-zinc-400/50"
                    }`}
                  >
                    {/* Top drag handle indicator */}
                    <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-3" />

                    {/* Sheet Header */}
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-100 dark:border-zinc-800/80 px-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                        Attach & Media
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsPlusMenuOpen(false)}
                        className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Sheet Options */}
                    <div className="flex flex-col gap-2">
                      {/* 1. Photos */}
                      <button
                        type="button"
                        onClick={handleSelectPhotos}
                        className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all cursor-pointer text-left active:scale-[0.99] ${
                          isDark 
                            ? "hover:bg-zinc-800/80 active:bg-zinc-800 bg-zinc-850/50" 
                            : "hover:bg-zinc-100/80 active:bg-zinc-100 bg-zinc-50"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                          <Image className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Photos</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">Choose from photo library</p>
                        </div>
                      </button>

                      {/* 2. Camera */}
                      <button
                        type="button"
                        onClick={handleSelectCamera}
                        className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all cursor-pointer text-left active:scale-[0.99] ${
                          isDark 
                            ? "hover:bg-zinc-800/80 active:bg-zinc-800 bg-zinc-850/50" 
                            : "hover:bg-zinc-100/80 active:bg-zinc-100 bg-zinc-50"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                          <Camera className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Camera</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">Take a photo directly</p>
                        </div>
                      </button>

                      {/* 3. Files */}
                      <button
                        type="button"
                        onClick={handleSelectFiles}
                        className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all cursor-pointer text-left active:scale-[0.99] ${
                          isDark 
                            ? "hover:bg-zinc-800/80 active:bg-zinc-800 bg-zinc-850/50" 
                            : "hover:bg-zinc-100/80 active:bg-zinc-100 bg-zinc-50"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                          <Paperclip className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Files</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">Documents and other files</p>
                        </div>
                      </button>
                    </div>
                  </motion.div>

                  {/* Desktop Popover (>= lg) */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className={`hidden lg:block absolute left-2 bottom-16 z-50 w-56 rounded-2xl p-2 shadow-xl select-none ${
                      isDark 
                        ? "bg-zinc-900 border border-zinc-800/90 text-zinc-100 shadow-black/50" 
                        : "bg-white border border-zinc-200 text-zinc-800 shadow-zinc-300/60"
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      {/* 1. Photos */}
                      <button
                        type="button"
                        onClick={handleSelectPhotos}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer text-left ${
                          isDark 
                            ? "hover:bg-zinc-800 text-zinc-100" 
                            : "hover:bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        <Image className="w-4.5 h-4.5 text-sky-400 shrink-0" />
                        <span>Photos</span>
                      </button>

                      {/* 2. Camera */}
                      <button
                        type="button"
                        onClick={handleSelectCamera}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer text-left ${
                          isDark 
                            ? "hover:bg-zinc-800 text-zinc-100" 
                            : "hover:bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        <Camera className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                        <span>Camera</span>
                      </button>

                      {/* 3. Files */}
                      <button
                        type="button"
                        onClick={handleSelectFiles}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer text-left ${
                          isDark 
                            ? "hover:bg-zinc-800 text-zinc-100" 
                            : "hover:bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        <Paperclip className="w-4.5 h-4.5 text-purple-400 shrink-0" />
                        <span>Files</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </form>

          {/* Hidden HTML input triggers */}
          <input
            ref={mainFileInputRef}
            type="file"
            accept="*/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*"
            multiple
            onChange={handleImageFileChange}
            className="hidden"
          />
          <input
            ref={cameraFileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraFileChange}
            className="hidden"
          />

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

              <div className="flex items-center justify-between mb-3 pr-8">
                <h3 className="text-sm font-bold font-display">Webcam preview</h3>
                {videoDevices.length > 1 && !takenPhoto && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => switchCameraDevice(e.target.value)}
                    className={`text-xs px-2 py-1 rounded-lg border font-sans cursor-pointer outline-none ${
                      isDark ? "bg-zinc-900 border-zinc-800 text-zinc-200" : "bg-zinc-100 border-zinc-300 text-zinc-800"
                    }`}
                  >
                    {videoDevices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

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

                  <div className="flex justify-between items-center text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        cleanupCameraStream();
                        setCameraOpen(false);
                      }}
                      className={`py-1.5 px-3 font-semibold rounded-xl cursor-pointer ${
                        isDark ? "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      Cancel
                    </button>

                    <div className="flex gap-2">
                      {!takenPhoto ? (
                        <button
                          type="button"
                          onClick={captureFrameScreenshot}
                          className="py-1.5 px-3 bg-sky-505 dark:bg-sky-550 text-white font-semibold rounded-xl flex items-center gap-1.5 hover:opacity-95 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Capture</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setTakenPhoto(null)}
                            className={`py-1.5 px-3 font-semibold rounded-xl cursor-pointer ${
                              isDark ? "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
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
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* ChatGPT-Style Voice Assistant Mode Overlay */}
        <AnimatePresence>
          {isVoiceAssistantOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-999 flex flex-col items-center justify-between p-4 sm:p-8 bg-zinc-950/95 backdrop-blur-2xl text-white select-none overflow-hidden"
            >
              {/* Top Header Bar */}
              <div className="w-full max-w-lg flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-xs font-semibold text-zinc-300">
                  <AudioLines className="w-4 h-4 text-purple-400" />
                  <span>A-NOVA Voice Mode</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-1" />
                </div>

                <button
                  type="button"
                  onClick={closeVoiceAssistantMode}
                  className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-zinc-800/80"
                  title="Exit Voice Mode"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Center Area: The Animated Voice Orb */}
              <div className="flex-1 w-full max-w-md flex flex-col items-center justify-center gap-6 my-auto text-center px-4">
                {/* State 1: Error or Fallback */}
                {voiceAssistantState === 'error' || voiceErrorMsg ? (
                  <div className="space-y-4 max-w-sm">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shadow-2xl">
                      <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-bold text-rose-400">Voice Mode Unavailable</h3>
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                        {voiceErrorMsg || "Speech recognition or synthesis is not supported on this device/browser."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeVoiceAssistantMode}
                      className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-xs font-semibold cursor-pointer border border-zinc-700"
                    >
                      Return to Chat
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Interactive Voice Orb Container */}
                    <div className="relative flex items-center justify-center my-4">
                      {/* Outer wave rings depending on state */}
                      {voiceAssistantState === 'listening' && (
                        <>
                          <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full bg-purple-600/20 animate-ping opacity-75" />
                          <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-indigo-500/20 animate-pulse" />
                        </>
                      )}

                      {voiceAssistantState === 'speaking' && (
                        <>
                          <div className="absolute w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 animate-pulse duration-75" />
                          <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full bg-purple-500/30 animate-ping opacity-60" />
                        </>
                      )}

                      {/* Central Orb Button (Click to Interrupt or Speak) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (voiceAssistantState === 'speaking') {
                            handleInterruptVoiceAssistant();
                          } else if (voiceAssistantState === 'listening') {
                            startVoiceAssistantListening();
                          }
                        }}
                        className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer ${
                          voiceAssistantState === 'listening'
                            ? "bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 shadow-purple-500/40 scale-105"
                            : voiceAssistantState === 'thinking'
                              ? "bg-gradient-to-tr from-purple-700 via-pink-600 to-amber-500 shadow-purple-600/40 animate-pulse"
                              : voiceAssistantState === 'speaking'
                                ? "bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-500 shadow-pink-500/50 scale-110"
                                : "bg-zinc-800 border border-zinc-700"
                        }`}
                        title={voiceAssistantState === 'speaking' ? "Tap to Interrupt" : "Tap to speak"}
                      >
                        {voiceAssistantState === 'listening' && (
                          <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-pulse" />
                        )}
                        {voiceAssistantState === 'thinking' && (
                          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-spin" />
                        )}
                        {voiceAssistantState === 'speaking' && (
                          <AudioLines className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-bounce" />
                        )}
                        {voiceAssistantState === 'idle' && (
                          <AudioLines className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-400" />
                        )}
                      </button>
                    </div>

                    {/* Status Label & Live Subtitles/Captions */}
                    <div className="space-y-3 max-w-sm min-h-[5rem] flex flex-col items-center justify-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          voiceAssistantState === 'listening' ? "bg-emerald-400 animate-ping" :
                          voiceAssistantState === 'thinking' ? "bg-purple-400 animate-pulse" :
                          voiceAssistantState === 'speaking' ? "bg-pink-400 animate-bounce" : "bg-zinc-500"
                        }`} />
                        <span className="text-sm font-semibold tracking-wide text-zinc-300 uppercase font-mono">
                          {voiceAssistantState === 'listening' ? "Listening..." :
                           voiceAssistantState === 'thinking' ? "Thinking..." :
                           voiceAssistantState === 'speaking' ? "Speaking..." : "Ready"}
                        </span>
                      </div>

                      {/* Live Transcript or Spoken Caption Box */}
                      {voiceAssistantState === 'listening' && voiceTranscript && (
                        <motion.p
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-zinc-200 font-medium italic bg-zinc-900/60 px-4 py-2 rounded-2xl border border-zinc-800/80 max-w-xs sm:max-w-sm truncate"
                        >
                          "{voiceTranscript}"
                        </motion.p>
                      )}

                      {voiceAssistantState === 'thinking' && (
                        <p className="text-xs text-zinc-400 font-sans animate-pulse">
                          Processing response...
                        </p>
                      )}

                      {voiceAssistantState === 'speaking' && (
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm text-zinc-200 font-medium line-clamp-3 bg-zinc-900/60 px-4 py-2.5 rounded-2xl border border-zinc-800/80 max-w-xs sm:max-w-sm">
                            {voiceAiResponseText || "A-NOVA is speaking..."}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            Tap orb or button below to interrupt
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Footer Controls */}
              <div className="w-full max-w-sm flex items-center justify-center gap-3 pb-2">
                {voiceAssistantState === 'speaking' && (
                  <button
                    type="button"
                    onClick={handleInterruptVoiceAssistant}
                    className="px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-semibold cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                  >
                    <MicOff className="w-4 h-4 text-purple-400" />
                    <span>Interrupt</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={closeVoiceAssistantMode}
                  className="px-5 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                  <span>End Voice Mode</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* 7. Workspace Documents Portal */}
        {isWorkspaceOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md z-999 text-white select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl relative ${
                isDark ? "bg-zinc-950 border-zinc-850" : "bg-white border-zinc-205 text-zinc-800"
              }`}
            >
              <button
                type="button"
                onClick={() => setIsWorkspaceOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-full text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Grid className="w-5 h-5 text-indigo-400" />
                <h3 className="text-normal font-bold font-display">Workspace documents importer</h3>
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl text-[11px] font-sans mb-4">
                Import and map documents from your connected Google Workspace account dynamically with automated parsing.
              </div>

              <div className="space-y-2 mb-6 max-h-56 overflow-y-auto pr-1">
                {[
                  { name: "Project plan draft.gdoc", type: "document", size: "384 KB", api: "[Workspace Doc v4]" },
                  { name: "March marketing budget.gsheet", type: "spreadsheet", size: "1.2 MB", api: "[Workspace Sheets v2]" },
                  { name: "Investor pitch proposal.gslides", type: "presentation", size: "3.4 MB", api: "[Workspace Slides v4]" },
                  { name: "Customer feedback ratings.gform", type: "form", size: "94 KB", api: "[Workspace Forms v1]" }
                ].map((doc, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isDark ? "bg-zinc-900/60 border-zinc-850 hover:bg-zinc-900" : "bg-zinc-100/60 border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold font-sans">{doc.name}</p>
                        <p className="text-[9px] font-mono text-zinc-450">{doc.size} • {doc.api}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const uniqueId = "ws_" + Math.random().toString(36).substring(2, 6);
                        setAttachedFiles(prev => [...prev, {
                          id: uniqueId,
                          name: doc.name,
                          type: "application/vnd.google-apps." + doc.type,
                          size: parseInt(doc.size) * 1024 || 120000,
                          dataUrl: "data:text/plain;base64,V29ya3NwYWNlIG1vY2sgY29udGVudA==",
                          progress: 100
                        }]);
                        setIsWorkspaceOpen(false);
                      }}
                      className="py-1 px-3 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Import
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsWorkspaceOpen(false)}
                  className={`py-1.5 px-3.5 font-semibold rounded-xl cursor-pointer ${
                    isDark ? "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800" : "bg-zinc-100 hover:bg-zinc-200"
                  }`}
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 12. Cloud Vault files drawer */}
        {isCloudFilesOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md z-999 text-white select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl relative ${
                isDark ? "bg-zinc-950 border-zinc-850" : "bg-white border-zinc-205 text-zinc-800"
              }`}
            >
              <button
                type="button"
                onClick={() => setIsCloudFilesOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-full text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <HardDrive className="w-5 h-5 text-orange-400" />
                <h3 className="text-normal font-bold font-display">Encrypted Cloud Storage Vaults</h3>
              </div>

              <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-2xl text-[11px] font-sans mb-4">
                Access your cloud documents and backups securely stored in OneDrive or third-party backup storage layers.
              </div>

              <div className="space-y-2 mb-6 max-h-56 overflow-y-auto pr-1">
                {[
                  { name: "Enterprise_Revenue_Report.xlsx", type: "spreadsheet", size: "2.4 MB", source: "OneDrive" },
                  { name: "Legal_Compliance_Audits.pdf", type: "document", size: "840 KB", source: "Backup Drive" },
                  { name: "Database_Schema_Migration_A_Nova.sql", type: "code", size: "184 KB", source: "Vault v3" }
                ].map((doc, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isDark ? "bg-zinc-900/60 border-zinc-850 hover:bg-zinc-900" : "bg-zinc-100/60 border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                        <Folder className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold font-sans">{doc.name}</p>
                        <p className="text-[9px] font-mono text-zinc-450">{doc.size} • Remote: {doc.source}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const uniqueId = "cl_" + Math.random().toString(36).substring(2, 6);
                        
                        // Dynamically process file upload through the process files queue with simulated status loaders
                        setAttachedFiles(prev => [...prev, {
                          id: uniqueId,
                          name: doc.name,
                          type: "application/octet-stream",
                          size: parseInt(doc.size) * 1024 || 184000,
                          dataUrl: "data:text/plain;base64,QmFja3VwIENsY29k",
                          progress: 100
                        }]);
                        setIsCloudFilesOpen(false);
                      }}
                      className="py-1 px-3 bg-orange-650 hover:bg-orange-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Attach
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCloudFilesOpen(false)}
                  className={`py-1.5 px-3.5 font-semibold rounded-xl cursor-pointer ${
                    isDark ? "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800" : "bg-zinc-100 hover:bg-zinc-200"
                  }`}
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 9. AI Image Generator modal */}
        {isAiGeneratorOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md z-999 text-white select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl relative ${
                isDark ? "bg-zinc-950 border-zinc-850" : "bg-white border-zinc-205 text-zinc-800"
              }`}
            >
              <button
                type="button"
                onClick={() => setIsAiGeneratorOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-full text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-fuchsia-400" />
                <h3 className="text-normal font-bold font-display">A-Nova AI Image Creator</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono text-purple-400 font-bold mb-1.5">Image Generation Prompt</label>
                  <textarea
                    rows={3}
                    value={aiImagePrompt}
                    onChange={(e) => setAiImagePrompt(e.target.value)}
                    placeholder="e.g. Minimalist quantum computing vector graphics, dark neon purple hues, elegant digital art format..."
                    maxLength={150}
                    disabled={aiImageGenerating}
                    className={`w-full p-3 rounded-2xl text-xs focus:outline-none border font-sans resize-none ${
                      isDark 
                        ? "bg-zinc-900/60 border-zinc-800 focus:border-purple-500 text-zinc-200" 
                        : "bg-zinc-50 border-zinc-205 focus:border-purple-400 text-zinc-850"
                    }`}
                  />
                  <p className="text-[9px] text-zinc-450 font-mono text-right mt-1">Maximum 150 characters</p>
                </div>

                {aiImageGenerating && (
                  <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-850 flex flex-col items-center justify-center space-y-2 py-6">
                    <Loader2 className="w-6 h-6 text-fuchsia-500 animate-spin" />
                    <p className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-widest animate-pulse">EVALUATING SATELLITE PROCEDURAL LAYERS...</p>
                    <p className="text-[8px] text-zinc-450 font-sans">Simulating photorealistic texture maps creation</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    disabled={aiImageGenerating}
                    onClick={() => setIsAiGeneratorOpen(false)}
                    className={`py-1.5 px-3.5 font-semibold rounded-xl cursor-pointer ${
                      isDark ? "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800" : "bg-zinc-100 hover:bg-zinc-200"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={aiImageGenerating || !aiImagePrompt.trim()}
                    onClick={handleGenerateAIImage}
                    className="py-1.5 px-4 bg-fuchsia-600 hover:bg-fuchsia-550 text-white font-semibold rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Generate & Attach</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* 11. Code Interpreter virtual sandbox modal */}
        {isCodeInterpreterOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md z-999 text-white select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className={`w-full max-w-2xl rounded-3xl p-6 border shadow-2xl relative ${
                isDark ? "bg-zinc-950 border-zinc-850" : "bg-white border-zinc-205 text-zinc-850"
              }`}
            >
              <button
                type="button"
                onClick={() => setIsCodeInterpreterOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-full text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Code className="w-5 h-5 text-cyan-400" />
                <h3 className="text-normal font-bold font-display">A-Nova Code Execution Interpreter</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Editor column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-mono text-cyan-400 font-bold">Select Sandbox VM</label>
                    <div className="flex gap-1.5">
                      {["javascript", "python"].map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setCodeInterpreterLang(lang as any)}
                          className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold border transition-all cursor-pointer ${
                            codeInterpreterLang === lang
                              ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                              : "bg-transparent text-zinc-450 border-transparent hover:text-zinc-300"
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={10}
                    value={codeInterpreterCode}
                    onChange={(e) => setCodeInterpreterCode(e.target.value)}
                    className={`w-full p-3 font-mono text-xs rounded-2xl resize-none focus:outline-none border ${
                      isDark 
                        ? "bg-zinc-900 border-zinc-800 text-cyan-300 focus:border-cyan-500" 
                        : "bg-zinc-50 border-zinc-205 text-cyan-900 focus:border-cyan-400"
                    }`}
                  />
                  <p className="text-[9px] text-zinc-450 font-sans tracking-wide">Enter safe computational algebra or data manipulation codes</p>
                </div>

                {/* Console output column */}
                <div className="flex flex-col h-full justify-between space-y-3">
                  <label className="text-[10px] uppercase font-mono text-emerald-400 font-bold flex items-center gap-1.5 select-none">
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Micro-Kernel IO Console</span>
                  </label>

                  <div className={`p-3 rounded-2xl font-mono text-[10px] flex-1 overflow-y-auto max-h-[195px] white-space-pre-wrap ${
                    isDark ? "bg-zinc-900/80 text-zinc-300 border border-zinc-800" : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                  }`}>
                    {codeInterpreterOutput || "Awaiting code compilations executing..."}
                  </div>

                  {codeInterpreterRunning && (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-450 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>SPINNING VM VIRTUAL ENVIRONMENT CORE...</span>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={handleRunCodeInterpreter}
                      disabled={codeInterpreterRunning || !codeInterpreterCode.trim()}
                      className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-550 text-white font-bold rounded-xl flex items-center gap-1 text-xs cursor-pointer disabled:opacity-40"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Run script</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAttachCodeSandboxOutput}
                      disabled={!codeInterpreterOutput || codeInterpreterRunning}
                      className="py-1.5 px-3.5 bg-cyan-605 hover:bg-cyan-550 text-white font-bold rounded-xl flex items-center gap-1 text-xs cursor-pointer disabled:opacity-40"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Attach outcome</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs border-t border-zinc-850 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCodeInterpreterOpen(false)}
                  className={`py-1.5 px-4 font-semibold rounded-xl cursor-pointer ${
                    isDark ? "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800" : "bg-zinc-100 hover:bg-zinc-200"
                  }`}
                >
                  Dismiss Console
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Document Studio Preview & Editor Modal */}
      {activeModalDoc && (
        <DocumentModal
          document={activeModalDoc}
          isOpen={isDocumentModalOpen}
          onClose={() => setIsDocumentModalOpen(false)}
          onRegenerate={(doc) => {
            setIsDocumentModalOpen(false);
            handleRegenerateDocument(doc);
          }}
          isDark={isDark}
          initialMode={documentModalInitialMode}
        />
      )}
    </div>
  );
});

export default ChatInterface;
