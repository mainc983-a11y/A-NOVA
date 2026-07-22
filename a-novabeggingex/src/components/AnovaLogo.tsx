import React from "react";
import { Sparkles } from "lucide-react";

interface AnovaLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtitle?: string;
  animated?: boolean;
  className?: string;
}

export default function AnovaLogo({
  size = "md",
  showText = true,
  subtitle,
  animated = true,
  className = "",
}: AnovaLogoProps) {
  // Size mappings
  const iconSizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-10 h-10 text-base",
    lg: "w-14 h-14 text-2xl",
    xl: "w-20 h-20 text-4xl",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const sparkleSizes = {
    sm: "w-3 h-3 -top-1 -right-1",
    md: "w-4 h-4 -top-1.5 -right-1.5",
    lg: "w-5 h-5 -top-2 -right-2",
    xl: "w-6 h-6 -top-2.5 -right-2.5",
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Icon Emblem */}
      <div className={`relative ${iconSizes[size].split(" ")[0]} ${iconSizes[size].split(" ")[1]} shrink-0`}>
        {/* Glow backdrop */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/30 via-indigo-500/30 to-purple-500/30 blur-md ${
            animated ? "animate-pulse" : ""
          }`}
        />

        {/* Outer Ring & SVG Graphic */}
        <div className="relative w-full h-full rounded-2xl bg-zinc-950 border border-zinc-800/90 shadow-lg flex items-center justify-center overflow-hidden">
          {/* Subtle gradient fill */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-purple-500/10" />
          
          {/* Custom Stylized A Vector */}
          <svg
            viewBox="0 0 100 100"
            className="w-3/5 h-3/5 text-transparent"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="anovaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
            <path
              d="M50 12 L85 88 L65 88 L50 54 L35 88 L15 88 Z M50 32 L40 56 L60 56 Z"
              fill="url(#anovaGrad)"
            />
          </svg>

          {/* Sparkle accent */}
          <Sparkles
            className={`${sparkleSizes[size]} text-cyan-400 absolute ${
              animated ? "animate-pulse" : ""
            }`}
          />
        </div>
      </div>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-black font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 ${textSizes[size]}`}
            >
              A-NOVA
            </span>
          </div>
          {subtitle && (
            <span className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase mt-0.5 font-medium truncate">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
