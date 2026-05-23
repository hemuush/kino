"use client";

import { MediaEntry } from '@/lib/db';
import { motion } from 'framer-motion';
import { Star, Heart } from 'lucide-react';

interface MediaCardProps {
  entry: MediaEntry;
  onClick?: () => void;
  onFavoriteToggle?: (e: React.MouseEvent) => void;
  onIncrementWatched?: (e: React.MouseEvent) => void;
  index?: number;
}

const typeLabels: Record<string, string> = {
  Movie: 'MOVIE',
  'TV Show': 'TV SHOW',
  Anime: 'ANIME',
};

export function MediaCard({ entry, onClick, onFavoriteToggle, onIncrementWatched, index = 0 }: MediaCardProps) {
  const isWatching = entry.status === 'Watching';
  const isPlanToWatch = entry.status === 'Plan to Watch';
  const isCompleted = entry.status === 'Completed' || !entry.status;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="group relative w-full rounded-2xl overflow-hidden cursor-pointer flex-shrink-0 border border-border/40 bg-card hover:border-primary/30 transition-all duration-300 interactive-lift"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-muted">
        {entry.coverImage ? (
          <img
            src={entry.coverImage}
            alt={entry.title}
            className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-background/50 p-4">
            <span className="text-[10px] text-muted-foreground/30 font-bold uppercase tracking-widest text-center leading-relaxed max-w-[80%] line-clamp-3">{entry.title}</span>
          </div>
        )}
        
        {/* Gradient Overlay — softer dark blue tone */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/10 to-transparent opacity-95 group-hover:opacity-100 transition-opacity duration-300" />
 
        {/* Interactive Favorite Icon Overlay */}
        <button
          type="button"
          onClick={(e) => {
            if (onFavoriteToggle) {
              e.stopPropagation();
              onFavoriteToggle(e);
            }
          }}
          className={`absolute top-3 right-3 z-25 w-7 h-7 rounded-xl flex items-center justify-center border transition-all duration-200 cursor-pointer shadow-md ${
            entry.favorite 
              ? 'bg-red-500/90 border-red-500/30 text-white fill-white' 
              : 'bg-black/60 border-white/10 text-white/80 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-400 hover:bg-black/85 hover:scale-110 active:scale-90'
          }`}
          title={entry.favorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart size={11} className={entry.favorite ? 'fill-white' : ''} />
        </button>

        {/* Quick +1 Episode Overlay Button */}
        {entry.type !== 'Movie' && (isWatching || isPlanToWatch) && onIncrementWatched && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIncrementWatched(e);
            }}
            className="absolute top-11 right-3 z-25 w-7 h-7 rounded-xl bg-black/60 border border-white/10 text-white/85 flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-primary hover:text-white hover:border-primary/20 hover:scale-110 active:scale-90 transition-all duration-200 cursor-pointer shadow-md text-[10px] font-bold"
            title={`Increment Watched (${entry.episodesWatched || 0}/${entry.episodesTotal || '?'})`}
          >
            +1
          </button>
        )}

        {/* Type & Status Label */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
          <span className="text-[8px] font-bold tracking-[0.15em] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-white/80 uppercase border border-white/5">
            {entry.type === 'Anime' && entry.animeType ? `ANIME / ${entry.animeType}` : typeLabels[entry.type]}
          </span>
          {!isCompleted && (
            <span className={`text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded shadow-sm uppercase ${
              isWatching 
                ? 'bg-accent text-[#030712]' 
                : 'bg-muted-foreground/30 text-foreground border border-white/5'
            }`}>
              {entry.status}
            </span>
          )}
        </div>
        
        {/* Info Overlay */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-3 flex flex-col gap-1">
          <h3 className="text-white font-semibold text-[13px] leading-tight line-clamp-1 group-hover:text-primary-hover transition-colors duration-200">
            {entry.title}
          </h3>
          
          {/* Rating or Status Info */}
          {isCompleted ? (
            <div className="flex items-center gap-1">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              <span className="text-[11px] text-white/70 font-semibold">{entry.rating}/10</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/50 font-medium italic">
                {isWatching ? 'Currently Watching' : 'Plan to Watch'}
              </span>
              {entry.type !== 'Movie' && (
                <span className="text-[10px] text-white/60 font-semibold tabular-nums">
                  {entry.episodesWatched || 0}/{entry.episodesTotal || '?'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Sleek Progress Bar at the bottom of the poster */}
        {entry.type !== 'Movie' && entry.episodesTotal && entry.episodesTotal > 0 ? (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/45 z-20">
            <div 
              className="bg-primary h-full transition-all duration-500 ease-out" 
              style={{ width: `${Math.min(100, ((entry.episodesWatched || 0) / entry.episodesTotal) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
