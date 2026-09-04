"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { MediaEntry, getWatchedRuntimeMinutes, Tag } from '@/lib/db';
import { X, Clock, Sparkles, TrendingUp, Share2, Check, Pause, Flame } from 'lucide-react';

// 1. Animated Number Counter Component
function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
    duration: 1500
  });
  const displayValue = useTransform(springValue, (current) => Math.round(current));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span>{displayValue}</motion.span>;
}

// 4. Staggered Typography Component
function StaggeredText({ text, className }: { text: string, className?: string }) {
  const words = text.split(" ");

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: "spring" as const, damping: 15, stiffness: 120 } }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className={`flex flex-wrap justify-center gap-x-3 gap-y-1 ${className}`}>
      {words.map((word, index) => (
        <motion.span key={index} variants={item} className="inline-block drop-shadow-sm">
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}

// Per-slide ambient gradient / orb color, keyed by slide id rather than position —
// so inserting the yearly-only "streak" slide can't shift another slide's colors.
const GRADIENTS: Record<string, string> = {
  intro: "from-zinc-900 via-zinc-950 to-black",
  time: "from-blue-900/40 via-zinc-950 to-black",
  genre: "from-purple-900/40 via-zinc-950 to-black",
  streak: "from-orange-900/40 via-zinc-950 to-black",
  top: "from-amber-900/40 via-zinc-950 to-black",
};

const ORB_COLORS: Record<string, [string, string]> = {
  intro: ["bg-primary/40", "bg-purple-600/30"],
  time: ["bg-blue-600/40", "bg-cyan-500/30"],
  genre: ["bg-purple-600/40", "bg-pink-500/30"],
  streak: ["bg-orange-600/40", "bg-amber-500/30"],
  top: ["bg-amber-600/40", "bg-orange-500/30"],
};

// 5. Floating Background Orbs
function FloatingOrbs({ slideId }: { slideId: string }) {
  const [c1, c2] = ORB_COLORS[slideId] || ORB_COLORS.intro;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-screen opacity-50 z-0">
      <motion.div
        animate={{ x: [0, 60, -30, 0], y: [0, -60, 40, 0], scale: [1, 1.3, 0.9, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute -top-[20%] -left-[20%] w-[80%] h-[80%] rounded-full blur-[100px] ${c1} transition-colors duration-1000`}
      />
      <motion.div
        animate={{ x: [0, -50, 30, 0], y: [0, 60, -30, 0], scale: [1, 0.8, 1.2, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute -bottom-[20%] -right-[20%] w-[90%] h-[90%] rounded-full blur-[100px] ${c2} transition-colors duration-1000`}
      />
    </div>
  );
}

interface RecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: MediaEntry[];
  genres: Tag[];
  type: 'weekly' | 'monthly' | 'yearly';
}

export function RecapModal({ isOpen, onClose, entries, genres, type }: RecapModalProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPausedState] = useState(false);
  const isPausedRef = useRef(false);

  const setIsPaused = (val: boolean) => {
    isPausedRef.current = val;
    setIsPausedState(val);
  };

  const [now, setNow] = useState(0);

  useEffect(() => {
    if (isOpen) {
      Promise.resolve().then(() => setNow(Date.now()));
    }
  }, [isOpen]);

  // Calculate stats for the time period
  const stats = useMemo(() => {
    const days = type === 'weekly' ? 7 : type === 'monthly' ? 30 : 365;
    const timeAgo = now - days * 24 * 60 * 60 * 1000;

    // Filter entries updated in the timeframe
    const recentEntries = entries.filter(e => (e.updatedAt || e.createdAt) >= timeAgo);

    let totalMinutes = 0;
    const typeCount = { Movie: 0, 'TV Show': 0, Anime: 0 };
    const genreCount: Record<string, number> = {};
    const monthMinutes: Record<string, number> = {};
    const completedCount = recentEntries.filter(e => e.status === 'Completed').length;
    const plannedTvCount = recentEntries.filter(e => e.type === 'TV Show' && e.status === 'Plan to Watch').length;
    const moviesWatchedCount = recentEntries.filter(e => e.type === 'Movie' && e.status === 'Completed').length;
    const seriesWatchedCount = recentEntries.filter(e => (e.type === 'TV Show' || e.type === 'Anime') && e.status === 'Completed').length;

    recentEntries.forEach(entry => {
      // Calculate watch time
      const minutes = getWatchedRuntimeMinutes(entry);
      totalMinutes += minutes;

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

      // Tally watched minutes per calendar month, for "most active month" (yearly wrap)
      const monthKey = new Date(entry.updatedAt || entry.createdAt).toLocaleDateString(undefined, { month: 'long' });
      monthMinutes[monthKey] = (monthMinutes[monthKey] || 0) + minutes;
    });

    const hours = Math.floor(totalMinutes / 60);
    const topGenreId = Object.keys(genreCount).sort((a, b) => genreCount[b] - genreCount[a])[0];
    const topGenreName = topGenreId
      ? genres.find(g => g.id === topGenreId)?.name || topGenreId
      : 'Diverse';

    // Longest run of consecutive calendar days with any activity — the "watch streak" (yearly wrap)
    const activeDates = Array.from(new Set(
      recentEntries.map(e => new Date(e.updatedAt || e.createdAt).toISOString().slice(0, 10))
    )).sort();
    let streak = activeDates.length > 0 ? 1 : 0;
    let currentRun = 1;
    for (let i = 1; i < activeDates.length; i++) {
      const diffDays = Math.round(
        (new Date(activeDates[i]).getTime() - new Date(activeDates[i - 1]).getTime()) / 86400000
      );
      currentRun = diffDays === 1 ? currentRun + 1 : 1;
      streak = Math.max(streak, currentRun);
    }

    const topMonth = Object.keys(monthMinutes).sort((a, b) => monthMinutes[b] - monthMinutes[a])[0] || null;

    return {
      recentCount: recentEntries.length,
      completedCount,
      plannedTvCount,
      moviesWatchedCount,
      seriesWatchedCount,
      hours,
      typeCount,
      topGenreName,
      topEntry: recentEntries.sort((a, b) => b.rating - a.rating)[0] || null,
      streak,
      topMonth,
    };
  }, [entries, genres, type, now]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setActiveSlide(0), 300);
      setTimeout(() => setCopied(false), 300);
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
      sw: stats.seriesWatchedCount,
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

  const titleText = type === 'weekly' ? 'Your Week in Kino' : type === 'monthly' ? 'Your Month in Kino' : 'Your Year in Kino';
  const subtitleText = type === 'weekly'
    ? "Let's see what you've been watching over the last 7 days."
    : type === 'monthly'
      ? "Let's see what you've accomplished over the last 30 days."
      : "Let's look back at your whole year in Kino.";

  const slides = useMemo(() => {
    const base = [
      {
        id: 'intro',
        content: (
          <div className="flex flex-col items-center text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 10, stiffness: 100, delay: 0.2 }}
              className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center relative shadow-[0_0_40px_rgba(var(--primary),0.3)]"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary"
              />
              <Sparkles size={40} className="text-primary" />
            </motion.div>
            <StaggeredText text={titleText} className="text-4xl sm:text-5xl font-display font-black tracking-tight" />
            <motion.p
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
              className="text-muted-foreground text-lg sm:text-xl font-medium"
            >
              {subtitleText}
            </motion.p>
          </div>
        )
      },
      {
        id: 'time',
        content: (
          <div className="flex flex-col items-center text-center space-y-6">
            <motion.div
              initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.1 }}
              className="w-20 h-20 bg-blue-500/20 rounded-2xl rotate-3 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]"
            >
              <Clock size={36} className="text-blue-500 -rotate-3" />
            </motion.div>
            <StaggeredText text="Time Well Spent" className="text-3xl font-display font-bold" />
            <div className="space-y-2 py-4">
              <motion.p initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, type: "spring" }} className="text-8xl font-black text-blue-500 font-display drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <AnimatedNumber value={stats.hours} />
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="text-muted-foreground uppercase tracking-widest text-sm font-bold">Hours Watched</motion.p>
            </div>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 }} className="text-sm sm:text-base text-foreground/80 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-blue-500/20 font-medium">
              You completed <strong className="text-blue-400"><AnimatedNumber value={stats.moviesWatchedCount} /> movies</strong> and <strong className="text-blue-400"><AnimatedNumber value={stats.seriesWatchedCount} /> series</strong>!
            </motion.p>
          </div>
        )
      },
      {
        id: 'genre',
        content: (
          <div className="flex flex-col items-center text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
              className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.2)]"
            >
              <TrendingUp size={36} className="text-purple-500" />
            </motion.div>
            <StaggeredText text="Your Top Vibe" className="text-3xl font-display font-bold" />
            <div className="space-y-4 py-8">
              <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.8, type: "spring" }}>
                <p className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-pink-500 font-display py-2">
                  {stats.topGenreName}
                </p>
              </motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="text-muted-foreground uppercase tracking-widest text-sm font-bold">Most Watched Genre</motion.p>
            </div>
          </div>
        )
      },
      ...(type === 'yearly' ? [{
        id: 'streak',
        content: (
          <div className="flex flex-col items-center text-center space-y-6">
            <motion.div
              initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.1 }}
              className="w-20 h-20 bg-orange-500/20 rounded-2xl rotate-3 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.2)]"
            >
              <Flame size={36} className="text-orange-500 -rotate-3" />
            </motion.div>
            <StaggeredText text="Your Rhythm" className="text-3xl font-display font-bold" />
            <div className="space-y-2 py-4">
              <motion.p initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, type: "spring" }} className="text-8xl font-black text-orange-500 font-display drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                <AnimatedNumber value={stats.streak} />
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="text-muted-foreground uppercase tracking-widest text-sm font-bold">Day Streak</motion.p>
            </div>
            {stats.topMonth && (
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 }} className="text-sm sm:text-base text-foreground/80 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-orange-500/20 font-medium">
                Your busiest stretch was <strong className="text-orange-400">{stats.topMonth}</strong>.
              </motion.p>
            )}
          </div>
        )
      }] : []),
      {
        id: 'top',
        content: (
          <div className="flex flex-col items-center text-center space-y-6 w-full">
            <StaggeredText text={`Highlight of the ${type === 'weekly' ? 'Week' : type === 'monthly' ? 'Month' : 'Year'}`} className="text-3xl font-display font-bold" />
            {stats.topEntry ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ delay: 0.8, duration: 0.8, type: "spring", damping: 15 }}
                className="relative w-56 aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-border/50 group mt-4"
              >
                <img src={stats.topEntry.coverImage} alt={stats.topEntry.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-5">
                  <p className="text-white text-xl font-bold leading-tight drop-shadow-md">{stats.topEntry.title}</p>
                  <div className="flex items-center gap-1 mt-2 text-amber-400">
                    {Array.from({ length: Math.floor(stats.topEntry.rating) }).map((_, i) => (
                      <motion.svg initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.5 + (i * 0.1) }} key={i} className="w-4 h-4 fill-current drop-shadow-sm" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></motion.svg>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-muted-foreground mt-10">No highly rated entries this {type === 'yearly' ? 'year' : type}.</motion.p>
            )}
          </div>
        )
      }
    ];
    return base;
  }, [type, titleText, subtitleText, stats]);

  const nextSlide = () => {
    setActiveSlide(prev => {
      if (prev < slides.length - 1) return prev + 1;
      onClose();
      return prev;
    });
  };

  const prevSlide = () => {
    setActiveSlide(prev => (prev > 0 ? prev - 1 : prev));
  };

  // Drives the per-slide progress bar and auto-advance. A single rAF loop per slide-mount;
  // pausing just flips a ref the loop checks every frame, so hold-to-pause never needs to
  // tear down/restart the loop (which would otherwise race with reading stale `progress`).
  useEffect(() => {
    if (!isOpen) return;
    Promise.resolve().then(() => setProgress(0));
    const SLIDE_DURATION = 12000;
    let accumulated = 0;
    let lastTimestamp: number | null = null;
    let raf: number;

    const tick = (timestamp: number) => {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      if (!isPausedRef.current) accumulated += delta;
      const pct = Math.min(100, (accumulated / SLIDE_DURATION) * 100);
      setProgress(pct);
      if (pct >= 100) {
        nextSlide();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only on slide/open change; pause is read live via isPausedRef so it never needs to restart this loop.
  }, [activeSlide, isOpen, slides.length]);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const suppressNextClickRef = useRef(false);

  const startHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => setIsPaused(true), 180);
  };

  const endHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isPausedRef.current) {
      suppressNextClickRef.current = true;
      setIsPaused(false);
    }
  };

  const handleZoneClick = (action: () => void) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    action();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden h-[100dvh] w-screen touch-none">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className={`relative w-full h-full flex flex-col bg-gradient-to-b ${GRADIENTS[slides[activeSlide]?.id] || GRADIENTS.intro} transition-colors duration-1000`}
        >
          <FloatingOrbs slideId={slides[activeSlide]?.id || 'intro'} />
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-5 z-20">
            <div className="max-w-md mx-auto w-full flex items-center justify-between">
              <div className="flex gap-2 flex-1 mr-4">
                {slides.map((s, i) => (
                  <div key={s.id} className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                    <div
                      className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                      style={{ width: `${i < activeSlide ? 100 : i === activeSlide ? progress : 0}%` }}
                    />
                  </div>
                ))}
              </div>
              <button onClick={onClose} className="p-2 bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md rounded-full text-white transition-all hover:scale-110 active:scale-95">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Touch Zones — quick tap navigates, hold (~180ms+) pauses without navigating */}
          <div
            className="absolute inset-y-16 left-0 w-1/3 z-10 cursor-pointer"
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onClick={() => handleZoneClick(prevSlide)}
          />
          <div
            className="absolute inset-y-16 right-0 w-2/3 z-10 cursor-pointer"
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onClick={() => handleZoneClick(nextSlide)}
          />

          {/* Pause indicator */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
              >
                <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10">
                  <Pause size={26} className="text-white/90" fill="currentColor" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content (Scrollable if necessary) */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 relative mt-14 overflow-y-auto hide-scrollbar z-20 pointer-events-none">
            <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center pointer-events-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide}
                  initial={{ opacity: 0, x: 50, filter: 'blur(10px)', scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)', scale: 1 }}
                  exit={{ opacity: 0, x: -50, filter: 'blur(10px)', scale: 0.9 }}
                  transition={{ duration: 0.5, type: "spring", damping: 20 }}
                  className="w-full flex justify-center py-4"
                >
                  {slides[activeSlide]?.content}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Footer controls */}
          <div className="p-5 pb-8 relative z-20 w-full shrink-0">
            <div className="max-w-md mx-auto w-full flex gap-3">
               {activeSlide === slides.length - 1 ? (
                 <motion.button
                   initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.5 }}
                   onClick={handleShare}
                   className="w-full py-4 bg-white hover:bg-gray-100 text-black font-black font-display tracking-wide rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2"
                 >
                   {copied ? <Check size={20} strokeWidth={3} /> : <Share2 size={20} strokeWidth={3} />}
                   {copied ? 'LINK COPIED!' : 'SHARE WRAPPED'}
                 </motion.button>
               ) : (
                 <button onClick={onClose} className="w-full py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/5 text-white/70 hover:text-white font-bold rounded-2xl transition-all text-sm">
                   Skip Recap
                 </button>
               )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
