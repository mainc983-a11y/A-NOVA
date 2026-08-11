import React, { useState, useEffect, useCallback } from "react";
import { Download, Sparkles, Maximize2, Loader2, AlertCircle, RotateCw } from "lucide-react";
import { GeneratedImage } from "../types";
import ImageViewerModal from "./ImageViewerModal";
import ImageEditModal from "./ImageEditModal";

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

const GeneratedImageCard = React.memo(function GeneratedImageCard({
  image,
  isGenerating = false,
  promptText = "Generating image...",
  isDark = true,
  onEdit,
  onRegenerate,
  allImagesInChat = [],
}: GeneratedImageCardProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset image load state whenever image URL changes
  useEffect(() => {
    if (image?.url) {
      setIsImgLoaded(false);
      setHasError(false);
    }
  }, [image?.url]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const handleDownload = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!image?.url) return;
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
    if (!image) return;
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

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (image && onRegenerate) {
      onRegenerate(image);
    } else {
      showToast("Regenerating image...");
    }
  };

  // Find index in chat images list for modal
  const galleryImages = image ? (allImagesInChat.length > 0 ? allImagesInChat : [image]) : [];
  const activeIdx = image ? Math.max(0, galleryImages.findIndex((g) => g.url === image.url)) : 0;

  // Determine if we should show the generating/loading state
  const isPending = isGenerating || !image || !isImgLoaded;
  const currentPrompt = image?.prompt || promptText || "Generating image...";

  return (
    <>
      <div
        className={`my-3.5 w-full max-w-full xs:max-w-[320px] sm:max-w-[340px] md:max-w-[332px] mx-auto rounded-2xl sm:rounded-3xl border transition-all duration-300 shadow-md hover:shadow-lg relative overflow-hidden group p-3.5 sm:p-4 ${
          isDark
            ? "bg-zinc-900/95 border-zinc-800/80 text-zinc-100"
            : "bg-white border-zinc-200/90 text-zinc-900"
        }`}
      >
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/90 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-xs px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md font-sans font-medium animate-fadeIn border border-zinc-700/50 pointer-events-none">
            {toastMessage}
          </div>
        )}

        {/* Status Header */}
        <div className="flex items-center justify-between gap-2 mb-3 px-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300 ${
                isPending && !hasError
                  ? "bg-sky-500/10 text-sky-500"
                  : hasError
                  ? "bg-red-500/10 text-red-500"
                  : "bg-emerald-500/10 text-emerald-500"
              }`}
            >
              {isPending && !hasError ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
              ) : hasError ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </div>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
              {isPending && !hasError ? "Generating image..." : hasError ? "Generation failed" : "Image generated"}
            </p>
          </div>

          {image && !isPending && !hasError && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                title="Download image"
                aria-label="Download image"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Centered Square Container for Skeleton & Final Image */}
        <div
          onClick={() => {
            if (image && isImgLoaded && !hasError) setIsViewerOpen(true);
          }}
          className={`relative w-full aspect-square max-w-[300px] max-h-[300px] mx-auto rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-center transition-all duration-300 ${
            image && isImgLoaded && !hasError ? "cursor-pointer group/img" : ""
          }`}
        >
          {/* Skeleton / Loading Placeholder */}
          {(isPending || hasError) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-5 text-center select-none">
              {/* GPU-accelerated Shimmer Sweep */}
              {!hasError && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-500/15 dark:via-sky-400/10 to-transparent animate-shimmer pointer-events-none transform-gpu" />
              )}

              {hasError ? (
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 mb-1">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Unable to load image preview.</p>
                  {onRegenerate && image && (
                    <button
                      type="button"
                      onClick={handleRegenerate}
                      className="mt-1 px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="relative z-10 w-11 h-11 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 flex items-center justify-center mb-3 border border-sky-500/20">
                    <Loader2 className="w-5.5 h-5.5 text-sky-500 animate-spin" />
                  </div>
                  <p className="relative z-10 text-xs font-medium text-zinc-500 dark:text-zinc-400 max-w-[220px] line-clamp-2 italic">
                    "{currentPrompt}"
                  </p>
                </>
              )}
            </div>
          )}

          {/* Render Actual Image */}
          {image?.url && (
            <img
              src={image.url}
              alt={image.prompt || "AI Generated Artwork"}
              onLoad={() => setIsImgLoaded(true)}
              onError={() => {
                setIsImgLoaded(false);
                setHasError(true);
              }}
              className={`w-full h-full object-contain rounded-xl sm:rounded-2xl transition-opacity duration-300 ease-out transform-gpu ${
                isImgLoaded && !hasError ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
              } group-hover/img:scale-[1.01] transition-transform duration-300`}
              loading="eager"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Hover Overlay Hint when Image Loaded */}
          {image && isImgLoaded && !hasError && (
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-all flex items-center justify-center backdrop-blur-0 group-hover/img:backdrop-blur-[1px] pointer-events-none z-20">
              <span className="opacity-0 group-hover/img:opacity-100 transition-all transform translate-y-2 group-hover/img:translate-y-0 px-3 py-1.5 rounded-full bg-black/80 text-white text-xs font-sans font-medium backdrop-blur-md shadow-lg flex items-center gap-1.5 border border-white/20">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Expand</span>
              </span>
            </div>
          )}
        </div>

        {/* Prompt Caption below image */}
        {currentPrompt && currentPrompt.trim().length > 0 && (
          <p className="mt-2.5 px-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-sans leading-relaxed line-clamp-3">
            {currentPrompt}
          </p>
        )}
      </div>

      {/* Full Screen Lightbox Modal */}
      {image && (
        <ImageViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          images={galleryImages}
          currentIndex={activeIdx}
          onDownload={() => handleDownload()}
          onShare={() => handleShare()}
        />
      )}

      {/* Dedicated Image Edit Modal */}
      {image && (
        <ImageEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          image={image}
          isDark={isDark}
          onSavePrompt={(img, newPrompt) => {
            img.prompt = newPrompt;
            if (onEdit) onEdit(img);
            showToast("Image prompt updated");
          }}
          onRegenerateImage={(img, newPrompt, ratio) => {
            img.prompt = newPrompt;
            if (onRegenerate) onRegenerate(img);
            else if (onEdit) onEdit(img);
            showToast("Regenerating with updated prompt...");
          }}
        />
      )}
    </>
  );
});

export default GeneratedImageCard;
