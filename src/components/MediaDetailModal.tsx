// src/components/MediaDetailModal.tsx
"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react';
import { MediaEntry, EpisodeInfo, safeDateFormat, isEpisodic, formatRuntime, getWatchedRuntimeMinutes } from '@/lib/db';
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
  const { genres, franchises } = useMedia();
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

  const displayEpisodes: EpisodeInfo[] = (entry.episodes && entry.episodes.length > 0)
    ? entry.episodes
    : (entry.episodesTotal ? Array.from({ length: Number(entry.episodesTotal) }, (_, i) => ({ name: `Episode ${i + 1}`, season: 1, number: i + 1 })) : []);

  const seasons = Array.from(new Set(displayEpisodes.map(ep => ep.season || 1))).sort((a, b) => a - b);

  useEffect(() => {
    if (seasons.length > 0 && !seasons.includes(selectedSeason)) {
      setSelectedSeason(seasons[0]);
    }
  }, [displayEpisodes, selectedSeason, seasons]);

  const filteredEpisodes = displayEpisodes.filter(ep => (ep.season || 1) === selectedSeason);
  const episodesWatched = entry.episodesWatched || 0;
  const watchedRuntimeMinutes = getWatchedRuntimeMinutes(entry);
  const totalRawRuntime = entry.episodesTotal && entry.runtime ? entry.episodesTotal * entry.runtime : (entry.runtime || 0);

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

  const handleRemoveEpisode = async (episodeIndex: number) => {
    if (!entry.episodes?.length) return;
    const epToRemove = entry.episodes[episodeIndex];
    const updatedEpisodes = entry.episodes.filter((_, i) => i !== episodeIndex);
    await handleSave({
      ...entry,
      episodes: updatedEpisodes,
      episodesTotal: updatedEpisodes.length,
      episodesWatched: Math.min(episodesWatched, updatedEpisodes.length),
      updatedAt: getTimestamp()
    });
    toast.success(`Episode "${epToRemove?.name || '#' + (episodeIndex + 1)}" removed.`);
  };

  const handleIncrementEpisode = async () => {
    if (!currentIsEpisodic) return;
    if (entry.episodesTotal && episodesWatched >= entry.episodesTotal) {
      handleOpenAddEpisode();
      return;
    }
    const nextWatched = episodesWatched + 1;
    const isNowComplete = entry.episodesTotal && nextWatched >= entry.episodesTotal;
    await handleSave({
      ...entry,
      episodesWatched: nextWatched,
      status: isNowComplete ? 'Completed' : (entry.status === 'Plan to Watch' ? 'Watching' : entry.status),
      rating: isNowComplete && entry.status !== 'Completed' ? entry.rating : entry.rating,
      updatedAt: getTimestamp()
    });
    if (isNowComplete) {
      toast.success('🎉 Series completed!', { description: `You finished all ${entry.episodesTotal} episodes.` });
    }
  };

  const handleDecrementEpisode = async () => {
    if (!currentIsEpisodic) return;
    const nextWatched = Math.max(0, episodesWatched - 1);
    await handleSave({ ...entry, episodesWatched: nextWatched, updatedAt: getTimestamp() });
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
    router.push(`/edit/${entry.id}`);
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
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center text-foreground">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/65 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className={`relative w-full ${currentIsEpisodic ? 'max-w-2xl md:max-w-4xl lg:max-w-5xl' : 'max-w-2xl'} max-h-[92vh] sm:max-h-[88vh] bg-card rounded-t-[28px] sm:rounded-2xl overflow-hidden z-[101] flex flex-col shadow-2xl border border-border/80`}
        >
          {/* Background blur from poster */}
          {entry.coverImage && (
            <div className="absolute inset-0 h-[250px] overflow-hidden -z-10 pointer-events-none opacity-[0.05] blur-3xl">
              <img src={entry.coverImage} className="w-full h-full object-cover scale-150" alt="bg" />
            </div>
          )}

          {/* ─── Header ─── */}
          <div className="sticky top-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-border/60 z-20 bg-card/95 backdrop-blur-xl shadow-sm shrink-0">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Badge variant={entry.type === 'Movie' ? 'movie' : entry.type === 'TV Show' ? 'tv' : 'anime'}>
                {entry.type === 'Anime' ? `Anime (${entry.animeType || 'Show'})` : entry.type}
              </Badge>
              {entry.status && entry.status !== 'Completed' && (
                <Badge variant={entry.status === 'Watching' ? 'accent' : 'muted'}>{entry.status}</Badge>
              )}
              {entry.favorite && (
                <Badge variant="primary">❤️ Favorite</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleToggleFavorite}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border cursor-pointer ${entry.favorite ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-muted border-border/60 hover:text-foreground'}`}
                title={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart size={14} className={entry.favorite ? 'fill-red-500' : ''} />
              </button>
              <button
                onClick={handleEdit}
                className="w-8 h-8 rounded-xl bg-muted border border-border/60 flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer hover:text-primary"
                title="Edit"
              >
                <Edit2 size={14} strokeWidth={2} />
              </button>
              <button
                onClick={handleDeleteClick}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${showDeleteConfirm ? 'bg-red-500 border-red-600 text-white' : 'bg-muted border-border/60 hover:text-red-400'}`}
                title={showDeleteConfirm ? 'Tap again to confirm delete' : 'Delete'}
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted border border-border/60 flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer" title="Close">
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
                className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 shrink-0"
              >
                <p className="text-sm font-semibold text-red-500 text-center">
                  ⚠️ Click delete again to confirm — this cannot be undone
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Body ─── */}
          <div className="flex-1 overflow-hidden px-4 sm:px-6 py-5 flex flex-col sm:flex-row gap-5 sm:gap-6 md:gap-8 min-h-0">
            {/* Left: Poster + metadata */}
            <div className="w-full sm:w-[200px] md:w-[220px] shrink-0 mx-auto sm:mx-0 overflow-y-auto hide-scrollbar">
              <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-card border border-border/60 relative group shadow-xl">
                {entry.coverImage ? (
                  <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 p-4">
                    <Film size={32} className="text-muted-foreground/30 mb-2" />
                    <span className="text-xs text-muted-foreground/50 font-bold uppercase text-center">{entry.title}</span>
                  </div>
                )}
              </div>

              {entryFranchise && (
                <div className="mt-4 bg-primary/8 border border-primary/20 rounded-xl p-3 text-center">
                  <Film size={12} className="text-primary mx-auto mb-1" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Universe</p>
                  <p className="text-[13px] font-bold text-foreground mt-0.5">{entryFranchise.name}</p>
                </div>
              )}

              {/* Rating widget (visible on desktop) */}
              <div className="hidden sm:block mt-4">
                {entry.status === 'Completed' ? (
                  <div className="bg-card border border-border/60 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Your Rating</p>
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
                ) : null}
              </div>
            </div>

            {/* Right: Details / Episodes */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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

              <div className="flex-1 overflow-y-auto pr-1 space-y-5 hide-scrollbar">
                {/* ─── Details Tab ─── */}
                {viewTab === 'Details' && (
                  <div className="space-y-5">
                    {/* Title + genres */}
                    <div>
                      <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 break-words">{entry.title}</h2>
                      <div className="flex flex-wrap gap-2">
                        {entryGenres.map((g) => (
                          <span key={g} className="bg-muted border border-border/40 text-muted-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase">{g}</span>
                        ))}
                        {entry.runtime ? (
                          <span className="bg-muted/50 border border-border/40 text-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                            <Clock size={10} /> {formatRuntime(entry.runtime)}{currentIsEpisodic ? '/ep' : ''}
                          </span>
                        ) : null}
                        {entry.releaseDate && (
                          <span className="bg-muted/50 border border-border/40 text-muted-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                            <Calendar size={10} /> {safeDateFormat(entry.releaseDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mobile action buttons */}
                    <div className="flex gap-2 sm:hidden">
                      <button
                        onClick={handleToggleFavorite}
                        className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${entry.favorite ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-card border-border text-muted-foreground'}`}
                      >
                        <Heart size={13} className={entry.favorite ? 'fill-red-500' : ''} /> Fav
                      </button>
                      <button onClick={handleEdit} className="flex-1 py-2.5 rounded-xl border border-primary/25 bg-primary/10 text-xs font-bold text-primary flex items-center justify-center gap-1.5">
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        onClick={handleDeleteClick}
                        className={`flex-1 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${showDeleteConfirm ? 'border-red-500 bg-red-500 text-white' : 'border-red-500/25 bg-red-500/10 text-red-500'}`}
                      >
                        <Trash2 size={13} /> {showDeleteConfirm ? 'Sure?' : 'Delete'}
                      </button>
                    </div>

                    {/* Rating (mobile) */}
                    {entry.status === 'Completed' && (
                      <div className="sm:hidden bg-card border border-border/60 rounded-xl p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Your Rating</p>
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
                    )}

                    {/* Episode progress */}
                    {currentIsEpisodic && (
                      <div className="bg-card border border-border/60 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Progress</h3>
                          {watchedRuntimeMinutes > 0 && (
                            <span className="text-xs font-semibold text-primary flex items-center gap-1">
                              <Clock size={11} /> {formatRuntime(watchedRuntimeMinutes)} watched
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        {entry.episodesTotal && entry.episodesTotal > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                              <span>{episodesWatched}/{entry.episodesTotal} episodes</span>
                              <span className="font-semibold text-foreground">{progressPercent}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                className={`h-full rounded-full ${progressPercent === 100 ? 'bg-green-500' : 'bg-primary'}`}
                              />
                            </div>
                          </div>
                        )}

                        {/* +/-1 episode controls */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleDecrementEpisode}
                            disabled={episodesWatched === 0 || isSaving}
                            className="w-10 h-10 rounded-xl border border-border/60 bg-muted flex items-center justify-center hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            <Minus size={16} />
                          </button>
                          <div className="flex-1 text-center">
                            <p className="text-2xl font-black text-foreground">{episodesWatched}</p>
                            <p className="text-[10px] text-muted-foreground">of {entry.episodesTotal || '?'} eps</p>
                          </div>
                          <button
                            onClick={handleIncrementEpisode}
                            disabled={isSaving}
                            className="w-10 h-10 rounded-xl border border-primary/30 bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Plus size={16} />
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
                      <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Review</h3>
                        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{entry.review}</p>
                      </div>
                    )}

                    {/* Status */}
                    {entry.status && (
                      <div className="flex items-center gap-2">
                        {entry.status === 'Completed' ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : entry.status === 'Watching' ? (
                          <PlayCircle size={16} className="text-blue-500" />
                        ) : (
                          <Clock size={16} className="text-amber-500" />
                        )}
                        <span className="text-sm font-semibold text-muted-foreground">{entry.status}</span>
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
                            className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${selectedSeason === season ? 'bg-primary/10 text-primary border-primary/30 shadow-sm' : 'bg-muted border-border/50 text-muted-foreground hover:text-foreground'}`}
                          >
                            Season {season}
                          </button>
                        ))}
                        <button
                          onClick={handleOpenAddEpisode}
                          className="px-4 py-2 rounded-full text-xs font-bold border border-dashed border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer flex items-center gap-1"
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
                          const isWatched = episodesWatched >= (ep.number || idx + 1);
                          return (
                            <div
                              key={`${ep.season}-${ep.number}-${idx}`}
                              className={`rounded-xl border px-4 py-3 flex items-center gap-3 group transition-all ${isWatched ? 'border-green-500/20 bg-green-500/5' : 'border-border/50 bg-muted/10 hover:border-border'}`}
                            >
                              <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 font-mono text-xs font-bold"
                                style={{ background: isWatched ? 'rgba(34,197,94,0.15)' : 'rgba(128,128,128,0.1)', color: isWatched ? '#22c55e' : 'var(--muted-fg)' }}>
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
                                  onClick={() => handleRemoveEpisode(globalIdx)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
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
                className="relative w-full max-w-sm bg-card border border-border/80 rounded-2xl shadow-2xl p-6 z-10"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-foreground">Add New Episode</h3>
                  <button onClick={() => setShowAddEpisode(false)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
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
