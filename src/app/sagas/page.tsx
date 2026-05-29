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
  ChevronRight, 
  ChevronLeft,
  Award, 
  Clock3,
  Edit3,
  BookOpen
} from 'lucide-react';
import { useMedia } from '@/context/MediaContext';
import { MediaEntry, formatRuntime, getWatchedRuntimeMinutes, isEpisodic } from '@/lib/db';
import { PageLoader } from '@/components/ui/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

function getYear(dateString?: string) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date.getFullYear().toString();
}

function statusTextColor(status?: string) {
  if (status === 'Completed') return 'text-emerald-500';
  if (status === 'Watching') return 'text-blue-500';
  return 'text-amber-500';
}

export default function SagasPage() {
  const { entries, franchises, isLoading } = useMedia();
  const searchParams = useSearchParams();

  const [selectedSaga, setSelectedSaga] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<MediaEntry | null>(null);
  const [mobileView, setMobileView] = useState<'timeline' | 'details'>('timeline');
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

  // Navigation for active saga
  const currentIndex = selectedMovie ? currentSagaItems.findIndex((item) => item.id === selectedMovie.id) : -1;
  const prevMovie = currentIndex > 0 ? currentSagaItems[currentIndex - 1] : null;
  const nextMovie = currentIndex >= 0 && currentIndex < currentSagaItems.length - 1 ? currentSagaItems[currentIndex + 1] : null;

  const handleSelectSaga = (saga: string) => {
    setSelectedSaga(saga);
    setSelectedMovie(groupedSagas[saga][0] || null);
    setMobileView('timeline');
  };

  const handleCloseSaga = () => {
    setSelectedSaga(null);
    setSelectedMovie(null);
  };

  if (isLoading) return <PageLoader text="Loading your Sagas..." />;

  return (
    <div className="absolute inset-0 bg-[#08090c] text-slate-200 overflow-hidden flex flex-col font-sans selection:bg-white/10">
      
      {/* Subtle single background glow to keep it clean */}
      <div className="absolute top-0 right-0 w-[40%] h-[30%] bg-white/[0.01] rounded-full blur-[120px] pointer-events-none" />

      {/* ─── Main Content Wrapper ─── */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* ─── LEFT PANEL: Timeline Sidebar (Desktop only) ─── */}
        <AnimatePresence>
          {selectedSaga && (
            <motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="hidden md:flex md:relative md:max-w-[260px] lg:max-w-[300px] flex-col bg-[#0b0c10] border-r border-white/5 shrink-0"
            >
              {/* Header */}
              <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={handleCloseSaga}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.03] border border-white/5 text-slate-450 hover:bg-white/[0.08] hover:text-white transition-all shrink-0 active:scale-95"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <div className="min-w-0">
                    <h2 className="font-bold text-[14px] text-slate-100 truncate leading-tight">{selectedSaga}</h2>
                    <p className="text-[9px] text-slate-500 font-bold mt-0.5 tracking-wider uppercase">{currentSagaItems.length} Entries</p>
                  </div>
                </div>
              </div>

              {/* Chronological List */}
              <div className="flex-1 overflow-y-auto px-3 py-5 space-y-2 relative custom-scrollbar">
                {/* Minimal Vertical Line */}
                <div className="absolute left-[26px] top-6 bottom-6 w-[1px] bg-white/5 pointer-events-none" />

                {currentSagaItems.map((media, index) => {
                  const isActive = selectedMovie?.id === media.id;
                  
                  return (
                    <div key={media.id || index} className="flex gap-3 relative group">
                      
                      {/* Timeline Dot */}
                      <div className="relative flex flex-col items-center shrink-0 mt-3 z-10 w-7">
                        <button
                          onClick={() => setSelectedMovie(media)}
                          className={`w-[6px] h-[6px] rounded-full transition-all duration-300 ${
                            isActive
                              ? 'bg-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                              : 'bg-slate-800 hover:bg-slate-500'
                          }`}
                        />
                        <span className="text-[8px] font-bold text-slate-655 mt-1.5">{(index + 1).toString().padStart(2, '0')}</span>
                      </div>

                      {/* Card Content */}
                      <button
                        onClick={() => setSelectedMovie(media)}
                        className={`flex-1 flex items-center gap-3 rounded-xl p-2 text-left border transition-all duration-200 relative overflow-hidden ${
                          isActive
                            ? 'bg-white/[0.03] border-white/10 pl-2.5'
                            : 'bg-transparent border-transparent hover:bg-white/[0.01]'
                        }`}
                      >
                        <div className="relative w-8 h-11 shrink-0 rounded-md overflow-hidden bg-slate-900 border border-white/5">
                          {media.coverImage ? (
                            <img src={media.coverImage} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-slate-800" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                            {media.title}
                          </p>
                          <p className="text-[9px] text-slate-500 font-semibold mt-0.5">
                            {getYear(media.releaseDate) || 'TBA'}
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Stats Footer */}
              {sagaRawRuntime > 0 && (
                <div className="shrink-0 p-4 border-t border-white/5 bg-[#0b0c10]">
                  <div className="grid grid-cols-2 gap-2 text-center text-[10px] text-slate-500">
                    <div>
                      <p className="font-medium">Total Time</p>
                      <p className="font-bold text-slate-300 mt-0.5">{formatRuntime(sagaRawRuntime)}</p>
                    </div>
                    <div className="border-l border-white/5">
                      <p className="font-medium">Watched</p>
                      <p className="font-bold text-slate-300 mt-0.5">
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
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative z-10 custom-scrollbar">
          
          {/* 1. Sagas Grid View (Overview) */}
          {!selectedSaga && (
            <div className="w-full max-w-[1400px] mx-auto p-6 sm:p-10 lg:p-16 space-y-12">
              
              {/* Minimal Typography Header */}
              <div className="space-y-4 text-left border-b border-white/5 pb-8">
                <div className="inline-flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  <Layers3 size={11} /> Library universes
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Franchises &amp; Sagas
                </h1>
                <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                  A unified view of chronological cinematic timelines, grouped automatically by franchises.
                </p>
              </div>

              {/* Search Bar */}
              <div className="max-w-md w-full relative group border-b border-white/5 pb-1">
                <Search size={14} className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-slate-450 transition-colors" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter timelines..."
                  className="w-full pl-7 pr-4 py-2 bg-transparent text-slate-200 placeholder-slate-600 text-sm outline-none transition-all duration-300"
                />
              </div>

              {/* Minimal Grid display */}
              {sagaNames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
                  <p className="text-slate-450 text-xs font-semibold">No Franchises Configured</p>
                  <p className="text-slate-600 text-[11px] mt-1 max-w-xs">
                    Tag a &quot;Saga / Franchise&quot; name when editing your movies or series to populate this library view.
                  </p>
                </div>
              ) : filteredSagaNames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-slate-550 text-xs font-medium">No matches found for &quot;{searchTerm}&quot;</p>
                  <button onClick={() => setSearchTerm('')} className="mt-2 text-slate-350 text-[11px] font-semibold hover:underline">
                    Clear Filter
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredSagaNames.map((saga, i) => {
                    const items = groupedSagas[saga];
                    const totalTime = items.reduce((t, m) => t + (m.runtime || 0), 0);
                    const latestYear = Math.max(0, ...items.map(m => Number(getYear(m.releaseDate) || 0)));

                    return (
                      <motion.button
                        key={saga}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.3, ease: "easeOut" }}
                        onClick={() => handleSelectSaga(saga)}
                        className="group flex flex-col justify-between p-5 rounded-2xl border border-white/5 bg-slate-900/10 hover:bg-slate-900/30 hover:border-white/10 transition-all duration-300 relative overflow-hidden text-left"
                      >
                        <div className="space-y-4">
                          {/* Single elegant poster thumbnail */}
                          <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-slate-950/80 border border-white/5 relative shadow-inner">
                            {items[0]?.coverImage ? (
                              <img 
                                src={items[0].coverImage} 
                                alt="" 
                                className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-75 transition-all duration-500" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-800 text-[10px] font-bold">NO POSTER</div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <h3 className="font-bold text-sm text-slate-200 group-hover:text-white transition-colors truncate">
                              {saga}
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              {items.length} {items.length === 1 ? 'entry' : 'entries'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-600 border-t border-white/5 pt-3 mt-4">
                          <span>{latestYear > 0 ? `${items[0] ? getYear(items[0].releaseDate) : ''} – ${latestYear}` : 'Timeline'}</span>
                          {totalTime > 0 && <span>{formatRuntime(totalTime)}</span>}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. Mobile Timeline Screen View */}
          {selectedSaga && mobileView === 'timeline' && (
            <div className="md:hidden flex-1 flex flex-col min-h-0 bg-[#08090c] overflow-y-auto animate-in fade-in duration-200 pb-8">
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 z-10 bg-[#08090c]/90 backdrop-blur-md">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={handleCloseSaga}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-400 transition-all shrink-0 active:scale-95"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <div className="min-w-0">
                    <h2 className="font-bold text-[14px] text-slate-200 truncate leading-tight">{selectedSaga}</h2>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">{currentSagaItems.length} Chronological Entries</p>
                  </div>
                </div>
              </div>

              {/* Chronological List */}
              <div className="flex-1 px-5 py-6 space-y-3 relative">
                {/* Visual Connector Line */}
                <div className="absolute left-[33px] top-6 bottom-6 w-[1px] bg-white/5 pointer-events-none" />

                {currentSagaItems.map((media, index) => {
                  const isActive = selectedMovie?.id === media.id;
                  const year = getYear(media.releaseDate);
                  
                  return (
                    <div key={media.id || index} className="flex gap-4 relative group">
                      
                      {/* Timeline Node */}
                      <div className="relative flex flex-col items-center shrink-0 mt-3.5 z-10 w-7">
                        <button
                          onClick={() => {
                            setSelectedMovie(media);
                            setMobileView('details');
                          }}
                          className={`w-[6px] h-[6px] rounded-full transition-all duration-300 ${
                            isActive ? 'bg-white scale-125' : 'bg-slate-800'
                          }`}
                        />
                        <span className="text-[8px] font-bold text-slate-600 mt-1.5">{(index + 1).toString().padStart(2, '0')}</span>
                      </div>

                      {/* Card Content */}
                      <button
                        onClick={() => {
                          setSelectedMovie(media);
                          setMobileView('details');
                        }}
                        className="flex-1 flex gap-3.5 rounded-xl p-2 text-left border bg-white/[0.01] border-white/5 active:scale-[0.98] transition-all relative overflow-hidden"
                      >
                        <div className="relative w-10 h-14 shrink-0 rounded-md overflow-hidden bg-slate-900 border border-white/5">
                          {media.coverImage ? (
                            <img src={media.coverImage} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-slate-800" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <p className="text-xs font-bold text-slate-350 truncate">
                            {media.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-semibold">
                            {year && <span>{year}</span>}
                            <span className="w-0.5 h-0.5 rounded-full bg-slate-700" />
                            <span className={statusTextColor(media.status)}>{media.status || 'Completed'}</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Stats Footer */}
              {sagaRawRuntime > 0 && (
                <div className="shrink-0 p-4 border-t border-white/5 bg-[#08090c] mt-auto mx-5">
                  <div className="grid grid-cols-2 gap-2 text-center text-[10px] text-slate-500">
                    <div>
                      <p className="font-medium">Total Time</p>
                      <p className="font-bold text-slate-350 mt-0.5">{formatRuntime(sagaRawRuntime)}</p>
                    </div>
                    <div className="border-l border-white/5">
                      <p className="font-medium">Watched</p>
                      <p className="font-bold text-slate-350 mt-0.5">
                        {sagaTotalRuntime > 0 ? formatRuntime(sagaTotalRuntime) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Saga Detail Interactive Screen */}
          {selectedSaga && selectedMovie && (
            <div className={`${mobileView === 'details' ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-h-0 relative animate-in fade-in duration-200 overflow-y-auto pb-12`}>
              
              {/* Back button for mobile at top */}
              <div className="md:hidden flex items-center gap-3 p-4 bg-[#08090c] border-b border-white/5 sticky top-0 z-25">
                <button
                  onClick={() => setMobileView('timeline')}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-400 transition-all duration-200 active:scale-95"
                >
                  <ArrowLeft size={14} />
                </button>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none">Back to list</h3>
                  <p className="text-xs font-bold text-slate-200 truncate mt-0.5">{selectedSaga}</p>
                </div>
              </div>

              {/* Minimal Spotlight Showcase Info Header */}
              <div className="w-full max-w-5xl mx-auto px-6 sm:px-10 pt-8 sm:pt-12 pb-6 flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-end border-b border-white/5">
                
                {/* Clean Poster frame */}
                <div className="shrink-0 relative hidden md:block">
                  <div className="w-28 md:w-36 aspect-[2/3] rounded-lg overflow-hidden border border-white/5 bg-slate-900">
                    {selectedMovie.coverImage ? (
                      <img src={selectedMovie.coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-850" />
                    )}
                  </div>
                </div>

                {/* Main Text Metadata */}
                <div className="flex-1 text-left space-y-3.5">
                  <div className="hidden md:flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    <button onClick={handleCloseSaga} className="hover:text-slate-350 transition-colors">Sagas</button>
                    <ChevronRight size={10} className="text-slate-700" />
                    <span>{selectedSaga}</span>
                    <ChevronRight size={10} className="text-slate-700" />
                    <span className="text-slate-350">{selectedMovie.title}</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                    {selectedMovie.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-405 font-medium">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{selectedMovie.type}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-800" />
                    {getYear(selectedMovie.releaseDate) && (
                      <>
                        <span>{getYear(selectedMovie.releaseDate)}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-800" />
                      </>
                    )}
                    {selectedMovie.runtime && (
                      <>
                        <span>{formatRuntime(selectedMovie.runtime)}{isEpisodic(selectedMovie) ? '/ep' : ''}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-800" />
                      </>
                    )}
                    <span className={statusTextColor(selectedMovie.status)}>{selectedMovie.status || 'Completed'}</span>
                    {selectedMovie.rating > 0 && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-800" />
                        <span className="flex items-center gap-1 text-amber-500">
                          <Star size={12} className="fill-amber-500 text-amber-500" /> {selectedMovie.rating}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Edit Button */}
                <div className="shrink-0 w-full md:w-auto">
                  <Link
                    href={`/edit/${selectedMovie.id}`}
                    className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 hover:text-white text-xs font-semibold tracking-wide transition-all active:scale-95 shadow-sm"
                  >
                    <Edit3 size={12} /> Edit entry
                  </Link>
                </div>
              </div>

              {/* Details Columns */}
              <div className="w-full max-w-5xl mx-auto px-6 sm:px-10 py-8 flex flex-col lg:flex-row gap-8">
                
                {/* 1. Review & Overview (Left Column) */}
                <div className="flex-1 space-y-6">
                  
                  {/* Overview Card */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <BookOpen size={12} /> Review &amp; notes
                    </h3>
                    {selectedMovie.review ? (
                      <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap font-medium">
                        {selectedMovie.review}
                      </p>
                    ) : (
                      <p className="text-slate-600 italic text-[11px]">
                        No review logged. Edit entry to add thoughts.
                      </p>
                    )}
                  </div>

                  {/* Progress Indicator for Series/Anime */}
                  {selectedMovie.episodesTotal && selectedMovie.episodesTotal > 0 && (
                    <div className="pt-4 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-550">
                        <span>Episode Progress</span>
                        <span className="text-slate-300">
                          {selectedMovie.episodesWatched || 0} / {selectedMovie.episodesTotal}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 border border-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-slate-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ((selectedMovie.episodesWatched || 0) / selectedMovie.episodesTotal) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Timeline Navigator (Right Column) */}
                <div className="w-full lg:w-[320px] shrink-0">
                  <div className="border border-white/5 bg-slate-950/20 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                      <span>Chronology</span>
                      <span>Entry {currentIndex + 1} of {currentSagaItems.length}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        disabled={!prevMovie}
                        onClick={() => setSelectedMovie(prevMovie)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.05] text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-25 disabled:pointer-events-none active:scale-95"
                      >
                        <ChevronLeft size={13} /> Prev
                      </button>
                      <button
                        disabled={!nextMovie}
                        onClick={() => setSelectedMovie(nextMovie)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.05] text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-25 disabled:pointer-events-none active:scale-95"
                      >
                        Next <ChevronRight size={13} />
                      </button>
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
