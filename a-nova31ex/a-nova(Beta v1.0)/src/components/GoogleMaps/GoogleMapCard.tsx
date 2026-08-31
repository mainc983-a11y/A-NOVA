import React, { useState } from "react";
import { MapPin, Navigation, ExternalLink, Compass, Maximize2 } from "lucide-react";

interface GoogleMapCardProps {
  query?: string;
  embedUrl?: string;
  mapUrl?: string;
  title?: string;
  subtitle?: string;
  isDark?: boolean;
  distanceText?: string;
  durationText?: string;
}

export const GoogleMapCard: React.FC<GoogleMapCardProps> = ({
  query,
  embedUrl,
  mapUrl,
  title,
  subtitle,
  isDark = true,
  distanceText,
  durationText
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const fallbackEmbed = embedUrl || (query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : "");
  const fallbackMapUrl = mapUrl || (query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "https://www.google.com/maps");

  if (!fallbackEmbed && !fallbackMapUrl) return null;

  return (
    <div
      className={`my-3 overflow-hidden rounded-2xl border transition-all duration-200 ${
        isDark
          ? "bg-zinc-900/90 border-zinc-800 shadow-md shadow-black/40"
          : "bg-white border-zinc-200 shadow-sm shadow-zinc-200"
      }`}
    >
      {/* Header bar */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        isDark ? "border-zinc-800/80 bg-zinc-900/50" : "border-zinc-100 bg-zinc-50/50"
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
            {distanceText ? <Navigation className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h4 className={`text-xs font-semibold truncate ${isDark ? "text-zinc-100" : "text-zinc-800"}`}>
              {title || query || "Google Maps Location"}
            </h4>
            {subtitle && (
              <p className="text-[11px] text-zinc-400 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(distanceText || durationText) && (
            <div className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 mr-1 ${
              isDark ? "bg-zinc-800 text-sky-400" : "bg-sky-50 text-sky-600"
            }`}>
              <Compass className="w-3 h-3" />
              <span>{durationText} ({distanceText})</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              isDark ? "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200" : "hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800"
            }`}
            title={isExpanded ? "Collapse Map" : "Expand Map"}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <a
            href={fallbackMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-sky-500 hover:bg-sky-600 text-white transition-colors"
          >
            <span>Open in Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Embedded Map Frame */}
      <div className={`w-full relative transition-all duration-300 ${isExpanded ? "h-[450px]" : "h-[240px] sm:h-[280px]"}`}>
        <iframe
          src={fallbackEmbed}
          title={title || "Google Maps Location"}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default GoogleMapCard;
