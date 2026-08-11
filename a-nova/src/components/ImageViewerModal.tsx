import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Download, Share2, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { GeneratedImage } from "../types";

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: GeneratedImage[];
  currentIndex: number;
  onSelectIndex?: (index: number) => void;
  onDownload?: (image: GeneratedImage) => void;
  onShare?: (image: GeneratedImage) => void;
}

export default function ImageViewerModal({
  isOpen,
  onClose,
  images,
  currentIndex,
  onSelectIndex,
  onDownload,
  onShare,
}: ImageViewerModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeImage = images[currentIndex] || images[0];

  // Reset zoom and position when image changes or modal opens
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex, isOpen]);

  // Show toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && currentIndex > 0 && onSelectIndex) {
        onSelectIndex(currentIndex - 1);
      } else if (e.key === "ArrowRight" && currentIndex < images.length - 1 && onSelectIndex) {
        onSelectIndex(currentIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length, onSelectIndex, onClose]);

  if (!isOpen || !activeImage) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Double tap handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTime < 300) {
        // Double tap!
        if (scale > 1) {
          handleResetZoom();
        } else {
          setScale(2.5);
        }
      }
      setLastTapTime(now);
      setSwipeStartY(e.touches[0].clientY);
      setSwipeStartX(e.touches[0].clientX);
    } else if (e.touches.length === 2) {
      // Pinch gesture start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDist) {
      // Pinch zoom
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / touchStartDist;
      setScale((prev) => Math.min(Math.max(prev * (factor > 1 ? 1.03 : 0.97), 1), 4));
      setTouchStartDist(currentDist);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchStartDist(null);
    if (e.changedTouches.length === 1 && swipeStartY !== null && swipeStartX !== null) {
      const deltaY = e.changedTouches[0].clientY - swipeStartY;
      const deltaX = e.changedTouches[0].clientX - swipeStartX;

      // Swipe down to close (when not zoomed)
      if (scale === 1 && deltaY > 90 && Math.abs(deltaY) > Math.abs(deltaX)) {
        onClose();
      }
      // Swipe left / right to navigate
      else if (scale === 1 && Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY) && onSelectIndex) {
        if (deltaX < 0 && currentIndex < images.length - 1) {
          onSelectIndex(currentIndex + 1);
        } else if (deltaX > 0 && currentIndex > 0) {
          onSelectIndex(currentIndex - 1);
        }
      }
    }
    setSwipeStartY(null);
    setSwipeStartX(null);
  };

  // Mouse pan handling when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Default download handler
  const executeDownload = () => {
    if (onDownload) {
      onDownload(activeImage);
    } else {
      const link = document.createElement("a");
      link.href = activeImage.url;
      link.download = `A-NOVA_Generated_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    showToast("Downloading image...");
  };

  // Default share handler
  const executeShare = async () => {
    if (onShare) {
      onShare(activeImage);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: "A-NOVA Generated Image",
          text: activeImage.prompt,
          url: activeImage.url,
        });
        showToast("Shared successfully");
      } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(activeImage.url);
        showToast("Image URL copied to clipboard");
      } catch (_) {
        showToast("Could not copy URL");
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col justify-between overflow-hidden select-none animate-fadeIn"
      onClick={(e) => {
        if (e.target === containerRef.current && scale === 1) onClose();
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[110] bg-zinc-800/90 text-white text-xs px-4 py-2 rounded-full shadow-lg border border-zinc-700/60 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3 min-w-0">
          {images.length > 1 && (
            <span className="px-2.5 py-1 rounded-full bg-zinc-800/80 text-zinc-300 font-mono text-xs border border-zinc-700/50">
              {currentIndex + 1} / {images.length}
            </span>
          )}
          <p className="text-xs sm:text-sm text-zinc-300 font-sans truncate max-w-xs sm:max-w-md md:max-w-xl">
            {activeImage.prompt}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            title="Zoom Out"
            className="p-2 rounded-full bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white transition disabled:opacity-40"
          >
            <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={handleZoomIn}
            disabled={scale >= 4}
            title="Zoom In"
            className="p-2 rounded-full bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white transition disabled:opacity-40"
          >
            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {scale !== 1 && (
            <button
              onClick={handleResetZoom}
              title="Reset Zoom"
              className="p-2 rounded-full bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          <button
            onClick={executeShare}
            title="Share"
            className="p-2 rounded-full bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={executeDownload}
            title="Download"
            className="p-2 rounded-full bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={onClose}
            title="Close (Esc)"
            className="p-2 rounded-full bg-zinc-800/80 hover:bg-red-500/80 text-zinc-300 hover:text-white transition ml-1"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport Area */}
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-6 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Left Arrow Button for multiple images */}
        {images.length > 1 && currentIndex > 0 && onSelectIndex && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectIndex(currentIndex - 1);
            }}
            className="absolute left-3 sm:left-6 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-zinc-700/50 transition backdrop-blur-md"
            title="Previous Image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Image Container */}
        <div
          className="transition-transform duration-100 ease-out flex items-center justify-center max-w-full max-h-full"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        >
          <img
            src={activeImage.url}
            alt={activeImage.prompt}
            className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl pointer-events-auto"
            draggable={false}
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Right Arrow Button for multiple images */}
        {images.length > 1 && currentIndex < images.length - 1 && onSelectIndex && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectIndex(currentIndex + 1);
            }}
            className="absolute right-3 sm:right-6 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-zinc-700/50 transition backdrop-blur-md"
            title="Next Image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Hint Bar */}
      <div className="relative z-10 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent text-center text-[11px] text-zinc-400 font-sans flex items-center justify-between sm:justify-center gap-4">
        <span className="hidden sm:inline">Pinch or double-tap to zoom • Swipe down to close</span>
        <div className="flex sm:hidden items-center justify-around w-full">
          <button onClick={executeDownload} className="flex items-center gap-1.5 text-zinc-200 py-1 px-3 bg-zinc-800/80 rounded-full">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button onClick={executeShare} className="flex items-center gap-1.5 text-zinc-200 py-1 px-3 bg-zinc-800/80 rounded-full">
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
          <button onClick={onClose} className="flex items-center gap-1.5 text-zinc-200 py-1 px-3 bg-zinc-800/80 rounded-full">
            <X className="w-3.5 h-3.5" /> Close
          </button>
        </div>
      </div>
    </div>
  );
}
