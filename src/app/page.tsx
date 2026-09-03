"use client";

import { ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Play, ChevronRight, Sparkles, Filter } from "lucide-react";
import { useMedia } from "@/context/MediaContext";
import { MediaEntry, formatRuntime, isEpisodic } from "@/lib/db";
import { MediaDetailModal } from "@/components/MediaDetailModal";
import MediaCard from "@/components/MediaCard";
import { PageLoader } from "@/components/ui/Loader";
import { Skeleton, MediaCardSkeleton } from "@/components/ui/Skeleton";
import { KinoLogo } from "@/components/KinoLogo";
import { AmbientGlow } from "@/components/ui/AmbientGlow";
import { ReactLenis } from "lenis/react";
import { hueFromTitle } from "@/lib/colors";
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

// Color palette for ambient slide glows — hue is shared with MediaCard via hueFromTitle
// so the same title always gets the same accent color everywhere in the app.
function colorFromTitle(title?: string) {
  const hueA = hueFromTitle(title);
  const hueB = (hueA + 70) % 360;
  return {
    a: `hsla(${hueA}, 80%, 60%, 0.12)`,
    b: `hsla(${hueB}, 85%, 55%, 0.08)`,
    glow: `hsla(${hueA}, 90%, 60%, 0.25)`,
  };
}

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}

function SectionHeading({ eyebrow, title, action }: SectionHeadingProps) {
  return (
    <div className="flex items-end justify-between px-3 sm:px-8 lg:px-12">
      <div className="space-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/85">{eyebrow}</span>
        <h4 className="text-lg sm:text-2xl lg:text-4xl font-bold tracking-tight text-foreground leading-none">{title}</h4>
      </div>
      {action}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-background text-foreground pb-28 md:pb-20">
      <div className="mx-auto w-full max-w-[2400px] py-5 sm:py-10 space-y-12 sm:space-y-16">
        <div className="w-full px-3 sm:px-8 lg:px-12">
          <Skeleton className="w-full h-[280px] sm:h-[360px] lg:h-[420px] rounded-3xl" />
        </div>
        <div className="w-full px-3 sm:px-8 lg:px-12 space-y-6">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-3 sm:gap-5 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[110px] xs:w-[125px] sm:w-[145px] lg:w-[165px] shrink-0">
                <MediaCardSkeleton />
              </div>
            ))}
          </div>
        </div>
        <div className="w-full px-3 sm:px-8 lg:px-12 space-y-6">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-3 sm:gap-5 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[110px] xs:w-[125px] sm:w-[145px] lg:w-[165px] shrink-0">
                <MediaCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
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
                      <p className="text-sm font-bold text-foreground truncate">{item.value}</p>
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
  const { entries, isLoading, updateEntry, deleteEntry } = useMedia();
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);

  // Deck slideshow state
  const [randomDeck, setRandomDeck] = useState<MediaEntry[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);

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

  const [shelfFilter, setShelfFilter] = useState<'All' | 'Movie' | 'TV Show' | 'Anime'>('All');

  // Grouped lists for shelves
  const watching = useMemo(() => entries.filter((e) => e.status === "Watching" && (shelfFilter === 'All' || e.type === shelfFilter)).slice(0, 24), [entries, shelfFilter]);
  const planned = useMemo(() => entries.filter((e) => e.status === "Plan to Watch" && (shelfFilter === 'All' || e.type === shelfFilter)).slice(0, 24), [entries, shelfFilter]);
  const completed = useMemo(() => [...entries].filter((e) => e.status === "Completed" && (shelfFilter === 'All' || e.type === shelfFilter)).sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)).slice(0, 24), [entries, shelfFilter]);

  const handleSuggestNext = () => {
    const ptws = entries.filter(e => e.status === 'Plan to Watch' && (shelfFilter === 'All' || e.type === shelfFilter));
    if (ptws.length === 0) return;
    const pick = ptws[Math.floor(Math.random() * ptws.length)];
    setSelectedEntry(pick);
  };

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
    Promise.resolve().then(() => setNowTimestamp(Date.now()));
  }, []);

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
          localStorage.setItem('kino_last_monthly_recap', currentMonthStr);
          router.push('/wraps?type=monthly');
          return;
        }
        const lastWeekly = localStorage.getItem('kino_last_weekly_recap');
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (isSunday && (!lastWeekly || parseInt(lastWeekly) < oneWeekAgo)) {
          localStorage.setItem('kino_last_weekly_recap', Date.now().toString());
          router.push('/wraps?type=weekly');
        }
      } catch (e) {
        console.error(e);
      }
    });
  }, [isLoading, entries.length, isEarlyMonth, isSunday, router]);



  if (isLoading) return <DashboardSkeleton />;

  if (entries.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background text-foreground overflow-hidden px-4">
        <AmbientGlow glows={[
          "top-[-10%] right-[-10%] w-[60%] h-[50%] bg-primary/5 blur-[160px]",
          "bottom-[-10%] left-[-10%] w-[50%] h-[45%] bg-purple-500/5 blur-[140px]",
        ]} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex flex-col items-center text-center max-w-md"
        >
          <KinoLogo size={56} showText={false} />
          <h2 className="text-2xl sm:text-3xl font-display font-bold mt-6 mb-2">Your cinema awaits</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Add your first movie, show, or anime to start building your personal collection — everything syncs straight to your Google Drive.
          </p>
          <Link href="/add" className="bg-foreground text-background px-6 py-3 rounded-full font-bold text-sm shadow-md hover:bg-foreground/90 transition-all flex items-center gap-2">
            <Sparkles size={16} /> Add Your First Title
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <ReactLenis root={false} className="absolute inset-0 overflow-y-auto bg-background text-foreground hide-scrollbar pb-28 md:pb-20">
      {/* Decorative ambient background glows */}
      <AmbientGlow glows={[
        "top-0 right-0 w-[55%] h-[40%] bg-primary/3 blur-[160px]",
        "bottom-[20%] left-0 w-[45%] h-[35%] bg-purple-500/3 blur-[140px]",
      ]} />

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

        {/* Section 1.5: The Daily Reel (Stories UI) */}
        {randomDeck.length > 0 && (
          <motion.section 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}
            className="w-full px-4 sm:px-8 lg:px-12"
          >
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[10px] font-mono tracking-[0.2em] text-primary uppercase font-bold flex items-center gap-2">
                <Play size={14} /> The Daily Reel
              </h2>
            </div>
            <div data-lenis-prevent className="flex gap-4 sm:gap-6 overflow-x-auto hide-scrollbar pb-4 pt-1 snap-x">
              {randomDeck.map((story, i) => (
                <div key={`story-${story.id}-${i}`} className="flex flex-col items-center gap-2 shrink-0 snap-start group cursor-pointer" onClick={() => setSelectedEntry(story)}>
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-primary p-1 transition-transform group-hover:scale-105 active:scale-95 shadow-lg">
                    <div className="w-full h-full rounded-full overflow-hidden bg-card relative">
                       {story.coverImage ? (
                         <img src={story.coverImage} className="w-full h-full object-cover" alt="" />
                       ) : (
                         <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-bold">{story.title.charAt(0)}</div>
                       )}
                       <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-foreground text-center w-16 sm:w-20 truncate">{story.title}</span>
                </div>
              ))}
            </div>
          </motion.section>
        )}


        {/* Interactive Release Calendar */}
        {timelineItems.length > 0 && (
          <div className="w-full space-y-6 lg:space-y-8 mt-12 mb-16">
            <SectionHeading eyebrow="UPCOMING & RECENT" title="Release Calendar" />

            <div data-lenis-prevent className="w-full overflow-x-auto hide-scrollbar scroll-smooth pb-6 px-3 sm:px-8 lg:px-12">
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
          
          {/* Filter Chips */}
          <div data-lenis-prevent className="flex items-center gap-2 px-3 sm:px-8 lg:px-12 overflow-x-auto hide-scrollbar w-full pt-4">
            <Filter size={14} className="text-muted-foreground mr-1" />
            {(['All', 'Movie', 'TV Show', 'Anime'] as const).map(f => (
              <button
                key={f}
                onClick={() => setShelfFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-bold whitespace-nowrap transition-colors ${shelfFilter === f ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent hover:border-border/50'}`}
              >
                {f === 'All' ? 'Everything' : f === 'TV Show' ? 'Series' : f}
              </button>
            ))}
          </div>
          {/* Shelf 1: Continue Watching */}
          {watching.length > 0 && (
            <motion.section 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="space-y-6 w-full text-left"
            >
              <SectionHeading
                eyebrow="ACTIVE TRACKING"
                title="Continue Watching"
                action={
                  <Link href="/collection?type=All" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                    See All <ChevronRight size={14} />
                  </Link>
                }
              />

              <div data-lenis-prevent className="w-full overflow-x-auto hide-scrollbar scroll-smooth pb-4">
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
              <SectionHeading
                eyebrow="UP NEXT"
                title="Watchlist"
                action={
                  <div className="flex items-center gap-3">
                    <button onClick={handleSuggestNext} className="hidden sm:flex text-[11px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-full items-center gap-1.5 transition-colors border border-amber-500/20">
                      <Sparkles size={12} /> Suggest Next
                    </button>
                    <Link href="/collection?type=All" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                      See All <ChevronRight size={14} />
                    </Link>
                  </div>
                }
              />

              <div data-lenis-prevent className="w-full overflow-x-auto hide-scrollbar scroll-smooth pb-4">
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
              <SectionHeading
                eyebrow="FINISHED TITLES"
                title="Recently Completed"
                action={
                  <Link href="/collection?type=All" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                    See All <ChevronRight size={14} />
                  </Link>
                }
              />

              <div data-lenis-prevent className="w-full overflow-x-auto hide-scrollbar scroll-smooth pb-4">
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

    </ReactLenis>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<PageLoader fullScreen text="Loading Dashboard..." />}>
      <DashboardContent />
    </Suspense>
  );
}
