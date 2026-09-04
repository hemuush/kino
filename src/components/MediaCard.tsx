// src/components/MediaCard.tsx
"use client";

import React, { useState } from "react";
import { isEpisodic, MediaEntry } from "@/lib/db";
import { fireConfetti, fireEpicConfetti } from "@/lib/confetti";
import { hueFromTitle } from "@/lib/colors";
import { ImageOff, Plus, Star, Check, Play } from "lucide-react";
import { motion } from "framer-motion";

interface MediaCardProps {
  entry: MediaEntry;
  onClick: () => void;
  onIncrementWatched: () => void;
  onStatusChange: (newStatus: MediaEntry["status"]) => Promise<void> | void;
  index: number;
}

function MediaCard({
  entry,
  onClick,
  onIncrementWatched,
  onStatusChange,
  index,
}: MediaCardProps) {
  const [imgError, setImgError] = useState(false);

  const activeColor = React.useMemo(() => `hsl(${hueFromTitle(entry.title)}, 65%, 45%)`, [entry.title]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.3, delay: Math.min(index, 16) * 0.02, ease: "easeOut" }}
      onClick={onClick}
      className="group flex flex-col gap-3 cursor-pointer w-full relative"
    >
      {/* Dynamic Ambient Blur Glow */}
      <div 
        className="absolute -inset-4 z-0 opacity-0 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none blur-2xl rounded-full"
        style={{ backgroundColor: activeColor }}
      />

      <div className="relative z-10 w-full aspect-[2/3] bg-muted/40 rounded-xl overflow-hidden border border-border/20 shadow-sm transition-all duration-300 group-hover:shadow-2xl">

        {/* Cover Image */}
        {entry.coverImage && !imgError ? (
          <img
            src={entry.coverImage}
            alt={entry.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-3">
            <ImageOff className="w-6 h-6 mb-2 opacity-20" />
            <span className="text-[10px] text-center font-medium opacity-50 px-2 line-clamp-3 leading-snug">
              {entry.title}
            </span>
          </div>
        )}

        {/* Dark subtle gradient bottom up on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

        {/* Rating Pill (Top Left) */}
        {entry.status === 'Completed' && entry.rating > 0 && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-md px-1.5 py-0.5 z-30 shadow-sm border border-white/10">
            <Star size={10} className="fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-semibold text-white/90 leading-none">{entry.rating}</span>
          </div>
        )}

        {/* Quick Actions (Bottom Center) - Sleek and minimalist */}
        <div className="absolute bottom-3 left-0 right-0 px-3 z-30 flex justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          {entry.status === "Watching" && isEpisodic(entry) && (
            <button
              onClick={(e) => { e.stopPropagation(); fireConfetti(); onIncrementWatched(); }}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-medium tracking-wide px-3 py-1.5 rounded-full transition-colors shadow-lg"
            >
              <Plus size={12} strokeWidth={2.5} />
              <span>{entry.episodesWatched || 0} / {entry.episodesTotal || "?"}</span>
            </button>
          )}
          {entry.status === "Watching" && !isEpisodic(entry) && (
            <button
              onClick={(e) => { e.stopPropagation(); fireEpicConfetti(); if (onStatusChange) onStatusChange("Completed"); }}
              className="flex items-center gap-1.5 bg-green-500/80 hover:bg-green-500 backdrop-blur-md border border-white/20 text-white text-[10px] font-medium tracking-wide px-3 py-1.5 rounded-full transition-colors shadow-lg"
            >
              <Check size={12} strokeWidth={2.5} />
              <span>Complete</span>
            </button>
          )}
          {entry.status === "Plan to Watch" && (
            <button
              onClick={(e) => { e.stopPropagation(); if (onStatusChange) onStatusChange("Watching"); }}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-medium tracking-wide px-3 py-1.5 rounded-full transition-colors shadow-lg"
            >
              <Play size={10} strokeWidth={3} fill="currentColor" />
              <span>Start</span>
            </button>
          )}
        </div>
      </div>

      {/* Title & Metadata (Minimalist) */}
      <div className="px-0.5 flex flex-col gap-0.5">
        <h3 className="text-[13px] font-semibold text-foreground leading-tight truncate group-hover:text-primary transition-colors" title={entry.title}>
          {entry.title}
        </h3>
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium">
          <span className="opacity-80">{entry.type === "TV Show" ? "Series" : entry.type}</span>
          <span className="opacity-60">{entry.status}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default React.memo(MediaCard, (prevProps, nextProps) => {
  return prevProps.entry === nextProps.entry && prevProps.index === nextProps.index;
});
