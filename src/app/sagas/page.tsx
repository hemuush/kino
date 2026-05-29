'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Film, 
  Layers3, 
  Star, 
  Tv, 
  Search, 
  Play, 
  ChevronRight, 
  Award, 
  Clock3, 
  CheckCircle,
  Eye,
  PlusCircle,
  Edit3
} from 'lucide-react';
import { useMedia } from '@/context/MediaContext';
import { MediaEntry, formatRuntime, getWatchedRuntimeMinutes } from '@/lib/db';
import { PageLoader } from '@/components/ui/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

function getYear(dateString?: string) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date.getFullYear().toString();
}

function statusGlowClass(status?: string) {
  if (status === 'Completed') return 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] border-emerald-400/20';
  if (status === 'Watching') return 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.4)] border-blue-400/20';
  return 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)] border-amber-400/20';
}

function statusTextColor(status?: string) {
  if (status === 'Completed') return 'text-emerald-400';
  if (status === 'Watching') return 'text-blue-400';
  return 'text-amber-400';
}

export default function SagasPage() {
  const { entries, franchises, isLoading } = useMedia();
  const searchParams = useSearchParams();

  const [selectedSaga, setSelectedSaga] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<MediaEntry | null>(null);
  const queryParam = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [prevQueryParam, setPrevQueryParam] = useState(queryParam);

  if (queryParam !== prevQueryParam) {
    setPrevQueryParam(queryParam);
    setSearchTerm(queryParam);
  }

  const groupedSagas = useMemo(() => {
    const groups: Record<string, MediaEntry[]> = {};

    entries.forEach((entry) => {
      let sagaName = entry.franchise;

      if (entry.franchiseId && franchises.length > 0) {
        const foundFranchise = franchises.find((franchise) => franchise.id === entry.franchiseId);
        if (foundFranchise) sagaName = foundFranchise.name;
      }

      if (!sagaName || typeof sagaName !== 'string' || !sagaName.trim()) return;

      const trimmedSagaName = sagaName.trim();
      if (!groups[trimmedSagaName]) groups[trimmedSagaName] = [];
      groups[trimmedSagaName].push(entry);
    });

    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateA - dateB;
      });
    });

    return groups;
  }, [entries, franchises]);

  const sagaNames = useMemo(() => Object.keys(groupedSagas).sort(), [groupedSagas]);

  const filteredSagaNames = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return sagaNames;
    return sagaNames.filter((name) => {
      const items = groupedSagas[name] || [];
      const haystack = [
        name,
        ...items.map((item) => `${item.title} ${item.type} ${getYear(item.releaseDate)}`),
      ].join(' ').toLowerCase();
      return query.split(/\s+/).every((token) => haystack.includes(token));
    });
  }, [groupedSagas, sagaNames, searchTerm]);

  const currentSagaItems = selectedSaga ? groupedSagas[selectedSaga] || [] : [];

  // Stats for the active saga
  const sagaTotalRuntime = currentSagaItems.reduce((total, item) => total + getWatchedRuntimeMinutes(item), 0);
  const sagaRawRuntime = currentSagaItems.reduce((total, item) => total + (item.runtime || 0), 0);
  const totalSagaEntries = Object.values(groupedSagas).reduce((total, items) => total + items.length, 0);

  const handleSelectSaga = (saga: string) => {
    setSelectedSaga(saga);
    setSelectedMovie(groupedSagas[saga][0] || null);
  };

  const handleCloseSaga = () => {
    setSelectedSaga(null);
    setSelectedMovie(null);
  };

  if (isLoading) return <PageLoader text="Loading your Sagas..." />;

  return (
    <div className="absolute inset-0 bg-[#03050c] text-slate-100 overflow-hidden flex flex-col font-sans">
      
      {/* ─── Glowing Background Blobs ─── */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* ─── Main Content Wrapper ─── */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* ─── LEFT PANEL: Timeline Sidebar (Only shown when a saga is selected) ─── */}
        <AnimatePresence>
          {selectedSaga && (
            <motion.aside
              initial={{ x: -340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -340, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="absolute left-0 top-0 bottom-0 z-20 w-full max-w-[320px] md:relative md:max-w-[280px] lg:max-w-[320px] flex flex-col bg-slate-950/85 backdrop-blur-2xl border-r border-white/5 shadow-2xl shrink-0"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-900/30">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={handleCloseSaga}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-200 shrink-0"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="min-w-0">
                    <h2 className="font-extrabold text-[15px] text-white tracking-tight truncate leading-tight">{selectedSaga}</h2>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{currentSagaItems.length} Chronological Entries</p>
                  </div>
                </div>
              </div>

              {/* Chronological List */}
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 relative">
                {/* Visual Connector Line */}
                <div className="absolute left-[33px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-indigo-500/20 via-cyan-500/20 to-indigo-500/10 pointer-events-none" />

                {currentSagaItems.map((media, index) => {
                  const isActive = selectedMovie?.id === media.id;
                  const year = getYear(media.releaseDate);
                  
                  return (
                    <div key={media.id || index} className="flex gap-4 relative group">
                      
                      {/* Timeline Node */}
                      <div className="relative flex flex-col items-center shrink-0 mt-3.5 z-10">
                        <button
                          onClick={() => setSelectedMovie(media)}
                          className={`w-[16px] h-[16px] rounded-full border-2 transition-all duration-300 ${
                            isActive
                              ? 'bg-cyan-400 border-white scale-125 shadow-[0_0_12px_rgba(34,211,238,0.8)]'
                              : 'bg-slate-950 border-slate-600 hover:border-slate-400'
                          }`}
                        />
                        <span className="text-[9px] font-bold text-slate-500 mt-2 tracking-tighter">#{index + 1}</span>
                      </div>

                      {/* Card Content */}
                      <button
                        onClick={() => setSelectedMovie(media)}
                        className={`flex-1 flex gap-3 rounded-2xl p-2 text-left border transition-all duration-300 relative overflow-hidden ${
                          isActive
                            ? 'bg-white/[0.04] border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                            : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'
                        }`}
                      >
                        <div className="relative w-12 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-900 border border-white/5">
                          {media.coverImage ? (
                            <img src={media.coverImage} alt={media.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-600 text-[10px] font-bold">Film</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <p className={`text-xs font-bold leading-tight truncate ${isActive ? 'text-cyan-400' : 'text-slate-200'}`}>
                            {media.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {year && <span className="text-[10px] font-bold text-slate-400">{year}</span>}
                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                            <span className={`text-[10px] font-semibold ${statusTextColor(media.status)}`}>{media.status || 'Completed'}</span>
                          </div>
                          {media.rating > 0 && (
                            <div className="flex items-center gap-0.5 mt-1 text-amber-400">
                              <Star size={10} className="fill-amber-400" />
                              <span className="text-[10px] font-black">{media.rating}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Stats Footer */}
              {sagaRawRuntime > 0 && (
                <div className="shrink-0 p-4 border-t border-white/5 bg-slate-950/90">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Runtime</p>
                      <p className="text-xs font-extrabold text-slate-200 mt-0.5">{formatRuntime(sagaRawRuntime)}</p>
                    </div>
                    <div className="border-l border-white/5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Watched</p>
                      <p className="text-xs font-extrabold text-cyan-400 mt-0.5">
                        {sagaTotalRuntime > 0 ? formatRuntime(sagaTotalRuntime) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ─── RIGHT PANEL: Main Content ─── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
          
          {/* 1. Sagas Grid View (Overview) */}
          {!selectedSaga && (
            <div className="w-full max-w-[1600px] mx-auto p-5 sm:p-8 lg:p-12 space-y-10">
              
              {/* Header section with high-end typography and glow card */}
              <div className="relative rounded-[32px] overflow-hidden border border-white/5 bg-gradient-to-br from-slate-900/60 to-slate-950/80 p-6 sm:p-8 lg:p-10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <Layers3 size={13} /> Cinematic Universes
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                    Franchises &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">Sagas</span>
                  </h1>
                  <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                    View connected movies, TV shows, and timelines automatically grouped by their overarching franchises.
                  </p>
                </div>

                {/* Glassmorphic Stats */}
                <div className="flex gap-4">
                  {[
                    { label: 'Sagas', value: sagaNames.length, icon: Layers3 },
                    { label: 'Total Entries', value: totalSagaEntries, icon: Film },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl px-6 py-4 min-w-[110px] text-center shadow-lg relative group overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-12 h-12 text-white/[0.01] group-hover:text-white/[0.03] transition-colors duration-500">
                          <Icon className="w-full h-full" />
                        </div>
                        <p className="text-3xl font-extrabold text-white tracking-tight">{stat.value}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Search Bar */}
              <div className="max-w-md w-full relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by saga name, media title, or year..."
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-slate-200 placeholder-slate-500 text-sm outline-none focus:border-cyan-500/40 focus:ring-4 focus:ring-cyan-500/5 hover:bg-white/[0.05] transition-all duration-300"
                />
              </div>

              {/* Main Grid display */}
              {sagaNames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-28 text-center border border-dashed border-white/5 rounded-3xl bg-slate-900/10">
                  <div className="w-16 h-16 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-center mb-5 text-slate-500">
                    <Film size={26} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-200">Your Universe is Empty</h2>
                  <p className="text-slate-400 text-xs mt-1.5 max-w-sm leading-relaxed">
                    Set a &quot;Saga / Franchise&quot; value when editing or adding your media items to automatically populate this library view.
                  </p>
                </div>
              ) : filteredSagaNames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-slate-400 text-sm font-medium">No custom sagas match your query &quot;{searchTerm}&quot;</p>
                  <button onClick={() => setSearchTerm('')} className="mt-3 text-cyan-400 text-xs font-bold hover:underline tracking-wide">
                    Clear Search Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredSagaNames.map((saga, i) => {
                    const items = groupedSagas[saga];
                    const totalTime = items.reduce((t, m) => t + (m.runtime || 0), 0);
                    const avgRating = items.filter(m => m.rating > 0);
                    const avgR = avgRating.length ? (avgRating.reduce((s, m) => s + m.rating, 0) / avgRating.length).toFixed(1) : null;
                    const latestYear = Math.max(0, ...items.map(m => Number(getYear(m.releaseDate) || 0)));

                    return (
                      <motion.button
                        key={saga}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i, 16) * 0.03, duration: 0.35 }}
                        onClick={() => handleSelectSaga(saga)}
                        className="group flex flex-col text-left overflow-hidden rounded-[24px] border border-white/5 bg-slate-950/40 hover:border-cyan-500/20 hover:bg-slate-900/30 shadow-lg hover:shadow-cyan-500/[0.02] hover:-translate-y-1 transition-all duration-300 focus:outline-none"
                      >
                        {/* Immersive Poster Montage */}
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950 flex">
                          {/* Collage system */}
                          <div className="absolute inset-0 grid grid-cols-[1.3fr_0.7fr] gap-0.5 p-0.5">
                            <div className="overflow-hidden rounded-l-2xl border-r border-slate-950">
                              {items[0]?.coverImage ? (
                                <img src={items[0].coverImage} alt={items[0].title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                              ) : (
                                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[10px] font-black uppercase text-slate-500">{saga}</div>
                              )}
                            </div>
                            <div className="grid grid-rows-2 gap-0.5">
                              <div className="overflow-hidden rounded-tr-2xl border-b border-slate-950">
                                {items[1]?.coverImage ? (
                                  <img src={items[1].coverImage} alt={items[1].title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                ) : (
                                  <div className="w-full h-full bg-slate-900/60" />
                                )}
                              </div>
                              <div className="overflow-hidden rounded-br-2xl relative">
                                {items[2]?.coverImage ? (
                                  <img src={items[2].coverImage} alt={items[2].title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                ) : (
                                  <div className="w-full h-full bg-slate-900/30" />
                                )}
                                {items.length > 3 && (
                                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex items-center justify-center border-l border-t border-white/5">
                                    <span className="text-white font-extrabold text-xs font-mono">+{items.length - 3}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Top and bottom shade filters */}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 opacity-70" />

                          {/* Quick Stats Overlay info */}
                          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                            <span className="bg-white/95 text-slate-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md shadow">
                              {items.length} {items.length === 1 ? 'Entry' : 'Entries'}
                            </span>
                            {latestYear > 0 && (
                              <span className="bg-slate-900/75 backdrop-blur-sm text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/5">
                                {latestYear}
                              </span>
                            )}
                          </div>

                          {/* Center Play Button on hover */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-11 h-11 bg-cyan-500/20 backdrop-blur-md rounded-full flex items-center justify-center border border-cyan-400/40 shadow-lg shadow-cyan-500/10">
                              <Play size={16} className="text-cyan-400 fill-cyan-400 ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Title and stats details */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-200 line-clamp-1 group-hover:text-cyan-400 transition-colors leading-snug">
                              {saga}
                            </h3>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5 pt-2.5">
                            <div className="flex items-center gap-3 font-semibold">
                              {totalTime > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock size={11} className="text-slate-500" /> {formatRuntime(totalTime)}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Tv size={11} className="text-slate-500" /> {items.filter(m => m.type === 'TV Show' || m.type === 'Anime').length > 0 ? 'Mixed' : 'Movies'}
                              </span>
                            </div>
                            {avgR && (
                              <div className="flex items-center gap-1 text-amber-400 font-extrabold">
                                <Star size={10} className="fill-amber-400" />
                                <span>{avgR}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. Saga Detail Interactive Screen */}
          {selectedSaga && selectedMovie && (
            <div className="flex-1 flex flex-col min-h-0 relative animate-in fade-in duration-300">
              
              {/* Back button for mobile at top */}
              <div className="md:hidden flex items-center gap-3 p-4 bg-slate-950/80 border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
                <button
                  onClick={handleCloseSaga}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-400"
                >
                  <ArrowLeft size={14} />
                </button>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Franchise</h3>
                  <p className="text-sm font-extrabold text-white truncate">{selectedSaga}</p>
                </div>
              </div>

              {/* Dynamic Immersive Showcase Banner */}
              <div className="relative h-[280px] md:h-[380px] w-full overflow-hidden bg-slate-950 shrink-0">
                {selectedMovie.coverImage && (
                  <img
                    src={selectedMovie.coverImage}
                    alt={selectedMovie.title}
                    className="absolute inset-0 w-full h-full object-cover scale-105 opacity-20 blur-xl"
                  />
                )}
                {/* Horizontal Gradient shadows */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#03050c] via-[#03050c]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#03050c]/80 via-transparent to-slate-950/30" />

                {/* Floating Content inside Hero */}
                <div className="absolute bottom-0 left-0 right-0 max-w-6xl mx-auto px-6 sm:px-8 py-8 flex flex-col md:flex-row gap-6 md:gap-8 items-end">
                  
                  {/* Poster Thumbnail */}
                  <div className="shrink-0 relative group hidden md:block">
                    <div className="w-32 md:w-44 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900 relative">
                      {selectedMovie.coverImage ? (
                        <img src={selectedMovie.coverImage} alt={selectedMovie.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 font-bold p-3 text-center">{selectedMovie.title}</div>
                      )}
                    </div>
                  </div>

                  {/* Main Hero Metadata */}
                  <div className="flex-1 space-y-4 text-left">
                    
                    {/* Navigation path & stats row */}
                    <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400">
                      <button onClick={handleCloseSaga} className="hover:text-white transition-colors">Sagas</button>
                      <ChevronRight size={12} className="text-slate-600" />
                      <span className="text-slate-300">{selectedSaga}</span>
                      <ChevronRight size={12} className="text-slate-600" />
                      <span className="text-cyan-400 font-extrabold truncate max-w-xs">{selectedMovie.title}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-[10px] font-extrabold uppercase tracking-wider">
                        {selectedMovie.type}
                      </span>
                      {getYear(selectedMovie.releaseDate) && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-white/[0.04] border border-white/5 text-slate-300 text-[10px] font-bold">
                          <Calendar size={10} className="text-slate-400" /> {getYear(selectedMovie.releaseDate)}
                        </span>
                      )}
                      {selectedMovie.runtime && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-white/[0.04] border border-white/5 text-slate-300 text-[10px] font-bold">
                          <Clock size={10} className="text-slate-400" /> {formatRuntime(selectedMovie.runtime)}
                        </span>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight break-words leading-tight">
                      {selectedMovie.title}
                    </h1>

                    {/* Status and Rating indicators */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {selectedMovie.status && (
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full border ${statusGlowClass(selectedMovie.status)}`} />
                          <span className="font-bold text-slate-300">{selectedMovie.status}</span>
                        </div>
                      )}
                      {selectedMovie.rating > 0 && (
                        <div className="flex items-center gap-1.5 text-amber-400 font-black">
                          <Star size={14} className="fill-amber-400" />
                          <span className="text-sm">{selectedMovie.rating} <span className="text-slate-500 text-xs font-normal">/ 10</span></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  <div className="shrink-0">
                    <Link
                      href={`/edit/${selectedMovie.id}`}
                      className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-200 hover:text-white text-xs font-extrabold tracking-wide transition-all shadow-md active:scale-95"
                    >
                      <Edit3 size={13} /> Edit Entry
                    </Link>
                  </div>
                </div>
              </div>

              {/* Showcase & Timeline Review Grid */}
              <div className="w-full max-w-6xl mx-auto px-6 sm:px-8 py-8 flex flex-col lg:flex-row gap-8">
                
                {/* 1. Review & Overview (Left Column) */}
                <div className="flex-1 space-y-6">
                  
                  {/* Overview Card */}
                  <div className="rounded-3xl border border-white/5 bg-white/[0.01] p-6 space-y-4">
                    <h3 className="text-base font-extrabold text-slate-200 flex items-center gap-2">
                      <Award size={15} className="text-cyan-400" /> Overview &amp; Notes
                    </h3>
                    {selectedMovie.review ? (
                      <p className="text-slate-300 leading-relaxed text-sm md:text-[15px] whitespace-pre-wrap">
                        {selectedMovie.review}
                      </p>
                    ) : (
                      <p className="text-slate-500 italic text-sm">
                        No personal review or notes added for this entry yet. Edit this item to add ratings, thoughts, and episodes details.
                      </p>
                    )}
                  </div>

                  {/* Progress Indicator for Series/Anime */}
                  {selectedMovie.episodesTotal && selectedMovie.episodesTotal > 0 && (
                    <div className="rounded-3xl border border-white/5 bg-white/[0.01] p-6 space-y-4">
                      <h3 className="text-sm font-extrabold text-slate-300 flex items-center gap-2">
                        <Clock3 size={14} className="text-indigo-400" /> Watching Progress
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                          <span>Episodes Completed</span>
                          <span className="text-slate-200">
                            {selectedMovie.episodesWatched || 0} / {selectedMovie.episodesTotal}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 border border-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, ((selectedMovie.episodesWatched || 0) / selectedMovie.episodesTotal) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Timeline Map (Right Column) */}
                <div className="w-full lg:w-[420px] shrink-0 space-y-6">
                  
                  {/* Timeline Title Card */}
                  <div className="rounded-3xl border border-white/5 bg-slate-950/40 p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-200">Timeline Map</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{currentSagaItems.length} sequential entries</p>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 text-[10px] font-black uppercase tracking-wider">
                        Timeline
                      </div>
                    </div>

                    {/* Timeline items list */}
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {currentSagaItems.map((media, index) => {
                        const isFeatured = selectedMovie.id === media.id;
                        const watchedTime = getWatchedRuntimeMinutes(media);
                        const isCompleted = media.status === 'Completed';
                        const isWatching = media.status === 'Watching';

                        return (
                          <button
                            key={media.id || index}
                            onClick={() => setSelectedMovie(media)}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-300 ${
                              isFeatured
                                ? 'bg-cyan-500/5 border-cyan-500/30 shadow-sm'
                                : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03] hover:border-white/10'
                            }`}
                          >
                            {/* Sequential index badge */}
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                              isFeatured 
                                ? 'bg-cyan-500 text-slate-950' 
                                : 'bg-slate-900 border border-white/5 text-slate-400'
                            }`}>
                              {index + 1}
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold leading-tight truncate ${isFeatured ? 'text-cyan-400' : 'text-slate-200'}`}>
                                {media.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] font-semibold text-slate-400">
                                {getYear(media.releaseDate) && <span>{getYear(media.releaseDate)}</span>}
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                <span>{media.type}</span>
                                {watchedTime > 0 && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                                    <span className="text-cyan-400">{formatRuntime(watchedTime)} watched</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Completed Status Checkmark icon */}
                            <div className="shrink-0">
                              {isCompleted ? (
                                <CheckCircle size={14} className="text-emerald-400" />
                              ) : isWatching ? (
                                <Eye size={14} className="text-blue-400" />
                              ) : (
                                <PlusCircle size={14} className="text-amber-500/70" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
