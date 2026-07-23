import React, { useState, useEffect } from "react";

export function getInitials(name?: string, email?: string): string {
  const cleanName = (name || "").trim();
  if (cleanName) {
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  }
  const cleanEmail = (email || "").trim();
  if (cleanEmail) {
    const local = cleanEmail.split("@")[0];
    return local.substring(0, 2).toUpperCase();
  }
  return "U";
}

const GRADIENTS = [
  "from-sky-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-blue-600 to-cyan-500",
  "from-fuchsia-600 to-pink-600"
];

export function getAvatarGradient(identifier?: string): string {
  if (!identifier) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

interface UserAvatarProps {
  user?: {
    avatarUrl?: string;
    displayName?: string;
    username?: string;
    email?: string;
    id?: string;
  } | null;
  src?: string;
  name?: string;
  email?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  showStatus?: boolean;
  onClick?: () => void;
  alt?: string;
}

export default function UserAvatar({
  user,
  src,
  name,
  email,
  size = "md",
  className = "",
  showStatus = false,
  onClick,
  alt
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const avatarUrl = src !== undefined ? src : user?.avatarUrl;
  const displayName = name || user?.displayName || user?.username || "";
  const userEmail = email || user?.email || "";
  const identifier = displayName || userEmail || user?.id || "user";

  const initials = getInitials(displayName, userEmail);
  const gradient = getAvatarGradient(identifier);

  // Reset imgError if avatarUrl changes
  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  // Handle bottts / robot dicebear URLs as empty if we want modern clean initials, 
  // but allow valid uploaded image URLs or custom data URLs!
  const isDefaultRobotUrl = avatarUrl && (avatarUrl.includes("dicebear.com") || avatarUrl.includes("bottts"));
  const hasValidPhoto = Boolean(avatarUrl && !isDefaultRobotUrl && !imgError);

  // Dimensions mapping
  let sizeClasses = "w-9 h-9 text-xs";
  let textScale = "text-xs font-bold";

  if (typeof size === "number") {
    sizeClasses = "";
  } else {
    switch (size) {
      case "xs":
        sizeClasses = "w-6 h-6";
        textScale = "text-[10px] font-bold";
        break;
      case "sm":
        sizeClasses = "w-7 h-7";
        textScale = "text-[11px] font-bold";
        break;
      case "md":
        sizeClasses = "w-9 h-9";
        textScale = "text-xs font-bold";
        break;
      case "lg":
        sizeClasses = "w-12 h-12";
        textScale = "text-base font-bold";
        break;
      case "xl":
        sizeClasses = "w-24 h-24 sm:w-24 sm:h-24";
        textScale = "text-2xl font-extrabold";
        break;
    }
  }

  const customStyle = typeof size === "number" ? { width: `${size}px`, height: `${size}px` } : {};

  return (
    <div 
      onClick={onClick}
      style={customStyle}
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none overflow-hidden transition-all duration-200 ${sizeClasses} ${className} ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {hasValidPhoto ? (
        <img
          src={avatarUrl}
          alt={alt || displayName || "User profile photo"}
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div className={`w-full h-full rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-inner tracking-wider font-sans`}>
          <span className={textScale}>{initials}</span>
        </div>
      )}

      {showStatus && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-900 ring-1 ring-black/20" />
      )}
    </div>
  );
}
