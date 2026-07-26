import React from "react";
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Download,
  Eye,
  Edit3,
  RefreshCw,
  FileCheck,
  Table,
  Layers,
  Sparkles
} from "lucide-react";
import { GeneratedDocument, DocumentFormat } from "../types/document";
import { exportAndDownloadDocument } from "../utils/documentGenerator";

interface DocumentCardProps {
  document: GeneratedDocument;
  onPreview: (doc: GeneratedDocument) => void;
  onEdit: (doc: GeneratedDocument) => void;
  onRegenerate?: (doc: GeneratedDocument) => void;
  isDark?: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: doc,
  onPreview,
  onEdit,
  onRegenerate,
  isDark = true,
}) => {
  const [downloading, setDownloading] = React.useState(false);
  const [downloadSuccess, setDownloadSuccess] = React.useState(false);

  const formatConfig: Record<
    DocumentFormat,
    { label: string; ext: string; color: string; border: string; bg: string; icon: any }
  > = {
    pdf: {
      label: "PDF Report",
      ext: ".pdf",
      color: "text-red-500 dark:text-red-400",
      border: "border-red-500/30",
      bg: "bg-red-500/10",
      icon: FileText,
    },
    docx: {
      label: "Word Document",
      ext: ".docx",
      color: "text-blue-500 dark:text-blue-400",
      border: "border-blue-500/30",
      bg: "bg-blue-500/10",
      icon: FileText,
    },
    pptx: {
      label: "PowerPoint Presentation",
      ext: ".pptx",
      color: "text-amber-500 dark:text-amber-400",
      border: "border-amber-500/30",
      bg: "bg-amber-500/10",
      icon: Presentation,
    },
    xlsx: {
      label: "Excel Spreadsheet",
      ext: ".xlsx",
      color: "text-emerald-500 dark:text-emerald-400",
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/10",
      icon: FileSpreadsheet,
    },
    csv: {
      label: "CSV File",
      ext: ".csv",
      color: "text-purple-500 dark:text-purple-400",
      border: "border-purple-500/30",
      bg: "bg-purple-500/10",
      icon: Table,
    },
    md: {
      label: "Markdown Notes",
      ext: ".md",
      color: "text-cyan-500 dark:text-cyan-400",
      border: "border-cyan-500/30",
      bg: "bg-cyan-500/10",
      icon: FileCode,
    },
    txt: {
      label: "Text File",
      ext: ".txt",
      color: "text-zinc-500 dark:text-zinc-400",
      border: "border-zinc-500/30",
      bg: "bg-zinc-500/10",
      icon: FileText,
    },
    json: {
      label: "JSON Structure",
      ext: ".json",
      color: "text-yellow-500 dark:text-yellow-400",
      border: "border-yellow-500/30",
      bg: "bg-yellow-500/10",
      icon: FileCode,
    },
    html: {
      label: "HTML Document",
      ext: ".html",
      color: "text-indigo-500 dark:text-indigo-400",
      border: "border-indigo-500/30",
      bg: "bg-indigo-500/10",
      icon: FileCode,
    },
  };

  const cfg = formatConfig[doc.format] || formatConfig.pdf;
  const FormatIcon = cfg.icon;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      await exportAndDownloadDocument(doc);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error("Document download error:", err);
    } finally {
      setDownloading(false);
    }
  };

  const sectionCount = doc.sections ? doc.sections.length : 0;
  const slideCount = doc.slides ? doc.slides.length : 0;
  const tableCount = doc.sections ? doc.sections.filter((s) => s.type === "table").length : 0;

  return (
    <div
      className={`my-3.5 w-full rounded-2xl border transition-all duration-200 shadow-md select-none overflow-hidden ${
        isDark
          ? "bg-zinc-900/95 border-zinc-800 text-zinc-100 hover:border-zinc-700"
          : "bg-white border-zinc-200 text-zinc-900 hover:border-zinc-300 shadow-xs"
      }`}
    >
      {/* Top Banner Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${
        isDark ? "bg-zinc-950/60 border-zinc-800/80" : "bg-zinc-50 border-zinc-200/80"
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-2 rounded-xl border ${cfg.bg} ${cfg.border} ${cfg.color} shrink-0`}>
            <FormatIcon className="w-5 h-5" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-mono font-semibold uppercase px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                {doc.format.toUpperCase()}
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium truncate">
                {cfg.label}
              </span>
            </div>
            <h4 className="text-sm font-semibold tracking-tight truncate mt-0.5">
              {doc.title}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Auto-Generated
          </span>
        </div>
      </div>

      {/* Body Content & Summary */}
      <div className="p-4 space-y-3">
        {doc.summary && (
          <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 line-clamp-2 italic">
            "{doc.summary}"
          </p>
        )}

        {/* Metadata Details Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          {sectionCount > 0 && (
            <span className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
              isDark ? "bg-zinc-800/70 border border-zinc-700/50" : "bg-zinc-100 border border-zinc-200"
            }`}>
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              {sectionCount} {sectionCount === 1 ? "Section" : "Sections"}
            </span>
          )}

          {slideCount > 0 && (
            <span className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
              isDark ? "bg-zinc-800/70 border border-zinc-700/50" : "bg-zinc-100 border border-zinc-200"
            }`}>
              <Presentation className="w-3.5 h-3.5 text-amber-400" />
              {slideCount} Slides
            </span>
          )}

          {tableCount > 0 && (
            <span className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
              isDark ? "bg-zinc-800/70 border border-zinc-700/50" : "bg-zinc-100 border border-zinc-200"
            }`}>
              <Table className="w-3.5 h-3.5 text-emerald-400" />
              {tableCount} {tableCount === 1 ? "Table" : "Tables"}
            </span>
          )}

          <span className="ml-auto font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
            {doc.filename}
          </span>
        </div>

        {/* Quick Actions Toolbar */}
        <div className={`pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-2 ${
          isDark ? "border-zinc-800/80" : "border-zinc-200/80"
        }`}>
          {/* 1-Click Preview */}
          <button
            type="button"
            onClick={() => onPreview(doc)}
            className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isDark
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            Preview
          </button>

          {/* 1-Click Download */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              downloadSuccess
                ? "bg-emerald-600 text-white"
                : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs"
            }`}
          >
            {downloadSuccess ? (
              <>
                <FileCheck className="w-3.5 h-3.5" />
                Downloaded!
              </>
            ) : downloading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Download
              </>
            )}
          </button>

          {/* 1-Click Edit */}
          <button
            type="button"
            onClick={() => onEdit(doc)}
            className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isDark
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            Edit
          </button>

          {/* 1-Click Regenerate */}
          {onRegenerate && (
            <button
              type="button"
              onClick={() => onRegenerate(doc)}
              className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isDark
                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
              Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
