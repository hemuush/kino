"use client";

import { useState, useEffect } from 'react';
import { MediaEntry, EpisodeInfo } from '@/lib/db';
import { X, Edit2, Trash2, Calendar, Star, Check, Heart, Plus, Minus, ChevronDown, ChevronRight, Tv, Clock, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { useMedia } from '@/hooks/useMedia';

interface MediaDetailModalProps {
  entry: MediaEntry;
  onClose: () => void;
  onSave: (entry: MediaEntry) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEditClick: () => void;
}

export function MediaDetailModal({ entry, onClose, onSave, onDelete, onEditClick }: MediaDetailModalProps) {
  const { genres, franchises } = useMedia();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Record<number, boolean>>({ 1: true });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const isEpisodic = entry.type === 'Series' || (entry.type === 'Anime' && entry.animeType === 'Show');

  // Resolve Relationships
  const entryFranchise = entry.franchiseId ? franchises.find(f => f.id === entry.franchiseId) : null;
  const entryGenres = (entry.genreIds || []).map(id => genres.find(g => g.id === id)?.name).filter(Boolean);

  const displayEpisodes: EpisodeInfo[] = (entry.episodes && entry.episodes.length > 0)
    ? entry.episodes
    : (entry.episodesTotal ? Array.from({ length: Number(entry.episodesTotal) }, (_, i) => ({ name: `Episode ${i + 1}`, season: 1, number: i + 1 })) : []);

  const episodesBySeason = displayEpisodes.reduce<Record<number, { episode: EpisodeInfo; globalIndex: number }[]>>((acc, ep, index) => {
    const s = ep.season || 1;
    if (!acc[s]) acc[s] = [];
    acc[s].push({ episode: ep, globalIndex: index });
    return acc;
  }, {});

  const episodesWatched = entry.episodesWatched || 0;
  const activeEpisode = isEpisodic && episodesWatched > 0 ? displayEpisodes[episodesWatched - 1] : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center text-foreground">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

        <motion.div initial={{ opacity: 0, y: 80, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 80, scale: 0.95 }} className="relative w-full max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[85vh] sm:max-h-[92vh] bg-card rounded-t-[28px] sm:rounded-2xl overflow-hidden z-[101] flex flex-col shadow-2xl border border-border/80">

          {entry.coverImage && <div className="absolute inset-0 h-[300px] overflow-hidden -z-10 pointer-events-none opacity-[0.06] blur-3xl"><img src={entry.coverImage} className="w-full h-full object-cover scale-150" /></div>}

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 relative z-10 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Badge variant="primary">{entry.type === 'Anime' ? `Anime (${entry.animeType || 'Show'})` : entry.type}</Badge>
              {entry.status && entry.status !== 'Completed' && <Badge variant={entry.status === 'Watching' ? 'accent' : 'muted'}>{entry.status}</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onSave({ ...entry, favorite: !entry.favorite })} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border cursor-pointer ${entry.favorite ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-muted border-border/60 hover:text-foreground'}`}><Heart size={14} className={entry.favorite ? 'fill-red-500' : ''} /></button>
              <button onClick={onEditClick} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all text-xs font-bold cursor-pointer"><Edit2 size={12} strokeWidth={2.5} /> Edit</button>
              <button onClick={() => setShowDeleteConfirm(!showDeleteConfirm)} className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${showDeleteConfirm ? 'bg-red-500 border-red-600 text-white animate-pulse' : 'bg-muted border-border/60 hover:text-red-400'}`}><Trash2 size={14} strokeWidth={2} /></button>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted border border-border/60 flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer"><X size={15} strokeWidth={2.5} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-6 md:gap-8">
            <div className="w-[120px] sm:w-[220px] md:w-[260px] shrink-0 mx-auto sm:mx-0">
              <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-muted border border-border/80 shadow-xl">
                <img src={entry.coverImage || `https://placehold.co/300x450/0b0f19/1e293b?text=${encodeURIComponent(entry.title.substring(0, 10))}`} className="w-full h-full object-cover" />
              </div>

              {entryFranchise && (
                <div className="mt-4 w-full bg-primary/10 border border-primary/20 rounded-xl p-3 flex flex-col items-center text-center shadow-inner">
                  <Film size={14} className="text-primary mb-1" />
                  <span className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Universe</span>
                  <span className="text-[12px] font-bold text-foreground mt-0.5">{entryFranchise.name}</span>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col space-y-6 w-full">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">{entry.title}</h2>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {entryGenres.map((g) => <span key={g} className="bg-muted border border-border/40 text-muted-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase">{g}</span>)}
                  {!isEpisodic && entry.runtime && (
                    <span className="bg-muted/50 border border-border/40 text-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><Clock size={10} /> {entry.runtime} min</span>
                  )}
                </div>
              </div>

              {isEpisodic && (
                <div className="bg-gradient-to-r from-muted/30 to-muted/10 border border-border/40 p-5 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase block">Progress</span>
                      <span className="text-[18px] font-extrabold tabular-nums mt-1 block">{episodesWatched} / {entry.episodesTotal || '?'} <span className="text-xs text-muted-foreground uppercase">episodes</span></span>
                    </div>
                  </div>
                  {entry.episodesTotal && <div className="w-full bg-muted/60 mt-4 rounded-full h-2 overflow-hidden border border-border/20"><motion.div initial={{ width: 0 }} animate={{ width: `${(episodesWatched / Number(entry.episodesTotal)) * 100}%` }} className="bg-primary h-full rounded-full" /></div>}
                </div>
              )}

              {isEpisodic && displayEpisodes.length > 0 && (
                <div className="border border-border/40 rounded-2xl overflow-hidden bg-muted/10">
                  <div className="px-5 py-3 bg-muted/20 border-b border-border/40 flex items-center gap-2">
                    <Tv size={14} className="text-primary" /><span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase">Episodes</span>
                  </div>
                  <div className="max-h-[250px] overflow-y-auto divide-y divide-border/20">
                    {displayEpisodes.map((ep, idx) => {
                      const isWatched = idx < episodesWatched;
                      return (
                        <div key={idx} className={`w-full px-5 py-2.5 flex items-center gap-3 border-l-2 ${isWatched ? 'border-primary bg-primary/5' : 'border-transparent bg-transparent'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isWatched ? 'bg-primary border-primary text-white' : 'border-border/60 bg-muted/50'}`}>
                            {isWatched && <Check size={11} strokeWidth={3} />}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className={`text-[12px] font-bold truncate ${isWatched ? 'text-foreground' : 'text-muted-foreground'}`}>{ep.season ? `S${ep.season}E${ep.number || idx + 1}` : `Ep ${idx + 1}`}: {ep.name}</span>
                            {ep.runtime && <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Clock size={9} /> {ep.runtime} min</span>}
                          </div>
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