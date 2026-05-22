"use client";

import { useState } from 'react';
import { useMedia } from '@/hooks/useMedia';
import { MediaCard } from '@/components/MediaCard';
import { MediaDetailModal } from '@/components/MediaDetailModal';
import { BarChart3, Star, Play, ClipboardList, Heart, Film, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaEntry } from '@/lib/db';
import { Badge } from '@/components/ui/Badge';

export default function Analytics() {
  const { entries, isLoading, updateEntry, deleteEntry, syncStatus } = useMedia();
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);

  const handleIncrementWatched = (entry: MediaEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.type === 'Movie') return;
    const nextWatched = (entry.episodesWatched || 0) + 1;
    const total = entry.episodesTotal;
    
    if (total && nextWatched >= total) {
      const updated = {
        ...entry,
        episodes: entry.episodes || [],
        episodesWatched: total,
        status: 'Completed' as const,
      };
      updateEntry(updated);
      setSelectedEntry(updated); // Open modal immediately to prompt rating/date
    } else {
      const updated = {
        ...entry,
        episodes: entry.episodes || [],
        episodesWatched: nextWatched,
        status: entry.status === 'Plan to Watch' ? ('Watching' as const) : entry.status,
      };
      updateEntry(updated);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center px-4 sm:px-6 h-14 max-w-7xl mx-auto w-full">
            <div className="w-32 h-4 skeleton" />
          </div>
        </header>
        <div className="flex-1 px-4 sm:px-6 py-8 max-w-7xl mx-auto w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 skeleton rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 skeleton rounded-2xl" />
            <div className="h-64 skeleton rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // 1. Calculate general stats
  const totalCount = entries.length;
  const completedEntries = entries.filter(e => e.status === 'Completed' || !e.status);
  const watchingEntries = entries.filter(e => e.status === 'Watching');
  const planToWatchEntries = entries.filter(e => e.status === 'Plan to Watch');
  
  const completedWithRating = completedEntries.filter(e => e.rating && e.rating > 0);
  const averageRating = completedWithRating.length > 0
    ? (completedWithRating.reduce((sum, e) => sum + e.rating, 0) / completedWithRating.length).toFixed(1)
    : '0.0';

  const totalEpisodesWatched = entries.reduce((sum, entry) => {
    if (entry.type !== 'Movie') {
      return sum + (entry.episodesWatched || 0);
    }
    return sum;
  }, 0);

  const totalTimeMinutes = entries.reduce((sum, entry) => {
    if (entry.type === 'Movie') {
      return sum + (entry.status === 'Completed' || !entry.status ? 120 : 0);
    } else if (entry.type === 'Series') {
      return sum + (entry.episodesWatched || 0) * 45;
    } else if (entry.type === 'Anime') {
      return sum + (entry.episodesWatched || 0) * 24;
    }
    return sum;
  }, 0);

  const totalHours = totalTimeMinutes / 60;
  const timeWatchedString = totalHours >= 24
    ? `${(totalHours / 24).toFixed(1)} days`
    : `${totalHours.toFixed(1)} hrs`;

  // Calculate rating frequency distribution (1 to 10)
  const ratingFrequencies = Array.from({ length: 10 }, (_, i) => {
    const ratingValue = i + 1;
    const count = completedEntries.filter(e => e.rating === ratingValue).length;
    return { rating: ratingValue, count };
  });

  const maxRatingCount = Math.max(...ratingFrequencies.map(rf => rf.count), 1);

  // 2. Type breakdown
  const moviesCount = entries.filter(e => e.type === 'Movie').length;
  const seriesCount = entries.filter(e => e.type === 'Series').length;
  const animeCount = entries.filter(e => e.type === 'Anime').length;

  const getPercent = (count: number) => {
    if (totalCount === 0) return 0;
    return Math.round((count / totalCount) * 100);
  };

  const moviesPct = getPercent(moviesCount);
  const seriesPct = getPercent(seriesCount);
  const animePct = getPercent(animeCount);

  // 3. Status distribution
  const completedPct = getPercent(completedEntries.length);
  const watchingPct = getPercent(watchingEntries.length);
  const planToWatchPct = getPercent(planToWatchEntries.length);

  // 4. Favorites shelf
  const favorites = entries.filter(e => e.favorite);

  // 5. Genre counts
  const genreCounts: { [key: string]: number } = {};
  entries.forEach(e => {
    if (e.genre && Array.isArray(e.genre)) {
      e.genre.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    }
  });

  const sortedGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15); // Top 15 genres

  const maxGenreCount = sortedGenres.length > 0 ? sortedGenres[0][1] : 1;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 20 } }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-6 h-14 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[17px] font-semibold tracking-tight flex items-center gap-2">
              <BarChart3 size={17} className="text-primary" /> Analytics
            </h1>
            <AnimatePresence mode="wait">
              {syncStatus !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: -5 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                    syncStatus === 'syncing' 
                      ? 'bg-primary/5 text-primary border-primary/20' 
                      : syncStatus === 'synced'
                        ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20'
                        : 'bg-red-500/5 text-red-400 border-red-500/20'
                  }`}
                >
                  {syncStatus === 'syncing' && (
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {syncStatus === 'synced' && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {syncStatus === 'error' && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">
                    {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'synced' ? 'Synced to Cloud' : 'Sync Error'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="flex-1 px-3 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8 pb-20">
        
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-5 border border-border/40">
              <BarChart3 size={26} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-xl font-bold mb-2 tracking-tight">No analytics available</h3>
            <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">
              Add movies, series, or anime in the dashboard to unlock comprehensive dashboard analytics.
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            {/* Row 1: Summary Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Total Titles */}
              <div className="surface-elevated rounded-2xl p-4 sm:p-5 border border-border/50 relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-primary/10 group-hover:text-primary/20 transition-colors pointer-events-none">
                  <Film size={48} strokeWidth={1} />
                </div>
                <span className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                  Total Tracked
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold mt-2 tabular-nums">
                  {totalCount}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Across all media types
                </p>
              </div>

              {/* Currently Watching */}
              <div className="surface-elevated rounded-2xl p-4 sm:p-5 border border-border/50 relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-primary/10 group-hover:text-primary/20 transition-colors pointer-events-none">
                  <Play size={48} strokeWidth={1} />
                </div>
                <span className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                  Currently Watching
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold mt-2 tabular-nums text-primary">
                  {watchingEntries.length}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Active series & anime
                </p>
              </div>

              {/* Episodes Watched */}
              <div className="surface-elevated rounded-2xl p-4 sm:p-5 border border-border/50 relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-[#38bdf8]/10 group-hover:text-[#38bdf8]/20 transition-colors pointer-events-none">
                  <ClipboardList size={48} strokeWidth={1} />
                </div>
                <span className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                  Episodes Watched
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold mt-2 tabular-nums text-[#38bdf8]">
                  {totalEpisodesWatched}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Across series & anime
                </p>
              </div>

              {/* Total Time Watched */}
              <div className="surface-elevated rounded-2xl p-4 sm:p-5 border border-border/50 relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors pointer-events-none">
                  <Clock size={48} strokeWidth={1} />
                </div>
                <span className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                  Time Watched
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold mt-2 tabular-nums text-emerald-500">
                  {timeWatchedString}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {totalTimeMinutes.toLocaleString()} total minutes
                </p>
              </div>

              {/* Average Rating */}
              <div className="surface-elevated rounded-2xl p-4 sm:p-5 border border-border/50 relative overflow-hidden group">
                <div className="absolute right-4 top-4 text-amber-500/10 group-hover:text-amber-500/20 transition-colors pointer-events-none">
                  <Star size={48} strokeWidth={1} />
                </div>
                <span className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                  Average Rating
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold mt-2 tabular-nums text-amber-500">
                  {averageRating}<span className="text-[14px] text-muted-foreground/60 font-medium font-sans">/10</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Based on {completedWithRating.length} graded titles
                </p>
              </div>
            </motion.div>

            {/* Row 2: Type Breakdown & Status Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Type Breakdown */}
              <motion.div variants={itemVariants} className="surface-elevated rounded-2xl p-6 border border-border/50 flex flex-col justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-muted-foreground uppercase tracking-wider mb-6">
                    Media Breakdown
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Movies progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">Movies</span>
                        <span className="text-muted-foreground tabular-nums">{moviesCount} ({moviesPct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${moviesPct}%` }} />
                      </div>
                    </div>

                    {/* Series progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">Series</span>
                        <span className="text-muted-foreground tabular-nums">{seriesCount} ({seriesPct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${seriesPct}%` }} />
                      </div>
                    </div>

                    {/* Anime progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">Anime</span>
                        <span className="text-muted-foreground tabular-nums">{animeCount} ({animePct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${animePct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-border/20 flex justify-between text-[11px] text-muted-foreground">
                  <span>Movies: {moviesCount}</span>
                  <span>Series: {seriesCount}</span>
                  <span>Anime: {animeCount}</span>
                </div>
              </motion.div>

              {/* Status Distribution */}
              <motion.div variants={itemVariants} className="surface-elevated rounded-2xl p-6 border border-border/50 flex flex-col justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-muted-foreground uppercase tracking-wider mb-6">
                    Watchlist Statuses
                  </h3>

                  <div className="space-y-4">
                    {/* Completed */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">Completed</span>
                        <span className="text-muted-foreground tabular-nums">{completedEntries.length} ({completedPct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completedPct}%` }} />
                      </div>
                    </div>

                    {/* Watching */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">Watching</span>
                        <span className="text-muted-foreground tabular-nums">{watchingEntries.length} ({watchingPct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${watchingPct}%` }} />
                      </div>
                    </div>

                    {/* Plan to Watch */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground">Plan to Watch</span>
                        <span className="text-muted-foreground tabular-nums">{planToWatchEntries.length} ({planToWatchPct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-muted-foreground/30 rounded-full" style={{ width: `${planToWatchPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-border/20 flex justify-between text-[11px] text-muted-foreground">
                  <span>Done: {completedEntries.length}</span>
                  <span>Active: {watchingEntries.length}</span>
                  <span>Planned: {planToWatchEntries.length}</span>
                </div>
              </motion.div>
            </div>

            {/* Row 3: Rating Distribution & Genre Cloud */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Ratings Frequency Bar Chart */}
              <motion.div variants={itemVariants} className="surface-elevated rounded-2xl p-6 border border-border/50 md:col-span-2 flex flex-col justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Ratings Distribution
                  </h3>
                  <p className="text-[11px] text-muted-foreground mb-6">
                    Frequency of ratings (1-10) across completed titles
                  </p>
                  
                  <div className="h-40 sm:h-48 flex items-end gap-1 sm:gap-3 px-1 sm:px-2 pt-6 border-b border-border/30">
                    {ratingFrequencies.map((rf) => {
                      const heightPercent = rf.count > 0 ? (rf.count / maxRatingCount) * 100 : 0;
                      return (
                        <div key={rf.rating} className="flex-1 flex flex-col items-center group/bar h-full justify-end relative">
                          {/* Tooltip on hover */}
                          <div className="absolute -top-7 opacity-0 group-hover/bar:opacity-100 transition-all duration-200 bg-background border border-border px-2.5 py-1 rounded-lg text-[10px] font-bold text-foreground pointer-events-none whitespace-nowrap shadow-lg z-30">
                            {rf.count} {rf.count === 1 ? 'title' : 'titles'}
                          </div>
                          
                          {/* Rating Count label above the bar */}
                          {rf.count > 0 && (
                            <span className="text-[10px] font-bold text-muted-foreground/80 mb-1.5 tabular-nums transition-colors group-hover/bar:text-primary">
                              {rf.count}
                            </span>
                          )}

                          {/* The Bar */}
                          <div className="w-full relative h-full flex items-end">
                            <motion.div
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{ type: 'spring', damping: 15, stiffness: 100, delay: rf.rating * 0.03 }}
                              style={{ 
                                height: rf.count > 0 ? `${heightPercent}%` : '4px',
                                originY: 1 
                              }}
                              className={`w-full rounded-t-lg transition-all duration-300 ${
                                rf.count > 0 
                                  ? 'bg-gradient-to-t from-primary/10 via-primary/50 to-primary group-hover/bar:from-primary/30 group-hover/bar:via-primary/70 group-hover/bar:to-primary/95 group-hover/bar:shadow-[0_0_12px_rgba(59,130,246,0.3)]' 
                                  : 'bg-muted/30 group-hover/bar:bg-muted/50'
                              }`}
                            />
                          </div>
                          
                          {/* Rating Label (1-10) below the border */}
                          <span className="text-[11px] font-bold text-muted-foreground mt-2 group-hover/bar:text-foreground transition-colors">
                            {rf.rating}★
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Genre Cloud */}
              <motion.div variants={itemVariants} className="surface-elevated rounded-2xl p-6 border border-border/50 flex flex-col justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Popular Genres / Tags
                  </h3>

                  {sortedGenres.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4">Add genres to your titles to populate this section.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2.5 py-2">
                      {sortedGenres.map(([genre, count]) => {
                        const ratio = count / maxGenreCount;
                        // Compute weight styling based on popularity
                        let sizeClass = 'text-[11px] opacity-70 border-border/40';
                        let bgClass = 'bg-muted/30';
                        if (ratio > 0.75) {
                          sizeClass = 'text-[13px] font-bold text-primary border-primary/20';
                          bgClass = 'bg-primary/5';
                        } else if (ratio > 0.45) {
                          sizeClass = 'text-[12px] font-semibold text-foreground/90 border-border/60';
                          bgClass = 'bg-muted/65';
                        }

                        return (
                          <span
                            key={genre}
                            className={`px-3.5 py-1.5 rounded-xl border transition-all hover:scale-105 duration-200 cursor-default ${sizeClass} ${bgClass}`}
                          >
                            {genre} <span className="text-[10px] text-muted-foreground/50 ml-1.5 tabular-nums">x{count}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Row 4: Favorites shelf */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="flex items-center gap-2">
                <Heart size={14} className="text-red-500 fill-red-500" />
                <h3 className="text-[14px] font-bold text-muted-foreground uppercase tracking-wider">
                  Favorites Showcase
                </h3>
                <span className="text-[12px] text-muted-foreground">({favorites.length})</span>
              </div>

              {favorites.length === 0 ? (
                <div className="surface-elevated rounded-2xl p-8 border border-border/50 text-center">
                  <Heart size={22} className="text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No favorites added yet. Toggle the heart icon on any movie card or detail page.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
                  {favorites.map((entry, i) => (
                    <MediaCard
                      key={entry.id}
                      entry={entry}
                      onClick={() => setSelectedEntry(entry)}
                      onFavoriteToggle={() => updateEntry({ ...entry, favorite: !entry.favorite })}
                      onIncrementWatched={(e) => handleIncrementWatched(entry, e)}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </motion.div>

          </motion.div>
        )}

      </div>

      {/* Detail & Edit Modal */}
      {selectedEntry && (
        <MediaDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSave={async (updatedEntry) => {
            updateEntry(updatedEntry);
            setSelectedEntry(updatedEntry);
          }}
          onDelete={async (id) => {
            deleteEntry(id);
            setSelectedEntry(null);
          }}
        />
      )}
    </div>
  );
}
