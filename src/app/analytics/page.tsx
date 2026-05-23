"use client";

import { useMemo } from 'react';
import { useMedia } from "@/hooks/useMedia";
import { isEpisodic } from "@/lib/db";
import { Film, Tv, Clock, Trophy, BarChart3, Popcorn, Play, Folders } from "lucide-react";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const { entries, isLoading, genres, franchises } = useMedia();

  const {
    totalHours,
    totalDays,
    totalEpisodesWatched,
    moviesCompleted,
    seriesCompleted,
    masterpieces,
    topGenres,
    topSagas
  } = useMemo(() => {
    let totalMinutes = 0;
    let epsWatched = 0;
    
    const genreCount: Record<string, number> = {};
    const sagaCount: Record<string, number> = {};

    let moviesDone = 0;
    let seriesDone = 0;
    let tens = 0;

    entries.forEach(entry => {
      const episodic = isEpisodic(entry);

      if (!episodic) {
        if (entry.status === 'Completed') {
          moviesDone++;
          if (entry.runtime) totalMinutes += entry.runtime;
        }
      } else {
        if (entry.status === 'Completed') seriesDone++;
        const count = entry.episodesWatched || 0;
        epsWatched += count;
        
        const eps = entry.episodes || [];
        const fallbackRuntime = entry.runtime || 0;

        for (let i = 0; i < count; i++) {
          if (eps[i] && eps[i].runtime) {
            totalMinutes += eps[i].runtime!;
          } else if (fallbackRuntime > 0) {
            totalMinutes += fallbackRuntime;
          }
        }
      }

      if (entry.rating === 10) tens++;

      (entry.genreIds || []).forEach(gId => {
        const gName = genres.find(x => x.id === gId)?.name || 'Unknown';
        genreCount[gName] = (genreCount[gName] || 0) + 1;
      });

      if (entry.franchiseId) {
        const fName = franchises.find(x => x.id === entry.franchiseId)?.name || 'Unknown';
        sagaCount[fName] = (sagaCount[fName] || 0) + 1;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const days = (hours / 24).toFixed(1);

    return {
      totalHours: hours,
      totalDays: days,
      totalEpisodesWatched: epsWatched,
      moviesCompleted: moviesDone,
      seriesCompleted: seriesDone,
      masterpieces: tens,
      topGenres: Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 5),
      topSagas: Object.entries(sagaCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }, [entries, genres, franchises]);

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Loading insights...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight mb-2">Analytics</h1>
        <p className="text-muted-foreground text-sm">Strict calculation based on your precise episode runtimes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Strict Time Block */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="col-span-1 md:col-span-4 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm glass">
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
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card glass border border-border/60 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground font-bold tracking-widest uppercase text-[10px]">
            <Film size={12} /> Movies Finished
          </div>
          <div className="font-display text-4xl font-extrabold tabular-nums">
            {moviesCompleted}
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="bg-card glass border border-border/60 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground font-bold tracking-widest uppercase text-[10px]">
            <Tv size={12} /> Series Finished
          </div>
          <div className="font-display text-4xl font-extrabold tabular-nums">
            {seriesCompleted}
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-card glass border border-border/60 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground font-bold tracking-widest uppercase text-[10px]">
            <Play size={12} /> Episodes Watched
          </div>
          <div className="font-display text-4xl font-extrabold tabular-nums text-primary/80">
            {totalEpisodesWatched.toLocaleString()}
          </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="bg-card glass border border-border/60 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground font-bold tracking-widest uppercase text-[10px]">
            <Trophy size={12} /> Masterpieces
          </div>
          <div className="font-display text-4xl font-extrabold tabular-nums text-amber-500">
            {masterpieces}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Genres Chart */}
        {topGenres.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card glass border border-border/60 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={18} className="text-primary" />
              <h2 className="text-lg font-bold font-display">Top Genres</h2>
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
                      <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1, delay: 0.4 + (idx * 0.1) }} className="bg-primary h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Top Sagas Chart */}
        {topSagas.length > 0 && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="bg-card glass border border-border/60 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Folders size={18} className="text-primary" />
              <h2 className="text-lg font-bold font-display">Top Sagas</h2>
            </div>
            <div className="space-y-5">
              {topSagas.map(([saga, count], idx) => {
                const percentage = Math.round((count / Math.max(...topSagas.map(s => s[1]))) * 100);
                return (
                  <div key={saga}>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-foreground">{saga}</span>
                      <span className="text-muted-foreground">{count} entries</span>
                    </div>
                    <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }} className="bg-primary/80 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.4)]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}