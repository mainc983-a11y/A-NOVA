import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, Trash2, X, Check, RefreshCw, ZoomIn, ZoomOut, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import UserAvatar, { getInitials, getAvatarGradient } from "./UserAvatar";

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
  planStatus = "Plus Tier",
  emailVerified = true,
  provider = "Supabase Auth"
}: ProfilePictureSectionProps) {
  const [showOptions, setShowOptions] = useState(false);
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
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);

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

    // Reset input value so same file can be chosen again
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

  // Attach video element when camera is active
  useEffect(() => {
    if (isCameraActive && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraActive, cameraStream]);

  // Snap Photo from Camera
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
      
      // Stop camera stream
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
      setIsCameraActive(false);

      // Open cropper with captured image
      setCropImageSrc(dataUrl);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  // Close Camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  // Remove Photo (revert to initials)
  const handleRemovePhoto = async () => {
    setShowOptions(false);
    try {
      await onAvatarChange("");
      if (showSuccess) showSuccess("Profile photo removed. Displaying initials avatar.");
    } catch (err: any) {
      if (showError) showError("Failed to remove profile photo.");
    }
  };

  // Drag pan handlers for cropper
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

  // Apply Crop and Save Image
  const applyCropAndSave = async () => {
    if (!cropImageSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = cropImageSrc;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    // Create 512x512 canvas for high quality circular image output
    const canvas = document.createElement("canvas");
    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, outputSize, outputSize);

    // Save context for clipping circular mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw image centered with zoom & pan offsets
    const minDimension = Math.min(img.width, img.height);
    const drawSize = minDimension * zoom;

    // Calculate crop coordinates
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

    // Export to compressed WebP / JPEG data URL
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
    <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        
        {/* Modern Circular Profile Picture Area (80-100px) */}
        <div className="relative shrink-0 group">
          <div className="relative w-24 h-24 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-br from-zinc-700/60 via-zinc-800/80 to-zinc-900 shadow-xl shadow-black/50 border border-zinc-700/80 hover:border-sky-500/80 transition-all duration-300">
            <UserAvatar 
              src={currentPhotoUrl} 
              name={displayName || username} 
              email={email} 
              size="xl" 
              className="w-full h-full rounded-full shadow-inner"
            />
          </div>

          {/* Camera / Edit Icon Button at bottom-right */}
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="absolute bottom-0 right-0 p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-full shadow-lg border-2 border-zinc-900 transition-all duration-200 cursor-pointer transform hover:scale-110 active:scale-95 flex items-center justify-center"
            title="Change Profile Picture"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Options Dropdown Menu */}
          <AnimatePresence>
            {showOptions && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowOptions(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 top-full mt-2 w-52 bg-zinc-900 border border-zinc-700/90 rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 font-sans text-xs"
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer text-left font-medium"
                  >
                    <Upload className="w-4 h-4 text-sky-400" />
                    <span>Upload new photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer text-left font-medium"
                  >
                    <Camera className="w-4 h-4 text-purple-400" />
                    <span>Take a photo</span>
                  </button>

                  {currentPhotoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left font-medium border-t border-zinc-800/80 pt-2"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>Remove current photo</span>
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* User Details & Status Badges */}
        <div className="flex-1 text-center sm:text-left min-w-0 space-y-1.5">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h4 className="text-lg font-bold text-white tracking-tight truncate">
              {displayName || username}
            </h4>
            <span className="text-[10px] px-2.5 py-0.5 bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono font-semibold rounded-full">
              {planStatus}
            </span>
          </div>
          
          <p className="text-xs text-zinc-400 font-mono">@{username} • {email}</p>

          <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap">
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 border ${
              emailVerified ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <Check className="w-3 h-3" /> Email Verified
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
              {provider}
            </span>
          </div>
        </div>
      </div>

      {/* WEBCAM CAMERA MODAL */}
      <AnimatePresence>
        {isCameraActive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-semibold">Take Profile Photo</h3>
                </div>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-sky-400/50 rounded-full w-48 h-48 m-auto" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={captureCameraPhoto}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-sky-600/20"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Photo</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CIRCULAR CROP & ZOOM MODAL */}
      <AnimatePresence>
        {cropImageSrc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-semibold">Crop Profile Picture</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCropImageSrc(null)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Circular Crop Workspace */}
              <div 
                className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto bg-black rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing border border-zinc-800 flex items-center justify-center select-none"
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

                {/* Circular Mask Overlay */}
                <div className="absolute inset-0 pointer-events-none ring-[100px] ring-black/75 rounded-full w-52 h-52 m-auto border-2 border-sky-400 shadow-2xl" />
              </div>

              {/* Zoom Controls */}
              <div className="space-y-1.5 px-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
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
                  className="w-full accent-sky-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCropImageSrc(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyCropAndSave}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-600/20"
                >
                  <Check className="w-4 h-4" />
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
