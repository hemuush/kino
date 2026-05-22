"use client";

import { useState, useEffect } from 'react';
import { MediaEntry, EpisodeInfo, safeDateFormat } from '@/lib/db';
import { X, Edit2, Trash2, Calendar, Star, Check, Heart, Plus, Minus, ChevronDown, ChevronRight, Tv, Clock, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';

interface MediaDetailModalProps {
  entry: MediaEntry;
  onClose: () => void;
  onSave: (entry: MediaEntry) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEditClick: () => void;
}

export function MediaDetailModal({ entry, onClose, onSave, onDelete, onEditClick }: MediaDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Record<number, boolean>>({ 1: true });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const isEpisodic = entry.type === 'Series' || (entry.type === 'Anime' && entry.animeType === 'Show');

  const handleIncrementEpisode = async () => {
    if (!isEpisodic) return;
    const nextWatched = (entry.episodesWatched || 0) + 1;
    if (entry.episodesTotal && nextWatched >= entry.episodesTotal) {
      await onSave({ ...entry, episodesWatched: entry.episodesTotal, status: 'Completed' });
      onEditClick(); // Prompt rating
      return;
    }
    await onSave({ ...entry, episodesWatched: nextWatched, status: entry.status === 'Plan to Watch' ? 'Watching' : entry.status });
  };

  const handleDecrementEpisode = async () => {
    if (!isEpisodic) return;
    const nextWatched = Math.max(0, (entry.episodesWatched || 0) - 1);
    await onSave({ ...entry, episodesWatched: nextWatched });
  };

  const handleQuickToggleFavorite = async () => {
    await onSave({ ...entry, favorite: !entry.favorite });
  };

  const handleDelete = async () => {
    if (entry.id) {
      await onDelete(entry.id);
      onClose();
    }
  };

  const displayEpisodes: EpisodeInfo[] = (entry.episodes && entry.episodes.length > 0)
    ? entry.episodes
    : (entry.episodesTotal ? Array.from({ length: Number(entry.episodesTotal) }, (_, i) => ({ name: `Episode ${i + 1}`, season: 1, number: i + 1 })) : []);

  const episodesBySeason = displayEpisodes.reduce<Record<number, { episode: EpisodeInfo; globalIndex: number }[]>>((acc, ep, index) => {
    let s = 1;
    if (ep && ep.season !== undefined && ep.season !== null) {
      const parsed = parseInt(ep.season as any, 10);
      if (!isNaN(parsed) && parsed > 0) { s = parsed; }
    }
    if (!acc[s]) acc[s] = [];
    acc[s].push({ episode: { ...ep, season: s }, globalIndex: index });
    return acc;
  }, {});

  const episodesWatched = entry.episodesWatched || 0;
  const activeEpisodeIndex = episodesWatched - 1;
  const activeEpisode = isEpisodic && activeEpisodeIndex >= 0 && displayEpisodes[activeEpisodeIndex] ? displayEpisodes[activeEpisodeIndex] : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center text-foreground">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 80, scale: 0.95 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[85vh] sm:max-h-[92vh] bg-card rounded-t-[28px] sm:rounded-2xl overflow-hidden z-[101] flex flex-col shadow-2xl border border-border/80"
        >
          {entry.coverImage && (
            <div className="absolute inset-0 h-[300px] overflow-hidden -z-10 pointer-events-none opacity-[0.06] blur-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.coverImage} alt="" className="w-full h-full object-cover scale-150" />
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 relative z-10 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Badge variant="primary">{entry.type === 'Anime' ? `Anime (${entry.animeType || 'Show'})` : entry.type}</Badge>
              {entry.status && entry.status !== 'Completed' && (
                <Badge variant={entry.status === 'Watching' ? 'accent' : 'muted'}>{entry.status}</Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleQuickToggleFavorite} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${entry.favorite ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-muted border-border/60 hover:text-foreground'}`}>
                <Heart size={14} className={entry.favorite ? 'fill-red-500' : ''} />
              </button>
              <button onClick={onEditClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all text-xs font-bold">
                <Edit2 size={12} strokeWidth={2.5} /> Edit
              </button>
              <button onClick={() => setShowDeleteConfirm(!showDeleteConfirm)} className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${showDeleteConfirm ? 'bg-red-500 border-red-600 text-white animate-pulse' : 'bg-muted border-border/60 hover:text-red-400'}`}>
                <Trash2 size={14} strokeWidth={2} />
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted border border-border/60 flex items-center justify-center hover:bg-muted/80 transition-colors">
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {showDeleteConfirm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-500/10 border-b border-red-500/20 px-6 py-3 flex items-center justify-between z-10">
              <span className="text-[12px] font-semibold text-red-400">Are you sure you want to delete this?</span>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1 text-[11px] font-bold bg-muted text-foreground rounded-md">Cancel</button>
                <button onClick={handleDelete} className="px-3 py-1 text-[11px] font-bold bg-red-500 text-white rounded-md">Delete</button>
              </div>
            </motion.div>
          )}

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-6 md:gap-8">
            {/* Left: Poster */}
            <div className="w-[120px] sm:w-[220px] md:w-[260px] shrink-0 mx-auto sm:mx-0">
              <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-muted border border-border/80 shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.coverImage || `https://placehold.co/300x450/0b0f19/1e293b?text=${encodeURIComponent(entry.title.substring(0, 10))}`} alt={entry.title} className="w-full h-full object-cover" />
              </div>

              {/* Franchise Badge below poster if exists */}
              {entry.franchise && (
                <div className="mt-4 w-full bg-primary/10 border border-primary/20 rounded-xl p-3 flex flex-col items-center text-center">
                  <Film size={14} className="text-primary mb-1" />
                  <span className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Collection</span>
                  <span className="text-[12px] font-bold text-foreground mt-0.5">{entry.franchise}</span>
                </div>
              )}
            </div>

            {/* Right: Info */}
            <div className="flex-1 flex flex-col space-y-6 w-full">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-center sm:text-left">{entry.title}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-4">
                  {entry.genre?.map((g) => (
                    <span key={g} className="bg-muted border border-border/40 text-muted-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase">{g}</span>
                  ))}
                  {entry.runtime && (
                    <span className="bg-muted/50 border border-border/40 text-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                      <Clock size={10} /> {entry.runtime} min
                    </span>
                  )}
                </div>

                {entry.releaseDate && (
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground">
                    <Calendar size={14} className="text-primary" />
                    <span>Released: <strong className="text-foreground">{new Date(entry.releaseDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong></span>
                  </div>
                )}
              </div>

              {/* Watch Progress */}
              {isEpisodic && (
                <div className="bg-gradient-to-r from-muted/30 to-muted/10 border border-border/40 p-5 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase block">Progress</span>
                      <span className="text-[18px] font-extrabold tabular-nums mt-1 block">
                        {episodesWatched} / {entry.episodesTotal || '?'} <span className="text-xs text-muted-foreground uppercase">episodes</span>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleDecrementEpisode} disabled={episodesWatched <= 0} className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center disabled:opacity-40"><Minus size={13} /></button>
                      <button onClick={handleIncrementEpisode} disabled={entry.episodesTotal ? episodesWatched >= entry.episodesTotal : false} className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center disabled:opacity-40"><Plus size={13} /></button>
                    </div>
                  </div>
                  {entry.episodesTotal && (
                    <div className="w-full bg-muted/60 mt-4 rounded-full h-2 overflow-hidden border border-border/20">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(episodesWatched / Number(entry.episodesTotal)) * 100}%` }} className="bg-primary h-full rounded-full" />
                    </div>
                  )}
                </div>
              )}

              {/* Rating */}
              {(entry.status === 'Completed' || (entry.rating && entry.rating > 0)) && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                      <Star key={val} size={16} className={val <= (entry.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'} />
                    ))}
                  </div>
                  <span className="text-[14px] font-extrabold text-amber-500 font-display">{(entry.rating || 0)}/10</span>
                </div>
              )}

              {/* Review block */}
              <div>
                <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase mb-2 block">Review</span>
                <div className="bg-muted/20 border border-border/40 rounded-2xl p-5 text-[13px] leading-relaxed relative group min-h-[100px]">
                  {entry.review || <em className="text-muted-foreground/50">No review added.</em>}
                  <button onClick={onEditClick} className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 px-3 py-1.5 bg-muted/80 text-[10px] font-bold rounded-lg transition-all"><Edit2 size={10} /> Edit</button>
                </div>
              </div>

              {/* Episodes List (Viewer) */}
              {isEpisodic && displayEpisodes.length > 0 && (
                <div className="border border-border/40 rounded-2xl overflow-hidden bg-muted/10">
                  <div className="px-5 py-3 bg-muted/20 border-b border-border/40 flex items-center gap-2">
                    <Tv size={14} className="text-primary" />
                    <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase">Episodes</span>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto divide-y divide-border/20">
                    {displayEpisodes.map((ep, globalIndex) => {
                      const isWatched = globalIndex < episodesWatched;
                      return (
                        <div key={globalIndex} className={`w-full px-5 py-2.5 flex items-center gap-3 border-l-2 ${isWatched ? 'border-primary bg-primary/5' : 'border-transparent bg-transparent'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isWatched ? 'bg-primary border-primary text-white' : 'border-border/60 bg-muted/50'}`}>
                            {isWatched && <Check size={11} strokeWidth={3} />}
                          </div>
                          <span className={`text-[12px] font-medium ${isWatched ? 'text-foreground' : 'text-muted-foreground'}`}>{ep.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}