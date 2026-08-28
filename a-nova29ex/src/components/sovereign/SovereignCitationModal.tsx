import React, { useState } from "react";
import { X, FileText, CheckCircle2, Copy, Check, ExternalLink, Shield } from "lucide-react";
import { DocumentCitation } from "../../types/sovereign";
import { motion, AnimatePresence } from "motion/react";

interface SovereignCitationModalProps {
  citation: DocumentCitation | null;
  onClose: () => void;
  isDark?: boolean;
}

export const SovereignCitationModal: React.FC<SovereignCitationModalProps> = ({
  citation,
  onClose,
  isDark = true
}) => {
  const [copied, setCopied] = useState(false);

  if (!citation) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(citation.chunkText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
            isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
          }`}
        >
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between ${
            isDark ? "border-zinc-850 bg-zinc-900/60" : "border-zinc-200 bg-zinc-50"
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold truncate max-w-sm">
                    {citation.documentName}
                  </h3>
                  {citation.pageNumber && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      Page {citation.pageNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                  <span>Match Confidence: {(citation.similarity * 100).toFixed(0)}%</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-500">
                    <Shield className="w-3 h-3" />
                    Verified Local RAG Source
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-200 text-zinc-600"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chunk Content */}
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Referenced Passage Excerpt
              </span>
              <div className={`p-4 rounded-xl border font-mono text-xs leading-relaxed whitespace-pre-wrap select-text ${
                isDark ? "bg-zinc-900/70 border-zinc-800 text-zinc-200" : "bg-zinc-100 border-zinc-200 text-zinc-800"
              }`}>
                {citation.chunkText}
              </div>
            </div>

            {citation.heading && (
              <div className="text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">Section: </span>
                {citation.heading}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-4 border-t flex items-center justify-between ${
            isDark ? "border-zinc-850 bg-zinc-900/40" : "border-zinc-200 bg-zinc-50"
          }`}>
            <span className="text-xs text-zinc-500">
              Retrieved locally from encrypted workspace store
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  copied
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                    : isDark
                      ? "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200"
                      : "bg-zinc-200 hover:bg-zinc-300 border-zinc-300 text-zinc-800"
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy Passage"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl text-xs font-medium bg-amber-500 hover:bg-amber-600 text-black font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
