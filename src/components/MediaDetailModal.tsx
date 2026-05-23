// src/components/MediaDetailModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { MediaEntry, EpisodeInfo, safeDateFormat, isEpisodic, formatRuntime } from '@/lib/db';
import { X, Edit2, Trash2, Calendar, Star, Check, Heart, Plus, Minus, ChevronDown, ChevronRight, Tv, Clock, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { useMedia } from '@/hooks/useMedia';
import { useRouter } from 'next/navigation';

interface MediaDetailModalProps {
  entry: MediaEntry;
  onClose: () => void;
  onSave: (entry: MediaEntry) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
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

  useEffect(() => {
    setReviewText(entry.review || '');
  }, [entry.review]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const currentIsEpisodic = isEpisodic(entry);

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
  }, [displayEpisodes, selectedSeason]);

  const filteredEpisodes = displayEpisodes.filter(ep => (ep.season || 1) === selectedSeason);
  const episodesWatched = entry.episodesWatched || 0;

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
          {entry.coverImage && <div className="absolute inset-0 h-[300px] overflow-hidden -z-10 pointer-events-none opacity-[0.06] blur-3xl"><img src={entry.coverImage} className="w-full h-full object-cover scale-150" /></div>}

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 relative z-10 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Badge variant={entry.type === 'Movie' ? 'movie' : entry.type === 'TV Show' || (entry.type as string) === 'Series' ? 'tv' : entry.type === 'Anime' ? 'anime' : 'primary'}>{entry.type === 'Anime' ? `Anime (${entry.animeType || 'Show'})` : entry.type}</Badge>
              {entry.status && entry.status !== 'Completed' && <Badge variant={entry.status === 'Watching' ? 'accent' : 'muted'}>{entry.status}</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onSave({ ...entry, favorite: !entry.favorite, updatedAt: Date.now() })} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border cursor-pointer ${entry.favorite ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-muted border-border/60 hover:text-foreground'}`}><Heart size={14} className={entry.favorite ? 'fill-red-500' : ''} /></button>

              <button
                onClick={() => {
                  router.push(`/edit/${entry.id}`);
                  onClose();
                }}
                className="w-8 h-8 rounded-xl bg-muted border border-border/60 flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer hover:text-primary"
              >
                <Edit2 size={14} strokeWidth={2} />
              </button>

              <button
                onClick={() => {
                  if (showDeleteConfirm) {
                    onDelete(entry.id!);
                  } else {
                    setShowDeleteConfirm(true);
                    setTimeout(() => setShowDeleteConfirm(false), 3000);
                  }
                }}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${showDeleteConfirm ? 'bg-red-500 border-red-600 text-white animate-pulse' : 'bg-muted border-border/60 hover:text-red-400'}`}
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted border border-border/60 flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer"><X size={15} strokeWidth={2.5} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-6 md:gap-8">
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
                  <span className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Universe / Collection</span>
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
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {entryGenres.map((g) => <span key={g} className="bg-muted border border-border/40 text-muted-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase">{g}</span>)}
                        {entry.runtime ? (
                          <span className="bg-muted/50 border border-border/40 text-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1" title="Total Runtime"><Clock size={10} /> {formatRuntime(entry.runtime)}</span>
                        ) : null}
                      </div>

                      {entry.releaseDate && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar size={14} className="text-primary" />
                          <span>Released: <strong className="text-foreground">{safeDateFormat(entry.releaseDate)}</strong></span>
                        </div>
                      )}
                    </div>

                    {currentIsEpisodic && (
                      <div className="bg-gradient-to-r from-muted/30 to-muted/10 border border-border/40 p-5 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase block">Progress</span>
                            <span className="text-[18px] font-extrabold tabular-nums mt-1 block">{episodesWatched} / {entry.episodesTotal || '?'} <span className="text-xs text-muted-foreground uppercase">episodes</span></span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleDecrementEpisode} disabled={episodesWatched <= 0} className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center disabled:opacity-40 cursor-pointer"><Minus size={13} /></button>
                            <button onClick={handleIncrementEpisode} className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"><Plus size={13} /></button>
                          </div>
                        </div>
                        {entry.episodesTotal && <div className="w-full bg-muted/60 mt-4 rounded-full h-2 overflow-hidden border border-border/20"><motion.div initial={{ width: 0 }} animate={{ width: `${(episodesWatched / Number(entry.episodesTotal)) * 100}%` }} className="bg-primary h-full rounded-full" /></div>}
                      </div>
                    )}

                    {/* Quick Watch Status Selector */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase block">Watch Status</span>
                      <div className="flex bg-muted/60 p-1 rounded-xl border border-border/40 w-fit gap-1">
                        {(['Plan to Watch', 'Watching', 'Completed'] as const).map((status) => {
                          const isActive = entry.status === status;
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={async () => {
                                let updated: MediaEntry = { ...entry, status, updatedAt: Date.now() };
                                if (status === 'Completed' && isEpisodic(entry) && entry.episodesTotal) {
                                  updated.episodesWatched = entry.episodesTotal;
                                }
                                await onSave(updated);
                              }}
                              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${isActive
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                }`}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive Rating Component */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase block">Rating</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                            <button
                              key={val}
                              type="button"
                              onMouseEnter={() => setHoveredStar(val)}
                              onMouseLeave={() => setHoveredStar(null)}
                              onClick={async () => {
                                await onSave({ ...entry, rating: val, updatedAt: Date.now() });
                              }}
                              className="cursor-pointer transition-transform active:scale-90 hover:scale-110"
                            >
                              <Star
                                size={18}
                                className={val <= (hoveredStar !== null ? hoveredStar : (entry.rating || 0)) ? 'text-amber-405 fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}
                              />
                            </button>
                          ))}
                        </div>
                        <span className="text-[14px] font-extrabold text-amber-500 font-display">{(entry.rating || 0)}/10</span>
                      </div>
                    </div>

                    {/* Inline Review Note Component */}
                    <div>
                      <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase mb-2 block">Review / Personal Note</span>
                      {isEditingReview ? (
                        <div className="space-y-3">
                          <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Write your review, rating thoughts or personal notes here..."
                            className="w-full bg-muted/20 border border-border/60 rounded-2xl p-4 text-[13px] outline-none focus:border-primary transition-colors min-h-[100px] resize-y text-foreground"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingReview(false);
                                setReviewText(entry.review || '');
                              }}
                              className="px-3.5 py-1.5 text-[11px] font-bold rounded-lg border border-border/60 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await onSave({ ...entry, review: reviewText.trim() || undefined, updatedAt: Date.now() });
                                setIsEditingReview(false);
                              }}
                              className="px-3.5 py-1.5 text-[11px] font-bold rounded-lg bg-primary text-white cursor-pointer"
                            >
                              Save Note
                            </button>
                          </div>
                        </div>
                      ) : entry.review ? (
                        <div className="bg-muted/20 border border-border/40 rounded-2xl p-5 text-[13px] leading-relaxed relative group min-h-[100px]">
                          {entry.review}
                          <button
                            onClick={() => setIsEditingReview(true)}
                            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 px-3 py-1.5 bg-muted/80 text-[10px] font-bold rounded-lg transition-all cursor-pointer border border-border/40 text-foreground"
                          >
                            <Edit2 size={10} /> Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsEditingReview(true)}
                          className="w-full py-6 border border-dashed border-border/60 hover:border-primary/45 rounded-2xl text-center text-muted-foreground hover:text-primary transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-muted/5"
                        >
                          <Plus size={16} />
                          <span className="text-[12.5px] font-semibold">Add a personal note or review</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Advanced Episodic List Viewer */}
                {viewTab === 'Episodes' && currentIsEpisodic && (
                  <div className="border border-border/40 rounded-2xl overflow-hidden bg-muted/10 flex flex-col h-full animate-fade-in relative">
                    <div className="px-5 py-3 bg-muted/20 border-b border-border/40 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <Tv size={14} className="text-primary" /><span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase">Episode Log</span>
                      </div>
                      <button onClick={handleOpenAddEpisode} className="text-[10px] font-bold tracking-widest uppercase bg-primary text-primary-foreground px-3 py-1.5 rounded-lg flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer">
                        <Plus size={12} /> Add
                      </button>
                    </div>
                    {seasons.length > 1 && (
                      <div className="flex gap-2 p-2 bg-muted/30 overflow-x-auto hide-scrollbar border-b border-border/40 shrink-0">
                        {seasons.map(s => (
                          <button key={s} onClick={() => setSelectedSeason(s)} className={`px-4 py-1.5 text-[11px] font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${selectedSeason === s ? 'bg-primary text-white shadow-sm' : 'bg-muted border border-border/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}>Season {s}</button>
                        ))}
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto divide-y divide-border/20 hide-scrollbar">
                      {filteredEpisodes.map((ep, idx) => {
                        const globalIdx = displayEpisodes.findIndex(e => e === ep);
                        const isWatched = globalIdx !== -1 ? globalIdx < episodesWatched : false;
                        return (
                          <div key={globalIdx} className={`w-full px-5 py-2.5 flex items-center gap-3 border-l-2 ${isWatched ? 'border-primary bg-primary/5' : 'border-transparent bg-transparent'}`}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isWatched ? 'bg-primary border-primary text-white' : 'border-border/60 bg-muted/50'}`}>
                              {isWatched && <Check size={11} strokeWidth={3} />}
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className={`text-[12px] font-bold truncate ${isWatched ? 'text-foreground' : 'text-muted-foreground'}`}>{ep.season ? `S${ep.season}E${ep.number || idx + 1}` : `Ep ${idx + 1}`}: {ep.name}</span>
                              <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                                {ep.runtime && <span className="flex items-center gap-1"><Clock size={9} /> {formatRuntime(ep.runtime)}</span>}
                                {ep.airDate && <span className="flex items-center gap-1"><Calendar size={9} /> Aired: {safeDateFormat(ep.airDate)}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {displayEpisodes.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                          <Tv size={32} className="mb-3 opacity-20" />
                          <span className="text-sm font-medium">No episodes logged yet.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Add Episode Overlay */}
              {showAddEpisode && (
                <div className="absolute inset-0 z-50 bg-card/95 backdrop-blur-md rounded-2xl flex items-center justify-center p-6 animate-fade-in border border-border/50">
                  <div className="w-full max-w-sm bg-muted/30 border border-border/60 rounded-2xl p-6 shadow-xl relative">
                    <button onClick={() => setShowAddEpisode(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
                    <h3 className="text-lg font-display font-bold mb-4">Add Episode</h3>

                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Season</label>
                          <input type="number" value={newEpSeason} onChange={e => setNewEpSeason(Number(e.target.value))} className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary transition-colors" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Episode</label>
                          <input type="number" value={newEpNumber} onChange={e => setNewEpNumber(Number(e.target.value))} className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary transition-colors" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</label>
                        <input type="text" value={newEpName} onChange={e => setNewEpName(e.target.value)} placeholder="e.g. Pilot" className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary transition-colors" />
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Runtime (min)</label>
                          <input type="number" value={newEpRuntime} onChange={e => setNewEpRuntime(e.target.value ? Number(e.target.value) : '')} placeholder="e.g. 45" className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary transition-colors" />
                        </div>
                        <div className="flex-[1.5] space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Air Date</label>
                          <input type="date" value={newEpDate} onChange={e => setNewEpDate(e.target.value)} className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary transition-colors" />
                        </div>
                      </div>

                      <button onClick={handleSaveNewEpisode} disabled={!newEpName.trim()} className="w-full mt-2 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl disabled:opacity-50 hover:bg-primary-hover transition-colors">
                        Save Episode
                      </button>
                    </div>
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