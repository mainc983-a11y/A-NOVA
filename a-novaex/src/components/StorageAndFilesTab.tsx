import React, { useState, useMemo } from "react";
import { 
  HardDrive, 
  File, 
  Image as ImageIcon, 
  FileText, 
  Volume2, 
  Video, 
  Trash2, 
  Download, 
  Share2, 
  Edit3, 
  FolderInput, 
  Eye, 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  Check, 
  X, 
  Sparkles, 
  Grid, 
  List,
  ChevronRight,
  Copy,
  ExternalLink,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatSession } from "../types";

export interface StorageItem {
  id: string;
  sessionId: string;
  sessionTitle: string;
  messageId: string;
  fileName: string;
  fileType: string;
  fileSize: number; // bytes
  category: "files" | "images" | "documents" | "audio" | "videos";
  dataUrl?: string;
  text?: string;
  date: string;
  isGeneratedImage?: boolean;
  prompt?: string;
}

interface StorageAndFilesTabProps {
  sessions: ChatSession[];
  onUpdateSessions?: (updatedSessions: ChatSession[]) => void;
  showSuccessNotification: (msg: string) => void;
  showErrorNotification: (msg: string) => void;
  isDark?: boolean;
}

const TOTAL_CAPACITY_BYTES = 500 * 1024 * 1024; // 500 MB

export default function StorageAndFilesTab({
  sessions,
  onUpdateSessions,
  showSuccessNotification,
  showErrorNotification,
  isDark = true
}: StorageAndFilesTabProps) {
  // UI State
  const [activeCategory, setActiveCategory] = useState<"all" | "files" | "images" | "documents" | "audio" | "videos">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "name_asc" | "name_desc" | "size_desc" | "size_asc">("date_desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null);
  const [renameItem, setRenameItem] = useState<StorageItem | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [moveItem, setMoveItem] = useState<StorageItem | null>(null);
  const [targetSessionId, setTargetSessionId] = useState<string>("");

  // Confirmation Modals
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<StorageItem | null>(null);
  const [clearConfirmType, setClearConfirmType] = useState<"batch" | null>(null);

  // 1. EXTRACT ALL STORAGE ITEMS FROM ALL SESSIONS
  const allStorageItems = useMemo<StorageItem[]>(() => {
    const items: StorageItem[] = [];

    sessions.forEach((sess) => {
      if (!sess.messages) return;

      sess.messages.forEach((msg) => {
        // A. Attached files
        if (msg.attachedFiles && msg.attachedFiles.length > 0) {
          msg.attachedFiles.forEach((file, index) => {
            const ext = (file.name.split(".").pop() || "").toLowerCase();
            const typeLower = (file.type || "").toLowerCase();

            let category: StorageItem["category"] = "files";
            if (typeLower.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext)) {
              category = "images";
            } else if (
              typeLower.includes("pdf") ||
              typeLower.includes("text/") ||
              typeLower.includes("word") ||
              typeLower.includes("document") ||
              typeLower.includes("json") ||
              typeLower.includes("csv") ||
              ["pdf", "doc", "docx", "txt", "csv", "json", "md", "rtf", "xlsx", "pptx"].includes(ext)
            ) {
              category = "documents";
            } else if (typeLower.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "aac", "flac"].includes(ext)) {
              category = "audio";
            } else if (typeLower.startsWith("video/") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) {
              category = "videos";
            }

            items.push({
              id: `${sess.id}_${msg.id}_att_${index}`,
              sessionId: sess.id,
              sessionTitle: sess.title || "Untitled Session",
              messageId: msg.id,
              fileName: file.name,
              fileType: file.type || ext || "application/octet-stream",
              fileSize: file.size || (file.dataUrl ? Math.round(file.dataUrl.length * 0.75) : 2048),
              category,
              dataUrl: file.dataUrl,
              text: file.text,
              date: msg.timestamp || sess.updatedAt || new Date().toISOString()
            });
          });
        }

        // B. AI Generated Images
        if (msg.generatedImages && msg.generatedImages.length > 0) {
          msg.generatedImages.forEach((img, index) => {
            const name = img.prompt ? `Generated: ${img.prompt.slice(0, 28)}...` : `AI_Generated_Image_${index + 1}.png`;
            items.push({
              id: `${sess.id}_${msg.id}_gen_${index}`,
              sessionId: sess.id,
              sessionTitle: sess.title || "Untitled Session",
              messageId: msg.id,
              fileName: name,
              fileType: "image/png",
              fileSize: img.url ? Math.round(img.url.length * 0.75) || 250000 : 250000,
              category: "images",
              dataUrl: img.url,
              date: msg.timestamp || sess.updatedAt || new Date().toISOString(),
              isGeneratedImage: true,
              prompt: img.prompt
            });
          });
        }

        // C. Speech Audio URLs
        if (msg.speechAudioUrl) {
          items.push({
            id: `${sess.id}_${msg.id}_audio`,
            sessionId: sess.id,
            sessionTitle: sess.title || "Untitled Session",
            messageId: msg.id,
            fileName: "Voice_Response.mp3",
            fileType: "audio/mp3",
            fileSize: 48000,
            category: "audio",
            dataUrl: msg.speechAudioUrl,
            date: msg.timestamp || sess.updatedAt || new Date().toISOString()
          });
        }
      });
    });

    return items;
  }, [sessions]);

  // 2. STORAGE OVERVIEW METRICS
  const totalUsedBytes = useMemo(() => {
    return allStorageItems.reduce((acc, item) => acc + item.fileSize, 0);
  }, [allStorageItems]);

  const remainingBytes = Math.max(0, TOTAL_CAPACITY_BYTES - totalUsedBytes);
  const usedPercentage = Math.min(100, Math.max(1, Math.round((totalUsedBytes / TOTAL_CAPACITY_BYTES) * 100)));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Category statistics breakdown
  const categoryStats = useMemo(() => {
    const stats = {
      files: { count: 0, size: 0 },
      images: { count: 0, size: 0 },
      documents: { count: 0, size: 0 },
      audio: { count: 0, size: 0 },
      videos: { count: 0, size: 0 }
    };

    allStorageItems.forEach((item) => {
      stats[item.category].count += 1;
      stats[item.category].size += item.fileSize;
    });

    return stats;
  }, [allStorageItems]);

  // 3. FILTERING & SORTING
  const filteredAndSortedItems = useMemo(() => {
    let result = [...allStorageItems];

    // Category Filter
    if (activeCategory !== "all") {
      result = result.filter((item) => item.category === activeCategory);
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.fileName.toLowerCase().includes(q) ||
          item.sessionTitle.toLowerCase().includes(q) ||
          item.fileType.toLowerCase().includes(q) ||
          (item.prompt && item.prompt.toLowerCase().includes(q))
      );
    }

    // Sort By
    result.sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "date_asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "name_asc") return a.fileName.localeCompare(b.fileName);
      if (sortBy === "name_desc") return b.fileName.localeCompare(a.fileName);
      if (sortBy === "size_desc") return b.fileSize - a.fileSize;
      if (sortBy === "size_asc") return a.fileSize - b.fileSize;
      return 0;
    });

    return result;
  }, [allStorageItems, activeCategory, searchQuery, sortBy]);

  // 4. ACTION HANDLERS
  const handleDownloadItem = (item: StorageItem) => {
    try {
      let downloadUrl = item.dataUrl;
      let createdBlobUrl = false;

      if (!downloadUrl && item.text) {
        const blob = new Blob([item.text], { type: item.fileType || "text/plain;charset=utf-8" });
        downloadUrl = URL.createObjectURL(blob);
        createdBlobUrl = true;
      }

      if (!downloadUrl) {
        showErrorNotification("File data URL or content is missing.");
        return;
      }
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = item.fileName || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (createdBlobUrl) {
        setTimeout(() => URL.revokeObjectURL(downloadUrl!), 5000);
      }

      showSuccessNotification(`Started download for "${item.fileName}"`);
    } catch (err) {
      showErrorNotification("Download failed.");
    }
  };

  const handleShareItem = async (item: StorageItem) => {
    if (navigator.share && item.dataUrl && !item.dataUrl.startsWith("data:")) {
      try {
        await navigator.share({
          title: item.fileName,
          text: `File attachment from chat session: ${item.sessionTitle}`,
          url: item.dataUrl
        });
        showSuccessNotification("Shared successfully!");
        return;
      } catch (e) {
        // Fall back to clipboard
      }
    }
    // Clipboard fallback
    try {
      const textToCopy = item.dataUrl || `${item.fileName} (${item.sessionTitle})`;
      await navigator.clipboard.writeText(textToCopy);
      showSuccessNotification("Link/Details copied to clipboard!");
    } catch {
      showErrorNotification("Failed to copy link.");
    }
  };

  const handleExecuteRename = () => {
    if (!renameItem || !newFileName.trim()) return;
    if (!onUpdateSessions) {
      showErrorNotification("Session update handler unavailable.");
      return;
    }

    const updatedName = newFileName.trim();
    const updatedSessions = sessions.map((sess) => {
      if (sess.id !== renameItem.sessionId) return sess;

      const newMessages = sess.messages.map((msg) => {
        if (msg.id !== renameItem.messageId) return msg;

        // Update attached file
        if (msg.attachedFiles) {
          const updatedAttached = msg.attachedFiles.map((file) => {
            if (file.name === renameItem.fileName) {
              return { ...file, name: updatedName };
            }
            return file;
          });
          return { ...msg, attachedFiles: updatedAttached };
        }

        // Update generated image prompt
        if (msg.generatedImages) {
          const updatedGen = msg.generatedImages.map((img) => {
            if (img.prompt === renameItem.prompt || img.url === renameItem.dataUrl) {
              return { ...img, prompt: updatedName };
            }
            return img;
          });
          return { ...msg, generatedImages: updatedGen };
        }

        return msg;
      });

      return { ...sess, messages: newMessages, updatedAt: new Date().toISOString() };
    });

    onUpdateSessions(updatedSessions);
    setRenameItem(null);
    setNewFileName("");
    showSuccessNotification(`Renamed to "${updatedName}"`);
  };

  const handleExecuteMove = () => {
    if (!moveItem || !targetSessionId || !onUpdateSessions) return;

    if (moveItem.sessionId === targetSessionId) {
      showErrorNotification("File is already in this conversation.");
      return;
    }

    const targetSession = sessions.find((s) => s.id === targetSessionId);
    if (!targetSession) {
      showErrorNotification("Target conversation not found.");
      return;
    }

    // Move file: remove from source session, add to target session's latest message or new message
    const updatedSessions = sessions.map((sess) => {
      // 1. Remove from source
      if (sess.id === moveItem.sessionId) {
        const newMessages = sess.messages.map((msg) => {
          if (msg.id !== moveItem.messageId) return msg;
          const newAttached = (msg.attachedFiles || []).filter((f) => f.name !== moveItem.fileName);
          const newGen = (msg.generatedImages || []).filter((g) => g.url !== moveItem.dataUrl);
          return { ...msg, attachedFiles: newAttached, generatedImages: newGen };
        });
        return { ...sess, messages: newMessages };
      }

      // 2. Add to target
      if (sess.id === targetSessionId) {
        const lastMsg = sess.messages[sess.messages.length - 1];
        if (lastMsg) {
          const updatedMessages = [...sess.messages];
          const targetIndex = updatedMessages.length - 1;

          if (moveItem.isGeneratedImage) {
            const existingGen = updatedMessages[targetIndex].generatedImages || [];
            updatedMessages[targetIndex] = {
              ...updatedMessages[targetIndex],
              generatedImages: [...existingGen, { url: moveItem.dataUrl || "", prompt: moveItem.prompt || moveItem.fileName }]
            };
          } else {
            const existingAtt = updatedMessages[targetIndex].attachedFiles || [];
            updatedMessages[targetIndex] = {
              ...updatedMessages[targetIndex],
              attachedFiles: [
                ...existingAtt,
                {
                  name: moveItem.fileName,
                  type: moveItem.fileType,
                  size: moveItem.fileSize,
                  dataUrl: moveItem.dataUrl || "",
                  text: moveItem.text
                }
              ]
            };
          }
          return { ...sess, messages: updatedMessages, updatedAt: new Date().toISOString() };
        }
      }

      return sess;
    });

    onUpdateSessions(updatedSessions);
    setMoveItem(null);
    setTargetSessionId("");
    showSuccessNotification(`Moved "${moveItem.fileName}" to "${targetSession.title}"`);
  };

  const handleExecuteDelete = (item: StorageItem) => {
    if (!onUpdateSessions) return;

    const updatedSessions = sessions.map((sess) => {
      if (sess.id !== item.sessionId) return sess;

      const newMessages = sess.messages.map((msg) => {
        if (msg.id !== item.messageId) return msg;

        const newAttached = (msg.attachedFiles || []).filter((f) => f.name !== item.fileName);
        const newGen = (msg.generatedImages || []).filter((g) => g.url !== item.dataUrl);
        const newSpeech = msg.speechAudioUrl === item.dataUrl ? undefined : msg.speechAudioUrl;

        return { ...msg, attachedFiles: newAttached, generatedImages: newGen, speechAudioUrl: newSpeech };
      });

      return { ...sess, messages: newMessages, updatedAt: new Date().toISOString() };
    });

    onUpdateSessions(updatedSessions);
    setDeleteConfirmItem(null);
    showSuccessNotification(`Deleted "${item.fileName}"`);
  };

  // Batch Selection Handlers
  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedItems.map((i) => i.id)));
    }
  };

  const handleBatchDownload = () => {
    const itemsToDownload = filteredAndSortedItems.filter((i) => selectedIds.has(i.id));
    if (itemsToDownload.length === 0) return;

    itemsToDownload.forEach((item, index) => {
      setTimeout(() => {
        handleDownloadItem(item);
      }, index * 250);
    });
  };

  const handleBatchDelete = () => {
    if (!onUpdateSessions || selectedIds.size === 0) return;

    const idsToDelete = new Set(selectedIds);
    const updatedSessions = sessions.map((sess) => {
      const newMessages = sess.messages.map((msg) => {
        const newAttached = (msg.attachedFiles || []).filter((f) => {
          const item = allStorageItems.find((i) => i.sessionId === sess.id && i.messageId === msg.id && i.fileName === f.name);
          return !item || !idsToDelete.has(item.id);
        });

        const newGen = (msg.generatedImages || []).filter((g) => {
          const item = allStorageItems.find((i) => i.sessionId === sess.id && i.messageId === msg.id && i.dataUrl === g.url);
          return !item || !idsToDelete.has(item.id);
        });

        return { ...msg, attachedFiles: newAttached, generatedImages: newGen };
      });

      return { ...sess, messages: newMessages };
    });

    onUpdateSessions(updatedSessions);
    setSelectedIds(new Set());
    setClearConfirmType(null);
    showSuccessNotification(`Deleted ${idsToDelete.size} selected item(s)`);
  };

  // Helper for Category Icons
  const getCategoryIcon = (cat: StorageItem["category"]) => {
    switch (cat) {
      case "images":
        return <ImageIcon className="w-4 h-4 text-emerald-500" />;
      case "documents":
        return <FileText className="w-4 h-4 text-sky-500" />;
      case "audio":
        return <Volume2 className="w-4 h-4 text-purple-500" />;
      case "videos":
        return <Video className="w-4 h-4 text-rose-500" />;
      default:
        return <File className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-6">
      {/* 1. STORAGE OVERVIEW HERO CARD */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5 text-sky-500 dark:text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Storage Overview</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {allStorageItems.length} file(s) across {sessions.length} conversation(s)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono font-semibold">
            <div className="text-right">
              <p className="text-zinc-900 dark:text-white font-bold">{formatSize(totalUsedBytes)} used</p>
              <p className="text-[11px] text-zinc-500">{formatSize(remainingBytes)} remaining</p>
            </div>
          </div>
        </div>

        {/* Real-time Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden border border-zinc-300/80 dark:border-zinc-800 p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${usedPercentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${
                usedPercentage > 90
                  ? "bg-rose-500"
                  : usedPercentage > 75
                  ? "bg-amber-500"
                  : "bg-gradient-to-r from-sky-500 via-purple-500 to-emerald-500"
              }`}
            />
          </div>
          <div className="flex justify-between text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            <span>0 MB</span>
            <span>{usedPercentage}% Capacity Used</span>
            <span>500 MB Capacity</span>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY BREAKDOWN GRID */}
      <div>
        <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-3">Storage Categories</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { id: "files", label: "Files", icon: File, color: "amber", stats: categoryStats.files },
            { id: "images", label: "Images", icon: ImageIcon, color: "emerald", stats: categoryStats.images },
            { id: "documents", label: "Documents", icon: FileText, color: "sky", stats: categoryStats.documents },
            { id: "audio", label: "Audio", icon: Volume2, color: "purple", stats: categoryStats.audio },
            { id: "videos", label: "Videos", icon: Video, color: "rose", stats: categoryStats.videos }
          ].map((cat) => {
            const IconComp = cat.icon;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(activeCategory === cat.id ? "all" : (cat.id as any))}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                  isActive
                    ? "bg-sky-500/10 border-sky-500/50 ring-1 ring-sky-500/30"
                    : "bg-white dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <IconComp className="w-4 h-4 text-zinc-700 dark:text-zinc-200" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                    {cat.stats.count}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{cat.label}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">{formatSize(cat.stats.size)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. SEARCH & CONTROLS BAR */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files or conversations..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Category Filter Pills, Sort & View Mode */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            {/* Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1">
              {(["all", "files", "images", "documents", "audio", "videos"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg capitalize transition cursor-pointer shrink-0 ${
                    activeCategory === cat
                      ? "bg-sky-500 text-white dark:bg-sky-500 dark:text-white shadow-xs"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="pl-7 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer appearance-none"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="size_desc">Size (Largest)</option>
                  <option value="size_asc">Size (Smallest)</option>
                </select>
                <ArrowUpDown className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center p-0.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === "list"
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Batch Selection Toolbar */}
        {filteredAndSortedItems.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 text-xs">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
            >
              {selectedIds.size === filteredAndSortedItems.length ? (
                <CheckSquare className="w-4 h-4 text-sky-500" />
              ) : (
                <Square className="w-4 h-4 text-zinc-400" />
              )}
              <span>Select All ({selectedIds.size}/{filteredAndSortedItems.length})</span>
            </button>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBatchDownload}
                  className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-[11px] rounded-lg flex items-center gap-1 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ({selectedIds.size})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setClearConfirmType("batch")}
                  className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-[11px] rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedIds.size})</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. FILE LIST & GRID VIEW */}
      <div>
        {filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/30 space-y-2">
            <File className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mx-auto" />
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No files found</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
              {searchQuery ? "Try a different search query or filter" : "Files uploaded in chat sessions will appear here"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* RESPONSIVE GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredAndSortedItems.map((item) => {
              const isSelected = selectedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`group relative p-3 rounded-2xl bg-white dark:bg-zinc-900/90 border transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-sky-500 ring-1 ring-sky-500/30 shadow-md"
                      : "border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs"
                  }`}
                >
                  {/* Select Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleSelectItem(item.id)}
                    className="absolute top-2.5 left-2.5 z-10 p-1 rounded-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xs text-zinc-600 dark:text-zinc-300 hover:text-sky-500 cursor-pointer transition"
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-sky-500" /> : <Square className="w-4 h-4 text-zinc-400" />}
                  </button>

                  {/* Thumbnail / Image Preview */}
                  <div className="relative w-full h-32 rounded-xl bg-zinc-100 dark:bg-zinc-950 overflow-hidden flex items-center justify-center mb-2.5 group/preview">
                    {item.category === "images" && item.dataUrl ? (
                      <img
                        src={item.dataUrl}
                        alt={item.fileName}
                        className="w-full h-full object-cover group-hover/preview:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="p-3 text-center flex flex-col items-center gap-1">
                        {getCategoryIcon(item.category)}
                        <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-zinc-500 dark:text-zinc-400">
                          {item.fileType.split("/")[1] || item.fileType}
                        </span>
                      </div>
                    )}

                    {/* Hover Quick Action Buttons */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="p-2 rounded-full bg-white/90 text-zinc-900 hover:bg-white transition cursor-pointer shadow-md"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadItem(item)}
                        className="p-2 rounded-full bg-white/90 text-zinc-900 hover:bg-white transition cursor-pointer shadow-md"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Meta Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate flex-1" title={item.fileName}>
                        {item.fileName}
                      </p>
                      {item.isGeneratedImage && (
                        <span className="px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-bold shrink-0">
                          AI
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                      <span>{formatSize(item.fileSize)}</span>
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                    </div>

                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500 truncate" title={`Session: ${item.sessionTitle}`}>
                      {item.sessionTitle}
                    </p>

                    {/* Action Toolbar */}
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRenameItem(item);
                          setNewFileName(item.fileName);
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Rename"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMoveItem(item);
                          setTargetSessionId(item.sessionId);
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Move to another conversation"
                      >
                        <FolderInput className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareItem(item)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Share"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmItem(item)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* RESPONSIVE LIST VIEW */
          <div className="space-y-2">
            {filteredAndSortedItems.map((item) => {
              const isSelected = selectedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl bg-white dark:bg-zinc-900/90 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? "border-sky-500 ring-1 ring-sky-500/30"
                      : "border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleSelectItem(item.id)}
                      className="p-1 text-zinc-400 hover:text-sky-500 cursor-pointer shrink-0"
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4 text-sky-500" /> : <Square className="w-4 h-4" />}
                    </button>

                    <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      {getCategoryIcon(item.category)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.fileName}</p>
                        {item.isGeneratedImage && (
                          <span className="px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-bold shrink-0">
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                        Session: {item.sessionTitle} • {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">{formatSize(item.fileSize)}</span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadItem(item)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRenameItem(item);
                          setNewFileName(item.fileName);
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Rename"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoveItem(item);
                          setTargetSessionId(item.sessionId);
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Move"
                      >
                        <FolderInput className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareItem(item)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Share"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmItem(item)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MODALS & OVERLAYS */}

      {/* A. Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 overflow-y-auto space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  {getCategoryIcon(previewItem.category)}
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{previewItem.fileName}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1 rounded-full text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview Content */}
              <div className="flex justify-center items-center bg-zinc-100 dark:bg-zinc-950 rounded-xl p-4 min-h-[220px]">
                {previewItem.category === "images" && previewItem.dataUrl ? (
                  <img src={previewItem.dataUrl} alt={previewItem.fileName} className="max-h-96 object-contain rounded-lg" />
                ) : previewItem.category === "audio" && previewItem.dataUrl ? (
                  <audio controls src={previewItem.dataUrl} className="w-full max-w-md" />
                ) : previewItem.text ? (
                  <pre className="text-xs text-zinc-800 dark:text-zinc-200 font-mono whitespace-pre-wrap max-h-80 overflow-y-auto w-full p-2">
                    {previewItem.text}
                  </pre>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <File className="w-12 h-12 text-zinc-400 mx-auto" />
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">File Attachment Details</p>
                    <p className="text-[11px] text-zinc-500 font-mono">{previewItem.fileType}</p>
                  </div>
                )}
              </div>

              {/* Information Table */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-zinc-50 dark:bg-zinc-950/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Size</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatSize(previewItem.fileSize)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Category</span>
                  <span className="capitalize text-zinc-900 dark:text-zinc-100">{previewItem.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Conversation</span>
                  <span className="truncate block text-zinc-900 dark:text-zinc-100">{previewItem.sessionTitle}</span>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleDownloadItem(previewItem)}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* B. Rename Modal */}
      <AnimatePresence>
        {renameItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Rename File</h3>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">New File Name</label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRename}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Save Name
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* C. Move to Conversation Modal */}
      <AnimatePresence>
        {moveItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Move File to Conversation</h3>
              <p className="text-xs text-zinc-500">
                Transfer <span className="font-semibold text-zinc-800 dark:text-zinc-200">{moveItem.fileName}</span> to another chat session.
              </p>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Target Conversation</label>
                <select
                  value={targetSessionId}
                  onChange={(e) => setTargetSessionId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || "Untitled Session"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMoveItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteMove}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Move File
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* D. Delete Single Confirmation */}
      <AnimatePresence>
        {deleteConfirmItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Delete File?</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Are you sure you want to delete <span className="font-bold text-zinc-800 dark:text-zinc-200">"{deleteConfirmItem.fileName}"</span>? This cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteDelete(deleteConfirmItem)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* E. Batch Delete Confirmation */}
      <AnimatePresence>
        {clearConfirmType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Delete {selectedIds.size} Selected File(s)?
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  This action will permanently delete these files from your conversation sessions and free up storage immediately.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setClearConfirmType(null)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
