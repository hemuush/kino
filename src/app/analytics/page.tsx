"use client";

import { useMedia } from "@/hooks/useMedia";
import { Film, Tv, Clock, Trophy, BarChart3, Popcorn } from "lucide-react";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const { entries, isLoading, genres } = useMedia();

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Loading insights...</div>;

  // Real, Precise Runtime Calculation
  let totalMinutesWatched = 0;

  entries.forEach(entry => {
    const isEpisodic = entry.type === 'Series' || (entry.type === 'Anime' && entry.animeType === 'Show');

    if (!isEpisodic) {
      if (entry.status === 'Completed' && entry.runtime) {
        totalMinutesWatched += entry.runtime;
      }
    } else {
      const watchedCount = entry.episodesWatched || 0;
      const eps = entry.episodes || [];
      const fallbackRuntime = entry.runtime || 0;

      for (let i = 0; i < watchedCount; i++) {
        // Strict mapping: Use exact episode runtime if available, else entry average
        if (eps[i] && eps[i].runtime) {
          totalMinutesWatched += eps[i].runtime!;
        } else if (fallbackRuntime > 0) {
          totalMinutesWatched += fallbackRuntime;
        }
      }
    }
  });

  const totalHours = Math.floor(totalMinutesWatched / 60);
  const totalDays = (totalHours / 24).toFixed(1);

  // Genre Stats (using Normalized IDs)
  const genreCount: Record<string, number> = {};
  entries.forEach(e => {
    (e.genreIds || []).forEach(gId => {
      const gName = genres.find(x => x.id === gId)?.name || 'Unknown';
      genreCount[gName] = (genreCount[gName] || 0) + 1;
    });
  });

  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight mb-2">Analytics</h1>
        <p className="text-muted-foreground text-sm">Strict calculation based on your precise episode runtimes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Strict Time Block */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="col-span-1 md:col-span-3 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2 text-primary font-bold tracking-widest uppercase text-xs">
              <Clock size={14} /> Total Life Invested
            </div>
            <div className="font-display text-5xl font-extrabold text-foreground tabular-nums tracking-tighter">
              {totalHours.toLocaleString()} <span className="text-2xl text-muted-foreground tracking-normal font-sans">hours</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-muted-foreground">That's {totalDays} solid days of watching.</div>
          </div>
          <div className="h-24 w-24 bg-primary/20 rounded-full flex items-center justify-center text-primary shadow-[0_0_50px_rgba(59,130,246,0.3)]">
            <Popcorn size={40} />
          </div>
        </motion.div>

        {/* Media Counts */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card border border-border/60 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground font-bold tracking-widest uppercase text-[10px]">
            <Film size={12} /> Movies Completed
          </div>
          <div className="font-display text-4xl font-extrabold tabular-nums">
            {entries.filter(e => e.type === 'Movie' && e.status === 'Completed').length}
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-card border border-border/60 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground font-bold tracking-widest uppercase text-[10px]">
            <Tv size={12} /> Series Completed
          </div>
          <div className="font-display text-4xl font-extrabold tabular-nums">
            {entries.filter(e => e.type !== 'Movie' && e.status === 'Completed').length}
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card border border-border/60 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground font-bold tracking-widest uppercase text-[10px]">
            <Trophy size={12} /> Masterpieces (10/10)
          </div>
          <div className="font-display text-4xl font-extrabold tabular-nums text-amber-500">
            {entries.filter(e => e.rating === 10).length}
          </div>
        </motion.div>
      </div>

      {/* Top Genres Chart */}
      {topGenres.length > 0 && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-card border border-border/60 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={18} className="text-primary" />
            <h2 className="text-lg font-bold">Top Genres</h2>
          </div>
          <div className="space-y-5">
            {topGenres.map(([genre, count], idx) => {
              const percentage = Math.round((count / entries.length) * 100);
              return (
                <div key={genre}>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-foreground">{genre}</span>
                    <span className="text-muted-foreground">{count} entries</span>
                  </div>
                  <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }} className="bg-primary h-full rounded-full" />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}