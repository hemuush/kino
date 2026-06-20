"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Play, ListVideo, ChevronRight, Activity, Star, CheckCircle2, Bookmark, Sparkles } from "lucide-react";
import { useMedia } from "@/context/MediaContext";
import { MediaEntry, formatRuntime, getWatchedRuntimeMinutes, isEpisodic } from "@/lib/db";
import { MediaDetailModal } from "@/components/MediaDetailModal";
import MediaCard from "@/components/MediaCard";
import { PageLoader } from "@/components/ui/Loader";
import { RecapModal } from "@/components/dashboard/RecapModal";
import { useRouter } from "next/navigation";

// Pick random items
function pickRandomItems<T>(arr: T[], count: number) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

// Color palettes for ambient slides glows
function colorFromTitle(title?: string) {
  const t = (title || "kino").toLowerCase();
  let hash = 0;
  for (let i = 0; i < t.length; i++) hash = (hash * 31 + t.charCodeAt(i)) >>> 0;
  const hueA = hash % 360;
  const hueB = (hueA + 70) % 360;
  return {
    a: `hsla(${hueA}, 80%, 60%, 0.12)`,
    b: `hsla(${hueB}, 85%, 55%, 0.08)`,
    glow: `hsla(${hueA}, 90%, 60%, 0.25)`,
  };
}

interface DiscProps {
  entry: MediaEntry;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

function Disc({ entry, className = "", onClick, active = false }: DiscProps) {
  return (
    <motion.button
      onClick={onClick}
      layout
      animate={{
        scale: active ? 1.05 : 0.92,
        filter: active ? "brightness(1) contrast(1)" : "brightness(0.75) contrast(0.9)",
        rotate: active ? 360 : 0
      }}
      whileHover={{ scale: active ? 1.08 : 0.95 }}
      transition={{ 
        rotate: active ? { repeat: Infinity, duration: 25, ease: "linear" } : { duration: 0.8 },
        scale: { type: "spring", stiffness: 100, damping: 15 },
        filter: { duration: 0.4 }
      }}
      className={`absolute overflow-hidden rounded-full border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.5)] ${className} cursor-pointer group`}
    >
      {/* Vinyl record cover art */}
      {entry.coverImage ? (
        <img src={entry.coverImage} alt={entry.title} className="h-full w-full object-cover select-none pointer-events-none" />
      ) : (
        <div className="h-full w-full bg-zinc-850" />
      )}
      
      {/* Vinyl record grooves & luster overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_15%,rgba(0,0,0,0.6)_16%,rgba(0,0,0,0.1)_22%,transparent_24%,rgba(0,0,0,0.65)_45%,rgba(0,0,0,0.2)_52%,transparent_56%,rgba(0,0,0,0.7)_80%,rgba(0,0,0,0.35)_90%,rgba(0,0,0,0.85)_100%)] mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-45 pointer-events-none" />

      {/* Central spindle hole & record label */}
      <div className="absolute inset-[32%] rounded-full bg-gradient-to-br from-neutral-200 to-neutral-400 dark:from-neutral-750 dark:to-neutral-900 border border-white/20 shadow-inner flex items-center justify-center pointer-events-none">
        {/* Center hole */}
        <div className="w-[22%] h-[22%] rounded-full bg-[#06070c] border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]" />
      </div>
    </motion.button>
  );
}

interface SpotlightCardProps {
  entry: MediaEntry;
  setSelectedEntry: (entry: MediaEntry) => void;
  activeSlide: number;
  randomDeck: MediaEntry[];
  setActiveSlide: (slide: number) => void;
}

function SpotlightCard({ entry, setSelectedEntry, activeSlide, randomDeck, setActiveSlide }: SpotlightCardProps) {
  const router = useRouter();
  const activeColor = useMemo(() => colorFromTitle(entry?.title), [entry]);

  // Tech specifications grid layout
  const statsGrid = [
    { label: "SYS STATUS", value: entry.status || "PLAN TO WATCH" },
    { label: "RATING", value: entry.rating > 0 ? `${entry.rating} / 10` : "UNRATED" },
    { label: "FORMAT", value: entry.type.toUpperCase() },
    { label: "DURATION", value: entry.runtime ? formatRuntime(entry.runtime) : "N/A" }
  ];

  // Stacked discs list
  const discs = useMemo(() => {
    if (randomDeck.length === 0) return [];
    return [
      randomDeck[activeSlide % randomDeck.length],
      randomDeck[(activeSlide + 1) % randomDeck.length],
      randomDeck[(activeSlide + 2) % randomDeck.length],
    ].filter(Boolean);
  }, [randomDeck, activeSlide]);

  return (
    <div className="group/spotlight relative rounded-3xl p-[1px] bg-gradient-to-b from-white/15 via-white/5 to-transparent shadow-md hover:shadow-2xl w-full flex overflow-hidden">
      
      {/* Apple styling glassmorphic backplate */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <section className="relative w-full h-full rounded-[23px] border border-border overflow-hidden bg-card/65 dark:bg-[#0c0c0d]/90 p-5 sm:p-10 lg:p-16 flex flex-col justify-center">
        
        {/* Ambient color light projection */}
        <div className="absolute inset-0 overflow-hidden opacity-[0.25] dark:opacity-[0.35] pointer-events-none z-0">
          <div 
            style={{ backgroundColor: activeColor.glow }}
            className="absolute right-[10%] top-[10%] w-[380px] h-[380px] rounded-full blur-[140px] animate-pulse"
          />
          <div 
            style={{ backgroundColor: activeColor.b }}
            className="absolute left-[20%] bottom-[5%] w-[300px] h-[300px] rounded-full blur-[110px]"
          />
        </div>

        {/* Content Layout */}
        <div className="relative z-10 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${entry.id}`}
              initial={{ opacity: 0, filter: "blur(12px)", scale: 0.98 }}
              animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
              exit={{ opacity: 0, filter: "blur(10px)", scale: 0.99 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-8 lg:gap-14"
            >
              {/* Left Column: Details */}
              <div className="space-y-4 sm:space-y-6 md:space-y-8 text-left flex-1 min-w-0 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono tracking-[0.25em] text-primary uppercase font-bold">
                    RECOMMENDED CINEMA
                  </span>
                </div>
                
                <div className="space-y-3 min-w-0">
                  <h2 
                    onClick={() => router.push(`/media/${entry.id}`)}
                    className="text-2xl sm:text-4xl lg:text-6xl font-display font-bold tracking-tight leading-[1.05] cursor-pointer hover:text-primary transition-colors line-clamp-2 min-w-0"
                  >
                    {entry.title}
                  </h2>
                  <p className="text-xs font-semibold text-primary uppercase tracking-[0.1em]">
                    {entry.type} &bull; {entry.releaseDate?.split("-")[0] || "RELEASE YEAR"}
                  </p>
                </div>

                {/* Technical Specs Blocks */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 p-3 sm:p-4 rounded-xl bg-black/5 dark:bg-white/3 border border-border/40 backdrop-blur-md">
                  {statsGrid.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <p className="text-[8.5px] font-mono tracking-widest text-muted-foreground uppercase">{item.label}</p>
                      <p className="text-xs.5 font-bold text-foreground truncate">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="pt-1 sm:pt-2 flex flex-wrap gap-2.5">
                  <button
                    onClick={() => router.push(`/media/${entry.id}`)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 transition px-5 py-2.5 sm:px-6.5 sm:py-3.5 text-[10px] uppercase font-display tracking-widest font-bold cursor-pointer active:scale-95 shadow-md"
                  >
                    <Play size={12} className="fill-current" /> Quick Details
                  </button>
                  <Link
                    href="/collection"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-foreground/5 hover:bg-foreground/10 text-foreground transition px-5 py-2.5 sm:px-6.5 sm:py-3.5 text-[10px] uppercase font-display tracking-widest font-bold cursor-pointer active:scale-95"
                  >
                    Library
                  </Link>
                </div>
              </div>

              {/* Right Column: Virtual Rotating Vinyl Platter */}
              {entry.coverImage && (
                <div className="flex-shrink-0 flex items-center justify-center relative select-none w-full lg:w-auto">
                  {/* Ambient Glow */}
                  <div 
                    style={{ backgroundColor: activeColor.glow }}
                    className="absolute w-[80%] h-[80%] rounded-full blur-[80px] opacity-40 pointer-events-none"
                  />

                  {/* Mobile Single Disc View */}
                  <div className="flex lg:hidden justify-center items-center py-2 sm:py-4 relative w-36 h-36 sm:w-52 sm:h-52">
                    {discs[0] && (
                      <Disc entry={discs[0]} active className="w-full h-full" onClick={() => setSelectedEntry(discs[0])} />
                    )}
                  </div>

                  {/* Desktop 3D Stacked Vinyl Deck */}
                  <div className="hidden lg:flex relative w-[380px] h-[380px] items-center justify-center">
                    {/* Platter backing rim */}
                    <div className="absolute w-[84%] h-[84%] rounded-full border border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-center shadow-2xl">
                      <div className="absolute inset-2 rounded-full border border-dashed border-white/10 opacity-20 animate-spin" style={{ animationDuration: '60s' }} />
                    </div>

                    {/* Disc 2 (Backmost) */}
                    {discs[2] && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`disc-2-${discs[2].id}`}
                          initial={{ opacity: 0, x: 50, scale: 0.8 }}
                          animate={{ opacity: 0.55, x: 32, scale: 0.82 }}
                          exit={{ opacity: 0, x: -30, scale: 0.8 }}
                          transition={{ duration: 0.6 }}
                          className="absolute h-[68%] aspect-square z-10"
                        >
                          <Disc entry={discs[2]} className="h-full w-full" onClick={() => setSelectedEntry(discs[2])} />
                        </motion.div>
                      </AnimatePresence>
                    )}

                    {/* Disc 1 (Middle) */}
                    {discs[1] && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`disc-1-${discs[1].id}`}
                          initial={{ opacity: 0, x: 40, scale: 0.85 }}
                          animate={{ opacity: 0.8, x: 16, scale: 0.88 }}
                          exit={{ opacity: 0, x: -20, scale: 0.85 }}
                          transition={{ duration: 0.55 }}
                          className="absolute h-[76%] aspect-square z-20"
                        >
                          <Disc entry={discs[1]} className="h-full w-full" onClick={() => setSelectedEntry(discs[1])} />
                        </motion.div>
                      </AnimatePresence>
                    )}

                    {/* Disc 0 (Active / Foreground) */}
                    {discs[0] && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`disc-0-${discs[0].id}`}
                          initial={{ opacity: 0, x: 30, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -15, scale: 0.9 }}
                          transition={{ duration: 0.5 }}
                          className="absolute h-[85%] aspect-square z-30"
                        >
                          <Disc entry={discs[0]} active className="h-full w-full" onClick={() => setSelectedEntry(discs[0])} />
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Slide control indicators */}
        {randomDeck.length > 1 && (
          <div className="absolute bottom-6 right-8 flex items-center gap-2 z-30">
            {randomDeck.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className="relative h-1 rounded-full transition-all duration-300 cursor-pointer overflow-hidden"
                style={{
                  width: activeSlide === idx ? "24px" : "6px",
                  backgroundColor: activeSlide === idx ? "var(--foreground)" : "rgba(120, 120, 120, 0.2)"
                }}
                aria-label={`Go to slide ${idx + 1}`}
              >
                {activeSlide === idx && (
                  <motion.div 
                    className="absolute inset-y-0 left-0 bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 5, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { entries, isLoading, updateEntry, deleteEntry, genres } = useMedia();
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);
  const [showRecap, setShowRecap] = useState(false);
  const [recapType, setRecapType] = useState<'weekly' | 'monthly'>('weekly');

  // Deck slideshow state
  const [randomDeck, setRandomDeck] = useState<MediaEntry[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);

  // Shelf tab state
  const [activeShelf, setActiveShelf] = useState<"watching" | "planned" | "completed">("watching");
  const [hasSetDefaultShelf, setHasSetDefaultShelf] = useState(false);

  // Pick 5 random items once on load and prevent reshuffling when editing items
  useEffect(() => {
    if (entries.length > 0 && randomDeck.length === 0) {
      const picks = pickRandomItems(entries, Math.min(entries.length, 5));
      Promise.resolve().then(() => {
        setRandomDeck(picks);
        setActiveSlide(0);
      });
    }
  }, [entries, randomDeck.length]);

  // Cycle slide index every 5 seconds
  useEffect(() => {
    if (randomDeck.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % randomDeck.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [randomDeck.length]);

  const featured = randomDeck[activeSlide] || null;

  // Grouped lists for shelves
  const watching = useMemo(() => entries.filter((e) => e.status === "Watching").slice(0, 24), [entries]);
  const planned = useMemo(() => entries.filter((e) => e.status === "Plan to Watch").slice(0, 24), [entries]);
  const completed = useMemo(() => [...entries].filter((e) => e.status === "Completed").sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)).slice(0, 24), [entries]);

  // Release Calendar Timeline
  const timelineItems = useMemo(() => {
    return [...entries]
      .filter(e => e.releaseDate)
      .sort((a, b) => new Date(b.releaseDate!).getTime() - new Date(a.releaseDate!).getTime())
      .slice(0, 15);
  }, [entries]);

  // Reference timestamp computed once per mount — prevents impure Date.now() in render
  const [nowTimestamp, setNowTimestamp] = useState<number>(0);
  useEffect(() => {
    setNowTimestamp(Date.now());
  }, []);

  // timelineItems calculation ends here

  // Set default active shelf once based on items availability
  useEffect(() => {
    if (!isLoading && entries.length > 0 && !hasSetDefaultShelf) {
      Promise.resolve().then(() => {
        if (watching.length > 0) {
          setActiveShelf("watching");
        } else if (planned.length > 0) {
          setActiveShelf("planned");
        } else if (completed.length > 0) {
          setActiveShelf("completed");
        }
        setHasSetDefaultShelf(true);
      });
    }
  }, [entries, isLoading, watching.length, planned.length, completed.length, hasSetDefaultShelf]);

  // Date logic for displaying recap triggers
  const now = new Date();
  const isEarlyMonth = now.getDate() >= 1 && now.getDate() <= 5;
  const isSunday = now.getDay() === 0;

  // Handle automatic weekly and monthly recap popup
  useEffect(() => {
    if (isLoading || entries.length === 0) return;
    Promise.resolve().then(() => {
      try {
        const now = new Date();
        const lastMonthly = localStorage.getItem('kino_last_monthly_recap');
        const currentMonthStr = `${now.getFullYear()}-${now.getMonth()}`;
        if (isEarlyMonth && lastMonthly !== currentMonthStr) {
          setRecapType('monthly');
          setShowRecap(true);
          return;
        }
        const lastWeekly = localStorage.getItem('kino_last_weekly_recap');
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (isSunday && (!lastWeekly || parseInt(lastWeekly) < oneWeekAgo)) {
          setRecapType('weekly');
          setShowRecap(true);
        }
      } catch (e) {
        console.error(e);
      }
    });
  }, [isLoading, entries.length, isEarlyMonth, isSunday]);

  const handleCloseRecap = () => {
    setShowRecap(false);
    if (recapType === 'monthly') {
      const now = new Date();
      localStorage.setItem('kino_last_monthly_recap', `${now.getFullYear()}-${now.getMonth()}`);
    } else {
      localStorage.setItem('kino_last_weekly_recap', Date.now().toString());
    }
  };

  // Watch statistics
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let completedCount = 0;
    let avgRatingSum = 0;
    let ratedCount = 0;
    let totalEpisodes = 0;

    for (const e of entries) {
      if (e.status === "Completed") completedCount += 1;
      totalMinutes += getWatchedRuntimeMinutes(e);
      if (isEpisodic(e)) {
        totalEpisodes += e.episodesWatched || 0;
      }
      if ((e.rating || 0) > 0) {
        avgRatingSum += e.rating;
        ratedCount += 1;
      }
    }

    return {
      days: (totalMinutes / (60 * 24)).toFixed(1),
      episodes: totalEpisodes,
      completed: completedCount,
      watchlist: planned.length,
      avgRating: ratedCount ? (avgRatingSum / ratedCount).toFixed(1) : "0.0",
      total: entries.length,
    };
  }, [entries, planned.length]);

  // On This Day logic
  const onThisDay = useMemo(() => {
    if (entries.length === 0) return null;
    const today = new Date();
    const matches = entries.filter(e => {
      const d = new Date(e.createdAt);
      return d.getMonth() === today.getMonth() && d.getDate() === today.getDate() && d.getFullYear() < today.getFullYear();
    });
    return matches.sort((a,b) => (b.rating || 0) - (a.rating || 0))[0] || null;
  }, [entries]);

  if (isLoading) return <PageLoader text="Loading your Cinema Dashboard..." />;

  return (
    <div className="absolute inset-0 overflow-y-auto bg-background text-foreground scroll-smooth hide-scrollbar pb-28 md:pb-20">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 w-[55%] h-[40%] bg-primary/3 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-0 w-[45%] h-[35%] bg-purple-500/3 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Narrative Container (Apple/Nothing Scroll tour layout style) */}
      <div className="mx-auto w-full max-w-[2400px] py-5 sm:py-10 space-y-12 sm:space-y-20 lg:space-y-24">
        
        {/* Section 1: Giant Cinematic Widescreen Spotlight Hero */}
        {featured && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full px-3 sm:px-8 lg:px-12"
          >
            <SpotlightCard 
              entry={featured} 
              setSelectedEntry={setSelectedEntry} 
              activeSlide={activeSlide}
              randomDeck={randomDeck}
              setActiveSlide={setActiveSlide}
            />
          </motion.div>
        )}

        {/* Section 2: Dedicated Stats Row */}
        <div className="w-full space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-left space-y-2 max-w-2xl px-4 sm:px-8 lg:px-12"
          >
            <span className="text-[10px] font-mono tracking-[0.2em] text-primary uppercase font-bold">OVERVIEW &amp; STATS</span>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <h3 className="text-xl sm:text-3xl lg:text-5xl font-display font-bold tracking-tight text-foreground leading-none max-w-2xl">
                Your cinema journey, in numbers.
              </h3>
              <div className="flex gap-2 shrink-0">
                {isSunday && (
                  <button 
                    onClick={() => { setRecapType('weekly'); setShowRecap(true); }}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    <Sparkles size={14} /> Weekly
                  </button>
                )}
                {isEarlyMonth && (
                  <button 
                    onClick={() => { setRecapType('monthly'); setShowRecap(true); }}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 border border-purple-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    <Sparkles size={14} /> Monthly
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Section: On This Day */}
          {onThisDay && (
            <section className="relative z-10 px-4 sm:px-8 lg:px-12">
              <h2 className="text-[13px] sm:text-sm font-display font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <Star size={16} className="text-primary" />
                On This Day
              </h2>
              <div className="bg-card/65 backdrop-blur-xl border border-border/50 rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm hover:border-primary/30 transition-colors">
                <div className="w-32 h-48 sm:w-24 sm:h-36 shrink-0 relative rounded-xl overflow-hidden shadow-md bg-card border border-border/40">
                  {onThisDay.coverImage ? (
                    <img src={onThisDay.coverImage} alt={onThisDay.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/30 text-muted-foreground text-xs font-bold text-center p-2">{onThisDay.title}</div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold">{onThisDay.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    You added this {new Date().getFullYear() - new Date(onThisDay.createdAt).getFullYear()} year{new Date().getFullYear() - new Date(onThisDay.createdAt).getFullYear() > 1 ? 's' : ''} ago today. 
                    {onThisDay.rating ? ` You rated it ${onThisDay.rating}/10.` : ''}
                  </p>
                  <button 
                    onClick={() => setSelectedEntry(onThisDay)}
                    className="mt-4 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors rounded-lg font-bold text-xs uppercase tracking-wide cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </section>
          )}

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4 lg:gap-6 w-full px-3 sm:px-8 lg:px-12"
          >
            {[
              { value: stats.days, label: "Days Watched", Icon: Clock, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
              { value: stats.episodes, label: "Episodes", Icon: ListVideo, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
              { value: stats.completed, label: "Completed", Icon: CheckCircle2, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
              { value: stats.watchlist, label: "Plan to Watch", Icon: Bookmark, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
              { value: stats.avgRating, label: "Avg Rating", Icon: Star, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
              { value: stats.total, label: "Total Titles", Icon: Activity, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" }
            ].map(({ value, label, Icon, color }) => (
              <div 
                key={label}
                className="rounded-2xl border-2 border-border/60 bg-card/65 dark:bg-[#0c0c0d]/80 p-3 sm:p-5 backdrop-blur-xl shadow-sm text-left relative overflow-hidden group/card"
              >
                {/* Clean hover lighting glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-foreground/3 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="flex items-center gap-1.5">
                  <div className={`p-1 sm:p-1.5 rounded-lg border ${color}`}>
                    <Icon size={10} className="sm:w-3 sm:h-3" />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-muted-foreground uppercase font-semibold leading-none">{label}</span>
                </div>
                <p className="mt-2.5 sm:mt-4 text-xl sm:text-3xl font-bold tracking-tight text-foreground leading-none">{value}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Space reserved for Dashboard metrics */}

        {/* Interactive Release Calendar */}
        {timelineItems.length > 0 && (
          <div className="w-full space-y-6 lg:space-y-8 mt-12 mb-16">
            <div className="space-y-1 px-3 sm:px-8 lg:px-12">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/85">UPCOMING & RECENT</span>
              <h4 className="text-lg sm:text-2xl lg:text-3.5xl font-bold tracking-tight text-foreground leading-none">Release Calendar</h4>
            </div>
            
            <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth pb-6 px-3 sm:px-8 lg:px-12">
              <div className="flex items-center gap-6 w-max relative pt-6 pb-2">
                {/* Connecting line */}
                <div className="absolute top-[42px] left-0 right-0 h-0.5 bg-border/60 z-0" />
                
                {timelineItems.map((entry) => {
                  const date = new Date(entry.releaseDate!);
                  const isFuture = date.getTime() > nowTimestamp;
                  
                  return (
                    <div key={`timeline-${entry.id}`} className="relative z-10 flex flex-col items-center gap-4 w-[120px] sm:w-[140px] shrink-0 group cursor-pointer" onClick={() => router.push(`/media/${entry.id}`)}>
                      {/* Date label */}
                      <span className={`text-[9px] sm:text-[10px] font-mono tracking-widest font-bold px-2.5 py-1 rounded-md border shadow-sm ${isFuture ? 'text-primary bg-primary/10 border-primary/20' : 'text-muted-foreground bg-card border-border/60'}`}>
                        {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      
                      {/* Node */}
                      <div className={`w-3.5 h-3.5 rounded-full border-2 transition-transform duration-300 group-hover:scale-150 ${isFuture ? 'border-primary bg-primary shadow-[0_0_12px_rgba(var(--primary),0.6)]' : 'border-muted-foreground bg-background'}`} />
                      
                      {/* Card Thumbnail */}
                      <div className="w-full aspect-[2/3] rounded-[14px] overflow-hidden shadow-md border border-border/40 group-hover:border-primary/50 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:shadow-primary/20 transition-all duration-300 relative bg-card mt-2">
                        {entry.coverImage ? (
                          <img src={entry.coverImage} className="w-full h-full object-cover" alt={entry.title} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted/30 p-2 text-center">
                            <span className="text-[9px] font-bold uppercase">{entry.title}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="text-[10px] text-white font-bold truncate w-full text-center drop-shadow-md">{entry.title}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Media Shelves Narratives */}
        <div className="w-full space-y-10 sm:space-y-14 lg:space-y-16">
          
          {/* Shelf 1: Continue Watching */}
          {watching.length > 0 && (
            <motion.section 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="space-y-6 w-full text-left"
            >
              <div className="flex items-end justify-between px-3 sm:px-8 lg:px-12">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/85">ACTIVE TRACKING</span>
                  <h4 className="text-lg sm:text-2xl lg:text-3.5xl font-bold tracking-tight text-foreground leading-none">Continue Watching</h4>
                </div>
                <Link href="/collection?type=All" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                  See All <ChevronRight size={14} />
                </Link>
              </div>
              
              <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth pb-4">
                <div className="flex gap-3 sm:gap-5 px-3 sm:px-8 lg:px-12 w-max">
                  {watching.map((entry, i) => {
                    const hasEpisodes = isEpisodic(entry) && entry.episodesTotal;
                    const progressPercent = hasEpisodes 
                      ? ((entry.episodesWatched || 0) / (entry.episodesTotal || 1)) * 100 
                      : 0;

                    return (
                      <div key={entry.id} className="w-[110px] xs:w-[125px] sm:w-[145px] lg:w-[165px] shrink-0 snap-start flex flex-col gap-2">
                        <MediaCard
                          entry={entry}
                          index={i}
                          onClick={() => router.push(`/media/${entry.id}`)}
                          onFavoriteToggle={() => updateEntry({ ...entry, favorite: !entry.favorite })}
                          onIncrementWatched={() => {
                            if (isEpisodic(entry)) {
                              const max = entry.episodesTotal || 9999;
                              const current = entry.episodesWatched || 0;
                              if (current < max) {
                                updateEntry({ ...entry, episodesWatched: current + 1 });
                              }
                            }
                          }}
                          onStatusChange={(newStatus) => updateEntry({ ...entry, status: newStatus })}
                        />
                        
                        {/* Watch progress indicator bar */}
                        {hasEpisodes && (
                          <div className="px-0.5 text-left space-y-1.5">
                            <div className="w-full bg-muted border border-border/40 rounded-full h-1 overflow-hidden">
                              <motion.div 
                                className="bg-primary h-full rounded-full" 
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.6 }}
                              />
                            </div>
                            <p className="text-[9px] font-bold text-muted-foreground leading-none">
                              {entry.episodesWatched || 0}/{entry.episodesTotal} episodes
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          )}

          {/* Shelf 2: Watchlist */}
          {planned.length > 0 && (
            <motion.section 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="space-y-6 w-full text-left"
            >
              <div className="flex items-end justify-between px-3 sm:px-8 lg:px-12">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/85">UP NEXT</span>
                  <h4 className="text-lg sm:text-2xl lg:text-3.5xl font-bold tracking-tight text-foreground leading-none">Watchlist</h4>
                </div>
                <Link href="/collection?type=All" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                  See All <ChevronRight size={14} />
                </Link>
              </div>
              
              <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth pb-4">
                <div className="flex gap-3 sm:gap-5 px-3 sm:px-8 lg:px-12 w-max">
                  {planned.map((entry, i) => (
                    <div key={entry.id} className="w-[110px] xs:w-[125px] sm:w-[145px] lg:w-[165px] shrink-0 snap-start">
                      <MediaCard
                        entry={entry}
                        index={i}
                        onClick={() => router.push(`/media/${entry.id}`)}
                        onFavoriteToggle={() => updateEntry({ ...entry, favorite: !entry.favorite })}
                        onIncrementWatched={() => {}}
                        onStatusChange={(newStatus) => updateEntry({ ...entry, status: newStatus })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {/* Shelf 3: Recently Completed */}
          {completed.length > 0 && (
            <motion.section 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="space-y-6 w-full text-left"
            >
              <div className="flex items-end justify-between px-3 sm:px-8 lg:px-12">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/85">FINISHED TITLES</span>
                  <h4 className="text-lg sm:text-2xl lg:text-3.5xl font-bold tracking-tight text-foreground leading-none">Recently Completed</h4>
                </div>
                <Link href="/collection?type=All" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                  See All <ChevronRight size={14} />
                </Link>
              </div>
              
              <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth pb-4">
                <div className="flex gap-3 sm:gap-5 px-3 sm:px-8 lg:px-12 w-max">
                  {completed.map((entry, i) => (
                    <div key={entry.id} className="w-[110px] xs:w-[125px] sm:w-[145px] lg:w-[165px] shrink-0 snap-start">
                      <MediaCard
                        entry={entry}
                        index={i}
                        onClick={() => router.push(`/media/${entry.id}`)}
                        onFavoriteToggle={() => updateEntry({ ...entry, favorite: !entry.favorite })}
                        onIncrementWatched={() => {}}
                        onStatusChange={(newStatus) => updateEntry({ ...entry, status: newStatus })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

        </div>
      </div>

      {selectedEntry && (
        <MediaDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSave={async (updatedEntry) => {
            await updateEntry(updatedEntry);
            setSelectedEntry(updatedEntry);
          }}
          onDelete={async (id) => {
            await deleteEntry(id);
            setSelectedEntry(null);
          }}
        />
      )}

      <RecapModal 
        isOpen={showRecap} 
        onClose={handleCloseRecap} 
        entries={entries} 
        genres={genres} 
        type={recapType}
      />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<PageLoader fullScreen text="Loading Dashboard..." />}>
      <DashboardContent />
    </Suspense>
  );
}
