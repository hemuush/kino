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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.25, delay: Math.min(index, 16) * 0.02, type: "spring", stiffness: 150, damping: 20 }}
      onClick={onClick}
      className="group flex flex-col gap-2.5 cursor-pointer relative"
    >
      {/* Poster image wrapper */}
      <div className="relative w-full aspect-[2/3] bg-card rounded-2xl overflow-hidden border border-border/80 shadow-sm transition-all duration-350 group-hover:shadow-md group-hover:border-primary/50">
        
        {entry.coverImage && !imgError ? (
          <img
            src={entry.coverImage}
            alt={entry.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30 text-muted-foreground p-3">
            <ImageOff className="w-6 h-6 mb-2 opacity-25" />
            <span className="text-[9px] text-center font-bold uppercase tracking-wider px-1.5 line-clamp-3 opacity-55">
              {entry.title}
            </span>
          </div>
        )}

        {/* Dynamic gloss shine reflection effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
          <div className="absolute -inset-x-32 -inset-y-16 bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        </div>

        {/* Ambient gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Favorite square button */}
        <button
          onClick={(e) => { e.stopPropagation(); onFavoriteToggle(); }}
          className="absolute top-2 right-2 w-7.5 h-7.5 rounded-xl bg-black/35 hover:bg-black/60 backdrop-blur-md hover:scale-105 border border-white/30 transition-all cursor-pointer flex items-center justify-center z-20"
          title={entry.favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={12.5} className={entry.favorite ? "fill-primary text-primary" : "text-white/90"} />
        </button>

        {/* Rating overlay label */}
        {entry.status === 'Completed' && entry.rating > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/40 backdrop-blur-md border border-white/20 rounded-lg px-2 py-0.5 z-20">
            <Star size={9.5} className="fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-display font-bold text-white leading-none mt-0.5">{entry.rating}</span>
          </div>
        )}

        {/* Episode increment block overlay */}
        {entry.status === "Watching" && isEpisodic(entry) && (
          <button
            onClick={(e) => { e.stopPropagation(); onIncrementWatched(); }}
            className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-center gap-1 bg-primary/90 text-white text-[11px] font-display font-bold uppercase tracking-wider py-2 rounded-xl border border-primary hover:bg-primary transition-all shadow-lg cursor-pointer opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 duration-300"
            title="Increment episode"
          >
            <Plus size={11} strokeWidth={3} />
            <span>{entry.episodesWatched || 0}/{entry.episodesTotal || "?"} ep</span>
          </button>
        )}
      </div>

      {/* Metadata / Title details row */}
      <div className="px-0.5 text-left">
        <h3
          className="text-[13.5px] font-bold text-foreground truncate group-hover:text-primary transition-colors leading-tight"
          title={entry.title}
        >
          {entry.title}
        </h3>
        
        <div className="text-[10px] font-semibold text-muted-foreground mt-1 uppercase tracking-wide flex items-center gap-1.5">
          <span>{entry.type === "TV Show" ? "Series" : entry.type}</span>
          
          <span 
            className="w-1.5 h-1.5 rounded-full border border-white/20 inline-block shrink-0" 
            style={{
              backgroundColor: entry.status === 'Completed' ? '#34c759' : entry.status === 'Watching' ? '#D71921' : '#ff9500',
              boxShadow: entry.status === 'Completed' ? '0 0 6px rgba(52, 199, 89, 0.6)' : entry.status === 'Watching' ? '0 0 6px rgba(215, 25, 33, 0.6)' : '0 0 6px rgba(255, 149, 0, 0.6)'
            }} 
            title={entry.status}
          />
          
          <span className="text-[9.5px] lowercase font-medium text-muted-foreground/75 leading-none">
            {entry.status}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
