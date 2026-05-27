"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Clock3, ListVideo, CheckCircle2, Bookmark, Play } from "lucide-react";
import { useMedia } from "@/context/MediaContext";
import { MediaEntry, formatRuntime, isEpisodic } from "@/lib/db";
import { MediaDetailModal } from "@/components/MediaDetailModal";
import { PageLoader } from "@/components/ui/Loader";

function DashboardContent() {
  const { entries, isLoading, updateEntry, deleteEntry } = useMedia();
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);

  const { scrollYProgress } = useScroll();
  const scaleHero = useTransform(scrollYProgress, [0, 0.2], [1, 0.94]);

  const watching = useMemo(() => entries.filter((e) => e.status === "Watching"), [entries]);
  const planned = useMemo(() => entries.filter((e) => e.status === "Plan to Watch"), [entries]);
  const recent = useMemo(() => [...entries].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8), [entries]);
  const featured = watching[0] || planned[0] || recent[0] || null;

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
        time += w * (e.runtime || 0);
      } else if (e.status === "Completed") {
        time += e.runtime || 0;
      }
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
    <div className="absolute inset-0 overflow-y-auto bg-[radial-gradient(circle_at_10%_0%,rgba(245,158,11,0.08),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.08),transparent_40%),#05070f] text-white pb-24">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 lg:px-10 py-6 space-y-8">
        <motion.section style={{ scale: scaleHero }} className="relative min-h-[56vh] overflow-hidden rounded-[36px] border border-white/10">
          {featured?.coverImage ? <img src={featured.coverImage} alt={featured.title} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-zinc-900" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/25" />
          <div className="relative z-10 flex min-h-[56vh] flex-col items-center justify-center px-6 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/55">Collection Overview</p>
            <h1 className="mt-4 text-5xl font-black md:text-7xl">{featured ? featured.title : "Kino Dashboard"}</h1>
            <p className="mt-4 text-white/70">{featured ? `${featured.type} - ${featured.status || "Tracked"}` : "Add entries to build insights."}</p>
            <div className="mt-8 flex gap-4">
              {featured ? <button onClick={() => setSelectedEntry(featured)} className="rounded-full bg-white px-7 py-3 text-black font-semibold">Continue Watching</button> : <Link href="/add" className="rounded-full bg-white px-7 py-3 text-black font-semibold">Add First Entry</Link>}
              <Link href="/collection" className="rounded-full border border-white/20 bg-white/5 px-7 py-3">Open Collection</Link>
            </div>
          </div>
        </motion.section>

        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            [stats.days, "Days Watched", Clock3],
            [String(stats.episodes), "Episodes", ListVideo],
            [String(stats.completed), "Completed", CheckCircle2],
            [String(stats.watchlist), "Plan to Watch", Bookmark],
            [stats.avgRating, "Avg Rating", Play],
            [String(stats.total), "Total Titles", Bookmark],
          ].map(([value, label, Icon]) => (
            <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 flex items-center gap-1"><Icon size={11 as never} /> {String(label)}</p>
              <p className="mt-2 text-3xl font-black">{String(value)}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {[{ title: "Watching", items: watching }, { title: "Plan to Watch", items: planned }, { title: "Recently Added", items: recent }].map((block) => (
            <div key={block.title} className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-bold">{block.title}</h2>
                <span className="text-xs text-white/50">{block.items.length}</span>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {block.items.length === 0 ? (
                  <p className="text-sm text-white/50 py-6 text-center">No entries yet</p>
                ) : (
                  block.items.map((entry) => (
                    <button key={entry.id} onClick={() => setSelectedEntry(entry)} className="w-full rounded-xl border border-white/10 bg-black/25 p-2 text-left flex gap-3 hover:bg-white/5 transition">
                      <div className="w-12 h-14 rounded-lg overflow-hidden bg-zinc-800 shrink-0">{entry.coverImage ? <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover" /> : null}</div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-sm">{entry.title}</p>
                        <p className="text-xs text-white/60">{entry.type} - {entry.status || "Tracked"}</p>
                        <p className="text-xs text-white/45">{entry.runtime ? `${formatRuntime(entry.runtime)}${isEpisodic(entry) ? "/ep" : ""}` : "No runtime"}</p>
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
