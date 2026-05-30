'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Film, Clock, Search, ChevronRight } from 'lucide-react';
import { useMedia } from '@/context/MediaContext';
import { MediaEntry, formatRuntime } from '@/lib/db';
import { PageLoader } from '@/components/ui/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

function getYear(dateString?: string) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date.getFullYear().toString();
}

function statusTextColor(status?: string) {
  if (status === 'Completed') return 'text-emerald-400';
  if (status === 'Watching') return 'text-blue-400';
  return 'text-amber-400';
}

function statusDotColor(status?: string) {
  if (status === 'Completed') return 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
  if (status === 'Watching') return 'bg-blue-500 shadow-[0_0_8px_#3b82f6]';
  return 'bg-amber-500 shadow-[0_0_8px_#f59e0b]';
}

export default function SagasPage() {
  const { entries, franchises, isLoading } = useMedia();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedSaga, setSelectedSaga] = useState<string | null>(null);
  const queryParam = searchParams.get('q') || '';

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
    const query = queryParam.trim().toLowerCase();
    if (!query) return sagaNames;
    return sagaNames.filter((name) => {
      const items = groupedSagas[name] || [];
      const haystack = [
        name,
        ...items.map((item) => `${item.title} ${item.type} ${getYear(item.releaseDate)}`),
      ].join(' ').toLowerCase();
      return query.split(/\s+/).every((token) => haystack.includes(token));
    });
  }, [groupedSagas, sagaNames, queryParam]);

  const currentSagaItems = selectedSaga ? groupedSagas[selectedSaga] || [] : [];
  const sagaRawRuntime = currentSagaItems.reduce((total, item) => total + (item.runtime || 0), 0);

  const handleSelectSaga = (saga: string) => setSelectedSaga(saga);
  const handleCloseSaga = () => setSelectedSaga(null);

  if (isLoading) return <PageLoader text="Loading your Sagas..." />;

  return (
    <div className="absolute inset-0 overflow-y-auto bg-background text-foreground font-sans select-none hide-scrollbar pb-32 transition-colors duration-500">
      {/* Premium Backing */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-100 z-0" />
      
      {/* Ambient glowing orbs */}
      <div className="fixed top-0 right-1/4 w-[50%] h-[40%] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-1/4 left-0 w-[40%] h-[30%] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="mx-auto w-full max-w-[2400px] px-4 sm:px-8 lg:px-12 py-4 sm:py-6 relative z-10">
        
        <AnimatePresence mode="wait">
          {!selectedSaga ? (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0, filter: 'blur(10px)', y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-8"
            >


              {filteredSagaNames.length === 0 && queryParam ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/40 rounded-[32px] bg-card/10 backdrop-blur-md">
                  <Search size={40} className="text-muted-foreground/30 mb-6" />
                  <p className="text-muted-foreground text-sm font-semibold">No matches found for &quot;{queryParam}&quot;</p>
                  <button onClick={() => router.replace('/sagas')} className="mt-4 text-primary text-xs font-bold uppercase tracking-widest hover:underline cursor-pointer">
                    Clear Filter
                  </button>
                </div>
              ) : sagaNames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border/40 rounded-[32px] bg-card/10 backdrop-blur-md">
                  <Film size={48} className="text-muted-foreground/30 mb-6" />
                  <p className="text-foreground text-lg font-bold">No franchises configured yet</p>
                  <p className="text-muted-foreground/60 text-sm mt-3 max-w-sm leading-relaxed">
                    Tag a &quot;Saga / Franchise&quot; name when creating or editing your media items to build customized chronological timelines here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
                  {filteredSagaNames.map((saga, i) => {
                    const items = groupedSagas[saga];
                    const totalTime = items.reduce((t, m) => t + (m.runtime || 0), 0);
                    const latestYear = Math.max(0, ...items.map(m => Number(getYear(m.releaseDate) || 0)));
                    
                    return (
                      <motion.button
                        key={saga}
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: Math.min(i, 15) * 0.04, duration: 0.4, type: 'spring', stiffness: 100 }}
                        onClick={() => handleSelectSaga(saga)}
                        className="group relative flex flex-col text-left overflow-hidden rounded-[32px] border border-border/50 bg-card/40 dark:bg-[#0c0c0d]/60 backdrop-blur-2xl hover:border-primary/40 transition-all duration-500 hover:shadow-[0_8px_32px_-12px_rgba(var(--primary),0.2)] active:scale-[0.98]"
                      >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none z-20 overflow-hidden transition-opacity duration-500">
                          <div className="absolute -inset-x-32 -inset-y-16 bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-12 -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s] ease-out" />
                        </div>

                        {/* Cinematic Image Cover */}
                        <div className="relative w-full aspect-[21/9] sm:aspect-[16/10] overflow-hidden bg-muted/20">
                          {items[0]?.coverImage ? (
                            <img
                              src={items[0].coverImage}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-[10px] font-bold tracking-widest">NO COVER</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent z-10" />
                          
                          {/* Item count badge */}
                          <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-lg">
                            <Film size={10} className="text-white/80" />
                            <span className="text-[10px] font-mono tracking-widest text-white/90 font-bold">{items.length}</span>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="relative z-20 p-6 pt-2 flex-1 flex flex-col justify-end">
                          <h3 className="font-display font-bold text-xl sm:text-2xl text-foreground group-hover:text-primary transition-colors leading-tight mb-3 line-clamp-2">
                            {saga}
                          </h3>
                          
                          <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-auto">
                            <span className="text-[10px] font-mono tracking-widest text-muted-foreground/80 uppercase">
                              {latestYear > 0 ? `${items[0] && getYear(items[0].releaseDate) ? getYear(items[0].releaseDate) : ''} – ${latestYear}` : 'TIMELINE'}
                            </span>
                            {totalTime > 0 && (
                              <span className="text-[10px] font-mono tracking-widest text-muted-foreground/80 uppercase">
                                {formatRuntime(totalTime)}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="timeline-view"
              initial={{ opacity: 0, filter: 'blur(10px)', y: 30 }}
              animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
              exit={{ opacity: 0, filter: 'blur(10px)', y: 30 }}
              transition={{ duration: 0.5, type: 'spring', bounce: 0.2 }}
              className="w-full max-w-[900px] mx-auto space-y-12"
            >
              {/* Timeline Header */}
              <div className="space-y-8">
                <button
                  onClick={handleCloseSaga}
                  className="group flex items-center gap-3 px-5 py-2.5 rounded-full border border-border/40 bg-card/40 dark:bg-[#0c0c0d]/60 backdrop-blur-xl hover:bg-card/80 text-foreground transition-all cursor-pointer active:scale-95 shadow-sm w-fit"
                >
                  <ArrowLeft size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground group-hover:text-foreground uppercase font-bold transition-colors">
                    Back to Overview
                  </span>
                </button>

                <div className="space-y-6">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-foreground leading-[1.1]">
                    {selectedSaga}
                  </h1>

                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 rounded-full border border-border/50 bg-card/40 dark:bg-[#0c0c0d]/60 backdrop-blur-xl px-4 py-2 shadow-sm">
                      <Film size={14} className="text-primary" />
                      <span className="text-[11px] font-mono tracking-[0.15em] text-foreground font-bold uppercase">{currentSagaItems.length} Entries</span>
                    </div>
                    {sagaRawRuntime > 0 && (
                      <div className="flex items-center gap-2 rounded-full border border-border/50 bg-card/40 dark:bg-[#0c0c0d]/60 backdrop-blur-xl px-4 py-2 shadow-sm">
                        <Clock className="text-muted-foreground w-3.5 h-3.5" />
                        <span className="text-[11px] font-mono tracking-[0.15em] text-foreground font-bold uppercase">{formatRuntime(sagaRawRuntime)} Total</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* High-End Timeline */}
              <div className="relative pl-6 sm:pl-12 py-4 space-y-12 before:absolute before:left-[35px] sm:before:left-[59px] before:top-4 before:bottom-4 before:w-[2px] before:bg-gradient-to-b before:from-primary/50 before:via-border/30 before:to-transparent before:pointer-events-none">
                
                {currentSagaItems.map((media, index) => {
                  const year = getYear(media.releaseDate);

                  return (
                    <motion.div
                      key={media.id || index}
                      initial={{ opacity: 0, x: -20, filter: 'blur(5px)' }}
                      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                      transition={{ delay: Math.min(index, 10) * 0.08, duration: 0.5, type: 'spring' }}
                      className="relative flex flex-col sm:flex-row gap-6 sm:gap-10 group"
                    >
                      {/* Timeline Node */}
                      <div className="absolute -left-[30px] sm:-left-[31px] top-6 z-10 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-background border-[3px] border-primary shadow-[0_0_15px_rgba(var(--primary),0.4)] group-hover:scale-125 group-hover:shadow-[0_0_20px_rgba(var(--primary),0.6)] transition-all duration-300" />
                      </div>

                      {/* Timeline Number (Mobile moves to card top, desktop left) */}
                      <div className="hidden sm:flex flex-col items-end w-16 pt-5 shrink-0">
                        <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground/60 font-bold">PART</span>
                        <span className="text-3xl font-display font-black text-foreground/20 group-hover:text-primary/40 transition-colors">
                          {(index + 1).toString().padStart(2, '0')}
                        </span>
                      </div>

                      {/* Content Card */}
                      <div className="flex-1 flex flex-col sm:flex-row gap-5 p-5 rounded-[28px] border border-border/40 bg-card/40 dark:bg-[#0c0c0d]/60 backdrop-blur-2xl hover:border-primary/30 hover:bg-card/60 transition-all duration-500 hover:shadow-[0_8px_32px_-12px_rgba(var(--primary),0.15)] relative overflow-hidden">
                        
                        {/* Shimmer sweep */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-10">
                          <div className="absolute -inset-x-32 -inset-y-16 bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-12 -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s] ease-out" />
                        </div>

                        {/* Card Cover */}
                        <div className="relative w-full sm:w-[120px] aspect-[16/9] sm:aspect-[2/3] shrink-0 rounded-[18px] overflow-hidden bg-muted/20 border border-border/40 shadow-inner">
                          {media.coverImage ? (
                            <img src={media.coverImage} loading="lazy" decoding="async" alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-muted/10 text-muted-foreground/30">
                              <Film size={24} />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 flex flex-col justify-center py-2 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <div className="flex sm:hidden items-center gap-2 mb-2">
                                <span className="text-[9px] font-mono tracking-[0.2em] text-primary font-bold uppercase">PART {(index + 1).toString().padStart(2, '0')}</span>
                              </div>
                              <h3 className="text-lg sm:text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors leading-tight line-clamp-2">
                                {media.title}
                              </h3>
                            </div>
                            <Link
                              href={`/edit/${media.id}`}
                              className="shrink-0 p-2 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors z-20"
                            >
                              <ChevronRight size={16} />
                            </Link>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-auto relative z-20">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-border/40 bg-background/50 text-[10px] font-mono tracking-widest text-primary font-bold uppercase backdrop-blur-md">
                              {media.type}
                            </span>
                            {year && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-border/40 bg-background/50 text-[10px] font-mono tracking-widest text-foreground/70 uppercase backdrop-blur-md">
                                {year}
                              </span>
                            )}
                            {media.runtime && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-border/40 bg-background/50 text-[10px] font-mono tracking-widest text-foreground/70 uppercase backdrop-blur-md">
                                {formatRuntime(media.runtime)}
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/40 bg-background/50 text-[10px] font-mono tracking-widest uppercase backdrop-blur-md font-bold ${statusTextColor(media.status)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusDotColor(media.status)}`} />
                              {media.status || 'Completed'}
                            </span>
                            {media.rating > 0 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-[10px] font-mono tracking-widest text-amber-500 font-bold uppercase backdrop-blur-md">
                                <Star size={10} className="fill-amber-500 text-amber-500" />
                                {media.rating}
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
