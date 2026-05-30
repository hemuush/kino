"use client";

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaEntry, getWatchedRuntimeMinutes, Tag } from '@/lib/db';
import { X, Play, Clock, Sparkles, TrendingUp, Calendar, Download, Share2, Check, Copy } from 'lucide-react';

interface RecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: MediaEntry[];
  genres: Tag[];
  type: 'weekly' | 'monthly';
}

export function RecapModal({ isOpen, onClose, entries, genres, type }: RecapModalProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [copied, setCopied] = useState(false);

  // Calculate stats for the time period
  const stats = useMemo(() => {
    const days = type === 'weekly' ? 7 : 30;
    const timeAgo = Date.now() - days * 24 * 60 * 60 * 1000;
    
    // Filter entries updated in the timeframe
    const recentEntries = entries.filter(e => (e.updatedAt || e.createdAt) >= timeAgo);
    
    let totalMinutes = 0;
    const typeCount = { Movie: 0, 'TV Show': 0, Anime: 0 };
    const genreCount: Record<string, number> = {};
    const completedCount = recentEntries.filter(e => e.status === 'Completed').length;
    const plannedTvCount = recentEntries.filter(e => e.type === 'TV Show' && e.status === 'Plan to Watch').length;
    const moviesWatchedCount = recentEntries.filter(e => e.type === 'Movie' && e.status === 'Completed').length;

    recentEntries.forEach(entry => {
      // Calculate watch time
      totalMinutes += getWatchedRuntimeMinutes(entry);
      
      // Count types
      if (entry.type === 'Movie') typeCount.Movie++;
      if (entry.type === 'TV Show') typeCount['TV Show']++;
      if (entry.type === 'Anime') typeCount.Anime++;

      // Count genres
      if (entry.genreIds && entry.genreIds.length > 0) {
        entry.genreIds.forEach(gid => {
          genreCount[gid] = (genreCount[gid] || 0) + 1;
        });
      } else if (entry.genre && entry.genre.length > 0) {
        entry.genre.forEach(g => {
          genreCount[g] = (genreCount[g] || 0) + 1;
        });
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const topGenreId = Object.keys(genreCount).sort((a, b) => genreCount[b] - genreCount[a])[0];
    const topGenreName = topGenreId 
      ? genres.find(g => g.id === topGenreId)?.name || topGenreId
      : 'Diverse';

    return {
      recentCount: recentEntries.length,
      completedCount,
      plannedTvCount,
      moviesWatchedCount,
      hours,
      typeCount,
      topGenreName,
      topEntry: recentEntries.sort((a, b) => b.rating - a.rating)[0] || null
    };
  }, [entries, genres, type]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setActiveSlide(0), 300);
      setCopied(false);
    }
  }, [isOpen]);

  const handleShare = () => {
    // Generate minimal payload for sharing
    const payload = {
      t: type,
      h: stats.hours,
      c: stats.completedCount,
      g: stats.topGenreName,
      mw: stats.moviesWatchedCount,
      tp: stats.plannedTvCount,
      tm: stats.topEntry?.title || "",
      tr: stats.topEntry?.rating || 0
    };

    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    const url = `${window.location.origin}/share?d=${encoded}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (!isOpen) return null;

  const titleText = type === 'weekly' ? 'Your Week in Kino' : 'Your Month in Kino';
  const subtitleText = type === 'weekly' ? 'Let\'s see what you\'ve been watching over the last 7 days.' : 'Let\'s see what you\'ve accomplished over the last 30 days.';

  const slides = [
    {
      id: 'intro',
      content: (
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-primary/30 border-t-primary"
            />
            <Sparkles size={32} className="text-primary" />
          </div>
          <h2 className="text-4xl font-display font-black tracking-tight">{titleText}</h2>
          <p className="text-muted-foreground text-lg">{subtitleText}</p>
        </div>
      )
    },
    {
      id: 'time',
      content: (
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Clock size={32} className="text-blue-500" />
          </div>
          <h2 className="text-3xl font-display font-bold">Time Well Spent</h2>
          <div className="space-y-2">
            <p className="text-6xl font-black text-blue-500 font-display">{stats.hours}</p>
            <p className="text-muted-foreground uppercase tracking-widest text-sm font-bold">Hours Watched</p>
          </div>
          <p className="text-sm text-foreground/80 bg-muted/50 p-3 rounded-xl border border-border/50">
            You completed {stats.moviesWatchedCount} movies and planned to watch {stats.plannedTvCount} TV shows!
          </p>
        </div>
      )
    },
    {
      id: 'genre',
      content: (
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center">
            <TrendingUp size={32} className="text-purple-500" />
          </div>
          <h2 className="text-3xl font-display font-bold">Top Vibe</h2>
          <div className="space-y-2">
            <p className="text-5xl font-black text-purple-400 font-display">{stats.topGenreName}</p>
            <p className="text-muted-foreground uppercase tracking-widest text-sm font-bold">Most Watched Genre</p>
          </div>
        </div>
      )
    },
    {
      id: 'top',
      content: (
        <div className="flex flex-col items-center text-center space-y-6 w-full">
          <h2 className="text-3xl font-display font-bold">Highlight of the {type === 'weekly' ? 'Week' : 'Month'}</h2>
          {stats.topEntry ? (
            <div className="relative w-48 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-border/50 group">
              <img src={stats.topEntry.coverImage} alt={stats.topEntry.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
                <p className="text-white font-bold leading-tight">{stats.topEntry.title}</p>
                <div className="flex items-center gap-1 mt-1 text-yellow-400">
                  {Array.from({ length: Math.floor(stats.topEntry.rating) }).map((_, i) => (
                    <svg key={i} className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No highly rated entries this {type}.</p>
          )}
        </div>
      )
    }
  ];

  const nextSlide = () => {
    if (activeSlide < slides.length - 1) setActiveSlide(prev => prev + 1);
    else onClose();
  };

  const prevSlide = () => {
    if (activeSlide > 0) setActiveSlide(prev => prev - 1);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-xl"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-background border border-border shadow-2xl rounded-[32px] overflow-hidden flex flex-col h-[85vh] sm:h-auto sm:aspect-[4/5]"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
            <div className="flex gap-1.5 flex-1 mr-4">
              {slides.map((_, i) => (
                <div key={i} className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: i < activeSlide ? "100%" : i === activeSlide ? "100%" : "0%" }}
                    transition={{ duration: i === activeSlide ? 15 : 0.2, ease: "linear" }}
                    onAnimationComplete={() => {
                      if (i === activeSlide && i < slides.length - 1) {
                        nextSlide();
                      }
                    }}
                  />
                </div>
              ))}
            </div>
            <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Touch Zones for navigation */}
          <div className="absolute inset-y-12 left-0 w-1/3 z-10 cursor-pointer" onClick={prevSlide} />
          <div className="absolute inset-y-12 right-0 w-2/3 z-10 cursor-pointer" onClick={nextSlide} />

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 relative min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, x: 20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(8px)' }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full flex justify-center"
              >
                {slides[activeSlide].content}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer controls */}
          <div className="p-4 sm:p-6 pt-0 relative z-10 flex gap-2">
             <button onClick={onClose} className="flex-1 py-3 bg-muted/50 hover:bg-muted text-foreground font-bold rounded-2xl transition-colors text-sm sm:text-base">
               Close Recap
             </button>
             {activeSlide === slides.length - 1 && (
               <button onClick={handleShare} className="flex-1 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl transition-colors flex items-center justify-center gap-2">
                 {copied ? <Check size={16} /> : <Share2 size={16} />}
                 {copied ? 'Link Copied!' : 'Share Public Link'}
               </button>
             )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
