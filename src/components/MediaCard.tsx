// src/components/MediaCard.tsx
"use client";

import React, { useState, useRef } from "react";
import { isEpisodic, MediaEntry } from "@/lib/db";
import { ImageOff, Heart, Plus, Star, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface MediaCardProps {
  entry: MediaEntry;
  onClick: () => void;
  onFavoriteToggle: () => Promise<void> | void;
  onIncrementWatched: () => void;
  onStatusChange: (newStatus: MediaEntry["status"]) => Promise<void> | void;
  index: number;
}

function MediaCard({
  entry,
  onClick,
  onFavoriteToggle,
  onIncrementWatched,
  onStatusChange,
  index,
}: MediaCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [swipeHint, setSwipeHint] = useState<'fav' | 'status' | null>(null);
  const didDrag = useRef(false);

  // Determine Kino-Card Rarity
  let rarityLevel = "common";
  if (entry.rating === 10) rarityLevel = "mythic";
  else if (entry.rating >= 8) rarityLevel = "epic";

  // Rarity styling logic
  const isMythic = rarityLevel === "mythic";
  const isEpic = rarityLevel === "epic";

  const cardBorderClass = isMythic 
    ? "border-amber-200/50 shadow-[0_0_15px_rgba(251,191,36,0.15)] group-hover:shadow-[0_0_25px_rgba(251,191,36,0.3)] group-hover:border-amber-200/80" 
    : isEpic 
      ? "border-purple-300/40 shadow-[0_0_10px_rgba(168,85,247,0.1)] group-hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] group-hover:border-purple-300/70" 
      : "border-border/40 shadow-sm group-hover:shadow-md group-hover:border-primary/30";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileTap={{ scale: 0.95, rotateY: 10 }}
      transition={{ duration: 0.25, delay: Math.min(index, 16) * 0.02, type: "spring", stiffness: 150, damping: 20 }}
      onClick={() => { if (!didDrag.current) onClick(); }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDrag={(e, info) => {
        didDrag.current = Math.abs(info.offset.x) > 5;
        if (info.offset.x > 40) setSwipeHint('fav');
        else if (info.offset.x < -40) setSwipeHint('status');
        else setSwipeHint(null);
      }}
      onDragEnd={(e, info) => {
        setTimeout(() => { didDrag.current = false; }, 100);
        setSwipeHint(null);
        if (info.offset.x > 80) {
          onFavoriteToggle();
        } else if (info.offset.x < -80) {
          const nextStatus = entry.status === "Watching" ? "Completed" : entry.status === "Completed" ? "Plan to Watch" : "Watching";
          if (onStatusChange) onStatusChange(nextStatus);
        }
      }}
      className="group flex flex-col gap-2.5 cursor-pointer relative"
      style={{ perspective: "1000px" }}
    >
      {/* Swipe hint overlays */}
      {swipeHint === 'fav' && (
        <div className="absolute inset-0 z-50 rounded-2xl bg-rose-500/20 border-2 border-rose-500/60 flex items-center justify-center pointer-events-none">
          <Heart size={32} className="fill-rose-500 text-rose-500 drop-shadow-lg" />
        </div>
      )}
      {swipeHint === 'status' && (
        <div className="absolute inset-0 z-50 rounded-2xl bg-blue-500/20 border-2 border-blue-500/60 flex items-center justify-center pointer-events-none">
          <span className="text-blue-400 font-bold text-xs uppercase tracking-widest">Status →</span>
        </div>
      )}

      {/* Trading Card Wrapper */}
      <motion.div 
        animate={isHovered ? { rotateX: 5, rotateY: -5 } : { rotateX: 0, rotateY: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`relative w-full aspect-[2/3] bg-card rounded-2xl overflow-hidden border transition-all duration-300 transform-gpu ${cardBorderClass}`}
      >
        
        {entry.coverImage && !imgError ? (
          <img
            src={entry.coverImage}
            alt={entry.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
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

        {/* --- MYTHIC RARE FOIL EFFECT --- */}
        {isMythic && (
          <>
            {/* Iridescent Rainbow Foil overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[rgba(255,255,255,0.4)] to-transparent mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none" 
                 style={{ backgroundImage: "linear-gradient(110deg, transparent 20%, rgba(251, 191, 36, 0.4) 30%, rgba(236, 72, 153, 0.4) 40%, rgba(56, 189, 248, 0.4) 50%, transparent 60%)", backgroundSize: "200% auto", animation: isHovered ? "shine 3s linear infinite" : "none" }} 
            />
            {/* Golden ambient glow */}
            <div className="absolute inset-0 bg-amber-400/10 mix-blend-color z-0 pointer-events-none" />
          </>
        )}

        {/* --- EPIC RARE FOIL EFFECT --- */}
        {isEpic && !isMythic && (
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[rgba(168,85,247,0.3)] to-transparent mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" 
               style={{ backgroundImage: "linear-gradient(110deg, transparent 25%, rgba(168, 85, 247, 0.4) 40%, rgba(236, 72, 153, 0.4) 50%, transparent 65%)", backgroundSize: "200% auto", animation: isHovered ? "shine 4s linear infinite" : "none" }} 
          />
        )}

        {/* Standard gloss shine reflection for common cards */}
        {!isMythic && !isEpic && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
            <div className="absolute -inset-x-32 -inset-y-16 bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-12 -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s] ease-out" />
          </div>
        )}

        {/* Ambient gradient shadow overlay (bottom text protection) */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

        {/* Favorite square button */}
        <button
          onClick={(e) => { e.stopPropagation(); onFavoriteToggle(); }}
          className="absolute top-2 right-2 w-7.5 h-7.5 rounded-xl bg-black/40 backdrop-blur-md hover:scale-110 border border-white/30 transition-all cursor-pointer flex items-center justify-center z-30 shadow-md"
          title={entry.favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={12.5} className={entry.favorite ? "fill-rose-500 text-rose-500" : "text-white/90"} />
        </button>

        {/* Rating overlay badge / Trading Card Stat */}
        {entry.status === 'Completed' && entry.rating > 0 && (
          <div className={`absolute top-2 left-2 flex items-center gap-1 backdrop-blur-md border rounded-lg px-2 py-0.5 z-30 shadow-lg ${isMythic ? 'bg-amber-500/20 border-amber-400 text-amber-300' : isEpic ? 'bg-purple-500/20 border-purple-400 text-purple-200' : 'bg-black/40 border-white/20 text-white'}`}>
            {isMythic ? <Sparkles size={10} className="text-amber-400" /> : <Star size={9.5} className={isEpic ? "fill-purple-400 text-purple-400" : "fill-amber-400 text-amber-400"} />}
            <span className="text-[10px] font-display font-bold leading-none mt-0.5">{entry.rating}</span>
          </div>
        )}

        {/* Episode increment block overlay (Stats bar at bottom) */}
        {entry.status === "Watching" && isEpisodic(entry) && (
          <button
            onClick={(e) => { e.stopPropagation(); onIncrementWatched(); }}
            className="absolute bottom-2 left-2 right-2 z-30 flex items-center justify-center gap-1 bg-primary/95 text-white text-[11px] font-display font-bold uppercase tracking-wider py-2 rounded-xl border border-white/20 hover:bg-primary transition-all shadow-lg cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100 translate-y-0 lg:translate-y-1 lg:group-hover:translate-y-0 duration-300"
            title="Increment episode"
          >
            <Plus size={11} strokeWidth={3} />
            <span>{entry.episodesWatched || 0}/{entry.episodesTotal || (entry.episodes?.length || "?")} ep</span>
          </button>
        )}
        
        {/* On-Card Rarity Label when hovered */}
        {(isMythic || isEpic) && (
          <div className="absolute bottom-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 pointer-events-none">
            <span className={`text-[8px] font-mono font-bold uppercase tracking-widest ${isMythic ? 'text-amber-400' : 'text-purple-400'}`}>
              {isMythic ? 'MYTHIC RARE' : 'EPIC'}
            </span>
          </div>
        )}
      </motion.div>

      {/* Metadata / Title details row */}
      <div className="px-1 text-left relative z-20">
        <h3
          className={`text-[13.5px] font-bold truncate transition-colors leading-tight ${isMythic ? 'text-amber-500 group-hover:text-amber-400' : isEpic ? 'text-purple-400 group-hover:text-purple-300' : 'text-foreground group-hover:text-primary'}`}
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
      
        {/* Global CSS for the shine animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }
      `}} />
    </motion.div>
  );
}

export default React.memo(MediaCard, (prevProps, nextProps) => {
  return prevProps.entry === nextProps.entry && prevProps.index === nextProps.index;
});
