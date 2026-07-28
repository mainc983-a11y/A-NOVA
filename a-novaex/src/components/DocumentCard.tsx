import React, { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Download,
  Edit3,
  Share2,
  Trash2,
  Check,
  RefreshCw,
  Table
} from "lucide-react";
import { GeneratedDocument, DocumentFormat } from "../types/document";
import { exportAndDownloadDocument } from "../utils/documentGenerator";

interface DocumentCardProps {
  document: GeneratedDocument;
  onPreview?: (doc: GeneratedDocument) => void;
  onEdit?: (doc: GeneratedDocument) => void;
  onRegenerate?: (doc: GeneratedDocument) => void;
  onDelete?: (doc: GeneratedDocument) => void;
  isDark?: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = React.memo(({
  document: doc,
  onPreview,
  onEdit,
  onDelete,
  isDark = true,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const formatConfig: Record<
    DocumentFormat,
    { label: string; color: string; border: string; bg: string; icon: any }
  > = {
    pdf: {
      label: "PDF Document",
      color: "text-red-500 dark:text-red-400",
      border: "border-red-500/20 dark:border-red-500/30",
      bg: "bg-red-500/10",
      icon: FileText,
    },
    docx: {
      label: "Word Document",
      color: "text-blue-500 dark:text-blue-400",
      border: "border-blue-500/20 dark:border-blue-500/30",
      bg: "bg-blue-500/10",
      icon: FileText,
    },
    pptx: {
      label: "PowerPoint Presentation",
      color: "text-amber-500 dark:text-amber-400",
      border: "border-amber-500/20 dark:border-amber-500/30",
      bg: "bg-amber-500/10",
      icon: Presentation,
    },
    xlsx: {
      label: "Excel Spreadsheet",
      color: "text-emerald-500 dark:text-emerald-400",
      border: "border-emerald-500/20 dark:border-emerald-500/30",
      bg: "bg-emerald-500/10",
      icon: FileSpreadsheet,
    },
    csv: {
      label: "CSV File",
      color: "text-purple-500 dark:text-purple-400",
      border: "border-purple-500/20 dark:border-purple-500/30",
      bg: "bg-purple-500/10",
      icon: Table,
    },
    md: {
      label: "Markdown File",
      color: "text-cyan-500 dark:text-cyan-400",
      border: "border-cyan-500/20 dark:border-cyan-500/30",
      bg: "bg-cyan-500/10",
      icon: FileCode,
    },
    txt: {
      label: "Text Document",
      color: "text-zinc-500 dark:text-zinc-400",
      border: "border-zinc-500/20 dark:border-zinc-500/30",
      bg: "bg-zinc-500/10",
      icon: FileText,
    },
    json: {
      label: "JSON File",
      color: "text-yellow-500 dark:text-yellow-400",
      border: "border-yellow-500/20 dark:border-yellow-500/30",
      bg: "bg-yellow-500/10",
      icon: FileCode,
    },
    html: {
      label: "HTML File",
      color: "text-indigo-500 dark:text-indigo-400",
      border: "border-indigo-500/20 dark:border-indigo-500/30",
      bg: "bg-indigo-500/10",
      icon: FileCode,
    },
  };

  const cfg = formatConfig[doc.format] || formatConfig.pdf;
  const FormatIcon = cfg.icon;

  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloading(true);
    try {
      await exportAndDownloadDocument(doc);
      setDownloadSuccess(true);
      showToast(`${cfg.label} downloaded`);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error("Document download error:", err);
      showToast("Download failed, please retry");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc.title,
          text: doc.summary || doc.title,
        });
        showToast("Shared successfully");
      } catch (_) {}
    } else {
      try {
        const content = doc.rawMarkdown || doc.title;
        await navigator.clipboard.writeText(content);
        showToast("Document link copied to clipboard");
      } catch (_) {
        showToast("Could not share document");
      }
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(doc);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(doc);
    }
  };

  // Compute file name & size string
  const fileName =
    doc.filename ||
    `${(doc.title || "document").toLowerCase().replace(/\s+/g, "_")}.${doc.format}`;
  const rawLength =
    (doc.rawMarkdown?.length || 0) +
    JSON.stringify(doc.sections || []).length +
    JSON.stringify(doc.slides || []).length +
    JSON.stringify(doc.sheets || []).length;
  const estimatedKb = Math.max(12, Math.round(rawLength / 1024 + 18));
  const fileSizeStr =
    estimatedKb >= 1024 ? `${(estimatedKb / 1024).toFixed(1)} MB` : `${estimatedKb} KB`;

  return (
    <div
      onClick={(e) => {
        if (onPreview) {
          onPreview(doc);
        } else {
          handleDownload(e);
        }
      }}
      className={`my-2.5 w-full max-w-md rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md relative overflow-hidden p-3 sm:p-3.5 select-none cursor-pointer group/doc ${
        isDark
          ? "bg-zinc-900/90 border-zinc-800 text-zinc-100 hover:border-zinc-700/80 hover:bg-zinc-850"
          : "bg-white border-zinc-200 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      {/* Toast Popup */}
      {toastMessage && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/90 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-xs px-3 py-1 rounded-full shadow-lg backdrop-blur-md font-sans font-medium animate-fadeIn border border-zinc-700/50">
          {toastMessage}
        </div>
      )}

      {/* Main File Header Row */}
      <div className="flex items-center gap-3">
        {/* File Type Icon */}
        <div
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover/doc:scale-105 ${cfg.bg} ${cfg.border} ${cfg.color}`}
        >
          <FormatIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        {/* File Name & Subtitle */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs sm:text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100 tracking-tight group-hover/doc:text-sky-500 transition-colors">
            {fileName}
          </h4>
          <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-sans truncate mt-0.5">
            {cfg.label} • {fileSizeStr}
          </p>
        </div>

        {/* Download Button on Far Right */}
        <button
          type="button"
          onClick={handleDownload}
          title="Download document"
          aria-label="Download document"
          className="shrink-0 p-2 rounded-xl text-zinc-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
        >
          {downloadSuccess ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : downloading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
});

