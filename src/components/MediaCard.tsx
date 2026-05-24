// src/components/MediaCard.tsx
"use client";

import React, { useState } from "react";
import { MediaEntry } from "@/lib/db";
import { ImageOff, Heart, Plus, Star } from "lucide-react";

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
  onStatusChange,
  index,
}: MediaCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      className="group flex flex-col gap-3 cursor-pointer animate-in fade-in zoom-in duration-300"
      style={{ animationDelay: `${Math.min(index, 20) * 50}ms` }}
    >
      {/* Poster Container - Hardcoded to Square (aspect-square)
        Appearance Preference Context has been completely removed.
      */}
      <div className="relative w-full aspect-square bg-card rounded-xl overflow-hidden border border-border/50 shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-cyan-500/10 group-hover:border-cyan-500/30">
        {entry.coverImage && !imgError ? (
          <img
            src={entry.coverImage}
            alt={entry.title}
            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground p-4">
            <ImageOff className="w-8 h-8 mb-3 opacity-30" />
            <span className="text-[10px] text-center font-bold uppercase tracking-wider px-2 line-clamp-3">
              {entry.title}
            </span>
          </div>
        )}

        {/* Top-Right Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle();
            }}
            className="p-1.5 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors cursor-pointer"
            title={entry.favorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              size={14}
              className={entry.favorite ? "fill-red-500 text-red-500" : "text-white"}
            />
          </button>
        </div>

        {/* Bottom-Right Badges: Increment Episodes (For TV Shows currently being watched) */}
        {entry.status === "Watching" && (entry.type === "TV Show" || entry.type === "Anime") && (
          <div className="absolute bottom-2 right-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onIncrementWatched();
              }}
              className="flex items-center gap-1 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md hover:bg-emerald-400 transition-colors shadow-sm cursor-pointer"
              title="Increment watched episodes"
            >
              <Plus size={12} strokeWidth={3} />
              {entry.episodesWatched || 0}/{entry.episodesTotal || "?"}
            </button>
          </div>
        )}
      </div>

      {/* Media Details */}
      <div className="flex flex-col px-1">
        <h3
          className="text-[13px] sm:text-sm font-bold text-foreground truncate group-hover:text-cyan-400 transition-colors"
          title={entry.title}
        >
          {entry.title}
        </h3>

        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {entry.type === "TV Show" ? "Series" : entry.type}
          </span>

          {entry.rating ? (
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
              <Star size={10} className="fill-amber-400" />
              {entry.rating}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}