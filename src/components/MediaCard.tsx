// src/components/MediaCard.tsx
"use client";

import React, { useState } from "react";
import { isEpisodic, MediaEntry } from "@/lib/db";
import { ImageOff, Heart, Plus, Star } from "lucide-react";
import { motion } from "framer-motion";

interface MediaCardProps {
  entry: MediaEntry;
  onClick: () => void;
  onFavoriteToggle: () => Promise<void> | void;
  onIncrementWatched: () => void;
  onStatusChange: (newStatus: MediaEntry["status"]) => Promise<void> | void;
  index: number;
}

export default function MediaCard({
  entry,
  onClick,
  onFavoriteToggle,
  onIncrementWatched,
  index,
}: MediaCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.25, delay: Math.min(index, 16) * 0.03 }}
      onClick={onClick}
      className="group flex flex-col gap-2 cursor-pointer"
    >
      {/* Poster */}
      <div className="relative w-full aspect-[2/3] bg-card rounded-xl overflow-hidden border border-border/50 shadow-sm transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-lg group-hover:border-primary/30">
        {entry.coverImage && !imgError ? (
          <img
            src={entry.coverImage}
            alt={entry.title}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/20 text-muted-foreground p-3">
            <ImageOff className="w-6 h-6 mb-2 opacity-30" />
            <span className="text-[9px] text-center font-bold uppercase tracking-wider px-1 line-clamp-3 opacity-50">
              {entry.title}
            </span>
          </div>
        )}

        {/* Gradient overlay for badges visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Favorite button */}
        <button
          onClick={(e) => { e.stopPropagation(); onFavoriteToggle(); }}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/65 transition-all cursor-pointer flex items-center justify-center z-10"
          title={entry.favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={12} className={entry.favorite ? "fill-red-500 text-red-500" : "text-white/80"} />
        </button>

        {/* Rating badge */}
        {entry.rating > 0 && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-md px-1.5 py-0.5 z-10">
            <Star size={9} className="fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-bold text-white">{entry.rating}</span>
          </div>
        )}

        {/* Episode progress button for watching episodic */}
        {entry.status === "Watching" && isEpisodic(entry) && (
          <button
            onClick={(e) => { e.stopPropagation(); onIncrementWatched(); }}
            className="absolute bottom-1.5 left-1.5 right-1.5 z-10 flex items-center justify-center gap-1 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold py-1.5 rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
            title="Mark next episode watched"
          >
            <Plus size={11} strokeWidth={3} />
            {entry.episodesWatched || 0}/{entry.episodesTotal || "?"}
          </button>
        )}

        {/* Status indicator line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 opacity-80"
          style={{
            background: entry.status === 'Completed' ? '#22c55e' : entry.status === 'Watching' ? '#3b82f6' : '#f59e0b',
          }}
        />
      </div>

      {/* Title row */}
      <div className="px-0.5">
        <h3
          className="text-[12px] sm:text-[13px] font-bold text-foreground truncate group-hover:text-primary transition-colors leading-tight"
          title={entry.title}
        >
          {entry.title}
        </h3>
        <p className="text-[10px] text-muted-foreground/70 font-medium mt-0.5 uppercase tracking-wide">
          {entry.type === "TV Show" ? "Series" : entry.type}
        </p>
      </div>
    </motion.div>
  );
}
