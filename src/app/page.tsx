"use client";

import { useState, Suspense, useMemo } from 'react';
import { useMedia } from '@/context/MediaContext';
import MediaCard from "@/components/MediaCard";
import MediaCardSkeleton from '@/components/MediaCardSkeleton';
import { MediaDetailModal } from '@/components/MediaDetailModal';
import { MediaEntry, formatRuntime } from '@/lib/db';
import {
  Clock, PlayCircle, ArrowRight, Plus, Star, Info,
  Play, Calendar, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

function DashboardContent() {
  const { entries, isLoading, updateEntry, deleteEntry } = useMedia();
  const { user } = useAuth();

  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'watching' | 'planned' | 'recent'>('watching');

  // Categorize entries
  const currentlyWatching = useMemo(() => entries.filter(e => e.status === 'Watching'), [entries]);
  const planToWatch = useMemo(() => entries.filter(e => e.status === 'Plan to Watch'), [entries]);
  const recentlyAdded = useMemo(() => [...entries].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8), [entries]);

  // Dynamically select the hero entry
  const heroEntry = useMemo(() => {
    if (currentlyWatching.length > 0) return currentlyWatching[0];
    if (planToWatch.length > 0) return planToWatch[0];
    if (entries.length > 0) return [...entries].sort((a, b) => b.createdAt - a.createdAt)[0];
    return null;
  }, [currentlyWatching, planToWatch, entries]);

  // Accurate analytics calculation based strictly on watched content
  const stats = useMemo(() => {
    let totalTime = 0; // in minutes
    let totalEpisodes = 0;
    let totalCompleted = 0;

    entries.forEach(e => {
      if (e.status === 'Completed') {
        totalCompleted++;
      }

      if (e.type === 'Movie') {
        // For movies, only add runtime if completed
        if (e.status === 'Completed') {
          totalTime += (e.runtime || 0);
        }
      } else {
        // For TV Shows / Anime, calculate based strictly on episodes actually watched
        const watched = e.episodesWatched || 0;
        totalEpisodes += watched;
        // Assuming e.runtime is the runtime per episode
        totalTime += watched * (e.runtime || 0);
      }
    });

    return { totalTime, totalEpisodes, totalCompleted };
  }, [entries]);

  // Converting total minutes to days
  const formatDays = (mins: number) => (mins / (60 * 24)).toFixed(1);

  // Comprehensive Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-4 lg:pt-8 px-4 sm:px-8 lg:px-10 max-w-[1600px] mx-auto w-full animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 relative z-10">
          <div className="lg:col-span-2 h-[320px] bg-muted/20 border border-border/20 rounded-[28px]" />
          <div className="flex flex-col gap-4">
            <div className="h-[100px] bg-muted/20 border border-border/20 rounded-[24px]" />
            <div className="h-[100px] bg-muted/20 border border-border/20 rounded-[24px]" />
            <div className="h-[100px] bg-muted/20 border border-border/20 rounded-[24px]" />
          </div>
        </div>
        <div className="mb-12 relative z-10">
          <div className="h-6 w-48 bg-muted/30 rounded-md mb-5" />
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => <MediaCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-background pb-4 lg:pb-6 pt-4 lg:pt-6 px-4 sm:px-8 lg:px-10 overflow-hidden w-full max-w-[1600px] mx-auto animate-fade-in animate-fade-up">

      {/* Top Section: Hero & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-4 lg:mb-8 relative z-10 shrink-0 lg:h-[350px]">

        {/* Hero Banner */}
        <div className="lg:col-span-2 relative border border-border/40 shadow-sm bg-card/40 dark:bg-neutral-900/40 rounded-[28px] p-5 lg:p-8 h-[180px] sm:h-[200px] lg:h-full flex flex-col justify-center overflow-hidden">
          {heroEntry && (
            <div
              className="absolute inset-0 bg-cover bg-center scale-105 blur-2xl opacity-10 pointer-events-none"
              style={{ backgroundImage: `url(${heroEntry.coverImage})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-0" />

          <div className="relative z-10 flex flex-row items-center justify-between gap-4 lg:gap-8 h-full">
            {heroEntry ? (
              <>
                {heroEntry.coverImage && (
                  <div className="shrink-0 relative w-[90px] sm:w-[110px] xl:w-[150px] aspect-[2/3] rounded-xl lg:rounded-2xl overflow-hidden shadow-lg bg-neutral-800/80">
                    <img src={heroEntry.coverImage} alt={heroEntry.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 flex flex-col items-start justify-center h-full min-w-0">
                  <span className="text-[10px] font-bold tracking-widest text-primary/80 uppercase mb-2">
                    Featured {heroEntry.status}
                  </span>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-display font-bold tracking-tight text-foreground mb-2 line-clamp-2">
                    {heroEntry.title}
                  </h2>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium mb-4">
                    {heroEntry.rating && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Star size={12} className="fill-amber-500" /> {heroEntry.rating}/10
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-muted rounded-md">{heroEntry.type}</span>
                  </div>
                  <button
                    onClick={() => setSelectedEntry(heroEntry)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-full font-semibold text-xs transition-all shadow-sm"
                  >
                    <Info size={14} /> View Details
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 text-left max-w-md">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold tracking-tight text-foreground mb-2">
                  Welcome to Kino
                </h2>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  Start logging your media. Your accurate watch-time analytics will appear here as you update your progress.
                </p>
                <Link href="/add" className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2 rounded-full font-semibold text-xs transition-all">
                  <Plus size={14} /> Add First Entry
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Minimal Analytics Stack */}
        <div className="grid grid-cols-3 lg:flex lg:flex-col gap-3 lg:gap-4 shrink-0 h-[80px] lg:h-full">

          <div className="border border-border/40 bg-card/40 rounded-[20px] p-3 lg:p-4 flex flex-col justify-center items-start flex-1 transition-colors hover:bg-card/60">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 lg:mb-2">
              <Clock size={14} className="text-amber-500" />
              <span className="text-[10px] lg:text-xs font-semibold uppercase tracking-wider">Time Watched</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg lg:text-3xl font-bold text-foreground">{formatDays(stats.totalTime)}</span>
              <span className="text-[10px] lg:text-sm text-muted-foreground font-medium">days</span>
            </div>
          </div>

          <div className="border border-border/40 bg-card/40 rounded-[20px] p-3 lg:p-4 flex flex-col justify-center items-start flex-1 transition-colors hover:bg-card/60">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 lg:mb-2">
              <Play size={14} className="text-emerald-500" />
              <span className="text-[10px] lg:text-xs font-semibold uppercase tracking-wider">Episodes</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg lg:text-3xl font-bold text-foreground">{stats.totalEpisodes}</span>
              <span className="text-[10px] lg:text-sm text-muted-foreground font-medium">watched</span>
            </div>
          </div>

          <div className="border border-border/40 bg-card/40 rounded-[20px] p-3 lg:p-4 flex flex-col justify-center items-start flex-1 transition-colors hover:bg-card/60">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 lg:mb-2">
              <CheckCircle2 size={14} className="text-blue-500" />
              <span className="text-[10px] lg:text-xs font-semibold uppercase tracking-wider">Completed</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg lg:text-3xl font-bold text-foreground">{stats.totalCompleted}</span>
              <span className="text-[10px] lg:text-sm text-muted-foreground font-medium">titles</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 relative z-10 pb-4 lg:pb-0">

        {/* Mobile Tabs */}
        <div className="flex lg:hidden bg-muted/30 p-1 rounded-xl border border-border/40 shrink-0 mb-2">
          <button onClick={() => setActiveTab('watching')} className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'watching' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
            Watching
          </button>
          <button onClick={() => setActiveTab('planned')} className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'planned' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
            Planned
          </button>
          <button onClick={() => setActiveTab('recent')} className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'recent' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
            Recent
          </button>
        </div>

        {/* Left Column: Grids (Watching & Planned) */}
        <div className={`flex-[2] flex-col gap-8 min-h-0 overflow-y-auto hide-scrollbar pr-2 pb-24 ${activeTab === 'recent' ? 'hidden lg:flex' : 'flex'}`}>

          {/* Continue Watching Section */}
          <div className={`${activeTab !== 'watching' && 'hidden lg:block'}`}>
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-background/95 backdrop-blur z-10 py-2">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <PlayCircle size={18} className="text-emerald-500" /> Continue Watching
              </h2>
            </div>
            {currentlyWatching.length > 0 ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {currentlyWatching.map((entry, i) => (
                  <MediaCard
                    key={entry.id}
                    entry={entry}
                    index={i}
                    onClick={() => setSelectedEntry(entry)}
                    onFavoriteToggle={() => updateEntry({ ...entry, favorite: !entry.favorite })}
                    onIncrementWatched={() => {
                      const max = entry.episodesTotal || 9999;
                      const current = entry.episodesWatched || 0;
                      if (current < max) updateEntry({ ...entry, episodesWatched: current + 1 });
                    }}
                    onStatusChange={(newStatus) => updateEntry({ ...entry, status: newStatus })}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-border/50 rounded-2xl text-center">
                <p className="text-sm text-muted-foreground">You aren't currently watching anything.</p>
              </div>
            )}
          </div>

          {/* Plan to Watch Section */}
          <div className={`${activeTab !== 'planned' && 'hidden lg:block'} lg:mt-6`}>
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-background/95 backdrop-blur z-10 py-2">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar size={18} className="text-blue-500" /> Plan to Watch
              </h2>
            </div>
            {planToWatch.length > 0 ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {planToWatch.map((entry, i) => (
                  <MediaCard
                    key={entry.id}
                    entry={entry}
                    index={i}
                    onClick={() => setSelectedEntry(entry)}
                    onFavoriteToggle={() => updateEntry({ ...entry, favorite: !entry.favorite })}
                    onIncrementWatched={() => { }}
                    onStatusChange={(newStatus) => updateEntry({ ...entry, status: newStatus })}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-border/50 rounded-2xl text-center">
                <p className="text-sm text-muted-foreground">Your watchlist is empty.</p>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Recently Added */}
        <div className={`flex-[1] flex-col min-h-0 bg-card/20 border border-border/40 rounded-[24px] p-5 lg:flex ${activeTab === 'recent' ? 'flex' : 'hidden'}`}>
          <div className="flex items-center justify-between mb-5 shrink-0">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock size={16} className="text-primary" /> Recently Added
            </h2>
            <Link href="/collection" className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              View All <ArrowRight size={12} />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 hide-scrollbar pb-20 lg:pb-4">
            {recentlyAdded.length > 0 ? (
              <div className="flex flex-col gap-3">
                {recentlyAdded.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="flex gap-3 p-3 rounded-xl border border-border/40 hover:border-border hover:bg-muted/30 transition-all cursor-pointer group"
                  >
                    <div className="shrink-0 w-[50px] h-[75px] rounded-lg overflow-hidden bg-muted">
                      {entry.coverImage && (
                        <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {entry.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {entry.type} • {entry.status}
                      </p>
                      {entry.runtime && (
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatRuntime(entry.runtime)} / ep
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-muted-foreground">No recent entries.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Detail Modal */}
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

      {/* Floating Action Button */}
      <Link
        href="/add"
        className="fixed bottom-20 right-6 lg:bottom-10 lg:right-10 w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 z-50 group"
      >
        <Plus size={24} className="stroke-[2.5] transition-transform duration-300 group-hover:rotate-90" />
      </Link>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <DashboardContent />
    </Suspense>
  );
}