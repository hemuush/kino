"use client";

import { ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Play, ChevronRight, Sparkles, Filter, Clock, X, History, Star, NotebookPen, Send, Flame, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { useMedia } from "@/context/MediaContext";
import { MediaEntry, formatRuntime, isEpisodic, getWatchedRuntimeMinutes } from "@/lib/db";
import { MediaDetailModal } from "@/components/MediaDetailModal";
import { PageLoader } from "@/components/ui/Loader";
import { Skeleton, MediaCardSkeleton } from "@/components/ui/Skeleton";
import { KinoLogo } from "@/components/KinoLogo";
import { AmbientGlow } from "@/components/ui/AmbientGlow";
import { CinematicBackdrop } from "@/components/dashboard/CinematicBackdrop";
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

// "What to watch tonight" quick-pick: narrows the watchlist by how much time
// you have and what you're in the mood for, then picks randomly from that pool.
type QuickPickDuration = 'Any' | 'Quick' | 'Medium' | 'Long';
type QuickPickMood = 'Any' | 'Feel-Good' | 'Intense' | 'Emotional' | 'Mind-Bending';

const MOOD_GENRE_KEYWORDS: Record<Exclude<QuickPickMood, 'Any'>, string[]> = {
  'Feel-Good': ['comedy', 'slice of life', 'animation'],
  'Intense': ['action', 'thriller', 'horror'],
  'Emotional': ['drama', 'romance'],
  'Mind-Bending': ['sci-fi', 'mystery', 'supernatural', 'fantasy'],
};

// A rough "how long is one sitting" estimate — full runtime for a movie,
// one episode's length for anything episodic (matches how `runtime` is
// already used as the per-episode field on episodic entries in MediaForm).
function getSessionRuntimeMinutes(entry: MediaEntry): number | null {
  if (!isEpisodic(entry)) return entry.runtime || null;
  if (entry.runtime) return entry.runtime;
  const knownEpisodeRuntimes = (entry.episodes || [])
    .map(ep => ep.runtime)
    .filter((r): r is number => !!r && r > 0);
  if (knownEpisodeRuntimes.length === 0) return null;
  return Math.round(knownEpisodeRuntimes.reduce((sum, r) => sum + r, 0) / knownEpisodeRuntimes.length);
}

function matchesDuration(minutes: number | null, duration: QuickPickDuration): boolean {
  if (duration === 'Any' || minutes === null) return true;
  if (duration === 'Quick') return minutes < 45;
  if (duration === 'Medium') return minutes >= 45 && minutes <= 90;
  return minutes > 90;
}

function matchesMood(entry: MediaEntry, genreNamesById: Map<string, string>, mood: QuickPickMood): boolean {
  if (mood === 'Any') return true;
  const keywords = MOOD_GENRE_KEYWORDS[mood];
  const entryGenreNames = (entry.genreIds || []).map(id => (genreNamesById.get(id) || '').toLowerCase());
  return entryGenreNames.some(name => keywords.some(kw => name.includes(kw)));
}

// Alternating tilt angles for The Vault's fanned record-crate list — fixed, not
// random, so the layout is stable across renders (React 19 purity: no Math.random
// during render).
const VAULT_ANGLES = [-4, 3, -2, 4, -3, 2, -4, 3, -2, 4];

// SVG stroke-dasharray/offset for a circular progress ring at the given radius.
function progressRing(percent: number, radius: number) {
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, percent));
  return { circumference, offset: circumference * (1 - clamped) };
}

// Deterministic gradient placeholder (keyed by title hue) for tiles with no cover image.
function placeholderGradient(title?: string): string {
  const hue = hueFromTitle(title);
  return `linear-gradient(155deg, hsl(${hue}, 45%, 18%), #050505)`;
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

// Deferred: computed once mounted via the same Promise.resolve().then() pattern used
// elsewhere, never `new Date()` during render.
function todayISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

function QuickJournalNote() {
  const { addJournalEntry } = useMedia();
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [today, setToday] = useState('');

  useEffect(() => {
    Promise.resolve().then(() => setToday(todayISO(new Date())));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSaving) return;
    setIsSaving(true);
    await addJournalEntry(today, text.trim());
    setText('');
    setIsSaving(false);
    toast.success("Note saved to your Journal.");
  };

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5 mb-2">
        <NotebookPen size={11} /> Quick Note
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's on your mind about what you're watching?"
        rows={2}
        className="flex-1 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-none"
      />
      <button
        type="submit"
        disabled={!text.trim() || isSaving}
        className="self-end mt-2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground text-background text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        <Send size={11} /> {isSaving ? 'Saving...' : 'Save to Journal'}
      </button>
    </form>
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
  const { entries, genres, isLoading, updateEntry, deleteEntry } = useMedia();
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

  const genreNamesById = useMemo(() => new Map(genres.map(g => [g.id, g.name])), [genres]);

  // Ambient background waypoints — one hue per section, top to bottom, so the page's
  // "mood lighting" drifts to match whatever shelf is currently in view.
  const sectionHues = useMemo(() => {
    return [featured, watching[0], planned[0], completed[0]]
      .filter((e): e is MediaEntry => !!e)
      .map((e) => hueFromTitle(e.title));
  }, [featured, watching, planned, completed]);

  // Shared shelf-entrance motion — a subtle forward tilt (like pulling a record off a
  // shelf) instead of a flat fade-up, disabled entirely under prefers-reduced-motion.
  const prefersReducedMotion = useReducedMotion();
  const shelfInitial = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 50, rotateX: -14 };
  const shelfAnimate = prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, rotateX: 0 };
  const shelfTransition = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const };
  const shelfStyle = prefersReducedMotion ? undefined : { transformPerspective: 1000, transformOrigin: "center top" };

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickDuration, setPickDuration] = useState<QuickPickDuration>('Any');
  const [pickMood, setPickMood] = useState<QuickPickMood>('Any');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setPickerOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerOpen]);

  const runQuickPick = () => {
    const pool = entries.filter(e => e.status === 'Plan to Watch' && (shelfFilter === 'All' || e.type === shelfFilter));
    if (pool.length === 0) return;
    const filtered = pool.filter(e =>
      matchesDuration(getSessionRuntimeMinutes(e), pickDuration) && matchesMood(e, genreNamesById, pickMood)
    );
    const finalPool = filtered.length > 0 ? filtered : pool;
    if (filtered.length === 0 && (pickDuration !== 'Any' || pickMood !== 'Any')) {
      toast.info("Nothing matched exactly — picked from your full watchlist instead.");
    }
    const pick = finalPool[Math.floor(Math.random() * finalPool.length)];
    setSelectedEntry(pick);
    setPickerOpen(false);
  };

  // Reference timestamp computed once per mount — prevents impure Date.now() in render
  const [nowTimestamp, setNowTimestamp] = useState<number>(0);
  useEffect(() => {
    Promise.resolve().then(() => setNowTimestamp(Date.now()));
  }, []);

  // Release Radar: a chronological window of releases centered on "today" (rather than
  // just the newest-dated 15), so the wave timeline has genuine past-to-future flow.
  const timelineItems = useMemo(() => {
    const dated = [...entries]
      .filter(e => e.releaseDate)
      .sort((a, b) => new Date(a.releaseDate!).getTime() - new Date(b.releaseDate!).getTime());
    if (dated.length <= 15) return dated;
    const todayIdx = dated.findIndex(e => new Date(e.releaseDate!).getTime() >= nowTimestamp);
    const centerIdx = todayIdx === -1 ? dated.length - 1 : todayIdx;
    const start = Math.max(0, Math.min(centerIdx - 7, dated.length - 15));
    return dated.slice(start, start + 15);
  }, [entries, nowTimestamp]);

  // Index at which "today" falls within timelineItems — only meaningful (and only
  // rendered as a marker) when it genuinely splits the visible window in two.
  const todaySplitIndex = useMemo(() => {
    const idx = timelineItems.findIndex(e => new Date(e.releaseDate!).getTime() > nowTimestamp);
    return idx > 0 && idx < timelineItems.length ? idx : -1;
  }, [timelineItems, nowTimestamp]);

  type RadarNode = { kind: 'entry'; entry: MediaEntry } | { kind: 'today' };
  const radarNodes = useMemo<RadarNode[]>(() => {
    const nodes: RadarNode[] = timelineItems.map((e) => ({ kind: 'entry', entry: e }));
    if (todaySplitIndex > 0) nodes.splice(todaySplitIndex, 0, { kind: 'today' });
    return nodes;
  }, [timelineItems, todaySplitIndex]);

  // Your Week: hours watched in the last 7 days.
  const weeklyMinutes = useMemo(() => {
    if (!nowTimestamp) return 0;
    const weekAgo = nowTimestamp - 7 * 24 * 60 * 60 * 1000;
    return entries
      .filter(e => (e.updatedAt || e.createdAt) >= weekAgo)
      .reduce((sum, e) => sum + getWatchedRuntimeMinutes(e), 0);
  }, [entries, nowTimestamp]);

  // Your Week: current streak of consecutive days (ending today) with any tracked activity.
  const dayStreak = useMemo(() => {
    if (!nowTimestamp) return 0;
    const activeDays = new Set(
      entries
        .map(e => e.updatedAt || e.createdAt)
        .filter((ts): ts is number => !!ts)
        .map(ts => new Date(ts).toDateString())
    );
    let streak = 0;
    const cursor = new Date(nowTimestamp);
    while (activeDays.has(cursor.toDateString())) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [entries, nowTimestamp]);

  // Your Week: top genre + a 3-segment share breakdown for the mini stacked bar.
  const genreMix = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach(e => (e.genreIds || []).forEach(id => {
      const name = genreNamesById.get(id);
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    }));
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, [, c]) => sum + c, 0) || 1;
    return {
      topName: sorted[0]?.[0] || 'N/A',
      segments: sorted.slice(0, 3).map(([, c]) => (c / total) * 100),
    };
  }, [entries, genreNamesById]);

  // Your Week: average rating across completed, rated titles.
  const avgRating = useMemo(() => {
    const rated = entries.filter(e => e.status === 'Completed' && e.rating > 0);
    if (rated.length === 0) return null;
    return rated.reduce((sum, e) => sum + e.rating, 0) / rated.length;
  }, [entries]);

  // Date logic for displaying recap triggers — derived from the deferred nowTimestamp
  // above, never a bare `new Date()` during render.
  const isEarlyMonth = nowTimestamp > 0 && new Date(nowTimestamp).getDate() >= 1 && new Date(nowTimestamp).getDate() <= 5;
  const isSunday = nowTimestamp > 0 && new Date(nowTimestamp).getDay() === 0;

  // "On This Day": surfaces something completed/updated on this exact month+day in a past year.
  const onThisDay = useMemo(() => {
    if (!nowTimestamp) return null;
    const today = new Date(nowTimestamp);
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    const todayYear = today.getFullYear();

    const matches = entries.filter(e => {
      const ts = e.updatedAt || e.createdAt;
      if (!ts) return false;
      const d = new Date(ts);
      return d.getMonth() === todayMonth && d.getDate() === todayDate && d.getFullYear() < todayYear;
    });
    if (matches.length === 0) return null;

    matches.sort((a, b) => {
      const aCompleted = a.status === 'Completed' ? 1 : 0;
      const bCompleted = b.status === 'Completed' ? 1 : 0;
      if (aCompleted !== bCompleted) return bCompleted - aCompleted;
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
      return new Date(b.updatedAt || b.createdAt).getFullYear() - new Date(a.updatedAt || a.createdAt).getFullYear();
    });

    const entry = matches[0];
    const yearsAgo = todayYear - new Date(entry.updatedAt || entry.createdAt).getFullYear();
    return { entry, yearsAgo };
  }, [entries, nowTimestamp]);

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
      {/* Decorative ambient background glow — drifts hue between section colors as you scroll */}
      <CinematicBackdrop hues={sectionHues} />

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

        {/* On This Day + Quick Journal Note */}
        <div className={`w-full px-3 sm:px-8 lg:px-12 grid grid-cols-1 gap-4 ${onThisDay ? 'lg:grid-cols-2' : ''}`}>
            {onThisDay && (
              <button
                onClick={() => setSelectedEntry(onThisDay.entry)}
                className="flex items-center gap-4 p-4 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl hover:border-primary/40 transition-all text-left"
              >
                <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                  {onThisDay.entry.coverImage ? (
                    <img src={onThisDay.entry.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <History size={16} className="text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <History size={11} /> On This Day
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-0.5 leading-snug">
                    {onThisDay.yearsAgo} {onThisDay.yearsAgo === 1 ? 'year' : 'years'} ago, you {onThisDay.entry.status === 'Completed' ? 'finished' : 'were watching'}{' '}
                    <span className="text-primary">{onThisDay.entry.title}</span>
                  </p>
                </div>
                {onThisDay.entry.rating > 0 && (
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-bold shrink-0">
                    <Star size={12} className="fill-amber-400" /> {onThisDay.entry.rating}
                  </div>
                )}
              </button>
            )}
            <QuickJournalNote />
        </div>

        {/* Release Radar — a wave timeline orbiting a glowing "Today" marker, past dim, future lit */}
        {timelineItems.length > 0 && (
          <motion.div
            initial={shelfInitial}
            whileInView={shelfAnimate}
            viewport={{ once: true, margin: "-100px" }}
            transition={shelfTransition}
            style={shelfStyle}
            className="w-full space-y-6 lg:space-y-8 mt-12 mb-16"
          >
            <SectionHeading eyebrow="UPCOMING & RECENT" title="Release Radar" />

            <div data-lenis-prevent className="w-full overflow-x-auto hide-scrollbar scroll-smooth px-3 sm:px-8 lg:px-12" style={{ paddingTop: 64, paddingBottom: 64 }}>
              <div className="flex items-center gap-7 sm:gap-9 w-max relative">
                {/* Center spine */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px border-t border-dashed border-border/50 z-0" />

                {radarNodes.map((node, i) => {
                  const waveY = Math.sin(i * 0.9) * 34;

                  if (node.kind === 'today') {
                    return (
                      <div key="today-marker" className="relative z-10 flex flex-col items-center shrink-0" style={{ transform: `translateY(${waveY}px)` }}>
                        <div className="w-4 h-4 rounded-full bg-primary/20 border-2 border-primary shadow-[0_0_16px_rgba(215,25,33,0.5)] mb-2" />
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-primary whitespace-nowrap">Today</span>
                      </div>
                    );
                  }

                  const entry = node.entry;
                  const date = new Date(entry.releaseDate!);
                  const isFuture = date.getTime() > nowTimestamp;

                  return (
                    <div
                      key={`radar-${entry.id}`}
                      className="relative z-10 flex flex-col items-center gap-3 w-[96px] sm:w-[110px] shrink-0 group cursor-pointer"
                      style={{ transform: `translateY(${waveY}px)` }}
                      onClick={() => router.push(`/media/${entry.id}`)}
                    >
                      <span className={`text-[9px] font-mono tracking-widest font-bold px-2 py-1 rounded-md border shadow-sm whitespace-nowrap ${isFuture ? 'text-primary bg-primary/10 border-primary/20' : 'text-muted-foreground bg-card border-border/60 opacity-70'}`}>
                        {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>

                      <div className={`w-full aspect-[3/4] rounded-xl overflow-hidden shadow-md border transition-all duration-300 relative bg-card group-hover:-translate-y-1.5 ${isFuture ? 'border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/20' : 'border-border/40 opacity-70'}`}>
                        {entry.coverImage ? (
                          <img src={entry.coverImage} className="w-full h-full object-cover" alt={entry.title} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-2 text-center" style={{ background: placeholderGradient(entry.title) }}>
                            <span className="text-[9px] font-bold uppercase text-white/80">{entry.title}</span>
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] font-semibold text-foreground text-center w-full truncate">{entry.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Section 3: Tonight's Lineup, Your Week, The Vault */}
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

          {/* Tonight's Lineup — Continue Watching + Watchlist + Watch Tonight merged into one mixed-size grid */}
          {(watching.length > 0 || planned.length > 0) && (
            <motion.section
              initial={shelfInitial}
              whileInView={shelfAnimate}
              viewport={{ once: true, margin: "-100px" }}
              transition={shelfTransition}
              style={shelfStyle}
              className="space-y-6 w-full text-left"
            >
              <SectionHeading
                eyebrow="ACTIVE & UP NEXT"
                title="Tonight's Lineup"
                action={
                  <Link href="/collection?type=All" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                    See All <ChevronRight size={14} />
                  </Link>
                }
              />

              <div className="px-3 sm:px-8 lg:px-12">
                <div className="grid grid-cols-2 lg:grid-cols-12 auto-rows-[112px] sm:auto-rows-[130px] lg:auto-rows-[90px] gap-3 sm:gap-4 lg:gap-5">

                  {watching[0] && (() => {
                    const hasEps = isEpisodic(watching[0]) && !!watching[0].episodesTotal;
                    const pct = hasEps ? (watching[0].episodesWatched || 0) / (watching[0].episodesTotal || 1) : 0;
                    const ring = progressRing(pct, 20);
                    return (
                      <div
                        className="col-span-2 lg:col-span-5 row-span-2 relative rounded-2xl overflow-hidden border border-border/60 cursor-pointer group"
                        onClick={() => router.push(`/media/${watching[0].id}`)}
                      >
                        {watching[0].coverImage ? (
                          <img src={watching[0].coverImage} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                        ) : (
                          <div className="absolute inset-0" style={{ background: placeholderGradient(watching[0].title) }} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />
                        {hasEps && (
                          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-11 h-11 sm:w-12 sm:h-12">
                            <svg width="100%" height="100%" viewBox="0 0 44 44" className="-rotate-90">
                              <circle cx="22" cy="22" r="20" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                              <circle cx="22" cy="22" r="20" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray={ring.circumference} strokeDashoffset={ring.offset} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[10px] font-mono font-bold text-white">
                              {watching[0].episodesWatched || 0}/{watching[0].episodesTotal}
                            </div>
                          </div>
                        )}
                        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-widest bg-black/50 text-white px-2 py-1 rounded-full">
                          Continue Watching
                        </div>
                        <div className="absolute left-4 bottom-4 right-4 sm:left-5 sm:bottom-5">
                          <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-3 line-clamp-1">{watching[0].title}</h3>
                          <div className="inline-flex items-center gap-1.5 bg-white text-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-widest">
                            <Play size={10} className="fill-current" /> Resume
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {watching[1] && (() => {
                    const hasEps = isEpisodic(watching[1]) && !!watching[1].episodesTotal;
                    const pct = hasEps ? ((watching[1].episodesWatched || 0) / (watching[1].episodesTotal || 1)) * 100 : 0;
                    return (
                      <div
                        className="col-span-1 lg:col-span-3 row-span-2 relative rounded-2xl overflow-hidden border border-border/60 cursor-pointer group"
                        onClick={() => router.push(`/media/${watching[1].id}`)}
                      >
                        {watching[1].coverImage ? (
                          <img src={watching[1].coverImage} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                        ) : (
                          <div className="absolute inset-0" style={{ background: placeholderGradient(watching[1].title) }} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent" />
                        <div className="absolute left-3 right-3 bottom-3 sm:left-4 sm:right-4 sm:bottom-4">
                          <h4 className="text-sm sm:text-base font-bold text-white mb-2 line-clamp-1">{watching[1].title}</h4>
                          {hasEps && (
                            <>
                              <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden mb-1.5">
                                <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                              </div>
                              <p className="text-[8px] sm:text-[9px] font-mono font-bold text-white/70">
                                {watching[1].episodesWatched || 0}/{watching[1].episodesTotal} EPISODES
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {planned.length > 0 && (
                    <div ref={pickerRef} className="col-span-1 lg:col-span-4 row-span-2 relative">
                      <button
                        onClick={() => setPickerOpen(v => !v)}
                        className="w-full h-full rounded-2xl border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 backdrop-blur-xl p-4 sm:p-5 flex flex-col justify-between text-left transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Shuffle size={14} className="text-amber-500" />
                            <span className="text-[11px] sm:text-xs font-display font-bold uppercase tracking-wide text-foreground">Watch Tonight?</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-[8px] sm:text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-full bg-amber-500/15 text-amber-500">
                              {pickDuration === 'Any' ? 'Any length' : pickDuration}
                            </span>
                            <span className="text-[8px] sm:text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-full bg-muted/60 text-muted-foreground">
                              {pickMood === 'Any' ? 'Any mood' : pickMood}
                            </span>
                          </div>
                        </div>
                        <div className="inline-flex items-center justify-center gap-1.5 bg-foreground text-background py-2 sm:py-2.5 rounded-lg text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-widest">
                          <Sparkles size={11} /> Pick For Me
                        </div>
                      </button>

                      <AnimatePresence>
                        {pickerOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 w-[280px] p-4 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-2xl shadow-xl"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold text-foreground tracking-tight">What to watch tonight?</span>
                              <button onClick={() => setPickerOpen(false)} aria-label="Close" className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60 transition-colors">
                                <X size={14} />
                              </button>
                            </div>

                            <div className="space-y-1.5 mb-3">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Clock size={11} /> Got time for</span>
                              <div className="flex flex-wrap gap-1.5">
                                {(['Any', 'Quick', 'Medium', 'Long'] as const).map(d => (
                                  <button
                                    key={d}
                                    onClick={() => setPickDuration(d)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${pickDuration === d ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent hover:border-border/50'}`}
                                  >
                                    {d === 'Any' ? 'Any' : d === 'Quick' ? '<45m' : d === 'Medium' ? '45–90m' : '90m+'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1.5 mb-4">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">In the mood for</span>
                              <div className="flex flex-wrap gap-1.5">
                                {(['Any', 'Feel-Good', 'Intense', 'Emotional', 'Mind-Bending'] as const).map(m => (
                                  <button
                                    key={m}
                                    onClick={() => setPickMood(m)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${pickMood === m ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent hover:border-border/50'}`}
                                  >
                                    {m}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={runQuickPick}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-foreground text-background hover:bg-foreground/90 transition text-xs font-bold"
                            >
                              <Sparkles size={13} /> Pick For Me
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {planned.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      className="col-span-1 lg:col-span-3 row-span-1 relative rounded-xl overflow-hidden border border-border/60 cursor-pointer group"
                      onClick={() => router.push(`/media/${entry.id}`)}
                    >
                      {entry.coverImage ? (
                        <img src={entry.coverImage} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                      ) : (
                        <div className="absolute inset-0" style={{ background: placeholderGradient(entry.title) }} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent" />
                      {entry.rating > 0 && (
                        <div className="absolute top-2 left-2 text-[8px] font-mono font-bold bg-black/55 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Star size={8} className="fill-amber-400 text-amber-400" /> {entry.rating}
                        </div>
                      )}
                      <span className="absolute left-2 right-2 bottom-2 text-[9px] sm:text-[10px] font-semibold text-white truncate">{entry.title}</span>
                    </div>
                  ))}

                  {planned.length > 3 && (
                    <Link
                      href="/collection?type=All"
                      className="col-span-1 lg:col-span-3 row-span-1 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col items-center justify-center gap-0.5"
                    >
                      <span className="text-base sm:text-lg font-display font-bold">+{planned.length - 3}</span>
                      <span className="text-[8px] font-mono font-bold uppercase text-muted-foreground tracking-wide">More in Watchlist</span>
                    </Link>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {/* Your Week — pure data strip, no posters */}
          <motion.section
            initial={shelfInitial}
            whileInView={shelfAnimate}
            viewport={{ once: true, margin: "-100px" }}
            transition={shelfTransition}
            style={shelfStyle}
            className="w-full"
          >
            <div className="px-3 sm:px-8 lg:px-12 mb-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/85">Your Week</span>
            </div>
            <div className="mx-3 sm:mx-8 lg:mx-12 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-xl grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border/40">
              <div className="p-5 sm:p-6">
                <Clock size={14} className="text-primary mb-3" />
                <div className="font-display text-2xl sm:text-3xl font-bold">{(weeklyMinutes / 60).toFixed(1)}H</div>
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground mt-1">Watched This Week</div>
              </div>
              <div className="p-5 sm:p-6">
                <Flame size={14} className="text-primary mb-3" />
                <div className="font-display text-2xl sm:text-3xl font-bold">{dayStreak}</div>
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground mt-1">Day Streak</div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-3">Top Genre</div>
                <div className="font-display text-lg sm:text-xl font-bold mb-2 truncate">{genreMix.topName}</div>
                <div className="flex h-1.5 rounded-full overflow-hidden gap-px bg-muted">
                  {genreMix.segments.map((pct, i) => (
                    <div key={i} style={{ width: `${pct}%`, backgroundColor: i === 0 ? 'var(--primary)' : i === 1 ? '#8b5cf6' : 'var(--muted-foreground)' }} />
                  ))}
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <Star size={14} className="fill-amber-400 text-amber-400 mb-3" />
                <div className="font-display text-2xl sm:text-3xl font-bold">{avgRating ? avgRating.toFixed(1) : '—'}</div>
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground mt-1">Avg Rating</div>
              </div>
            </div>
          </motion.section>

          {/* The Vault — recently completed, a fanned record-crate list */}
          {completed.length > 0 && (
            <motion.section
              initial={shelfInitial}
              whileInView={shelfAnimate}
              viewport={{ once: true, margin: "-100px" }}
              transition={shelfTransition}
              style={shelfStyle}
              className="space-y-6 w-full text-left"
            >
              <SectionHeading
                eyebrow="FINISHED TITLES"
                title="The Vault"
                action={
                  <Link href="/collection?type=All" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
                    See All <ChevronRight size={14} />
                  </Link>
                }
              />

              <div data-lenis-prevent className="w-full overflow-x-auto hide-scrollbar scroll-smooth px-3 sm:px-8 lg:px-12" style={{ paddingTop: 24, paddingBottom: 16 }}>
                <div className="flex items-center w-max">
                  {completed.slice(0, 10).map((entry, i) => (
                    <div
                      key={entry.id}
                      className="relative w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] shrink-0 rounded-xl overflow-hidden border border-border/60 shadow-lg cursor-pointer hover:z-20 hover:!rotate-0 hover:scale-105 transition-transform duration-300"
                      style={{ transform: `rotate(${VAULT_ANGLES[i % VAULT_ANGLES.length]}deg)`, marginRight: i === Math.min(completed.length, 10) - 1 ? 0 : -28, zIndex: i }}
                      onClick={() => router.push(`/media/${entry.id}`)}
                    >
                      {entry.coverImage ? (
                        <img src={entry.coverImage} className="absolute inset-0 w-full h-full object-cover" alt={entry.title} />
                      ) : (
                        <div className="absolute inset-0" style={{ background: placeholderGradient(entry.title) }} />
                      )}
                      {entry.rating > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-foreground text-background flex items-center justify-center text-[9px] sm:text-[10px] font-display font-bold shadow-md">
                          {entry.rating}
                        </div>
                      )}
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
