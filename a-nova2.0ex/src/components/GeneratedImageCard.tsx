import React, { useState } from "react";
import { Download, Edit3, RotateCw, Share2, Trash2, Sparkles, Image as ImageIcon, Maximize2, Eye, Info, ChevronDown, ChevronUp } from "lucide-react";
import { GeneratedImage } from "../types";
import ImageViewerModal from "./ImageViewerModal";

interface GeneratedImageCardProps {
  key?: string | number;
  image?: GeneratedImage;
  isGenerating?: boolean;
  promptText?: string;
  isDark?: boolean;
  onEdit?: (image: GeneratedImage) => void;
  onRegenerate?: (image: GeneratedImage) => void;
  onDelete?: (image: GeneratedImage) => void;
  allImagesInChat?: GeneratedImage[];
}

export default function GeneratedImageCard({
  image,
  isGenerating = false,
  promptText = "Generating image...",
  isDark = true,
  onEdit,
  onRegenerate,
  onDelete,
  allImagesInChat = [],
}: GeneratedImageCardProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // If in generating/loading state
  if (isGenerating || !image) {
    return (
      <div className={`my-3.5 w-full max-w-2xl mx-auto rounded-2xl sm:rounded-3xl border p-3.5 sm:p-5 shadow-lg transition-all ${
        isDark ? "bg-zinc-900/90 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
      }`}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 animate-spin" />
          </div>
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Generating image...
          </p>
        </div>

        <div className="relative w-full aspect-square sm:aspect-video rounded-xl sm:rounded-2xl bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden flex flex-col items-center justify-center p-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center mb-2.5">
            <ImageIcon className="w-5 h-5 text-sky-500 animate-pulse" />
          </div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 max-w-md line-clamp-2 italic">
            "{promptText}"
          </p>
          <div className="w-48 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mt-3 overflow-hidden relative">
            <div className="h-full bg-sky-500 rounded-full animate-[shimmer_1.5s_infinite] w-full transform -translate-x-full" />
          </div>
        </div>
      </div>
    );
  }

  const handleDownload = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const link = document.createElement("a");
      link.href = image.url;
      link.download = `A-NOVA_Artwork_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Downloading image...");
    } catch (_) {
      showToast("Download started");
    }
  };

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "A-NOVA Generated Image",
          text: image.prompt,
          url: image.url,
        });
        showToast("Shared successfully");
      } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(image.url);
        showToast("Image link copied to clipboard");
      } catch (_) {
        showToast("Could not share link");
      }
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(image);
    } else {
      showToast("Edit prompt loaded");
    }
  };

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRegenerate) {
      onRegenerate(image);
    } else {
      showToast("Regenerating image...");
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(image);
    }
  };

  // Find index in chat images list for modal
  const galleryImages = allImagesInChat.length > 0 ? allImagesInChat : [image];
  const activeIdx = Math.max(0, galleryImages.findIndex((g) => g.url === image.url));

  return (
    <>
      <div className={`my-3.5 w-full max-w-2xl mx-auto rounded-2xl sm:rounded-3xl border transition-all duration-300 shadow-md hover:shadow-lg relative overflow-hidden group p-3 sm:p-4 ${
        isDark
          ? "bg-zinc-900/95 border-zinc-800/80 text-zinc-100"
          : "bg-white border-zinc-200/90 text-zinc-900"
      }`}>
        {/* Toast Popup */}
        {toastMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/90 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-xs px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md font-sans font-medium animate-fadeIn border border-zinc-700/50">
            {toastMessage}
          </div>
        )}

        {/* Clean Image Container */}
        <div
          onClick={() => setIsViewerOpen(true)}
          className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer bg-zinc-950/40 dark:bg-zinc-950/80 group/img aspect-auto min-h-[220px] sm:min-h-[320px] flex items-center justify-center border border-zinc-200/60 dark:border-zinc-800/60"
        >
          <img
            src={image.url}
            alt={image.prompt || "AI Generated Artwork"}
            className="w-full h-auto max-h-[520px] object-contain rounded-xl sm:rounded-2xl transition-transform duration-300 group-hover/img:scale-[1.01]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />

          {/* Hover Overlay Hint */}
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-all flex items-center justify-center backdrop-blur-0 group-hover/img:backdrop-blur-[1px]">
            <span className="opacity-0 group-hover/img:opacity-100 transition-all transform translate-y-2 group-hover/img:translate-y-0 px-3 py-1.5 rounded-full bg-black/80 text-white text-xs font-sans font-medium backdrop-blur-md shadow-lg flex items-center gap-1.5 border border-white/20">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expand</span>
            </span>
          </div>
        </div>

        {/* Simple Caption (only if user provided prompt text) */}
        {image.prompt && image.prompt.trim().length > 0 && (
          <p className="mt-2.5 px-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-sans leading-relaxed">
            {image.prompt}
          </p>
        )}

        {/* Expandable Image Info Details Section */}
        {showDetails && (
          <div className="mt-3 p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 text-xs font-mono space-y-1.5 text-zinc-600 dark:text-zinc-400 animate-fadeIn">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1.5 font-sans">
              <Info className="w-3.5 h-3.5 text-sky-500" />
              <span>Image Info</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-zinc-400">Format:</span> PNG</div>
              <div><span className="text-zinc-400">Resolution:</span> {image.width || 1024} × {image.height || 1024}</div>
              <div><span className="text-zinc-400">Aspect Ratio:</span> {image.aspectRatio || "1:1"}</div>
              <div><span className="text-zinc-400">Provider:</span> {image.provider || "DALL-E 3 / Imagen"}</div>
            </div>
          </div>
        )}

        {/* Action Bar Below Image */}
        <div className={`mt-3 pt-2.5 border-t flex flex-wrap items-center justify-between sm:justify-center gap-1 sm:gap-3 text-xs font-sans ${
          isDark ? "border-zinc-800/80 text-zinc-300" : "border-zinc-200/80 text-zinc-700"
        }`}>
          <button
            onClick={() => setIsViewerOpen(true)}
            type="button"
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-sky-500 transition font-medium text-[11px] sm:text-xs cursor-pointer"
            title="Open Fullscreen View"
          >
            <Eye className="w-3.5 h-3.5 text-sky-500" />
            <span>Open</span>
          </button>

          <button
            onClick={handleDownload}
            type="button"
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-sky-500 transition font-medium text-[11px] sm:text-xs cursor-pointer"
            title="Download Image"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Download</span>
          </button>

          <button
            onClick={handleShare}
            type="button"
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-sky-500 transition font-medium text-[11px] sm:text-xs cursor-pointer"
            title="Share Image"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Share</span>
          </button>

          <button
            onClick={handleEdit}
            type="button"
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-sky-500 transition font-medium text-[11px] sm:text-xs cursor-pointer"
            title="Edit Prompt"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Edit</span>
          </button>

          <button
            onClick={handleRegenerate}
            type="button"
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-sky-500 transition font-medium text-[11px] sm:text-xs cursor-pointer"
            title="Regenerate Image"
          >
            <RotateCw className="w-3.5 h-3.5 text-emerald-500" />
            <span>Regenerate</span>
          </button>

          <button
            onClick={handleDelete}
            type="button"
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-500 transition font-medium text-[11px] sm:text-xs cursor-pointer"
            title="Delete Image"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            type="button"
            className={`flex items-center gap-1 py-1.5 px-2 rounded-xl transition font-medium text-[11px] sm:text-xs cursor-pointer ${
              showDetails
                ? "bg-sky-500/10 text-sky-500 font-semibold"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
            title="Image Details"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Details</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Full Screen Lightbox Modal */}
      <ImageViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        images={galleryImages}
        currentIndex={activeIdx}
        onDownload={handleDownload}
        onShare={handleShare}
      />
    </>
  );
}
