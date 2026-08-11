import React, { useState, useEffect } from "react";
import { X, Sparkles, RefreshCw, Check, Image as ImageIcon } from "lucide-react";
import { GeneratedImage } from "../types";

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: GeneratedImage | null;
  onSavePrompt?: (image: GeneratedImage, updatedPrompt: string) => void;
  onRegenerateImage?: (image: GeneratedImage, updatedPrompt: string, aspectRatio?: string) => void;
  isDark?: boolean;
}

export default function ImageEditModal({
  isOpen,
  onClose,
  image,
  onSavePrompt,
  onRegenerateImage,
  isDark = true,
}: ImageEditModalProps) {
  const [promptText, setPromptText] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (image) {
      setPromptText(image.prompt || "");
    }
  }, [image]);

  if (!isOpen || !image) return null;

  const handleSaveOnly = () => {
    if (onSavePrompt) {
      onSavePrompt(image, promptText);
    } else {
      image.prompt = promptText;
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleRegenerate = () => {
    if (onRegenerateImage) {
      onRegenerateImage(image, promptText, aspectRatio);
    } else if (onSavePrompt) {
      onSavePrompt(image, promptText);
    }
    onClose();
  };

  return (
    <div
      id="image_edit_modal_overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 sm:backdrop-blur-sm select-none touch-action-manipulation"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-lg rounded-3xl p-6 shadow-2xl border flex flex-col gap-4 overflow-hidden transform-gpu transition-all ${
          isDark
            ? "bg-zinc-900 border-zinc-800 text-zinc-100"
            : "bg-white border-zinc-200 text-zinc-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-semibold">
              <Sparkles className="w-4 h-4 text-sky-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Edit Image Details</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Modify prompt or regenerate visual content
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image Preview & Prompt Field */}
        <div className="flex gap-4 items-start">
          {image.url && (
            <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 relative group">
              <img
                src={image.url}
                alt={image.prompt}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Image Prompt
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={3}
              className={`w-full p-3 text-xs rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                  : "bg-zinc-50 border-zinc-200 text-zinc-900"
              }`}
              placeholder="Describe what you'd like to create..."
            />
          </div>
        </div>

        {/* Aspect Ratio Picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Aspect Ratio
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "1:1", label: "Square (1:1)" },
              { id: "16:9", label: "Landscape (16:9)" },
              { id: "9:16", label: "Portrait (9:16)" },
            ].map((ratio) => (
              <button
                key={ratio.id}
                type="button"
                onClick={() => setAspectRatio(ratio.id)}
                className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer text-center ${
                  aspectRatio === ratio.id
                    ? "bg-sky-500/15 border-sky-500 text-sky-500 dark:text-sky-400 font-bold"
                    : isDark
                    ? "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveOnly}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              savedSuccess
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                : isDark
                ? "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                : "bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200"
            }`}
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{savedSuccess ? "Saved!" : "Save Prompt"}</span>
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate Image</span>
          </button>
        </div>
      </div>
    </div>
  );
}
