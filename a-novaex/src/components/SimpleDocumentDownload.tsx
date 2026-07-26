import React, { useState, useEffect } from "react";
import { Download, CheckCircle2, AlertCircle, Loader2, FileText, FileSpreadsheet, Presentation, Table, FileCode } from "lucide-react";
import { GeneratedDocument, DocumentFormat } from "../types/document";
import { exportAndDownloadDocument } from "../utils/documentGenerator";

interface SimpleDocumentDownloadProps {
  document: GeneratedDocument;
  isDark?: boolean;
}

const formatLabels: Record<DocumentFormat, string> = {
  pdf: "PDF",
  docx: "DOCX",
  pptx: "PPTX",
  xlsx: "XLSX",
  csv: "CSV",
  md: "Markdown",
  txt: "Text",
  json: "JSON",
  html: "HTML",
};

const formatIcons: Record<DocumentFormat, any> = {
  pdf: FileText,
  docx: FileText,
  pptx: Presentation,
  xlsx: FileSpreadsheet,
  csv: Table,
  md: FileCode,
  txt: FileText,
  json: FileCode,
  html: FileCode,
};

export const SimpleDocumentDownload: React.FC<SimpleDocumentDownloadProps> = ({
  document: doc,
  isDark = true,
}) => {
  const [status, setStatus] = useState<"generating" | "ready" | "error">("generating");
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    setStatus("generating");
    setErrorMessage("");

    const timer = setTimeout(() => {
      if (isMounted) {
        if (!doc) {
          setStatus("error");
          setErrorMessage("Failed to generate file.");
        } else {
          setStatus("ready");
        }
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [doc]);

  const handleDownload = async () => {
    if (!doc) return;
    setDownloading(true);
    try {
      await exportAndDownloadDocument(doc);
    } catch (err: any) {
      console.error("File download error:", err);
      setStatus("error");
      setErrorMessage(err?.message || "Failed to download file.");
    } finally {
      setDownloading(false);
    }
  };

  const label = formatLabels[doc.format] || doc.format.toUpperCase();

  if (status === "generating") {
    return (
      <div
        className={`my-2.5 p-3 sm:p-3.5 rounded-xl border flex items-center gap-3 text-xs transition-all ${
          isDark
            ? "bg-zinc-900/80 border-zinc-800 text-zinc-300"
            : "bg-zinc-50 border-zinc-200 text-zinc-700"
        }`}
      >
        <Loader2 className="w-4 h-4 animate-spin text-cyan-500 shrink-0" />
        <span className="font-medium">Generating {label} in background...</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className={`my-2.5 p-3 sm:p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
          isDark
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-red-50 border-red-200 text-red-600"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span className="font-medium truncate">
            {errorMessage || `Failed to generate ${label}.`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setStatus("generating")}
          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-red-500/15 hover:bg-red-500/25 transition-colors cursor-pointer shrink-0"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className={`my-2.5 p-3 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
        isDark
          ? "bg-zinc-900/80 border-zinc-800 text-zinc-100"
          : "bg-zinc-50/90 border-zinc-200 text-zinc-900"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold">✅ Your {label} is ready.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shrink-0 shadow-xs disabled:opacity-50"
      >
        {downloading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Downloading...</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span>Download {label}</span>
          </>
        )}
      </button>
    </div>
  );
};
