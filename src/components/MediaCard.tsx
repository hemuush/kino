"use client";

import { MediaEntry } from '@/lib/db';
import { motion } from 'framer-motion';
import { Star, X } from 'lucide-react';

interface MediaCardProps {
  entry: MediaEntry;
  onDelete?: (id: number) => void;
  index?: number;
}

const typeLabels: Record<string, string> = {
  Movie: 'MOVIE',
  Series: 'SERIES',
  Anime: 'ANIME',
};

export function MediaCard({ entry, onDelete, index = 0 }: MediaCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="group relative w-full rounded-2xl overflow-hidden cursor-pointer flex-shrink-0 interactive-lift"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.coverImage || `https://placehold.co/300x450/1a1a1a/333333?text=${encodeURIComponent(entry.title.substring(0, 8))}`}
          alt={entry.title}
          className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/300x450/1a1a1a/333333?text=${encodeURIComponent(entry.title.substring(0, 8))}`;
          }}
        />
        
        {/* Gradient Overlay — softer */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90" />

        {/* Type Label — clean text, no emoji */}
        <div className="absolute top-3 left-3 z-10">
          <span className="text-[9px] font-semibold tracking-[0.12em] text-white/60 uppercase">
            {typeLabels[entry.type]}
          </span>
        </div>

        {/* Delete — minimal × */}
        {onDelete && entry.id && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(entry.id!); }}
            className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white/50 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/80 hover:text-white transition-all duration-200 focus-ring"
            title="Remove"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        )}
        
        {/* Info Overlay */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-3 flex flex-col gap-1.5">
          <h3 className="text-white font-semibold text-[13px] leading-tight line-clamp-1 drop-shadow-md">
            {entry.title}
          </h3>
          
          {/* Compact rating */}
          <div className="flex items-center gap-1">
            <Star size={11} className="text-amber-400 fill-amber-400" />
            <span className="text-[11px] text-white/60 font-medium">{entry.rating}/10</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
