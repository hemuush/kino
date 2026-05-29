// src/components/MediaDetailModal.tsx
"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react';
import { MediaEntry, EpisodeInfo, safeDateFormat, isEpisodic, formatRuntime, getWatchedRuntimeMinutes } from '@/lib/db';
import { X, Edit2, Trash2, Calendar, Star, Check, Heart, Plus, Minus, Tv, Clock, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { useMedia } from '@/context/MediaContext';
import { useRouter } from 'next/navigation';

interface MediaDetailModalProps {
  entry: MediaEntry;
  onClose: () => void;
  onSave: (entry: MediaEntry) => Promise<void>;
  // FIX: Updated to accept string | number to match MediaEntry['id']
  onDelete: (id: string | number) => Promise<void>;
}

export function MediaDetailModal({ entry, onClose, onSave, onDelete }: MediaDetailModalProps) {
  const router = useRouter();
  const { genres, franchises } = useMedia();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [viewTab, setViewTab] = useState<'Details' | 'Episodes'>('Details');

  const [showAddEpisode, setShowAddEpisode] = useState(false);
  const [newEpSeason, setNewEpSeason] = useState<number>(1);
  const [newEpNumber, setNewEpNumber] = useState<number>(1);
  const [newEpName, setNewEpName] = useState('');
  const [newEpRuntime, setNewEpRuntime] = useState<number | ''>('');
  const [newEpDate, setNewEpDate] = useState('');

  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [reviewText, setReviewText] = useState(entry.review || '');

  // FIX: Accessibility - Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setReviewText(entry.review || '');
  }, [entry.review]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const currentIsEpisodic = isEpisodic(entry);

  // FIX: Force tab to Details if user is on Episodes but media type changed to Movie
  useEffect(() => {
    if (!currentIsEpisodic && viewTab === 'Episodes') {
      setViewTab('Details');
    }
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

    const updatedEpisodes = [...(entry.episodes || []), newEpisode];
    const newTotal = updatedEpisodes.length;

    await onSave({
      ...entry,
      episodes: updatedEpisodes,
      episodesTotal: newTotal,
      episodesWatched: episodesWatched + 1,
      status: entry.status === 'Plan to Watch' ? 'Watching' : entry.status,
      updatedAt: Date.now()
    });

    setShowAddEpisode(false);
  };

  const handleIncrementEpisode = async () => {
    if (!currentIsEpisodic) return;
    if (entry.episodesTotal && episodesWatched >= entry.episodesTotal) {
      handleOpenAddEpisode();
      return;
    }
    const nextWatched = episodesWatched + 1;
    await onSave({
      ...entry,
      episodesWatched: nextWatched,
      status: entry.status === 'Plan to Watch' ? 'Watching' : entry.status,
      updatedAt: Date.now()
    });
  };

  const handleDecrementEpisode = async () => {
    if (!currentIsEpisodic) return;
    const nextWatched = Math.max(0, episodesWatched - 1);
    await onSave({ ...entry, episodesWatched: nextWatched, updatedAt: Date.now() });
  };

  const handleEdit = () => {
    router.push(`/edit/${entry.id}`);
    onClose();
  };

  const handleDeleteClick = () => {
    if (showDeleteConfirm) {
      onDelete(entry.id!);
      return;
    }

    setShowDeleteConfirm(true);
    setTimeout(() => setShowDeleteConfirm(false), 3000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center text-foreground">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.95 }}
          className={`relative w-full ${currentIsEpisodic ? 'max-w-2xl md:max-w-4xl lg:max-w-5xl' : 'max-w-2xl'} h-[85vh] sm:h-[85vh] bg-card rounded-t-[28px] sm:rounded-2xl overflow-hidden z-[101] flex flex-col shadow-2xl border border-border/80`}
        >
          {entry.coverImage && <div className="absolute inset-0 h-[300px] overflow-hidden -z-10 pointer-events-none opacity-[0.06] blur-3xl"><img src={entry.coverImage} className="w-full h-full object-cover scale-150" alt="background" /></div>}

          {/* Header */}
          <div className="sticky top-0 flex items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border/60 z-20 bg-card/95 backdrop-blur-xl shadow-sm">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Badge variant={entry.type === 'Movie' ? 'movie' : entry.type === 'TV Show' || (entry.type as string) === 'Series' ? 'tv' : entry.type === 'Anime' ? 'anime' : 'primary'}>{entry.type === 'Anime' ? `Anime (${entry.animeType || 'Show'})` : entry.type}</Badge>
              {entry.status && entry.status !== 'Completed' && <Badge variant={entry.status === 'Watching' ? 'accent' : 'muted'}>{entry.status}</Badge>}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button onClick={() => onSave({ ...entry, favorite: !entry.favorite, updatedAt: Date.now() })} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border cursor-pointer ${entry.favorite ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-muted border-border/60 hover:text-foreground'}`}><Heart size={14} className={entry.favorite ? 'fill-red-500' : ''} /></button>

              <button
                onClick={handleEdit}
                className="w-8 h-8 rounded-xl bg-muted border border-border/60 flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer hover:text-primary"
                title="Edit"
              >
                <Edit2 size={14} strokeWidth={2} />
              </button>

              <button
                onClick={handleDeleteClick}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${showDeleteConfirm ? 'bg-red-500 border-red-600 text-white animate-pulse' : 'bg-muted border-border/60 hover:text-red-400'}`}
                title={showDeleteConfirm ? 'Confirm delete' : 'Delete'}
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted border border-border/60 flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer" title="Close"><X size={15} strokeWidth={2.5} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-4 sm:px-6 py-5 sm:py-6 flex flex-col sm:flex-row gap-5 sm:gap-6 md:gap-8">
            <div className="w-[120px] sm:w-[220px] md:w-[260px] shrink-0 mx-auto sm:mx-0 overflow-y-auto hide-scrollbar pb-6">
              <div className="aspect-[2/3] rounded-[24px] overflow-hidden bg-card glass shadow-2xl shadow-black/20 border border-border/60 relative group ring-1 ring-white/5">
                {entry.coverImage ? (
                  <img
                    src={entry.coverImage}
                    alt={entry.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-background/50 p-6">
                    <span className="text-xs sm:text-sm text-muted-foreground/30 font-black uppercase tracking-widest text-center leading-relaxed max-w-[80%] line-clamp-4 shadow-sm">{entry.title}</span>
                  </div>
                )}
                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] pointer-events-none" />
              </div>

              {entryFranchise && (
                <div className="mt-4 w-full bg-primary/10 border border-primary/20 rounded-xl p-3 flex flex-col items-center text-center shadow-inner">
                  <Film size={14} className="text-primary mb-1" />
                  <span className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Universe</span>
                  <span className="text-[12px] font-bold text-foreground mt-0.5">{entryFranchise.name}</span>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
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

              <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-6 hide-scrollbar">
                {viewTab === 'Details' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="min-w-0">
                      <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 break-words">{entry.title}</h2>
                      <div className="mb-4 grid grid-cols-3 gap-2 sm:hidden">
                        <button
                          onClick={() => onSave({ ...entry, favorite: !entry.favorite, updatedAt: Date.now() })}
                          className={`min-h-10 rounded-xl border px-3 text-xs font-bold flex items-center justify-center gap-1.5 ${entry.favorite ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-card border-border text-muted-foreground'}`}
                        >
                          <Heart size={14} className={entry.favorite ? 'fill-red-500' : ''} /> Fav
                        </button>
                        <button
                          onClick={handleEdit}
                          className="min-h-10 rounded-xl border border-primary/25 bg-primary/10 px-3 text-xs font-bold text-primary flex items-center justify-center gap-1.5"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          onClick={handleDeleteClick}
                          className={`min-h-10 rounded-xl border px-3 text-xs font-bold flex items-center justify-center gap-1.5 ${showDeleteConfirm ? 'border-red-500 bg-red-500 text-white' : 'border-red-500/25 bg-red-500/10 text-red-500'}`}
                        >
                          <Trash2 size={14} /> {showDeleteConfirm ? 'Sure?' : 'Delete'}
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-4 min-w-0">
                        {entryGenres.map((g) => <span key={g} className="bg-muted border border-border/40 text-muted-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase">{g}</span>)}
                        {entry.runtime ? (
                          <span className="bg-muted/50 border border-border/40 text-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><Clock size={10} /> {formatRuntime(entry.runtime)}</span>
                        ) : null}
                      </div>
                      {entry.releaseDate && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                          <Calendar size={14} className="text-primary shrink-0" />
                          <span className="min-w-0 break-words">Released: <strong className="text-foreground">{safeDateFormat(entry.releaseDate)}</strong></span>
                        </div>
                      )}
                    </div>
                    {entry.review && (
                      <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Review</h3>
                        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{entry.review}</p>
                      </div>
                    )}
                    {entry.rating > 0 && (
                      <div className="flex flex-wrap items-center gap-2 text-amber-400 font-semibold">
                        <span>★</span>
                        <span>{entry.rating}/10</span>
                      </div>
                    )}
                    {currentIsEpisodic && (
                      <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Progress</h3>
                        <p className="text-sm text-foreground mb-3">{episodesWatched}/{entry.episodesTotal || '?' } episodes watched</p>
                        {!!watchedRuntimeMinutes && (
                          <p className="text-xs text-muted-foreground mb-3">Watched time: {formatRuntime(watchedRuntimeMinutes)}</p>
                        )}
                        <div className="flex gap-2">
                          <button onClick={handleDecrementEpisode} className="px-3 py-1.5 rounded-lg border border-border/60 bg-card text-sm">-1</button>
                          <button onClick={handleIncrementEpisode} className="px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-sm text-primary">+1</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {viewTab === 'Episodes' && currentIsEpisodic && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 flex-wrap">
                      {seasons.map((season) => (
                        <button
                          key={season}
                          onClick={() => setSelectedSeason(season)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border ${selectedSeason === season ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted border-border/50 text-muted-foreground'}`}
                        >
                          Season {season}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {filteredEpisodes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No episodes found for this season.</p>
                      ) : (
                        filteredEpisodes.map((ep, idx) => (
                          <div key={`${ep.season}-${ep.number}-${idx}`} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                            <p className="text-sm font-semibold text-foreground">
                              S{ep.season || 1}E{ep.number || idx + 1}: {ep.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {ep.airDate ? safeDateFormat(ep.airDate) : 'Unknown date'} {ep.runtime ? `• ${formatRuntime(ep.runtime)}` : ''}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
