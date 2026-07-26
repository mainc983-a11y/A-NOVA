import React, { useState } from "react";
import {
  X,
  Download,
  Eye,
  Edit3,
  RefreshCw,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Table,
  Layers,
  Sparkles,
  Check,
  Maximize2
} from "lucide-react";
import { GeneratedDocument, DocumentFormat, DocumentSection, DocumentSlide } from "../types/document";
import { exportAndDownloadDocument } from "../utils/documentGenerator";

interface DocumentModalProps {
  document: GeneratedDocument;
  isOpen: boolean;
  onClose: () => void;
  onRegenerate?: (doc: GeneratedDocument) => void;
  isDark?: boolean;
  initialMode?: "preview" | "edit";
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  document: initialDoc,
  isOpen,
  onClose,
  onRegenerate,
  isDark = true,
  initialMode = "preview",
}) => {
  const [doc, setDoc] = useState<GeneratedDocument>(initialDoc);
  const [mode, setMode] = useState<"preview" | "edit">(initialMode);
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [activeFormat, setActiveFormat] = useState<DocumentFormat>(initialDoc.format);

  React.useEffect(() => {
    setDoc(initialDoc);
    setActiveFormat(initialDoc.format);
  }, [initialDoc]);

  if (!isOpen) return null;

  const handleFormatChange = (newFmt: DocumentFormat) => {
    setActiveFormat(newFmt);
    const cleanExtName = doc.title.replace(/\s+/g, "_");
    setDoc((prev) => ({
      ...prev,
      format: newFmt,
      filename: `${cleanExtName}.${newFmt}`,
    }));
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await exportAndDownloadDocument({ ...doc, format: activeFormat });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to download document:", err);
    } finally {
      setDownloading(false);
    }
  };

  // Section Editing Helpers
  const handleUpdateSectionTitle = (idx: number, newTitle: string) => {
    const updated = [...doc.sections];
    updated[idx] = { ...updated[idx], title: newTitle };
    setDoc({ ...doc, sections: updated });
  };

  const handleUpdateSectionContent = (idx: number, newContent: string) => {
    const updated = [...doc.sections];
    updated[idx] = { ...updated[idx], content: newContent };
    setDoc({ ...doc, sections: updated });
  };

  const handleAddBullet = (secIdx: number) => {
    const updated = [...doc.sections];
    const sec = updated[secIdx];
    const bullets = sec.bullets ? [...sec.bullets, "New key point..."] : ["New key point..."];
    updated[secIdx] = { ...sec, bullets };
    setDoc({ ...doc, sections: updated });
  };

  const handleUpdateBullet = (secIdx: number, bulletIdx: number, val: string) => {
    const updated = [...doc.sections];
    const sec = updated[secIdx];
    if (sec.bullets) {
      const bullets = [...sec.bullets];
      bullets[bulletIdx] = val;
      updated[secIdx] = { ...sec, bullets };
      setDoc({ ...doc, sections: updated });
    }
  };

  const handleDeleteBullet = (secIdx: number, bulletIdx: number) => {
    const updated = [...doc.sections];
    const sec = updated[secIdx];
    if (sec.bullets) {
      const bullets = sec.bullets.filter((_, i) => i !== bulletIdx);
      updated[secIdx] = { ...sec, bullets };
      setDoc({ ...doc, sections: updated });
    }
  };

  const handleAddSection = () => {
    const newSec: DocumentSection = {
      id: "sec_" + Math.random().toString(36).substring(2, 8),
      title: "New Section",
      type: "paragraph",
      content: "Enter your section narrative or notes here...",
      bullets: [],
    };
    setDoc({ ...doc, sections: [...doc.sections, newSec] });
  };

  const handleDeleteSection = (secIdx: number) => {
    const updated = doc.sections.filter((_, i) => i !== secIdx);
    setDoc({ ...doc, sections: updated });
  };

  // PowerPoint Slide Editing Helpers
  const handleUpdateSlideTitle = (sIdx: number, newTitle: string) => {
    if (!doc.slides) return;
    const slides = [...doc.slides];
    slides[sIdx] = { ...slides[sIdx], title: newTitle };
    setDoc({ ...doc, slides });
  };

  const handleAddSlide = () => {
    const slides = doc.slides ? [...doc.slides] : [];
    const newSlide: DocumentSlide = {
      id: "slide_" + (slides.length + 1),
      slideNumber: slides.length + 1,
      title: `Slide ${slides.length + 1}`,
      bulletPoints: ["Key topic highlight..."],
    };
    setDoc({ ...doc, slides: [...slides, newSlide] });
    setActiveSlideIdx(slides.length);
  };

  const formatsList: { id: DocumentFormat; label: string }[] = [
    { id: "pdf", label: "PDF (.pdf)" },
    { id: "docx", label: "Word (.docx)" },
    { id: "pptx", label: "PowerPoint (.pptx)" },
    { id: "xlsx", label: "Excel (.xlsx)" },
    { id: "csv", label: "CSV (.csv)" },
    { id: "md", label: "Markdown (.md)" },
    { id: "txt", label: "Text (.txt)" },
    { id: "json", label: "JSON (.json)" },
    { id: "html", label: "HTML (.html)" },
  ];

  const slides = doc.slides && doc.slides.length > 0 ? doc.slides : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-5xl h-[92vh] max-h-[920px] rounded-3xl border flex flex-col shadow-2xl overflow-hidden transition-all ${
          isDark
            ? "bg-zinc-900 border-zinc-800 text-zinc-100"
            : "bg-white border-zinc-200 text-zinc-900"
        }`}
      >
        {/* Top Header Bar */}
        <div
          className={`px-4 sm:px-6 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${
            isDark ? "bg-zinc-950/80 border-zinc-800" : "bg-zinc-50 border-zinc-200"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wide uppercase text-cyan-500 dark:text-cyan-400">
                  A-NOVA Document Studio
                </span>
                <span className="text-zinc-400">•</span>
                <span className="text-xs text-zinc-400 font-mono">
                  {doc.date || new Date().toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold truncate tracking-tight">
                {doc.title}
              </h2>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Format Switcher */}
            <select
              value={activeFormat}
              onChange={(e) => handleFormatChange(e.target.value as DocumentFormat)}
              className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                isDark
                  ? "bg-zinc-800 border-zinc-700 text-cyan-400 focus:border-cyan-500"
                  : "bg-zinc-100 border-zinc-300 text-cyan-600 focus:border-cyan-500"
              }`}
            >
              {formatsList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>

            {/* Mode Toggle */}
            <div
              className={`flex items-center p-1 rounded-xl border ${
                isDark ? "bg-zinc-800 border-zinc-700" : "bg-zinc-100 border-zinc-200"
              }`}
            >
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  mode === "preview"
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  mode === "edit"
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                downloadSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:opacity-90 shadow-sm"
              }`}
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Downloaded
                </>
              ) : downloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Preparing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Download
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-600"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main View Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 select-text">
          {mode === "preview" ? (
            /* PREVIEW MODE */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* PowerPoint Slide Deck View */}
              {activeFormat === "pptx" ? (
                <div className="space-y-4">
                  {/* Active Slide Canvas */}
                  {slides.length > 0 && (
                    <div className="space-y-4">
                      <div
                        className={`aspect-video w-full rounded-2xl border p-6 sm:p-10 flex flex-col justify-between shadow-xl transition-all ${
                          isDark
                            ? "bg-gradient-to-br from-slate-900 to-zinc-900 border-zinc-800 text-zinc-100"
                            : "bg-gradient-to-br from-slate-50 to-white border-zinc-200 text-zinc-900"
                        }`}
                      >
                        {/* Slide Top Banner */}
                        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
                          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-cyan-500 dark:text-cyan-400">
                            {slides[activeSlideIdx]?.title || doc.title}
                          </h3>
                          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            Slide {activeSlideIdx + 1} / {slides.length}
                          </span>
                        </div>

                        {/* Bullet Points */}
                        <div className="my-auto py-4 space-y-3">
                          {slides[activeSlideIdx]?.bulletPoints?.map((bp, i) => (
                            <div key={i} className="flex items-start gap-3 text-sm sm:text-base">
                              <span className="w-2 h-2 rounded-full bg-cyan-400 mt-2 shrink-0" />
                              <p className="leading-relaxed font-medium">{bp}</p>
                            </div>
                          ))}
                        </div>

                        {/* Slide Footer */}
                        {slides[activeSlideIdx]?.keyTakeaway && (
                          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs sm:text-sm font-medium">
                            💡 <span className="font-bold">Key Takeaway:</span>{" "}
                            {slides[activeSlideIdx].keyTakeaway}
                          </div>
                        )}
                      </div>

                      {/* Slide Deck Navigation Controls */}
                      <div className="flex items-center justify-between gap-4">
                        <button
                          type="button"
                          disabled={activeSlideIdx === 0}
                          onClick={() => setActiveSlideIdx((p) => Math.max(0, p - 1))}
                          className={`px-4 py-2 rounded-xl border disabled:opacity-40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                            isDark
                              ? "bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-zinc-100"
                              : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800"
                          }`}
                        >
                          <ChevronLeft className="w-4 h-4" /> Previous Slide
                        </button>

                        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-md">
                          {slides.map((s, idx) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setActiveSlideIdx(idx)}
                              className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                                activeSlideIdx === idx
                                  ? "bg-cyan-500 text-white shadow-md scale-110"
                                  : isDark
                                  ? "bg-zinc-800 text-zinc-400 hover:text-white"
                                  : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                              }`}
                            >
                              {idx + 1}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          disabled={activeSlideIdx === slides.length - 1}
                          onClick={() =>
                            setActiveSlideIdx((p) => Math.min(slides.length - 1, p + 1))
                          }
                          className={`px-4 py-2 rounded-xl border disabled:opacity-40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                            isDark
                              ? "bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-zinc-100"
                              : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800"
                          }`}
                        >
                          Next Slide <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Standard Paper Document Preview (PDF, Word, Markdown, Excel, etc.) */
                <div
                  className={`w-full min-h-[680px] p-8 sm:p-12 rounded-2xl border shadow-xl transition-all ${
                    isDark
                      ? "bg-zinc-950 border-zinc-800/80 text-zinc-100"
                      : "bg-white border-zinc-200 text-zinc-900"
                  }`}
                >
                  {/* Document Title Banner */}
                  <div className="border-b pb-6 mb-8 border-zinc-200 dark:border-zinc-700/50">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-500">
                        A-NOVA GENERATED DOCUMENT
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        {doc.date || new Date().toLocaleDateString()}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {doc.title}
                    </h1>
                    {doc.subtitle && (
                      <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400 mt-1">
                        {doc.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Summary Callout */}
                  {doc.summary && (
                    <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-800 dark:text-cyan-200 text-sm leading-relaxed mb-8">
                      <strong className="font-semibold block mb-1">Executive Summary:</strong>
                      {doc.summary}
                    </div>
                  )}

                  {/* Sections List */}
                  <div className="space-y-8">
                    {doc.sections?.map((sec) => (
                      <div key={sec.id} className="space-y-3">
                        {sec.title && (
                          <h3 className="text-lg font-bold border-b border-zinc-200 dark:border-zinc-800 pb-2 text-zinc-900 dark:text-zinc-100">
                            {sec.title}
                          </h3>
                        )}

                        {sec.content && (
                          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                            {sec.content}
                          </p>
                        )}

                        {sec.bullets && sec.bullets.length > 0 && (
                          <ul className="space-y-2 pl-2">
                            {sec.bullets.map((b, bi) => (
                              <li
                                key={bi}
                                className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Table Render */}
                        {sec.type === "table" && sec.tableHeaders && sec.tableRows && (
                          <div className="overflow-x-auto my-4 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-zinc-100 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-700">
                                  {sec.tableHeaders.map((th, thi) => (
                                    <th key={thi} className="px-4 py-2.5 font-bold">
                                      {th}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                                {sec.tableRows.map((tr, tri) => (
                                  <tr
                                    key={tri}
                                    className={tri % 2 === 1 ? "bg-zinc-50 dark:bg-zinc-900/40" : "bg-transparent"}
                                  >
                                    {tr.map((tc, tci) => (
                                      <td key={tci} className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                                        {tc}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* EDIT MODE */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Document Header Metadata Editor */}
              <div
                className={`p-5 rounded-2xl border space-y-4 ${
                  isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                }`}
              >
                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-500 dark:text-cyan-400 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" /> Document Properties
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-600 dark:text-zinc-400">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={doc.title}
                      onChange={(e) => setDoc({ ...doc, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:border-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-zinc-600 dark:text-zinc-400">
                      Subtitle / Category
                    </label>
                    <input
                      type="text"
                      value={doc.subtitle || ""}
                      onChange={(e) => setDoc({ ...doc, subtitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:border-cyan-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-600 dark:text-zinc-400">
                    Executive Summary
                  </label>
                  <textarea
                    rows={2}
                    value={doc.summary || ""}
                    onChange={(e) => setDoc({ ...doc, summary: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              {/* Sections Editor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    Document Sections ({doc.sections.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Section
                  </button>
                </div>

                {doc.sections.map((sec, secIdx) => (
                  <div
                    key={sec.id}
                    className={`p-4 rounded-2xl border space-y-3 relative ${
                      isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={sec.title || ""}
                        placeholder="Section Heading..."
                        onChange={(e) => handleUpdateSectionTitle(secIdx, e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-sm font-bold text-cyan-600 dark:text-cyan-400 focus:border-cyan-500 outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => handleDeleteSection(secIdx)}
                        className="p-1.5 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      value={sec.content || ""}
                      placeholder="Section content narrative..."
                      onChange={(e) => handleUpdateSectionContent(secIdx, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed focus:border-cyan-500 outline-none"
                    />

                    {/* Bullets editor */}
                    <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Bullet Points</span>
                        <button
                          type="button"
                          onClick={() => handleAddBullet(secIdx)}
                          className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Plus className="w-3 h-3" /> Add Bullet
                        </button>
                      </div>

                      {sec.bullets?.map((bullet, bulletIdx) => (
                        <div key={bulletIdx} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                          <input
                            type="text"
                            value={bullet}
                            onChange={(e) =>
                              handleUpdateBullet(secIdx, bulletIdx, e.target.value)
                            }
                            className="flex-1 px-3 py-1 rounded-lg border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:border-cyan-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteBullet(secIdx, bulletIdx)}
                            className="p-1 text-zinc-400 hover:text-red-500 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
