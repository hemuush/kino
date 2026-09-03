// src/components/MediaDetailModal.tsx
"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo } from 'react';
import { MediaEntry, EpisodeInfo, safeDateFormat, isEpisodic, formatRuntime, getWatchedRuntimeMinutes, getTotalRuntimeMinutes, getSeasonNumbers, materializeEpisodes } from '@/lib/db';
import { fireConfetti, fireEpicConfetti } from '@/lib/confetti';
import { X, Edit2, Trash2, Calendar, Star, Heart, Plus, Minus, Clock, Film, CheckCircle2, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { useMedia } from '@/context/MediaContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const getTimestamp = () => Date.now();

interface MediaDetailModalProps {
  entry: MediaEntry;
  onClose: () => void;
  onSave: (entry: MediaEntry) => Promise<void>;
  onDelete: (id: string | number) => Promise<void>;
}

export function MediaDetailModal({ entry, onClose, onSave, onDelete }: MediaDetailModalProps) {
  const router = useRouter();
  const { genres, franchises, syncStatus } = useMedia();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [viewTab, setViewTab] = useState<'Details' | 'Episodes'>('Details');
  const [isSaving, setIsSaving] = useState(false);

  // Add episode form state
  const [showAddEpisode, setShowAddEpisode] = useState(false);
  const [newEpSeason, setNewEpSeason] = useState<number>(1);
  const [newEpNumber, setNewEpNumber] = useState<number>(1);
  const [newEpName, setNewEpName] = useState('');
  const [newEpRuntime, setNewEpRuntime] = useState<number | ''>('');
  const [newEpDate, setNewEpDate] = useState('');

  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  // Theater Mode (UI vanishes after inactivity)
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let lastX = -1;
    let lastY = -1;

    const resetTimer = (e?: Event) => {
      // Ignore synthetic mousemoves (when an element vanishes under the cursor, browser fires mousemove)
      if (e && e.type === 'mousemove') {
        const mouseEvent = e as MouseEvent;
        if (lastX === mouseEvent.clientX && lastY === mouseEvent.clientY) {
          return;
        }
        lastX = mouseEvent.clientX;
        lastY = mouseEvent.clientY;
      }

      setIsTheaterMode(false);
      clearTimeout(timeout);
      // Wait 5 seconds before hiding UI
      timeout = setTimeout(() => setIsTheaterMode(true), 5000);
    };

    resetTimer();
    const events = ['mousemove', 'touchstart', 'touchmove', 'keydown', 'click', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timeout);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, []);
  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && !showAddEpisode) onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showAddEpisode]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const currentIsEpisodic = isEpisodic(entry);

  useEffect(() => {
    if (!currentIsEpisodic && viewTab === 'Episodes') setViewTab('Details');
  }, [currentIsEpisodic, viewTab]);

  const entryFranchise = entry.franchiseId ? franchises.find(f => f.id === entry.franchiseId) : null;
  const entryGenres = (entry.genreIds || []).map(id => genres.find(g => g.id === id)?.name).filter(Boolean);

  const displayEpisodes = useMemo<EpisodeInfo[]>(() => materializeEpisodes(entry), [entry]);

  const seasons = useMemo(() => getSeasonNumbers(displayEpisodes), [displayEpisodes]);

  useEffect(() => {
    if (seasons.length > 0 && !seasons.includes(selectedSeason)) {
      setSelectedSeason(seasons[0]);
    }
  }, [displayEpisodes, selectedSeason, seasons]);

  const filteredEpisodes = displayEpisodes.filter(ep => (ep.season || 1) === selectedSeason);
  const episodesWatched = entry.episodesWatched || 0;
  const watchedRuntimeMinutes = getWatchedRuntimeMinutes(entry);
  const totalRawRuntime = getTotalRuntimeMinutes(entry);

  const handleSave = async (updatedEntry: MediaEntry) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(updatedEntry);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAddEpisode = () => {
    const currentSeason = selectedSeason || 1;
    setNewEpSeason(currentSeason);
    const epsInSeason = (entry.episodes || []).filter(e => e.season === currentSeason);
    const nextNum = epsInSeason.length > 0 ? Math.max(...epsInSeason.map(e => e.number || 0)) + 1 : 1;
    setNewEpNumber(nextNum);
    setNewEpName(`Episode ${nextNum}`);
    setNewEpRuntime('');
    setNewEpDate(new Date().toISOString().split('T')[0]);
    setShowAddEpisode(true);
  };

  const handleSaveNewEpisode = async () => {
    if (!newEpName.trim()) return;
    const newEpisode = {
      season: newEpSeason,
      number: newEpNumber,
      name: newEpName.trim(),
      runtime: newEpRuntime ? Number(newEpRuntime) : undefined,
      airDate: newEpDate || undefined,
    };

    const updatedEpisodes = [...(entry.episodes || []), newEpisode].sort((a, b) => {
      if ((a.season || 1) !== (b.season || 1)) return (a.season || 1) - (b.season || 1);
      return (a.number || 0) - (b.number || 0);
    });
    const newTotal = Math.max(entry.episodesTotal || 0, updatedEpisodes.length);

    await handleSave({
      ...entry,
      episodes: updatedEpisodes,
      episodesTotal: newTotal,
      status: entry.status === 'Plan to Watch' ? 'Watching' : entry.status,
      updatedAt: getTimestamp()
    });

    toast.success(`Episode "${newEpisode.name}" added!`);
    setShowAddEpisode(false);
  };

  const handleToggleEpisodeWatched = async (globalIdx: number) => {
    if (!entry.episodes || globalIdx < 0) return;
    const updatedEpisodes = [...entry.episodes];
    updatedEpisodes[globalIdx] = { ...updatedEpisodes[globalIdx], watched: !updatedEpisodes[globalIdx].watched };

    const newWatchedCount = updatedEpisodes.filter(e => e.watched).length;
    const newTotal = entry.episodesTotal || updatedEpisodes.length;

    let newStatus = entry.status;
    if (newWatchedCount === 0) newStatus = 'Plan to Watch';
    else if (newWatchedCount >= newTotal && newTotal > 0) newStatus = 'Completed';
    else newStatus = 'Watching';

    if (newStatus === 'Completed' && entry.status !== 'Completed') {
      fireEpicConfetti();
    } else if (updatedEpisodes[globalIdx].watched) {
      fireConfetti();
    }

    await handleSave({
      ...entry,
      episodes: updatedEpisodes,
      episodesWatched: newWatchedCount,
      status: newStatus,
      updatedAt: getTimestamp()
    });
  };

  const handleRemoveEpisode = async (episodeIndex: number) => {
    if (!entry.episodes?.length) return;
    const epToRemove = entry.episodes[episodeIndex];
    const updatedEpisodes = entry.episodes.filter((_, i) => i !== episodeIndex);
    const newWatched = updatedEpisodes.filter(e => e.watched).length;
    await handleSave({
      ...entry,
      episodes: updatedEpisodes,
      episodesTotal: updatedEpisodes.length,
      episodesWatched: newWatched,
      updatedAt: getTimestamp()
    });
    toast.success(`Episode "${epToRemove?.name || '#' + (episodeIndex + 1)}" removed.`);
  };

  const handleIncrementEpisode = async () => {
    if (!currentIsEpisodic) return;
    if (entry.episodesTotal && episodesWatched >= entry.episodesTotal && (!entry.episodes || entry.episodes.length === 0)) {
      handleOpenAddEpisode();
      return;
    }
    
    const newEpisodes = entry.episodes ? [...entry.episodes] : undefined;
    let nextWatched = episodesWatched + 1;
    let newTotal = entry.episodesTotal;

    if (newEpisodes && newEpisodes.length > 0) {
      const sortedEps = [...newEpisodes].sort((a, b) => {
        if ((a.season || 1) !== (b.season || 1)) return (a.season || 1) - (b.season || 1);
        return (a.number || 0) - (b.number || 0);
      });
      const nextUnwatched = sortedEps.find(e => !e.watched);
      if (nextUnwatched) {
        const globalIdx = newEpisodes.findIndex(e => e === nextUnwatched);
        newEpisodes[globalIdx] = { ...newEpisodes[globalIdx], watched: true };
        nextWatched = newEpisodes.filter(e => e.watched).length;
      }
      newTotal = newTotal || newEpisodes.length;
    }

    const isNowComplete = newTotal ? nextWatched >= newTotal : false;
    await handleSave({
      ...entry,
      episodes: newEpisodes,
      episodesWatched: nextWatched,
      status: isNowComplete ? 'Completed' : (entry.status === 'Plan to Watch' ? 'Watching' : entry.status),
      rating: isNowComplete && entry.status !== 'Completed' ? entry.rating : entry.rating,
      updatedAt: getTimestamp()
    });
    if (isNowComplete && entry.status !== 'Completed') {
      fireEpicConfetti();
      toast.success('🎉 Series completed!', { description: `You finished all ${newTotal} episodes.` });
    } else {
      fireConfetti();
    }
  };

  const handleDecrementEpisode = async () => {
    if (!currentIsEpisodic) return;
    const newEpisodes = entry.episodes ? [...entry.episodes] : undefined;
    let nextWatched = Math.max(0, episodesWatched - 1);

    if (newEpisodes && newEpisodes.length > 0) {
      const sortedEps = [...newEpisodes].sort((a, b) => {
        if ((a.season || 1) !== (b.season || 1)) return (b.season || 1) - (a.season || 1);
        return (b.number || 0) - (a.number || 0);
      });
      const lastWatched = sortedEps.find(e => e.watched);
      if (lastWatched) {
        const globalIdx = newEpisodes.findIndex(e => e === lastWatched);
        newEpisodes[globalIdx] = { ...newEpisodes[globalIdx], watched: false };
        nextWatched = newEpisodes.filter(e => e.watched).length;
      }
    }

    await handleSave({ 
      ...entry, 
      episodes: newEpisodes,
      episodesWatched: nextWatched, 
      status: nextWatched === 0 ? 'Plan to Watch' : 'Watching',
      updatedAt: getTimestamp() 
    });
  };

  const handleToggleFavorite = async () => {
    const newFav = !entry.favorite;
    await handleSave({ ...entry, favorite: newFav, updatedAt: getTimestamp() });
    toast.success(newFav ? '❤️ Added to favorites!' : 'Removed from favorites.', { duration: 2000 });
  };

  const handleSetRating = async (rating: number) => {
    await handleSave({ ...entry, rating, updatedAt: getTimestamp() });
    toast.success(`Rated ${rating}/10 ⭐`, { duration: 2000 });
  };

  const handleEdit = () => {
    router.push(`/media/${entry.id}/edit`);
    onClose();
  };

  const handleDeleteClick = async () => {
    if (showDeleteConfirm) {
      await onDelete(entry.id!);
      toast.success(`"${entry.title}" deleted from your collection.`, { duration: 3000 });
      return;
    }
    setShowDeleteConfirm(true);
    setTimeout(() => setShowDeleteConfirm(false), 3000);
  };

  const progressPercent = entry.episodesTotal && episodesWatched
    ? Math.round((episodesWatched / entry.episodesTotal) * 100)
    : 0;

  const displayRating = hoveredStar !== null ? hoveredStar : entry.rating;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center text-foreground">
        
        {/* Theater Mode Cinematic Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`absolute inset-0 bg-black transition-all duration-1000 ease-in-out ${isTheaterMode ? 'opacity-100 cursor-default' : 'opacity-80 cursor-pointer'}`}
          onClick={(e) => {
            if (isTheaterMode) {
              e.stopPropagation();
              setIsTheaterMode(false);
            } else {
              onClose();
            }
          }}
        >
          {entry.coverImage && (
            <img 
              src={entry.coverImage} 
              alt={entry.title}
              className={`w-full h-full object-cover transition-all duration-1000 ease-in-out ${isTheaterMode ? 'opacity-70 blur-0 scale-100' : 'opacity-20 blur-2xl scale-110'}`} 
            />
          )}
          {/* Subtle vignette/glow so it looks like Apple TV */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
          <div className={`absolute bottom-10 left-0 right-0 text-center transition-opacity duration-1000 ${isTheaterMode ? 'opacity-100' : 'opacity-0'}`}>
             <h2 className="text-white text-3xl font-display font-black tracking-tight drop-shadow-xl">{entry.title}</h2>
             <p className="text-white/60 text-sm font-bold uppercase tracking-widest mt-2 drop-shadow-md">Move mouse to wake</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: isTheaterMode ? 0 : 1, y: isTheaterMode ? 40 : 0, scale: isTheaterMode ? 0.95 : 1 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className={`relative w-full ${currentIsEpisodic ? 'max-w-2xl md:max-w-4xl lg:max-w-5xl' : 'max-w-2xl'} h-full sm:h-auto max-h-full sm:max-h-[88vh] bg-card/80 dark:bg-[#0c0c0d]/90 backdrop-blur-3xl rounded-t-[28px] sm:rounded-[32px] overflow-hidden z-[201] flex flex-col shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)] border border-border/60 border-b-0 sm:border-b ${isTheaterMode ? 'pointer-events-none' : ''}`}
        >
          {/* Background blur from poster */}
          {entry.coverImage && (
            <div className="absolute inset-0 h-[300px] overflow-hidden -z-10 pointer-events-none opacity-15 dark:opacity-20 mix-blend-screen">
              <img src={entry.coverImage} className="w-full h-full object-cover scale-150 blur-3xl" alt="bg" />
            </div>
          )}

          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-0 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border/60" />
          </div>

          {/* ─── Header ─── */}
          <div className="sticky top-0 flex items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-3.5 border-b border-border/60 z-20 bg-gradient-to-r from-card/80 to-card/40 dark:from-[#0c0c0d]/90 dark:to-[#0c0c0d]/60 backdrop-blur-md shadow-sm shrink-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <span className="hidden sm:inline-block text-[9px] font-mono tracking-[0.2em] text-primary/80 uppercase font-bold mr-2">ENTRY // DETAILS</span>
              <Badge variant={entry.type === 'Movie' ? 'movie' : entry.type === 'TV Show' ? 'tv' : 'anime'}>
                {entry.type === 'Anime' ? `Anime (${entry.animeType || 'Show'})` : entry.type}
              </Badge>
              {entry.status && entry.status !== 'Completed' && (
                <Badge variant={entry.status === 'Watching' ? 'accent' : 'muted'}>{entry.status}</Badge>
              )}
              {entry.favorite && (
                <Badge variant="primary" className="hidden sm:inline-flex">❤️ Fav</Badge>
              )}
              {syncStatus === 'syncing' && (
                <span className="hidden sm:flex items-center gap-1.5 ml-2 text-[10px] uppercase font-bold text-primary tracking-widest bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                  <span className="w-2 h-2 border-[1.5px] border-primary/30 border-t-primary rounded-full animate-spin" /> Saving
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="hidden sm:flex items-center gap-1.5 ml-2 text-[10px] uppercase font-bold text-red-500 tracking-widest bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Error
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                onClick={handleToggleFavorite}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all border shadow-sm backdrop-blur-sm cursor-pointer ${entry.favorite ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-card/50 border-border/60 hover:text-foreground hover:bg-card/80'}`}
                title={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-label={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart size={14} className={entry.favorite ? 'fill-red-500' : ''} />
              </button>
              <button
                onClick={handleEdit}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-card/50 border border-border/60 shadow-sm backdrop-blur-sm flex items-center justify-center hover:bg-card/80 transition-colors cursor-pointer hover:text-primary"
                title="Edit"
                aria-label="Edit entry"
              >
                <Edit2 size={14} strokeWidth={2} />
              </button>
              <button
                onClick={handleDeleteClick}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border shadow-sm backdrop-blur-sm flex items-center justify-center transition-all cursor-pointer ${showDeleteConfirm ? 'bg-red-500 border-red-600 text-white' : 'bg-card/50 border-border/60 hover:text-red-400 hover:bg-card/80'}`}
                title={showDeleteConfirm ? 'Tap again to confirm delete' : 'Delete'}
                aria-label={showDeleteConfirm ? 'Tap again to confirm delete' : 'Delete entry'}
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
              {/* Close button — always visible and prominent */}
              <button
                onClick={onClose}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-foreground text-background shadow-md border border-border/60 flex items-center justify-center hover:opacity-90 transition-colors cursor-pointer ml-0.5"
                title="Close"
                aria-label="Close"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* ─── Delete Confirm Banner ─── */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 sm:px-6 py-2 shrink-0 bg-black/20"
              >
                <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-[16px] px-4 py-3 shadow-inner">
                  <p className="text-sm font-semibold text-red-500 text-center flex items-center justify-center gap-2">
                    <Trash2 size={15} /> Click delete again to confirm — this cannot be undone
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Body ─── */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8 min-h-0">
            {/* Left: Poster (compact on mobile, full column on sm+) */}
            <div className="sm:w-[200px] md:w-[220px] shrink-0 sm:overflow-y-auto hide-scrollbar">
              {/* Mobile: poster + title side by side */}
              <div className="flex sm:block gap-3">
                <div className="w-24 sm:w-full aspect-[2/3] rounded-2xl overflow-hidden bg-card border-2 border-border/40 relative group shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] shrink-0">
                  {entry.coverImage ? (
                    <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 p-4">
                      <Film size={32} className="text-muted-foreground/30 mb-2" />
                      <span className="text-xs text-muted-foreground/50 font-bold uppercase text-center">{entry.title}</span>
                    </div>
                  )}
                </div>
                {/* Mobile-only inline title + meta */}
                <div className="sm:hidden flex flex-col justify-center gap-2 min-w-0 flex-1">
                  <h2 className="font-display text-xl font-black tracking-tight break-words leading-tight">{entry.title}</h2>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    {entry.type === 'TV Show' ? 'Series' : entry.type}
                    {entry.releaseDate ? ` · ${entry.releaseDate.split('-')[0]}` : ''}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${entry.status === 'Completed' ? 'bg-emerald-500' : entry.status === 'Watching' ? 'bg-primary' : 'bg-amber-500'}`} />
                    <span className="text-[10px] text-muted-foreground font-medium">{entry.status}</span>
                  </div>
                  {entryFranchise && (
                    <span className="text-[10px] font-mono text-primary/80 uppercase tracking-wider">📽 {entryFranchise.name}</span>
                  )}
                </div>
              </div>

              {entryFranchise && (
                <div className="hidden sm:block mt-5 bg-primary/10 border border-primary/20 backdrop-blur-sm rounded-[20px] p-4 text-center shadow-sm">
                  <Film size={14} className="text-primary mx-auto mb-1.5 opacity-80" />
                  <p className="text-[9px] font-mono uppercase tracking-widest text-primary/70">UNIVERSE</p>
                  <p className="text-sm font-bold text-foreground mt-1">{entryFranchise.name}</p>
                </div>
              )}

              {/* Rating widget (visible on desktop) */}
              <div className="hidden sm:block mt-5">
                  <div className="bg-card/65 dark:bg-[#0c0c0d]/80 backdrop-blur-xl border border-border/60 rounded-[20px] p-4 shadow-sm text-center">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Your Rating</p>
                    <div className="flex flex-wrap gap-0.5">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleSetRating(v)}
                          onMouseEnter={() => setHoveredStar(v)}
                          onMouseLeave={() => setHoveredStar(null)}
                          className="flex-1 min-w-[18px] flex items-center justify-center py-1 rounded transition-transform hover:scale-110 cursor-pointer"
                        >
                          <Star
                            size={14}
                            className={`transition-colors ${v <= displayRating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'}`}
                          />
                        </button>
                      ))}
                    </div>
                    {entry.rating > 0 && (
                      <p className="text-center text-sm font-black text-primary mt-2">{displayRating}/10</p>
                    )}
                  </div>
              </div>
            </div>

            {/* Right: Details / Episodes */}
            <div className="flex-1 flex flex-col min-w-0 sm:overflow-hidden">
              {/* Tab switcher */}
              {currentIsEpisodic && (
                <div className="flex border-b border-border/60 shrink-0 mb-4 gap-6">
                  {(['Details', 'Episodes'] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setViewTab(tab)}
                      className={`pb-3 text-[12px] font-bold tracking-wider uppercase transition-all border-b-2 cursor-pointer ${viewTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto sm:overflow-y-auto pr-1 space-y-4 hide-scrollbar">
                {/* ─── Details Tab ─── */}
                {viewTab === 'Details' && (
                  <div className="space-y-4">
                    {/* Title + genres — hidden on mobile (shown in compact hero row above) */}
                    <div className="hidden sm:block">
                      <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tight mb-3 break-words leading-none">{entry.title}</h2>
                      <div className="flex flex-wrap gap-2.5">
                        {entryGenres.map((g) => (
                          <span key={g} className="bg-card/50 backdrop-blur-sm border border-border/50 text-foreground px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">{g}</span>
                        ))}
                        {entry.runtime ? (
                          <span className="bg-card/50 backdrop-blur-sm border border-border/50 text-foreground px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                            <Clock size={11} className="text-muted-foreground" /> {formatRuntime(entry.runtime)}{currentIsEpisodic ? '/ep' : ''}
                          </span>
                        ) : null}
                        {entry.releaseDate && (
                          <span className="bg-card/50 backdrop-blur-sm border border-border/50 text-foreground px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                            <Calendar size={11} className="text-muted-foreground" /> {safeDateFormat(entry.releaseDate)}
                          </span>
                        )}
                      </div>
                    </div>



                    {/* Mobile-only genres/tags compact row */}
                    {(entryGenres.length > 0 || entry.runtime || entry.releaseDate) && (
                      <div className="sm:hidden flex flex-wrap gap-1.5">
                        {entryGenres.slice(0, 3).map((g) => (
                          <span key={g} className="bg-card/50 border border-border/50 text-foreground px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">{g}</span>
                        ))}
                        {entry.runtime && (
                          <span className="bg-card/50 border border-border/50 text-foreground px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Clock size={9} /> {formatRuntime(entry.runtime)}{currentIsEpisodic ? '/ep' : ''}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Rating (mobile) */}
                      <div className="sm:hidden bg-card/65 dark:bg-[#0c0c0d]/80 backdrop-blur-xl border border-border/60 rounded-[24px] p-5 shadow-sm text-center">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4">Your Rating</p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                            <button key={v} type="button" onClick={() => handleSetRating(v)}
                              onMouseEnter={() => setHoveredStar(v)} onMouseLeave={() => setHoveredStar(null)}
                              className="flex-1 py-1 flex items-center justify-center cursor-pointer"
                            >
                              <Star size={16} className={`transition-colors ${v <= displayRating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/15'}`} />
                            </button>
                          ))}
                        </div>
                        {entry.rating > 0 && <p className="text-center text-lg font-black text-primary mt-2">{displayRating}/10</p>}
                      </div>

                    {/* Episode progress */}
                    {currentIsEpisodic && (
                      <div className="bg-card/65 dark:bg-[#0c0c0d]/80 backdrop-blur-xl border border-border/60 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
                        {/* Ambient glow in corner */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-5 relative z-10">
                          <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">PROGRESS // TRACKER</h3>
                          {watchedRuntimeMinutes > 0 && (
                            <span className="text-[11px] font-bold text-primary flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                              <Clock size={11} /> {formatRuntime(watchedRuntimeMinutes)} total
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        {entry.episodesTotal && entry.episodesTotal > 0 && (
                          <div className="mb-5 relative z-10">
                            <div className="flex justify-between text-[11px] font-bold text-muted-foreground mb-2">
                              <span>{episodesWatched} / {entry.episodesTotal} EPISODES</span>
                              <span className="text-foreground">{progressPercent}%</span>
                            </div>
                            <div className="h-2.5 bg-black/20 dark:bg-white/5 rounded-full overflow-hidden border border-border/40 shadow-inner">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                className={`h-full rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] ${progressPercent === 100 ? 'bg-green-500 shadow-green-500/50' : 'bg-primary'}`}
                              />
                            </div>
                          </div>
                        )}

                        {/* +/-1 episode controls */}
                        <div className="flex items-center gap-4 relative z-10">
                          <button
                            onClick={handleDecrementEpisode}
                            disabled={episodesWatched === 0 || isSaving}
                            className="w-12 h-12 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md flex items-center justify-center hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                          >
                            <Minus size={18} />
                          </button>
                          <div className="flex-1 text-center bg-black/5 dark:bg-white/5 rounded-xl py-2 border border-border/40 shadow-inner">
                            <p className="text-3xl font-display font-black text-foreground tracking-tighter leading-none">{episodesWatched}</p>
                            <p className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground mt-1">WATCHED</p>
                          </div>
                          <button
                            onClick={handleIncrementEpisode}
                            disabled={isSaving}
                            className="w-12 h-12 rounded-xl border-2 border-primary/40 bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.4)] flex items-center justify-center hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Plus size={18} strokeWidth={2.5} />
                          </button>
                        </div>

                        {totalRawRuntime > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-3 text-center">
                            Total series: {formatRuntime(totalRawRuntime)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Review */}
                    {entry.review && (
                      <div className="rounded-[24px] border border-border/60 bg-card/65 dark:bg-[#0c0c0d]/80 backdrop-blur-xl p-5 shadow-sm">
                        <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">YOUR NOTES</h3>
                        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{entry.review}</p>
                      </div>
                    )}

                    {/* Status */}
                    {entry.status && (
                      <div className="flex items-center justify-center gap-2 py-3 bg-muted/30 rounded-full border border-border/40 w-max px-6">
                        {entry.status === 'Completed' ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : entry.status === 'Watching' ? (
                          <PlayCircle size={16} className="text-blue-500" />
                        ) : (
                          <Clock size={16} className="text-amber-500" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{entry.status}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Episodes Tab ─── */}
                {viewTab === 'Episodes' && currentIsEpisodic && (
                  <div className="space-y-4">
                    {/* Season tabs */}
                    {seasons.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {seasons.map((season) => (
                          <button
                            key={season}
                            onClick={() => setSelectedSeason(season)}
                            className={`px-4 py-2 rounded-xl text-xs font-display uppercase font-bold border transition-all cursor-pointer ${selectedSeason === season ? 'bg-primary/10 text-primary border-primary' : 'bg-muted border-border/50 text-muted-foreground hover:text-foreground'}`}
                          >
                            Season {season}
                          </button>
                        ))}
                        <button
                          onClick={handleOpenAddEpisode}
                          className="px-4 py-2 rounded-xl text-xs font-display uppercase font-bold border border-dashed border-border/60 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Plus size={12} /> Add Episode
                        </button>
                      </div>
                    )}

                    {/* Episode list */}
                    <div className="space-y-1.5">
                      {filteredEpisodes.length === 0 ? (
                        <div className="py-12 text-center">
                          <p className="text-muted-foreground text-sm mb-4">No episodes for Season {selectedSeason}.</p>
                          <button
                            onClick={handleOpenAddEpisode}
                            className="px-5 py-2.5 bg-primary/10 text-primary border border-primary/25 rounded-xl text-sm font-bold hover:bg-primary/15 transition-colors cursor-pointer flex items-center gap-2 mx-auto"
                          >
                            <Plus size={15} /> Add First Episode
                          </button>
                        </div>
                      ) : (
                        filteredEpisodes.map((ep, idx) => {
                          const globalIdx = (entry.episodes || []).findIndex(e => e.season === ep.season && e.number === ep.number && e.name === ep.name);
                          const isWatched = entry.episodes && globalIdx >= 0 ? entry.episodes[globalIdx].watched : (episodesWatched >= (ep.number || idx + 1));
                          return (
                            <div
                              key={`${ep.season}-${ep.number}-${idx}`}
                              onClick={() => { if (entry.episodes && globalIdx >= 0) handleToggleEpisodeWatched(globalIdx); }}
                              className={`rounded-xl border px-4 py-3 flex items-center gap-3 group transition-all ${entry.episodes && globalIdx >= 0 ? 'cursor-pointer' : ''} ${isWatched ? 'border-green-500/20 bg-green-500/5' : 'border-border/50 bg-muted/10 hover:border-border'}`}
                            >
                              <div className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 font-mono text-xs font-bold ${isWatched ? '' : 'text-muted-foreground'}`}
                                style={{ background: isWatched ? 'rgba(34,197,94,0.15)' : 'rgba(128,128,128,0.1)', color: isWatched ? '#22c55e' : 'currentColor' }}
                              >
                                {ep.number || idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${isWatched ? 'text-foreground' : 'text-foreground/80'}`}>
                                  {ep.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {ep.airDate ? safeDateFormat(ep.airDate) : ''}{ep.airDate && ep.runtime ? ' · ' : ''}{ep.runtime ? formatRuntime(ep.runtime) : ''}
                                </p>
                              </div>
                              {isWatched && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
                              {/* Remove button (only shown for manually added episodes) */}
                              {entry.episodes && globalIdx >= 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemoveEpisode(globalIdx); }}
                                  className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Add Episode Modal ─── */}
        <AnimatePresence>
          {showAddEpisode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[110] flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddEpisode(false)} />
              <motion.div
                initial={{ scale: 0.94, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.94, y: 16 }}
                className="relative w-full max-w-sm bg-card border border-border/80 rounded-[24px] shadow-2xl p-6 z-10"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-display uppercase tracking-widest font-bold text-foreground">Add Episode</h3>
                  <button onClick={() => setShowAddEpisode(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Season</label>
                      <input type="number" min="1" value={newEpSeason} onChange={(e) => setNewEpSeason(Number(e.target.value))}
                        className="w-full bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Episode #</label>
                      <input type="number" min="1" value={newEpNumber} onChange={(e) => setNewEpNumber(Number(e.target.value))}
                        className="w-full bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Title</label>
                    <input autoFocus type="text" value={newEpName} onChange={(e) => setNewEpName(e.target.value)} placeholder="Episode title..."
                      className="w-full bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Runtime (min)</label>
                      <input type="number" min="1" value={newEpRuntime} onChange={(e) => setNewEpRuntime(e.target.value ? Number(e.target.value) : '')} placeholder="Auto"
                        className="w-full bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Air Date</label>
                      <input type="date" value={newEpDate} onChange={(e) => setNewEpDate(e.target.value)}
                        className="w-full bg-background border border-border/60 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/40" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAddEpisode(false)} className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-semibold hover:bg-muted transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button onClick={handleSaveNewEpisode} disabled={!newEpName.trim()} className="flex-[2] py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <Plus size={15} /> Add Episode
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
