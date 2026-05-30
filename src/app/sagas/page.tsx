'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Film, Clock, Search, Video, Play, Calendar } from 'lucide-react';
import { useMedia } from '@/context/MediaContext';
import { MediaEntry, formatRuntime, isEpisodic, EpisodeInfo } from '@/lib/db';
import { PageLoader } from '@/components/ui/Loader';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';

function getYear(dateString?: string) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date.getFullYear().toString();
}

function statusDotColor(status?: string) {
  if (status === 'Completed') return 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
  if (status === 'Watching') return 'bg-blue-500 shadow-[0_0_8px_#3b82f6]';
  return 'bg-amber-500 shadow-[0_0_8px_#f59e0b]';
}

interface TimelineNode {
  id: string;
  type: 'movie' | 'season' | 'show';
  media: MediaEntry;
  seasonNumber?: number;
  episodesCount?: number;
  sortDate: number;
  displayYear: string;
}

export default function SagasPage() {
  const { entries, franchises, isLoading } = useMedia();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedSaga, setSelectedSaga] = useState<string | null>(null);
  const queryParam = searchParams.get('q') || '';

  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

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

  const timelineNodes = useMemo(() => {
    if (!selectedSaga) return [];
    const items = groupedSagas[selectedSaga] || [];
    const nodes: TimelineNode[] = [];

    items.forEach(media => {
      if (isEpisodic(media) && media.episodes && media.episodes.length > 0) {
        const seasons = new Map<number, EpisodeInfo[]>();
        media.episodes.forEach(ep => {
          const s = ep.season || 1;
          if (!seasons.has(s)) seasons.set(s, []);
          seasons.get(s)!.push(ep);
        });
        
        seasons.forEach((eps, s) => {
          const sortedEps = [...eps].sort((a,b) => (a.number || 0) - (b.number || 0));
          const airDateStr = sortedEps.find(e => e.airDate)?.airDate;
          const sortDate = airDateStr ? new Date(airDateStr).getTime() : (media.releaseDate ? new Date(media.releaseDate).getTime() : 0);
          const displayYear = airDateStr ? getYear(airDateStr) || '' : (getYear(media.releaseDate) || '');
          
          nodes.push({
            id: `${media.id}-s${s}`,
            type: 'season',
            media,
            seasonNumber: s,
            episodesCount: eps.length,
            sortDate: isNaN(sortDate) ? 0 : sortDate,
            displayYear: displayYear || 'N/A'
          });
        });
      } else {
         const sortDate = media.releaseDate ? new Date(media.releaseDate).getTime() : 0;
         nodes.push({
           id: `${media.id}`,
           type: media.type === 'Movie' ? 'movie' : 'show',
           media,
           sortDate: isNaN(sortDate) ? 0 : sortDate,
           displayYear: getYear(media.releaseDate) || 'N/A'
         })
      }
    });

    return nodes.sort((a, b) => a.sortDate - b.sortDate);
  }, [selectedSaga, groupedSagas]);


  const currentSagaItems = selectedSaga ? groupedSagas[selectedSaga] || [] : [];
  const sagaRawRuntime = currentSagaItems.reduce((total, item) => total + (item.runtime || 0), 0);

  if (isLoading) return <PageLoader text="Loading Universes..." />;

  return (
    <div className="absolute inset-0 overflow-y-auto bg-background text-foreground font-sans select-none hide-scrollbar transition-colors duration-500">
      {/* Immersive Background */}
      <motion.div 
        style={{ y: backgroundY }}
        className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20"
      >
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-purple-500/20 blur-[100px]" />
      </motion.div>
      
      <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none z-0 mix-blend-overlay"></div>

      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-8 lg:px-12 py-8 relative z-10 min-h-screen pb-32">
        
        <AnimatePresence mode="wait">
          {!selectedSaga ? (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(8px)', transition: { duration: 0.3 } }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-12 pt-8"
            >


              {filteredSagaNames.length === 0 && queryParam ? (
                <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-border/40 rounded-[32px] bg-card/5 backdrop-blur-sm">
                  <Search size={48} className="text-muted-foreground/30 mb-6" />
                  <p className="text-muted-foreground text-lg font-medium">No universes found matching &quot;{queryParam}&quot;</p>
                  <button onClick={() => router.replace('/sagas')} className="mt-6 px-6 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors">
                    Clear Filter
                  </button>
                </div>
              ) : sagaNames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-border/40 rounded-[32px] bg-card/5 backdrop-blur-sm">
                  <Film size={64} className="text-muted-foreground/20 mb-8" />
                  <p className="text-foreground text-2xl font-bold">No Sagas Configured</p>
                  <p className="text-muted-foreground mt-4 max-w-md leading-relaxed text-lg">
                    Tag a &quot;Franchise&quot; or &quot;Saga&quot; name when adding media to unlock custom chronological timelines.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                  {filteredSagaNames.map((saga, i) => {
                    const items = groupedSagas[saga];
                    const totalTime = items.reduce((t, m) => t + (m.runtime || 0), 0);
                    const startYear = getYear(items[0]?.releaseDate) || '';
                    const latestYear = Math.max(0, ...items.map(m => Number(getYear(m.releaseDate) || 0)));
                    const displayYears = startYear ? (startYear === latestYear.toString() ? startYear : `${startYear} - ${latestYear}`) : 'Timeline';
                    
                    return (
                      <motion.button
                        key={saga}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i, 12) * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => setSelectedSaga(saga)}
                        className="group relative flex flex-col text-left overflow-hidden rounded-[16px] bg-card/20 dark:bg-black/20 border border-border/30 backdrop-blur-xl hover:border-primary/50 transition-all duration-300 hover:shadow-[0_10px_20px_-10px_rgba(var(--primary),0.3)] hover:-translate-y-1 aspect-[4/3]"
                      >
                        {/* Cinematic Cover Background */}
                        <div className="absolute inset-0 z-0">
                          {items[0]?.coverImage && (
                            <>
                              <img
                                src={items[0].coverImage}
                                alt=""
                                className="w-full h-full object-cover opacity-30 group-hover:opacity-50 group-hover:scale-110 group-hover:rotate-1 transition-all duration-1000 ease-out"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
                            </>
                          )}
                        </div>

                        {/* Content */}
                        <div className="relative z-10 p-3 sm:p-4 flex-1 flex flex-col h-full">
                          
                          <div className="flex justify-between items-start">
                            <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2 shadow-lg w-fit">
                              <Film size={12} className="text-primary" />
                              <span className="text-[10px] font-mono tracking-widest text-white font-bold">{items.length}</span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-background/20 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                               <ArrowLeft size={18} className="text-white rotate-180" />
                            </div>
                          </div>

                          <div className="mt-auto">
                            <h3 className="font-display font-black text-lg sm:text-xl text-white drop-shadow-md mb-2 leading-tight line-clamp-3 group-hover:text-primary transition-colors duration-300">
                              {saga}
                            </h3>
                            
                            <div className="flex flex-wrap items-center gap-4 text-white/70">
                              <div className="flex items-center gap-1.5">
                                <Calendar size={14} />
                                <span className="text-[11px] font-mono tracking-widest uppercase">{displayYears}</span>
                              </div>
                              {totalTime > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <Clock size={14} />
                                  <span className="text-[10px] font-mono tracking-widest uppercase">{formatRuntime(totalTime)}</span>
                                </div>
                              )}
                            </div>
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              className="w-full max-w-[1200px] mx-auto pt-4"
            >
              {/* Timeline Header */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="sticky top-0 z-40 pb-8 pt-4 bg-background/80 backdrop-blur-2xl border-b border-border/40 mb-16 -mx-4 px-4 sm:mx-0 sm:px-0"
              >
                <div className="flex flex-col gap-6">
                  <button
                    onClick={() => setSelectedSaga(null)}
                    className="group flex items-center gap-3 px-5 py-2.5 rounded-full border border-border/40 bg-card/40 hover:bg-card/80 text-foreground transition-all cursor-pointer shadow-sm w-fit"
                  >
                    <ArrowLeft size={16} className="text-muted-foreground group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-mono tracking-widest uppercase font-bold">
                      Back to Collections
                    </span>
                  </button>

                  <div>
                    <h1 className="text-5xl sm:text-7xl font-display font-black tracking-tight text-foreground leading-none mb-6">
                      {selectedSaga}
                    </h1>

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 rounded-full border border-border/40 bg-card/30 px-5 py-2.5 shadow-sm backdrop-blur-md">
                        <Film size={16} className="text-primary" />
                        <span className="text-xs font-mono tracking-widest font-bold uppercase">{currentSagaItems.length} Titles</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-border/40 bg-card/30 px-5 py-2.5 shadow-sm backdrop-blur-md">
                        <Video size={16} className="text-blue-500" />
                        <span className="text-xs font-mono tracking-widest font-bold uppercase">{timelineNodes.length} Entries</span>
                      </div>
                      {sagaRawRuntime > 0 && (
                        <div className="flex items-center gap-2 rounded-full border border-border/40 bg-card/30 px-5 py-2.5 shadow-sm backdrop-blur-md">
                          <Clock className="text-purple-500 w-4 h-4" />
                          <span className="text-xs font-mono tracking-widest font-bold uppercase">{formatRuntime(sagaRawRuntime)} Total</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* The Timeline */}
              <div className="relative">
                {/* Central Line for Desktop, Left Line for Mobile */}
                <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary/50 via-border/30 to-transparent -translate-x-1/2" />
                
                <div className="space-y-8 md:space-y-16 py-8">
                  {timelineNodes.map((node, index) => {
                    const isEven = index % 2 === 0;
                    
                    return (
                      <motion.div
                        key={node.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className={`relative flex flex-col md:flex-row items-center gap-6 md:gap-12 group ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                      >
                        {/* Timeline Node Point */}
                        <div className="absolute left-[28px] md:left-1/2 top-8 md:top-1/2 z-10 flex items-center justify-center -translate-x-1/2 md:-translate-y-1/2">
                          <div className="w-5 h-5 rounded-full bg-background border-[4px] border-primary shadow-[0_0_20px_rgba(var(--primary),0.5)] group-hover:scale-150 group-hover:border-white transition-all duration-500" />
                          <div className="absolute w-12 h-12 rounded-full bg-primary/20 animate-ping opacity-0 group-hover:opacity-100" />
                        </div>

                        {/* Date / Metadata Side */}
                        <div className={`hidden md:flex flex-col w-1/2 ${isEven ? 'items-end text-right' : 'items-start text-left'} px-12`}>
                          <span className="text-3xl font-display font-black text-foreground/10 group-hover:text-primary/20 transition-colors duration-500 tracking-tighter">
                            {node.displayYear}
                          </span>
                          <div className="mt-2 text-sm font-mono tracking-widest text-muted-foreground uppercase font-semibold flex items-center gap-2">
                             Chronological Step {(index + 1).toString().padStart(2, '0')}
                          </div>
                        </div>

                        {/* Card Side */}
                        <div className="w-full md:w-1/2 pl-[70px] md:pl-0 px-4 md:px-12">
                          <Link href={`/edit/${node.media.id}`} className="block">
                            <div className="flex flex-col sm:flex-row gap-3 p-2 sm:p-3 rounded-[16px] border border-border/40 bg-card/40 backdrop-blur-xl hover:bg-card/60 hover:border-primary/40 transition-all duration-300 hover:shadow-[0_10px_20px_-10px_rgba(var(--primary),0.2)] hover:-translate-y-1 group/card">
                              
                              {/* Cover */}
                              <div className="relative w-16 sm:w-[80px] shrink-0 aspect-[2/3] rounded-[12px] overflow-hidden bg-muted/20 border border-border/20 shadow-sm">
                                {node.media.coverImage ? (
                                  <img src={node.media.coverImage} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-110" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-muted/10 text-muted-foreground/30">
                                    <Film size={20} />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
                                   <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg transform translate-y-4 group-hover/card:translate-y-0 transition-transform duration-500">
                                      <Play size={14} className="ml-0.5" />
                                   </div>
                                </div>
                              </div>

                              {/* Details */}
                              <div className="flex-1 flex flex-col justify-center py-2">
                                <div className="md:hidden text-xl font-display font-black text-foreground/10 mb-1">
                                  {node.displayYear}
                                </div>

                                <h3 className="text-sm sm:text-base font-display font-bold text-foreground group-hover/card:text-primary transition-colors leading-tight mb-1">
                                  {node.media.title}
                                </h3>
                                
                                {node.type === 'season' && (
                                  <div className="text-primary text-[10px] sm:text-xs font-bold tracking-wide mb-2">
                                    Season {node.seasonNumber} • {node.episodesCount} Episodes
                                  </div>
                                )}
                                {node.type === 'movie' && (
                                  <div className="text-muted-foreground text-[10px] sm:text-xs font-bold tracking-wide mb-2 flex items-center gap-1.5">
                                    <Film size={14} /> Movie Entry
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-2 mt-auto">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/40 bg-background/60 text-[10px] font-mono tracking-widest uppercase font-bold shadow-sm`}>
                                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusDotColor(node.media.status)}`} />
                                    {node.media.status || 'Completed'}
                                  </span>
                                  {node.media.rating > 0 && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-mono tracking-widest text-amber-500 font-bold uppercase shadow-sm">
                                      <Star size={10} className="fill-amber-500 text-amber-500" />
                                      {node.media.rating}
                                    </span>
                                  )}
                                </div>
                              </div>

                            </div>
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
