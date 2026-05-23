"use client";

import { useState, Suspense, useMemo } from 'react';
import { useMedia } from '@/context/MediaContext';
import MediaCard from "@/components/MediaCard";
import MediaCardSkeleton from '@/components/MediaCardSkeleton';
import { MediaDetailModal } from '@/components/MediaDetailModal';
import { MediaEntry, isEpisodic, formatRuntime } from '@/lib/db';
import { Clock, PlayCircle, Library, ArrowRight, Plus, Star, Info, Play } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

function DashboardContent() {
  const { entries, isLoading, updateEntry, deleteEntry } = useMedia();
  const { user } = useAuth();
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'watching' | 'recent'>('watching');

  const currentlyWatching = useMemo(() => entries.filter(e => e.status === 'Watching'), [entries]);
  const recentlyAdded = useMemo(() => [...entries].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6), [entries]);

  // Dynamically select the hero entry (Watching first, then latest added)
  const heroEntry = useMemo(() => {
    const watching = entries.filter(e => e.status === 'Watching');
    if (watching.length > 0) return watching[0];

    if (entries.length > 0) {
      return [...entries].sort((a, b) => b.createdAt - a.createdAt)[0];
    }

    return null;
  }, [entries]);

  const stats = useMemo(() => {
    let totalTime = 0;
    let totalEpisodes = 0;
    entries.forEach(e => {
      if (e.runtime && e.status === 'Completed' && !isEpisodic(e)) totalTime += e.runtime;
      if (isEpisodic(e)) {
        if (e.episodesWatched) totalEpisodes += e.episodesWatched;
        if (e.episodes) {
          const watchedEps = e.episodes.filter(ep => ep.number && ep.number <= (e.episodesWatched || 0));
          watchedEps.forEach(ep => { if (ep.runtime) totalTime += ep.runtime; });
        }
      }
    });
    return { totalTime, totalEpisodes, totalMedia: entries.length };
  }, [entries]);

  const formatHours = (mins: number) => (mins / 60).toFixed(1);

  // Helper to format date added
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const displayName = user?.name || "Hemant Sharma";

  // Comprehensive Loading State matching the dashboard layout exactly
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-8 px-6 sm:px-8 lg:px-10 max-w-[1600px] mx-auto w-full animate-pulse">
        {/* Ambient background glow orbs */}
        <div className="absolute top-[15%] left-[25%] w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px] bg-purple-500/5 rounded-full blur-[110px] pointer-events-none" />

        {/* Hero & Stats Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 relative z-10">
          {/* Hero Banner Skeleton */}
          <div className="lg:col-span-2 h-[320px] bg-muted/20 border border-border/20 rounded-[28px]" />

          {/* Stats Skeletons */}
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="h-[140px] bg-muted/20 border border-border/20 rounded-[24px]" />
              <div className="h-[140px] bg-muted/20 border border-border/20 rounded-[24px]" />
            </div>
            <div className="flex-1 min-h-[140px] bg-muted/20 border border-border/20 rounded-[24px]" />
          </div>
        </div>

        {/* Currently Watching Skeleton Array */}
        <div className="mb-12 relative z-10">
          <div className="h-6 w-48 bg-muted/30 rounded-md mb-5" />
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-x-4 gap-y-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Recently Added List Skeletons */}
        <div className="relative z-10">
          <div className="h-6 w-48 bg-muted/30 rounded-md mb-5" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl border border-border/20 bg-muted/10 h-[149px]">
                <div className="w-[80px] h-full bg-muted/40 rounded-xl shrink-0" />
                <div className="flex-1 flex flex-col justify-center gap-3">
                  <div className="h-4 w-3/4 bg-muted/40 rounded" />
                  <div className="h-3 w-1/2 bg-muted/30 rounded" />
                  <div className="h-2 w-1/3 bg-muted/20 rounded mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-background pb-4 lg:pb-6 pt-4 lg:pt-6 px-4 sm:px-8 lg:px-10 overflow-hidden w-full max-w-[1600px] mx-auto animate-fade-in animate-fade-up">
      {/* Ambient background glow orbs */}
      <div className="absolute top-[15%] left-[25%] w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px] bg-purple-500/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Bento Grid layout with Hero (Column 1-2) and Stats (Column 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-4 lg:mb-8 relative z-10 shrink-0 lg:h-[350px] xl:h-[390px]">

        {/* Column 1 & 2: Featured Hero Banner */}
        <div className="lg:col-span-2 relative border border-cyan-400/25 shadow-[0_0_20px_rgba(34,211,238,0.08)] bg-card/70 dark:bg-neutral-950/65 backdrop-blur-xl rounded-[28px] p-4 lg:p-8 h-[160px] sm:h-[180px] lg:h-full flex flex-col justify-center group overflow-hidden transition-all duration-300 hover:border-cyan-400/40 shrink-0 lg:shrink">
          {/* Blurred ambient glow backdrop */}
          {heroEntry && (
            <div
              className="absolute inset-0 bg-cover bg-center scale-105 blur-3xl opacity-25 dark:opacity-35 pointer-events-none transition-transform duration-700 group-hover:scale-110"
              style={{ backgroundImage: `url(${heroEntry.coverImage})` }}
            />
          )}

          {/* Solid gradient mask overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/50 to-transparent z-0" />

          <div className="relative z-10 flex flex-row items-center justify-between gap-4 lg:gap-8 h-full">
            {heroEntry ? (
              <>
                {/* Poster Artwork Left */}
                {heroEntry.coverImage && (
                  <div className="shrink-0 relative w-[80px] sm:w-[100px] xl:w-[160px] aspect-[2/3] rounded-xl lg:rounded-2xl overflow-hidden border border-white/10 shadow-xl transition-transform duration-500 bg-neutral-800/80 flex items-center justify-center p-2 lg:p-3 text-[10px] uppercase text-muted-foreground tracking-wider leading-snug">
                    <img
                      src={heroEntry.coverImage}
                      alt={heroEntry.title}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                )}

                {/* Media Details Right */}
                <div className="flex-1 flex flex-col items-start text-left justify-center h-full min-w-0">
                  <span className="text-[8px] lg:text-[9px] font-bold tracking-[0.2em] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded uppercase mb-1.5 lg:mb-3">
                    FEATURED {heroEntry.type === 'TV Show' ? 'SERIES' : heroEntry.type.toUpperCase()}
                  </span>

                  <h2 className="text-lg sm:text-xl lg:text-3xl xl:text-4xl font-display font-bold tracking-tight text-white mb-1 lg:mb-2 line-clamp-1 lg:line-clamp-2">
                    {heroEntry.title}
                  </h2>

                  {/* Rating & Status */}
                  <div className="flex items-center gap-2 text-[10px] lg:text-[11px] text-white/80 font-bold mb-2 lg:mb-4">
                    {heroEntry.rating && (
                      <div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                        <Star size={10} className="fill-amber-400" />
                        <span>{heroEntry.rating}/10</span>
                      </div>
                    )}
                    {heroEntry.status && (
                      <span className="bg-cyan-500/25 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20 uppercase text-[9px] tracking-wider">
                        {heroEntry.status}
                      </span>
                    )}
                  </div>

                  {/* Synopsis / Quote */}
                  {heroEntry.review ? (
                    <p className="hidden lg:block text-[12px] xl:text-[13px] text-white/70 mb-5 leading-relaxed line-clamp-2 italic">
                      "{heroEntry.review}"
                    </p>
                  ) : (
                    <p className="hidden lg:block text-[12px] xl:text-[13px] text-white/70 mb-5 leading-relaxed line-clamp-2">
                      Track and log your progress. Click below to view detailed notes, ratings, and update watch logs.
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 mt-1 lg:mt-0">
                    <button
                      onClick={() => setSelectedEntry(heroEntry)}
                      className="flex items-center gap-1.5 bg-white text-black hover:bg-neutral-100 active:scale-95 px-3 py-1.5 lg:px-4.5 lg:py-2 rounded-full font-bold text-[11px] lg:text-[12px] transition-all cursor-pointer shadow-md"
                    >
                      <Info size={12} className="stroke-[2.5]" />
                      View Details
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Fallback Welcome Hero Banner */
              <div className="flex-1 text-left max-w-md m-0">
                <span className="text-[8px] lg:text-[9px] font-bold tracking-[0.2em] bg-white/20 px-2.5 py-0.5 rounded uppercase mb-2 lg:mb-3 inline-block">
                  WELCOME TO KINO
                </span>
                <h2 className="text-lg sm:text-xl lg:text-3xl font-display font-bold tracking-tight text-white mb-1 lg:mb-2">
                  Build Your Media Watchlist
                </h2>
                <p className="hidden lg:block text-[13px] text-white/70 mb-5 leading-relaxed">
                  Start logging your movies, TV shows, and anime. Your watchlist is kept private and synchronized with your Google Drive.
                </p>
                <Link
                  href="/add"
                  className="inline-flex items-center gap-1.5 bg-white text-primary hover:bg-neutral-100 active:scale-95 px-3.5 py-1.5 lg:px-4.5 lg:py-2 rounded-full font-bold text-[11px] lg:text-[12px] transition-all cursor-pointer shadow-md"
                >
                  <Plus size={12} strokeWidth={2.5} />
                  Add First Entry
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats Column: On desktop it's a flex-col vertical stack. On mobile it's a single 3-column row */}
        <div className="grid grid-cols-3 lg:flex lg:flex-col gap-3 lg:gap-4 shrink-0 h-[75px] sm:h-[85px] lg:h-full">

          {/* Total Collection */}
          <div className="border border-border/80 dark:border-cyan-400/25 shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-card/70 dark:bg-neutral-950/65 backdrop-blur-xl rounded-2xl lg:rounded-[24px] p-2.5 lg:p-3 xl:p-4 flex flex-col lg:justify-between justify-center items-center lg:items-stretch h-full lg:h-auto lg:flex-1 group transition-all duration-300 hover:border-cyan-400/40 hover:shadow-lg">
            <div className="flex items-center justify-between w-full lg:flex-row">
              <span className="text-[7.5px] sm:text-[8px] lg:text-[9px] xl:text-[10px] font-bold text-muted-foreground/60 tracking-[0.12em] uppercase">Total</span>
              <div className="hidden lg:block p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <Library size={14} />
              </div>
            </div>
            <div className="flex flex-col items-center lg:items-start mt-1 lg:mt-2">
              <p className="text-base sm:text-lg lg:text-2xl xl:text-3xl font-display font-bold text-foreground tracking-tight leading-none mb-0.5 lg:mb-1">{stats.totalMedia}</p>
              <span className="text-[8px] lg:text-[10px] xl:text-[10.5px] text-muted-foreground font-medium uppercase lg:normal-case">Titles</span>
            </div>
          </div>

          {/* Episodes Watched */}
          <div className="border border-border/80 dark:border-cyan-400/25 shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-card/70 dark:bg-neutral-950/65 backdrop-blur-xl rounded-2xl lg:rounded-[24px] p-2.5 lg:p-3 xl:p-4 flex flex-col lg:justify-between justify-center items-center lg:items-stretch h-full lg:h-auto lg:flex-1 group transition-all duration-300 hover:border-cyan-400/40 hover:shadow-lg">
            <div className="flex items-center justify-between w-full lg:flex-row">
              <span className="text-[7.5px] sm:text-[8px] lg:text-[9px] xl:text-[10px] font-bold text-muted-foreground/60 tracking-[0.12em] uppercase">Episodes</span>
              <div className="hidden lg:block p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Play size={14} className="fill-emerald-400/20" />
              </div>
            </div>
            <div className="flex flex-col items-center lg:items-start mt-1 lg:mt-2">
              <p className="text-base sm:text-lg lg:text-2xl xl:text-3xl font-display font-bold text-foreground tracking-tight leading-none mb-0.5 lg:mb-1">{stats.totalEpisodes}</p>
              <span className="text-[8px] lg:text-[10px] xl:text-[10.5px] text-muted-foreground font-medium uppercase lg:normal-case">Watched</span>
            </div>
          </div>

          {/* Time Spent */}
          <div className="border border-border/80 dark:border-cyan-400/25 shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-card/70 dark:bg-neutral-950/65 backdrop-blur-xl rounded-2xl lg:rounded-[24px] p-2.5 lg:p-3 xl:p-4 flex flex-col lg:justify-between justify-center items-center lg:items-stretch h-full lg:h-auto lg:flex-1 group transition-all duration-300 hover:border-cyan-400/45 hover:shadow-lg overflow-hidden">
            <div className="flex items-center justify-between w-full lg:flex-row">
              <span className="text-[7.5px] sm:text-[8px] lg:text-[9px] xl:text-[10px] font-bold text-muted-foreground/60 tracking-[0.12em] uppercase">Time</span>
              <div className="hidden lg:block p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                <Clock size={14} />
              </div>
            </div>
            <div className="flex flex-col items-center lg:items-start mt-1 lg:mt-2">
              <p className="text-base sm:text-lg lg:text-2xl xl:text-3xl font-display font-bold text-foreground tracking-tight leading-none mb-0.5 lg:mb-1">{formatHours(stats.totalTime)}</p>
              <span className="text-[8px] lg:text-[10px] xl:text-[11.5px] text-muted-foreground font-medium uppercase lg:normal-case">Hours</span>
            </div>

            {/* Glowing Wave Chart SVG */}
            <div className="hidden lg:block mt-1 xl:mt-2 relative w-full flex-1 min-h-[25px] overflow-hidden">
              <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                  <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M 0 32 C 15 12, 28 35, 45 15 C 60 5, 75 32, 88 20 L 100 24" fill="none" stroke="url(#waveGrad)" strokeWidth="2.5" className="blur-[2px] opacity-75" />
                <path d="M 0 32 C 15 12, 28 35, 45 15 C 60 5, 75 32, 88 20 L 100 24" fill="none" stroke="url(#waveGrad)" strokeWidth="1.8" />
                <path d="M 0 32 C 15 12, 28 35, 45 15 C 60 5, 75 32, 88 20 L 100 24 L 100 40 L 0 40 Z" fill="url(#waveFill)" />
              </svg>
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Section: Split Pane for Lists on desktop, Tabbed view on mobile */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-8 min-h-0 relative z-10 pb-4 lg:pb-0">
        
        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden bg-card/70 dark:bg-neutral-950/65 p-1 rounded-full border border-border/80 dark:border-white/5 shadow-sm shrink-0 mb-1">
          <button
            onClick={() => setActiveTab('watching')}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-full transition-all duration-300 ${activeTab === 'watching' ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold shadow-[0_0_10px_rgba(34,211,238,0.15)]' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Watching {currentlyWatching.length > 0 && `(${currentlyWatching.length})`}
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-full transition-all duration-300 ${activeTab === 'recent' ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold shadow-[0_0_10px_rgba(34,211,238,0.15)]' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Recently Added
          </button>
        </div>

        {/* Currently Watching */}
        {currentlyWatching.length > 0 && (
          <div className={`flex-[1.2] flex flex-col min-h-0 lg:bg-card/10 lg:border lg:border-border/40 lg:rounded-[28px] lg:p-6 lg:shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] ${activeTab === 'watching' ? 'flex' : 'hidden lg:flex'}`}>
            <div className="flex items-center justify-between mb-3 lg:mb-5 shrink-0">
              <h2 className="text-base lg:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <PlayCircle size={16} className="text-emerald-500" /> Continue Watching
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 lg:pr-2 hide-scrollbar">
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-3 gap-y-4 lg:gap-x-4 lg:gap-y-6 pb-28">
                {currentlyWatching.map((entry, i) => (
                  <MediaCard
                    key={entry.id}
                    entry={entry}
                    onClick={() => setSelectedEntry(entry)}
                    onFavoriteToggle={() => updateEntry({ ...entry, favorite: !entry.favorite })}
                    onIncrementWatched={() => {
                      const max = entry.episodesTotal || 9999;
                      const current = entry.episodesWatched || 0;
                      if (current < max) {
                        updateEntry({ ...entry, episodesWatched: current + 1 });
                      }
                    }}
                    onStatusChange={(newStatus: MediaEntry["status"]) => updateEntry({ ...entry, status: newStatus })}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recently Added */}
        <div className={`flex-[1] flex flex-col min-h-0 lg:bg-card/10 lg:border lg:border-border/40 lg:rounded-[28px] lg:p-6 lg:shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] ${activeTab === 'recent' || (activeTab === 'watching' && currentlyWatching.length === 0) ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center justify-between mb-3 lg:mb-5 shrink-0">
            <h2 className="text-base lg:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Clock size={16} className="text-primary" /> Recently Added
            </h2>
            <Link href="/collection" className="text-[11px] lg:text-[12px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors bg-primary/10 px-3.5 py-1.5 rounded-full hover:bg-primary/20">
              Collection <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 lg:pr-2 hide-scrollbar">
            {recentlyAdded.length > 0 ? (
              <div className="flex flex-col gap-3 lg:gap-4 pb-28">
                {recentlyAdded.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="flex gap-3 lg:gap-4 p-3 lg:p-4 rounded-2xl border border-border/80 dark:border-cyan-400/20 hover:border-cyan-400/40 shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_0_12px_rgba(34,211,238,0.06)] hover:shadow-lg bg-card/70 dark:bg-neutral-950/65 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer select-none group shrink-0"
                  >
                    {/* Poster Left */}
                    <div className="shrink-0 relative w-[60px] h-[85px] lg:w-[70px] lg:h-[100px] rounded-xl overflow-hidden border border-white/5 shadow-md">
                      {entry.coverImage ? (
                        <img
                          src={entry.coverImage}
                          alt={entry.title}
                          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center p-2 text-center text-[9px] font-bold text-muted-foreground uppercase leading-tight line-clamp-3">
                          {entry.title}
                        </div>
                      )}
                    </div>

                    {/* Details Right */}
                    <div className="flex-1 flex flex-col text-left justify-center min-w-0">
                      <h3 className="font-bold text-[13px] lg:text-[14px] text-foreground group-hover:text-primary transition-colors duration-200 truncate leading-snug" title={entry.title}>
                        {entry.title}
                      </h3>
                      <p className="text-[10px] lg:text-[11px] text-muted-foreground mt-0.5 font-medium leading-none">
                        {entry.type === 'TV Show' ? 'Series' : entry.type} • {entry.rating ? `${entry.rating}/10` : 'No rating'}
                      </p>
                      {/* Runtime info */}
                      <p className="text-[9px] lg:text-[10px] text-muted-foreground/60 mt-1.5 font-medium leading-none">
                        {entry.runtime ? formatRuntime(entry.runtime) : "No runtime info"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 lg:py-16 bg-card/30 border border-dashed border-border/80 rounded-2xl">
                <p className="text-muted-foreground font-medium text-[13px] mb-3">Nothing here yet.</p>
                <Link href="/add" className="text-primary font-bold text-[12px] hover:underline flex items-center gap-2">
                  <Plus size={14} /> Start building your collection
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* View Detail Modal */}
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

      {/* Floating Action Button (Quick Add) */}
      <Link 
        href="/add"
        className="hidden lg:flex fixed bottom-10 right-10 w-14 h-14 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all duration-300 hover:scale-105 z-50 group"
        title="Add New Media"
      >
        <Plus size={24} className="stroke-[2.5] transition-transform duration-300 group-hover:rotate-90" />
      </Link>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Library className="animate-pulse opacity-50" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
