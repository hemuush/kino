"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useMedia } from '@/hooks/useMedia';
import { MediaDetailModal } from '@/components/MediaDetailModal';
import { MediaEntry } from '@/lib/db';
import { Film, Plus, Shuffle, ListFilter, Search, Star, Calendar, Clock, Tag, Orbit, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function SagasPage() {
  const { entries, franchises, updateEntry, deleteEntry } = useMedia();
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Search query for sagas (helps filter list if there are 1000+ sagas)
  const [sagaSearchQuery, setSagaSearchQuery] = useState('');

  // Track focused franchise ID
  const [activeFranchiseId, setActiveFranchiseId] = useState<string | number>('');
  // Track active entry inside the focused franchise
  const [activeEntryId, setActiveEntryId] = useState<string | number | undefined>('');

  // Filter franchises based on search query
  const filteredFranchises = useMemo(() => {
    if (!sagaSearchQuery.trim()) return franchises;
    return franchises.filter(f => 
      f.name.toLowerCase().includes(sagaSearchQuery.toLowerCase().trim())
    );
  }, [franchises, sagaSearchQuery]);

  // Set default active franchise on load or when list changes
  useEffect(() => {
    if (filteredFranchises.length > 0) {
      if (!activeFranchiseId || !filteredFranchises.some(f => f.id === activeFranchiseId)) {
        setActiveFranchiseId(filteredFranchises[0].id);
      }
    } else {
      setActiveFranchiseId('');
    }
  }, [filteredFranchises, activeFranchiseId]);

  // Map coordinates dynamically in a spiral layout on the constellation map
  const franchiseCoordinates = useMemo(() => {
    return filteredFranchises.map((fr, idx) => {
      // Spiral positioning formula
      const angle = idx * 0.95;
      const radius = 70 + idx * 22;
      
      const x = 50 + (radius / 7.5) * Math.cos(angle);
      const y = 50 + (radius / 11) * Math.sin(angle);

      // Count actual database entries for this franchise
      const count = entries.filter(e => e.franchiseId === fr.id).length;

      return {
        ...fr,
        x: Math.max(12, Math.min(88, x)),
        y: Math.max(12, Math.min(88, y)),
        count
      };
    });
  }, [filteredFranchises, entries]);

  // Get actual database entries for the focused franchise
  const activeSagaEntries = useMemo(() => {
    if (!activeFranchiseId) return [];
    return entries.filter(e => e.franchiseId === activeFranchiseId);
  }, [activeFranchiseId, entries]);

  // Sort chronological entries for timeline
  const sortedActiveEntries = useMemo(() => {
    return [...activeSagaEntries].sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return dateA - dateB;
    });
  }, [activeSagaEntries]);

  // Handle active entry selection
  useEffect(() => {
    if (sortedActiveEntries.length > 0) {
      if (!activeEntryId || !sortedActiveEntries.some(e => e.id === activeEntryId)) {
        setActiveEntryId(sortedActiveEntries[0].id);
      }
    } else {
      setActiveEntryId('');
    }
  }, [sortedActiveEntries, activeEntryId]);

  const activeEntry = useMemo(() => {
    return sortedActiveEntries.find(e => e.id === activeEntryId) || sortedActiveEntries[0];
  }, [sortedActiveEntries, activeEntryId]);

  const activeEntryIndex = useMemo(() => {
    return sortedActiveEntries.findIndex(e => e.id === activeEntryId);
  }, [sortedActiveEntries, activeEntryId]);

  // Ambient stars backdrop
  const starsList = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.8 + 0.8,
      opacity: Math.random() * 0.6 + 0.3
    }));
  }, []);

  const getPhaseName = (idx: number) => {
    if (idx < 2) return "PHASE I: THE GENESIS";
    if (idx < 4) return "PHASE II: EXPANSION";
    return "PHASE III: LEGENDS";
  };

  const handlePickRandom = () => {
    if (sortedActiveEntries.length > 0) {
      const random = sortedActiveEntries[Math.floor(Math.random() * sortedActiveEntries.length)];
      setActiveEntryId(random.id);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-8 pt-6 sm:pt-8 px-4 sm:px-8 max-w-[1600px] mx-auto animate-fade-in text-left">
      
      {/* Sagas Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Sagas</h1>
          <p className="text-muted-foreground text-sm font-semibold">Your cinematic universes and collections.</p>
        </div>
        
        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handlePickRandom}
            disabled={sortedActiveEntries.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900/60 dark:bg-neutral-950/65 hover:bg-neutral-800 text-foreground font-semibold text-[12.5px] border border-white/5 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Shuffle size={13} className="text-amber-500" /> Pick Random Watch
          </button>
          <Link 
            href="/collection"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900/60 dark:bg-neutral-950/65 hover:bg-neutral-800 text-foreground font-semibold text-[12.5px] border border-white/5 transition-colors cursor-pointer"
          >
            <ListFilter size={13} className="text-cyan-400" /> Collection Filters
          </Link>
          <Link 
            href="/add"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-[13px] transition-all shadow-sm cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} /> Add Media
          </Link>
        </div>
      </div>

      {franchises.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-32 bg-neutral-900/40 dark:bg-neutral-950/45 border border-white/5 rounded-[36px] text-center max-w-2xl mx-auto px-6">
          <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center mb-6">
            <Film size={28} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Sagas Found</h3>
          <p className="text-muted-foreground text-sm max-w-md leading-relaxed mb-8">
            You haven't logged any sagas yet. To build a saga universe, add or edit media entries in your collection and assign them a Franchise/Saga.
          </p>
          <Link 
            href="/add"
            className="bg-primary hover:bg-primary/95 text-white px-6 py-2.5 rounded-full font-semibold text-[13px] shadow-sm transition-all flex items-center gap-2"
          >
            <Plus size={15} strokeWidth={2.5} /> Add Media & Create Saga
          </Link>
        </div>
      ) : (
        <>
          {/* Galaxy Map Arena (Draggable Star Constellation Graph) */}
          <div 
            ref={mapRef}
            className="relative w-full h-[580px] bg-black/95 dark:bg-black/98 rounded-[36px] overflow-hidden border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.8)] mb-10 select-none"
          >
            
            {/* Constellation Star Background */}
            <div className="absolute inset-0 pointer-events-none opacity-45">
              {starsList.map((star) => (
                <div 
                  key={star.id}
                  className="absolute bg-white rounded-full animate-pulse"
                  style={{
                    left: `${star.x}%`,
                    top: `${star.y}%`,
                    width: `${star.size}px`,
                    height: `${star.size}px`,
                    opacity: star.opacity,
                    animationDuration: `${star.size * 2 + 1}s`
                  }}
                />
              ))}
            </div>

            {/* Constellation Search Overlay (Top Left, handles 1000+ Sagas list search) */}
            <div className="absolute left-6 top-6 z-30 max-w-[280px] w-full">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search or jump to saga..."
                  value={sagaSearchQuery}
                  onChange={(e) => setSagaSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900/80 dark:bg-neutral-950/90 text-white placeholder-muted-foreground/60 text-xs rounded-full py-2 pl-9 pr-8 border border-white/5 focus:border-cyan-400/40 outline-none backdrop-blur-xl transition-all text-left"
                />
                {sagaSearchQuery && (
                  <button 
                    onClick={() => setSagaSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Constellation Map Viewport */}
            <div className="absolute inset-0 z-10">

              {/* Saga Star Clusters (Peripheral / Galaxy systems scatter) - Draggable! */}
              {franchiseCoordinates.map((fr) => {
                const isFocused = fr.id === activeFranchiseId;
                
                // Nodes are scaled based on entry counts (more titles = bigger/brighter stars!)
                const starSize = Math.max(32, Math.min(76, 26 + fr.count * 4.5));
                const fontScale = Math.max(9, Math.min(13, 8.5 + fr.count * 0.4));

                return (
                  <motion.div 
                    key={fr.id}
                    drag
                    dragConstraints={mapRef}
                    dragElastic={0.1}
                    dragMomentum={false}
                    onClick={() => {
                      setActiveFranchiseId(fr.id);
                      setActiveEntryId('');
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer flex flex-col items-center justify-center z-20 group"
                    style={{
                      left: `${fr.x}%`,
                      top: `${fr.y}%`
                    }}
                  >
                    {/* Glowing Constellation Node Aura */}
                    <div 
                      className={`absolute rounded-full border transition-all duration-500 pointer-events-none ${isFocused ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_25px_rgba(34,211,238,0.25)] scale-110' : 'border-white/5 group-hover:border-cyan-400/20 group-hover:scale-105'}`}
                      style={{
                        width: `${starSize + 20}px`,
                        height: `${starSize + 20}px`
                      }}
                    />

                    {/* Star Globe representation */}
                    <div 
                      className={`rounded-full flex flex-col items-center justify-center border transition-all duration-500 shadow-md ${isFocused ? 'bg-gradient-to-tr from-cyan-950 via-teal-900 to-cyan-400 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-neutral-900/90 dark:bg-neutral-950/90 border-white/10 group-hover:border-cyan-400/30'}`}
                      style={{
                        width: `${starSize}px`,
                        height: `${starSize}px`
                      }}
                    >
                      <Orbit size={starSize * 0.4} className={`opacity-40 transition-transform duration-[6s] animate-spin ${isFocused ? 'text-cyan-400' : 'text-muted-foreground'}`} />
                    </div>

                    {/* Styled Star / Saga Text Emblem */}
                    <span 
                      className={`mt-2.5 font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full select-none transition-all ${isFocused ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/15' : 'text-white/60 bg-black/40 border border-white/5 group-hover:text-cyan-400'}`}
                      style={{ fontSize: `${fontScale}px` }}
                    >
                      {fr.name}
                    </span>

                    {/* Small orbiting dots showing entries count */}
                    <span className="text-[8.5px] font-mono text-muted-foreground/60 mt-0.5 leading-none">
                      {fr.count} {fr.count === 1 ? 'title' : 'titles'}
                    </span>
                  </motion.div>
                );
              })}

            </div>

            {/* FOCUSED SAGA SLIDING LEFT DRAWER */}
            <AnimatePresence>
              {activeFranchiseId && (
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute left-0 top-0 bottom-0 z-40 w-full sm:w-[380px] h-full bg-neutral-950/95 border-r border-white/10 shadow-2xl backdrop-blur-xl flex flex-col"
                >
                  {/* Drawer Header */}
                  <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div className="text-left">
                      <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Franchise Saga</span>
                      <h3 className="text-lg font-bold text-white truncate max-w-[220px] mt-0.5" title={franchises.find(f => f.id === activeFranchiseId)?.name}>
                        {franchises.find(f => f.id === activeFranchiseId)?.name || ''}
                      </h3>
                    </div>
                    <button 
                      onClick={() => setActiveFranchiseId('')} 
                      className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Drawer Body - Scrollable Chronological List */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 hide-scrollbar">
                    <div className="text-[10px] font-bold text-muted-foreground/60 tracking-wider uppercase mb-1">
                      Timeline (Release Date)
                    </div>
                    {sortedActiveEntries.length > 0 ? (
                      sortedActiveEntries.map((entry) => (
                        <div
                          key={entry.id}
                          onClick={() => setSelectedEntry(entry)}
                          className="flex gap-3.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/20 transition-all duration-300 cursor-pointer group text-left"
                        >
                          {/* Small Poster Left */}
                          <div className="shrink-0 w-[55px] aspect-[2/3] rounded-lg overflow-hidden border border-white/10 bg-neutral-900 flex items-center justify-center">
                            {entry.coverImage ? (
                              <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[8px] font-bold text-muted-foreground text-center uppercase p-1 leading-tight line-clamp-3">
                                {entry.title}
                              </span>
                            )}
                          </div>

                          {/* Details Right */}
                          <div className="flex-1 flex flex-col justify-center min-w-0">
                            <span className="text-[8.5px] font-bold text-cyan-400/90 tracking-wider uppercase mb-0.5">
                              {entry.releaseDate ? entry.releaseDate.split('-')[0] : 'TBA'}
                            </span>
                            <h4 className="text-[13px] font-bold text-white group-hover:text-cyan-400 transition-colors duration-200 truncate leading-snug">
                              {entry.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-muted-foreground/75 font-semibold">
                              <span>{entry.type === 'TV Show' ? 'Series' : entry.type}</span>
                              {entry.runtime && (
                                <>
                                  <span>•</span>
                                  <span>{entry.runtime} min</span>
                                </>
                              )}
                              {entry.rating && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-450 font-bold flex items-center gap-0.5">
                                    <Star size={9} className="fill-amber-450 text-amber-450" /> {entry.rating}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
                        <HelpCircle size={24} className="opacity-30" />
                        <p>No media logged in this saga yet.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </>
      )}

      {selectedEntry && (
        <MediaDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSave={async (updatedEntry) => {
            updateEntry(updatedEntry);
            setSelectedEntry(updatedEntry);
          }}
          onDelete={async (id) => { deleteEntry(id); setSelectedEntry(null); }}
        />
      )}
    </div>
  );
}
