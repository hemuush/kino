// src/components/MediaCard.tsx
"use client";

import { MediaEntry, WatchStatus } from '@/lib/db';
import { motion } from 'framer-motion';
import { Star, Heart, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MediaCardProps {
  entry: MediaEntry;
  onClick?: () => void;
  onFavoriteToggle?: (e: React.MouseEvent) => void;
  onIncrementWatched?: (e: React.MouseEvent) => void;
  onStatusChange?: (newStatus: WatchStatus, e: React.MouseEvent) => void;
  index?: number;
}

const typeLabels: Record<string, string> = {
  Movie: 'MOVIE',
  'TV Show': 'TV SHOW',
  Anime: 'ANIME',
};

const STATUS_CYCLE: WatchStatus[] = ['Plan to Watch', 'Watching', 'Completed'];

export function MediaCard({ entry, onClick, onFavoriteToggle, onIncrementWatched, onStatusChange, index = 0 }: MediaCardProps) {
  const isWatching = entry.status === 'Watching';
  const isPlanToWatch = entry.status === 'Plan to Watch';
  const isCompleted = entry.status === 'Completed' || !entry.status;

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onStatusChange) return;

    const currentStatus = entry.status || 'Completed';
    const currentIndex = STATUS_CYCLE.indexOf(currentStatus);
    const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];

    onStatusChange(nextStatus, e);
    toast.success(`Status changed to ${nextStatus}`, {
      description: entry.title,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="group w-full flex flex-col cursor-pointer select-none"
    >
      {/* Poster / Artwork Container (Fixed to Square) */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 bg-neutral-200/50 dark:bg-neutral-800/50 transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-lg group-hover:shadow-primary/5 group-hover:border-primary/30">
        {entry.coverImage ? (
          <img
            src={entry.coverImage}
            alt={entry.title}
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider text-center leading-relaxed line-clamp-3">
              {entry.title}
            </span>
          </div>
        )}

        {/* Interactive Favorite Icon Overlay */}
        <button
          type="button"
          onClick={(e) => {
            if (onFavoriteToggle) {
              e.stopPropagation();
              onFavoriteToggle(e);
            }
          }}
          className={`absolute top-2 right-2 z-30 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-250 cursor-pointer shadow-sm ${entry.favorite
            ? 'bg-red-500/90 text-white border border-red-500/30'
            : 'bg-black/45 text-white/90 opacity-0 group-hover:opacity-100 hover:bg-black/60 hover:scale-110 active:scale-90 border border-white/10'
            }`}
          title={entry.favorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart size={12} className={entry.favorite ? 'fill-white' : ''} />
        </button>

        {/* Quick +1 Episode Overlay Button */}
        {entry.type !== 'Movie' && (isWatching || isPlanToWatch) && onIncrementWatched && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIncrementWatched(e);
              toast.success(`Incremented episode for ${entry.title}`);
            }}
            className="absolute top-10 right-2 z-30 w-7 h-7 rounded-full bg-black/45 backdrop-blur-md text-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white hover:scale-110 active:scale-90 transition-all duration-250 cursor-pointer shadow-sm text-[10px] font-bold border border-white/10"
            title={`Increment Watched (${entry.episodesWatched || 0}/${entry.episodesTotal || '?'})`}
          >
            +1
          </button>
        )}

        {/* Type & Status Label (Top Left Overlay) */}
        <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 items-start">
          <button
            type="button"
            onClick={handleStatusClick}
            className={`text-[8.5px] font-bold tracking-wider px-2 py-0.5 rounded-full shadow-sm uppercase flex items-center gap-1 transition-all hover:scale-105 active:scale-95 border ${isWatching
              ? 'bg-primary/95 text-white border-primary/20 backdrop-blur-md'
              : 'bg-black/45 backdrop-blur-md text-white/90 hover:bg-black/65 border-white/5'
              }`}
            title="Click to change status"
          >
            {isWatching && <PlayCircle size={9} />}
            {isPlanToWatch && <Clock size={9} />}
            {isCompleted && <CheckCircle2 size={9} />}
            {entry.status || 'COMPLETED'}
          </button>
        </div>

        {/* Progress Bar at the absolute bottom border */}
        {entry.type !== 'Movie' && entry.episodesTotal && entry.episodesTotal > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 z-20">
            <div
              className="bg-primary h-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, ((entry.episodesWatched || 0) / entry.episodesTotal) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Metadata below artwork */}
      <div className="mt-2.5 px-1 flex flex-col select-none text-left">
        <span className="text-[9.5px] font-bold tracking-widest text-muted-foreground/75 uppercase leading-none truncate max-w-full">
          {entry.type === 'Anime' && entry.animeType ? `ANIME • ${entry.animeType}` : typeLabels[entry.type]}
        </span>

        <h3 className="text-foreground font-semibold text-[13.5px] tracking-tight leading-tight mt-1 truncate max-w-full group-hover:text-primary transition-colors duration-200" title={entry.title}>
          {entry.title}
        </h3>

        <div className="flex items-center w-full mt-1.5 min-h-[16px] justify-between">
          {isCompleted ? (
            <div className="flex items-center gap-0.5">
              <Star size={11} className="text-amber-500 fill-amber-500 animate-fade-in" />
              <span className="text-[11.5px] text-foreground/80 font-bold leading-none">{entry.rating}/10</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isWatching ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-[11.5px] text-muted-foreground font-medium leading-none">
                {isWatching ? 'Watching' : 'Plan to Watch'}
              </span>
            </div>
          )}

          {entry.type !== 'Movie' && (
            <span className="text-[11px] text-muted-foreground font-bold bg-neutral-200/50 dark:bg-neutral-800/50 px-1.5 py-0.5 rounded text-right leading-none font-mono">
              {entry.episodesWatched || 0}/{entry.episodesTotal || '?'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}