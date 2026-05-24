// src/app/page.tsx
"use client";

import { useState, Suspense, useMemo } from 'react';
import { useMedia } from '@/context/MediaContext';
import MediaCard from "@/components/MediaCard";
import MediaCardSkeleton from '@/components/MediaCardSkeleton';
import { MediaDetailModal } from '@/components/MediaDetailModal';
import { MediaEntry, formatRuntime, isEpisodic } from '@/lib/db';
import {
  Clock, PlayCircle, ArrowRight, Plus, Star, Info,
  Play, Calendar, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/Loader';

function DashboardContent() {
  const { entries, isLoading, updateEntry, deleteEntry } = useMedia();
  const { user } = useAuth();

  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'watching' | 'planned' | 'recent'>('watching');

  const currentlyWatching = useMemo(() => entries.filter(e => e.status === 'Watching'), [entries]);
  const planToWatch = useMemo(() => entries.filter(e => e.status === 'Plan to Watch'), [entries]);
  const recentlyAdded = useMemo(() => [...entries].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8), [entries]);

  const heroEntry = useMemo(() => {
    if (currentlyWatching.length > 0) return currentlyWatching[0];
    if (planToWatch.length > 0) return planToWatch[0];
    if (entries.length > 0) return [...entries].sort((a, b) => b.createdAt - a.createdAt)[0];
    return null;
  }, [currentlyWatching, planToWatch, entries]);

  const stats = useMemo(() => {
    let totalTime = 0;
    let totalEpisodes = 0;
    let totalCompleted = 0;

    entries.forEach(e => {
      if (e.status === 'Completed') {
        totalCompleted++;
      }

      if (!isEpisodic(e)) {
        // It's a standard Movie OR an Anime Movie
        if (e.status === 'Completed') {
          totalTime += (e.runtime || 0);
        }
      } else {
        // TV Show / Anime: Calculate strictly by watched episodes
        const watched = e.episodesWatched || 0;
        totalEpisodes += watched;
        totalTime += watched * (e.runtime || 0);
      }
    });

    return { totalTime, totalEpisodes, totalCompleted };
  }, [entries]);

  const formatDays = (mins: number) => (mins / (60 * 24)).toFixed(1);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-4 lg:pt-8 px-4 sm:px-8 lg:px-10 max-w-[1600px] mx-auto w-full animate-fade-in">
        <PageLoader text="Syncing your library..." />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-background pb-4 lg:pb-6 pt-4 lg:pt-6 px-4 sm:px-8 lg:px-10 overflow-hidden w-full max-w-[1600px] mx-auto animate-fade-in animate-fade-up">

      {/* Top Section: Hero & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-4 lg:mb-8 relative z-10 shrink-0 lg:h-[350px]">

        {/* Beautiful Glassmorphism Hero Banner */}
        <div className="lg:col-span-2 relative border border-border/30 rounded-[28px] p-5 lg:p-8 h-[180px] sm:h-[200px] lg:h-full flex flex-col justify-center overflow-hidden shadow-xl bg-gradient-to-br from-card/60 to-background group">
          {heroEntry && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center scale-110 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none"
                style={{ backgroundImage: `url(${heroEntry.coverImage})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent z-0" />
            </>
          )}

          <div className="relative z-10 flex flex-row items-center justify-between gap-4 lg:gap-8 h-full">
            {heroEntry ? (
              <>
                {heroEntry.coverImage && (
                  <div className="shrink-0 relative w-[90px] sm:w-[110px] xl:w-[150px] aspect-[2/3] rounded-xl lg:rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-neutral-800 border border-border/50 group-hover:scale-[1.02] transition-transform duration-500">
                    <img src={heroEntry.coverImage} alt={heroEntry.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 flex flex-col items-start justify-center h-full min-w-0">
                  <span className="text-[10px] font-bold tracking-widest text-primary/90 uppercase mb-2 bg-primary/10 px-2 py-1 rounded-md backdrop-blur-sm border border-primary/20">
                    Featured {heroEntry.status}
                  </span>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-display font-extrabold tracking-tight text-foreground mb-3 line-clamp-2 leading-tight">
                    {heroEntry.title}
                  </h2>
                  <div className="flex items-center gap-3 text-[12px] text-muted-foreground font-medium mb-5">
                    {heroEntry.rating && (
                      <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-2 py-1 rounded-md border border-amber-500/20">
                        <Star size={12} className="fill-amber-500" /> {heroEntry.rating}/10
                      </span>
                    )}
                    <span className="px-2 py-1 bg-muted/50 border border-border/50 rounded-md backdrop-blur-sm text-foreground/80">{heroEntry.type}</span>
                  </div>
                  <button
                    onClick={() => setSelectedEntry(heroEntry)}
                    className="flex items-center gap-2 bg-foreground text-background hover:bg-primary hover:text-primary-foreground px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
                  >
                    <Info size={16} /> View Details
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 text-left max-w-md relative z-10">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold tracking-tight text-foreground mb-3">
                  Welcome to Kino
                </h2>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Start logging your media. Your accurate watch-time analytics will automatically compile here based on completed movies and watched episodes.
                </p>
                <Link href="/add" className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-full font-bold text-sm transition-all shadow-lg active:scale-95 hover:shadow-primary/25 cursor-pointer">
                  <Plus size={16} /> Add First Entry
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Refined Analytics Stack */}
        <div className="grid grid-cols-3 lg:flex lg:flex-col gap-3 lg:gap-4 shrink-0 h-[80px] lg:h-full">
          {[
            { label: "Time Watched", value: formatDays(stats.totalTime), unit: "days", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
            { label: "Episodes", value: stats.totalEpisodes, unit: "watched", icon: Play, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
            { label: "Completed", value: stats.totalCompleted, unit: "titles", icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" }
          ].map((stat, i) => (
            <div key={i} className="relative border border-border/30 bg-card/40 backdrop-blur-sm rounded-[24px] p-4 lg:p-5 flex flex-col justify-center items-start flex-1 transition-all hover:bg-card/80 hover:shadow-md group overflow-hidden">
              <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl opacity-20 ${stat.bg}`} />
              <div className="flex items-center gap-2 text-muted-foreground mb-2 lg:mb-3">
                <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.border} border`}>
                  <stat.icon size={14} className={stat.color} />
                </div>
                <span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-foreground/70">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5 lg:gap-2">
                <span className="text-xl lg:text-4xl font-black text-foreground tracking-tight group-hover:scale-105 transition-transform origin-left">{stat.value}</span>
                <span className="text-[10px] lg:text-sm text-muted-foreground font-medium">{stat.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 relative z-10 pb-4 lg:pb-0">

        {/* Mobile Tabs */}
        <div className="flex lg:hidden bg-card/50 p-1.5 rounded-2xl border border-border/40 shrink-0 mb-2 backdrop-blur-md">
          {['watching', 'planned', 'recent'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all capitalize cursor-pointer ${activeTab === tab ? 'bg-background shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Left Column: Grids (Watching & Planned) */}
        <div className={`flex-[2] flex-col gap-10 min-h-0 overflow-y-auto hide-scrollbar pr-2 pb-24 ${activeTab === 'recent' ? 'hidden lg:flex' : 'flex'}`}>

          {/* Continue Watching Section */}
          <div className={`${activeTab !== 'watching' && 'hidden lg:block'}`}>
            <div className="flex items-center justify-between mb-5 sticky top-0 bg-background/95 backdrop-blur-xl z-20 py-3 border-b border-border/10">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
                <PlayCircle size={20} className="text-emerald-500 fill-emerald-500/20" /> Continue Watching
              </h2>
            </div>
            {currentlyWatching.length > 0 ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5">
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
              <div className="p-10 border border-dashed border-border/40 bg-muted/10 rounded-[24px] text-center flex flex-col items-center justify-center gap-3">
                <PlayCircle size={32} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground font-medium">You aren't currently watching anything.</p>
              </div>
            )}
          </div>

          {/* Plan to Watch Section */}
          <div className={`${activeTab !== 'planned' && 'hidden lg:block'}`}>
            <div className="flex items-center justify-between mb-5 sticky top-0 bg-background/95 backdrop-blur-xl z-20 py-3 border-b border-border/10">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
                <Calendar size={20} className="text-blue-500 fill-blue-500/20" /> Plan to Watch
              </h2>
            </div>
            {planToWatch.length > 0 ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5">
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
              <div className="p-10 border border-dashed border-border/40 bg-muted/10 rounded-[24px] text-center flex flex-col items-center justify-center gap-3">
                <Calendar size={32} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground font-medium">Your watchlist is empty.</p>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Recently Added */}
        <div className={`flex-[1] flex-col min-h-0 bg-card/30 border border-border/30 backdrop-blur-sm rounded-[28px] p-5 lg:flex shadow-inner ${activeTab === 'recent' ? 'flex' : 'hidden'}`}>
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Clock size={18} className="text-primary" /> Recently Added
            </h2>
            <Link href="/collection" className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors cursor-pointer">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 hide-scrollbar pb-20 lg:pb-4">
            {recentlyAdded.length > 0 ? (
              <div className="flex flex-col gap-3">
                {recentlyAdded.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="flex gap-4 p-3 rounded-2xl border border-border/20 bg-background/50 hover:border-primary/30 hover:bg-muted/50 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="shrink-0 w-[55px] h-[80px] rounded-xl overflow-hidden bg-muted relative">
                      {entry.coverImage ? (
                        <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/80 text-muted-foreground">
                          <Play size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {entry.title}
                      </h3>
                      <p className="text-[12px] font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> {entry.type}
                      </p>
                      <p className="text-[11px] font-semibold text-muted-foreground/70 mt-1 uppercase tracking-wider">
                        {entry.status} {entry.runtime ? `• ${formatRuntime(entry.runtime)}/ep` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <Clock size={20} className="text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">No recent entries.</p>
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
        className="fixed bottom-20 right-6 lg:bottom-10 lg:right-10 w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center shadow-xl shadow-primary/25 transition-all hover:scale-105 active:scale-95 z-50 group border border-primary/20 cursor-pointer"
      >
        <Plus size={24} className="stroke-[2.5] transition-transform duration-300 group-hover:rotate-90" />
      </Link>
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