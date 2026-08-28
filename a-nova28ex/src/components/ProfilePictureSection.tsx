import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, Trash2, X, Check, Eye, Sliders, ZoomOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import UserAvatar from "./UserAvatar";

interface ProfilePictureSectionProps {
  avatarUrl: string;
  displayName: string;
  username: string;
  email: string;
  onAvatarChange: (newAvatarUrl: string) => Promise<void> | void;
  showSuccess?: (msg: string) => void;
  showError?: (msg: string) => void;
  planStatus?: string;
  emailVerified?: boolean;
  provider?: string;
}

export default function ProfilePictureSection({
  avatarUrl,
  displayName,
  username,
  email,
  onAvatarChange,
  showSuccess,
  showError,
}: ProfilePictureSectionProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  // Crop state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Clean default robot URLs if user wants initials or custom photo
  const isDefaultRobotUrl = avatarUrl && (avatarUrl.includes("dicebear.com") || avatarUrl.includes("bottts"));
  const currentPhotoUrl = isDefaultRobotUrl ? "" : avatarUrl;

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Handle File Upload Select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      if (showError) showError("Please select a JPG, PNG, or WebP image file.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      if (showError) showError("File size is too large. Please select an image under 15MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (src) {
        setCropImageSrc(src);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setShowOptions(false);
      }
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  // Start Camera Stream
  const startCamera = async () => {
    try {
      setShowOptions(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
      });
      setCameraStream(stream);
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      if (showError) showError("Unable to access camera. Please check permissions.");
    }
  };

  useEffect(() => {
    if (isCameraActive && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraActive, cameraStream]);

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
      setIsCameraActive(false);

      setCropImageSrc(dataUrl);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const handleRemovePhoto = async () => {
    setShowRemoveConfirmModal(false);
    setShowOptions(false);
    try {
      await onAvatarChange("");
      if (showSuccess) showSuccess("Profile photo removed. Displaying initials avatar.");
    } catch (err: any) {
      if (showError) showError("Failed to remove profile photo.");
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const applyCropAndSave = async () => {
    if (!cropImageSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = cropImageSrc;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const canvas = document.createElement("canvas");
    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.clearRect(0, 0, outputSize, outputSize);

    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const minDimension = Math.min(img.width, img.height);

    const sourceX = (img.width - minDimension) / 2 - pan.x * (img.width / 280);
    const sourceY = (img.height - minDimension) / 2 - pan.y * (img.height / 280);

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      minDimension,
      minDimension,
      0,
      0,
      outputSize,
      outputSize
    );

    ctx.restore();

    let compressedDataUrl = canvas.toDataURL("image/webp", 0.88);
    if (!compressedDataUrl.startsWith("data:image/webp")) {
      compressedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
    }

    try {
      await onAvatarChange(compressedDataUrl);
      setCropImageSrc(null);
      if (showSuccess) showSuccess("Profile picture updated successfully!");
    } catch (err: any) {
      if (showError) showError("Failed to save profile picture.");
    }
  };

  return (
    <div className="p-5 md:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Profile Picture</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            A photo helps personalize your account and lets others recognize you
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center text-center gap-3 py-3">
        {/* Centered Avatar Display */}
        <div className="relative shrink-0 flex justify-center">
          <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full p-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 shadow-md flex items-center justify-center overflow-hidden">
            <UserAvatar 
              src={currentPhotoUrl} 
              name={displayName || username} 
              email={email} 
              size="lg" 
              className="w-full h-full rounded-full"
            />
          </div>
        </div>

        {/* Centered User Name */}
        <div className="min-w-0 text-center">
          <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">{displayName || username}</h4>
        </div>

        {/* Centered Action Buttons: View, Change, Remove */}
        <div className="flex items-center justify-center gap-3 flex-wrap shrink-0 w-full pt-1">
          {/* View Button */}
          <button
            type="button"
            onClick={() => setShowViewModal(true)}
            className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700/60 transition-all cursor-pointer active:scale-95"
            title="View Profile Picture"
          >
            <Eye className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span>View</span>
          </button>

          {/* Change Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Change</span>
            </button>

            {/* Dropdown for Change Options */}
            <AnimatePresence>
              {showOptions && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowOptions(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 p-1.5 space-y-1 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left font-medium"
                    >
                      <Upload className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                      <span>Upload Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-left font-medium"
                    >
                      <Camera className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                      <span>Take Photo</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Remove Button */}
          {currentPhotoUrl && (
            <button
              type="button"
              onClick={() => setShowRemoveConfirmModal(true)}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Remove Profile Picture"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* VIEW PHOTO FULL PREVIEW MODAL */}
      <AnimatePresence>
        {showViewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 text-zinc-900 dark:text-white relative text-center"
            >
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Profile Picture</h3>

              <div className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-full p-1 bg-zinc-100 dark:bg-zinc-800 border-2 border-sky-500/50 shadow-2xl flex items-center justify-center overflow-hidden">
                <UserAvatar 
                  src={currentPhotoUrl} 
                  name={displayName || username} 
                  email={email} 
                  size="lg" 
                  className="w-full h-full rounded-full"
                />
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal(false);
                    setShowOptions(true);
                  }}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Change Photo
                </button>
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM REMOVE PHOTO MODAL */}
      <AnimatePresence>
        {showRemoveConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 text-zinc-900 dark:text-white"
            >
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Remove Profile Photo?</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Your avatar will revert to your name's initials.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirmModal(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Remove Photo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WEBCAM CAMERA MODAL */}
      <AnimatePresence>
        {isCameraActive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-3 text-zinc-900 dark:text-white"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                  <h3 className="text-xs font-semibold">Take Profile Photo</h3>
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-sky-400/50 rounded-full w-40 h-40 m-auto" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-medium rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={captureCameraPhoto}
                  className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Snap Photo</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CIRCULAR CROP MODAL */}
      <AnimatePresence>
        {cropImageSrc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-3 text-zinc-900 dark:text-white"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                  <h3 className="text-xs font-semibold">Crop Profile Picture</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCropImageSrc(null)}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div 
                className="relative w-52 h-52 sm:w-60 sm:h-60 mx-auto bg-black rounded-xl overflow-hidden cursor-grab active:cursor-grabbing border border-zinc-200 dark:border-zinc-800 flex items-center justify-center select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={cropImageSrc}
                  alt="Crop preview"
                  draggable={false}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transition: isDragging ? "none" : "transform 0.1s ease-out",
                    maxHeight: "100%",
                    maxWidth: "100%",
                    objectFit: "contain"
                  }}
                  className="pointer-events-none"
                />

                <div className="absolute inset-0 pointer-events-none ring-[100px] ring-black/75 rounded-full w-48 h-48 m-auto border-2 border-sky-400 shadow-2xl" />
              </div>

              <div className="space-y-1 px-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  <span className="flex items-center gap-1">
                    <ZoomOut className="w-3.5 h-3.5" />
                    Zoom
                  </span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCropImageSrc(null)}
                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-medium rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyCropAndSave}
                  className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Apply & Save</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
