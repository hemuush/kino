"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Clock3, ListVideo, CheckCircle2, Bookmark, Star } from "lucide-react";
import { useMedia } from "@/context/MediaContext";
import { MediaEntry, formatRuntime, getWatchedRuntimeMinutes, isEpisodic } from "@/lib/db";
import { MediaDetailModal } from "@/components/MediaDetailModal";
import { PageLoader } from "@/components/ui/Loader";

function pickRandomItems<T>(arr: T[], count: number) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function colorFromTitle(title?: string) {
  const t = (title || "kino").toLowerCase();
  let hash = 0;
  for (let i = 0; i < t.length; i++) hash = (hash * 31 + t.charCodeAt(i)) >>> 0;
  const hueA = hash % 360;
  const hueB = (hueA + 70) % 360;
  return {
    a: `hsla(${hueA}, 78%, 54%, 0.38)`,
    b: `hsla(${hueB}, 82%, 52%, 0.28)`,
  };
}

function Disc({ entry, className, onClick, active = false }: { entry: MediaEntry; className: string; onClick: () => void; active?: boolean }) {
  return (
    <motion.button
      onClick={onClick}
      layout
      animate={{
        scale: active ? 1 : 0.95,
        filter: active ? "brightness(1)" : "brightness(0.86)",
      }}
      transition={{ type: "spring", stiffness: 80, damping: 20, mass: 0.8 }}
      className={`absolute overflow-hidden rounded-full border border-white/20 shadow-2xl ${className}`}
    >
      {entry.coverImage ? <img src={entry.coverImage} alt={entry.title} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-zinc-700" />}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_18%,rgba(0,0,0,0.55)_19%,rgba(0,0,0,0.15)_40%,rgba(0,0,0,0.65)_100%)]" />
      <div className="absolute inset-[34%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffffff,#8f99a3_40%,#131820_72%,#0a0d12)] border border-white/25" />
    </motion.button>
  );
}

function DashboardContent() {
  const { entries, isLoading, updateEntry, deleteEntry } = useMedia();
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);
  const [activeDiscIndex, setActiveDiscIndex] = useState(0);

  const watching = useMemo(() => entries.filter((e) => e.status === "Watching"), [entries]);
  const planned = useMemo(() => entries.filter((e) => e.status === "Plan to Watch"), [entries]);
  const recent = useMemo(() => [...entries].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8), [entries]);

  const randomSet = useMemo(() => pickRandomItems(entries, Math.min(entries.length, 10)), [entries]);
  const featured = randomSet[activeDiscIndex] || watching[0] || planned[0] || recent[0] || null;
  const discs = useMemo(() => {
    if (randomSet.length === 0) return [];
    return [
      randomSet[activeDiscIndex % randomSet.length],
      randomSet[(activeDiscIndex + 1) % randomSet.length],
      randomSet[(activeDiscIndex + 2) % randomSet.length],
    ].filter(Boolean);
  }, [randomSet, activeDiscIndex]);

  const activeColor = colorFromTitle(featured?.title);

  useEffect(() => {
    if (randomSet.length <= 1) return;
    const timer = setInterval(() => {
      setActiveDiscIndex((prev) => (prev + 1) % randomSet.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [randomSet.length]);

  const stats = useMemo(() => {
    let time = 0;
    let episodes = 0;
    let completed = 0;
    let avgRatingSum = 0;
    let ratedCount = 0;

    for (const e of entries) {
      if (e.status === "Completed") completed += 1;
      if (isEpisodic(e)) {
        const w = e.episodesWatched || 0;
        episodes += w;
      }
      time += getWatchedRuntimeMinutes(e);
      if ((e.rating || 0) > 0) {
        avgRatingSum += e.rating;
        ratedCount += 1;
      }
    }

    return {
      days: (time / (60 * 24)).toFixed(1),
      episodes,
      completed,
      watchlist: planned.length,
      avgRating: ratedCount ? (avgRatingSum / ratedCount).toFixed(1) : "0.0",
      total: entries.length,
    };
  }, [entries, planned.length]);

  if (isLoading) return <PageLoader text="Loading dashboard..." />;

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[radial-gradient(circle_at_10%_0%,rgba(245,158,11,0.08),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.08),transparent_40%),var(--background)] text-foreground pb-24">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 lg:px-10 py-4 lg:py-6 space-y-8">
        <section
          className="relative min-h-[56vh] overflow-hidden rounded-[36px] border border-white/10 transition-all duration-1000"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 45%, ${activeColor.a}, transparent 44%), radial-gradient(circle at 74% 32%, ${activeColor.b}, transparent 42%), linear-gradient(180deg, #06070c 0%, #0d1018 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/35" />

          <div className="absolute inset-0 hidden md:block">
            <AnimatePresence mode="wait">
              {discs[0] && (
                <motion.div
                  key={`hero-disc-0-${discs[0].id}`}
                  initial={{ opacity: 0, x: 36, scale: 0.92 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -24, scale: 0.92 }}
                  transition={{ duration: 0.55, ease: "easeInOut" }}
                  className="absolute right-[20%] top-[14%] h-[68%] aspect-square z-30"
                >
                  <Disc active entry={discs[0]} onClick={() => setSelectedEntry(discs[0])} className="h-full w-full" />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {discs[1] && (
                <motion.div
                  key={`hero-disc-1-${discs[1].id}`}
                  initial={{ opacity: 0, x: 30, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                  transition={{ duration: 0.52, ease: "easeInOut" }}
                  className="absolute right-[8%] top-[20%] h-[56%] aspect-square z-20"
                >
                  <Disc entry={discs[1]} onClick={() => setSelectedEntry(discs[1])} className="h-full w-full" />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {discs[2] && (
                <motion.div
                  key={`hero-disc-2-${discs[2].id}`}
                  initial={{ opacity: 0, x: 24, scale: 0.88 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -16, scale: 0.88 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="absolute right-[-4%] top-[28%] h-[46%] aspect-square z-10"
                >
                  <Disc entry={discs[2]} onClick={() => setSelectedEntry(discs[2])} className="h-full w-full" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="absolute inset-0 md:hidden">
            {discs[0] && <Disc entry={discs[0]} onClick={() => setSelectedEntry(discs[0])} className="left-[4%] top-[12%] h-[76%] aspect-square z-30" />}
            {discs[1] && <Disc entry={discs[1]} onClick={() => setSelectedEntry(discs[1])} className="left-[44%] top-[18%] h-[64%] aspect-square z-20" />}
            {discs[2] && <Disc entry={discs[2]} onClick={() => setSelectedEntry(discs[2])} className="left-[70%] top-[24%] h-[52%] aspect-square z-10" />}
          </div>

          <div className="relative z-40 flex min-h-[56vh] items-end justify-between p-6 md:p-10">
            <div className="max-w-xl text-white">
              <AnimatePresence mode="wait">
                <motion.div
                  key={featured?.id || "fallback"}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <p className="text-xs uppercase tracking-[0.35em] text-white/70">Random Pick Experience</p>
                  <h1 className="mt-3 text-4xl md:text-6xl font-black text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]">{featured ? featured.title : "Kino Dashboard"}</h1>
                  <p className="mt-3 text-white/90">{featured ? `${featured.type} - ${featured.status || "Tracked"}` : "Add entries to build insights."}</p>
                </motion.div>
              </AnimatePresence>
              <div className="mt-6 flex gap-3">
                {featured ? <button onClick={() => setSelectedEntry(featured)} className="rounded-full bg-white px-6 py-2.5 text-black font-semibold">View Details</button> : <Link href="/add" className="rounded-full bg-white px-6 py-2.5 text-black font-semibold">Add First Entry</Link>}
                <Link href="/collection" className="rounded-full border border-white/30 bg-black/20 px-6 py-2.5 text-white">Open Collection</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[[stats.days,"Days Watched",Clock3],[String(stats.episodes),"Episodes",ListVideo],[String(stats.completed),"Completed",CheckCircle2],[String(stats.watchlist),"Plan to Watch",Bookmark],[stats.avgRating,"Avg Rating",Star],[String(stats.total),"Total Titles",Bookmark]].map(([value,label,Icon]) => (
            <div key={String(label)} className="rounded-2xl border border-border/60 bg-white/95 dark:bg-card/70 p-4 backdrop-blur-xl shadow-sm dark:bg-card/70">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1"><Icon size={11 as never} /> {String(label)}</p>
              <p className="mt-2 text-3xl font-black">{String(value)}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {[{ title: "Watching", items: watching }, { title: "Plan to Watch", items: planned }, { title: "Recently Added", items: recent }].map((block) => (
            <div key={block.title} className="rounded-3xl border border-border/60 bg-white/95 dark:bg-card/70 p-4 backdrop-blur-xl shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-bold">{block.title}</h2>
                <span className="text-xs text-muted-foreground">{block.items.length}</span>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {block.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No entries yet</p>
                ) : (
                  block.items.map((entry) => (
                    <button key={entry.id} onClick={() => setSelectedEntry(entry)} className="w-full rounded-xl border border-border/60 bg-background/85 dark:bg-background/70 p-2 text-left flex gap-3 hover:bg-muted/60 transition">
                      <div className="w-12 h-14 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                        {entry.coverImage ? <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-sm">{entry.title}</p>
                        <p className="text-xs text-muted-foreground">{entry.type} - {entry.status || "Tracked"}</p>
                        <p className="text-xs text-muted-foreground/80">{entry.runtime ? `${formatRuntime(entry.runtime)}${isEpisodic(entry) ? "/ep" : ""}` : "No runtime"}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </section>
      </div>

      {selectedEntry && (
        <MediaDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSave={async (updatedEntry) => { await updateEntry(updatedEntry); setSelectedEntry(updatedEntry); }}
          onDelete={async (id) => { await deleteEntry(id); setSelectedEntry(null); }}
        />
      )}
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
