"use client";

import { useState, useEffect } from 'react';
import { MediaEntry, EpisodeInfo, safeDateFormat } from '@/lib/db';
import { X, Edit2, Trash2, Calendar, Star, Check, Heart, Plus, Minus, ChevronDown, ChevronRight, Tv } from 'lucide-react';
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

  const handleIncrementEpisode = async () => {
    if (entry.type === 'Movie') return;
    const nextWatched = (entry.episodesWatched || 0) + 1;

    if (entry.episodesTotal && nextWatched >= entry.episodesTotal) {
      await onSave({
        ...entry,
        episodesWatched: entry.episodesTotal,
        status: 'Completed',
      });
      // Trigger edit to prompt for rating
      onEditClick();
      return;
    }

    await onSave({
      ...entry,
      episodesWatched: nextWatched,
      status: entry.status === 'Plan to Watch' ? 'Watching' : entry.status,
    });
  };

  const handleDecrementEpisode = async () => {
    if (entry.type === 'Movie') return;
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
    : (entry.episodesTotal ? Array.from({ length: Number(entry.episodesTotal) }, (_, i) => ({
      name: `Episode ${i + 1}`,
      season: 1,
      number: i + 1,
    })) : []);

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
  const activeEpisode = entry.type !== 'Movie' && activeEpisodeIndex >= 0 && displayEpisodes[activeEpisodeIndex]
    ? displayEpisodes[activeEpisodeIndex]
    : null;

  const currentOrNextEpisode = entry.type !== 'Movie' && displayEpisodes.length > 0
    ? (displayEpisodes[episodesWatched] || displayEpisodes[displayEpisodes.length - 1] || null)
    : null;

  const handleEpisodeClick = async (globalIndex: number, isCurrentlyWatched: boolean) => {
    if (entry.type === 'Movie') return;
    const newWatched = isCurrentlyWatched ? globalIndex : globalIndex + 1;
    const finalTotal = entry.episodesTotal || displayEpisodes.length;

    if (newWatched >= finalTotal) {
      await onSave({ ...entry, episodesWatched: newWatched, status: 'Completed' });
      onEditClick();
    } else {
      await onSave({
        ...entry,
        episodesWatched: newWatched,
        status: (newWatched > 0 && entry.status === 'Plan to Watch') ? 'Watching' : entry.status,
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center text-foreground">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[85vh] sm:max-h-[92vh] bg-card rounded-t-[28px] sm:rounded-2xl overflow-hidden z-[101] flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-border/80 dark:border-primary/15 backdrop-blur-xl"
        >
          {entry.coverImage && (
            <div className="absolute inset-0 h-[250px] overflow-hidden -z-10 pointer-events-none opacity-[0.08] blur-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.coverImage} alt="" className="w-full h-full object-cover scale-150" />
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 relative z-10">
            <div className="flex items-center gap-2">
              <Badge variant="primary">{entry.type}</Badge>
              {entry.status && entry.status !== 'Completed' && (
                <Badge variant={entry.status === 'Watching' ? 'accent' : 'muted'}>
                  {entry.status}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickToggleFavorite}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border shadow-sm ${entry.favorite
                  ? 'bg-red-500/10 border-red-500/30 text-red-500'
                  : 'bg-muted border-border/60 hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Heart size={14} className={entry.favorite ? 'fill-red-500' : ''} />
              </button>

              <button
                onClick={onEditClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all cursor-pointer text-xs font-bold"
              >
                <Edit2 size={12} strokeWidth={2.5} /> Edit Details
              </button>

              <button
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm ${showDeleteConfirm
                  ? 'bg-red-500 border-red-600 text-white animate-pulse'
                  : 'bg-muted border-border/60 hover:bg-red-500/10 hover:text-red-400 text-foreground'
                  }`}
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-muted border border-border/60 flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer shadow-sm"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Delete Confirm */}
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-500/10 border-b border-red-500/20 px-6 py-3.5 flex items-center justify-between z-10"
            >
              <span className="text-[12px] font-semibold text-red-400">Are you sure you want to delete this title?</span>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-muted hover:bg-card-hover text-foreground cursor-pointer">Cancel</button>
                <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-500 hover:bg-red-600 text-white cursor-pointer">Delete</button>
              </div>
            </motion.div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8">
            {/* Left Side: Poster & Mobile Titles */}
            <div className="flex flex-row sm:flex-col gap-4 shrink-0 items-start w-full sm:w-[200px] md:w-[260px] lg:w-[300px]">
              <div className="w-[90px] sm:w-full shrink-0">
                <div className="aspect-[2/3] rounded-[20px] overflow-hidden bg-muted border border-border/80 shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.coverImage || `https://placehold.co/300x450/0b0f19/1e293b?text=${encodeURIComponent(entry.title.substring(0, 10))}`}
                    alt={entry.title}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>

              {/* Mobile Info View */}
              <div className="flex-1 min-w-0 sm:hidden">
                <h2 className="font-display text-lg font-extrabold tracking-tight leading-tight mb-1.5 text-foreground">
                  {entry.title}
                </h2>
                {entry.genre && entry.genre.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {entry.genre.map((g) => (
                      <Badge key={g} variant="muted" className="lowercase font-medium px-2.5 py-0.5 rounded-lg text-[9px]">{g}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  {entry.status !== 'Completed' && (
                    <div className="flex items-center gap-1.5 text-[11px] text-primary font-semibold">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                      <span>Currently {entry.status === 'Watching' ? 'Watching' : 'Planned'}</span>
                    </div>
                  )}
                  {entry.type === 'Movie' && entry.releaseDate && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar size={11} className="text-muted-foreground" />
                      <span>Released: {new Date(entry.releaseDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </div>
                  )}
                  {entry.type !== 'Movie' && activeEpisode && (
                    <div className="flex items-start gap-1 text-[11px] text-muted-foreground">
                      <Calendar size={11} className="text-primary mt-0.5" />
                      <span>Last Ep: <strong className="text-foreground">S{activeEpisode.season}E{activeEpisode.number}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side: Desktop Info & Details */}
            <div className="flex-1 flex flex-col space-y-5 sm:space-y-6 min-w-0 w-full">
              {/* Desktop Details */}
              <div className="hidden sm:block">
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight mb-2">{entry.title}</h2>
                {entry.genre && entry.genre.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {entry.genre.map((g) => (
                      <span key={g} className="bg-muted border border-border/40 text-muted-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{g}</span>
                    ))}
                  </div>
                )}

                <div className="mt-3.5 space-y-1.5">
                  {entry.type === 'Movie' ? (
                    entry.releaseDate && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar size={14} className="text-primary" />
                        <span>Released: <strong className="text-foreground">{new Date(entry.releaseDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong></span>
                      </div>
                    )
                  ) : (
                    activeEpisode ? (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Calendar size={14} className="text-primary mt-0.5" />
                        <div className="flex flex-col">
                          <span>Last Watched Ep: <strong className="text-foreground">S{activeEpisode.season}E{activeEpisode.number} - {activeEpisode.name}</strong></span>
                        </div>
                      </div>
                    ) : (
                      entry.releaseDate && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar size={14} className="text-primary" />
                          <span>Premiere: <strong className="text-foreground">{new Date(entry.releaseDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong></span>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>

              {/* Progress (Series only) */}
              {entry.type !== 'Movie' && (
                <div className="bg-muted/30 border border-border/40 p-5 rounded-[20px] space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase block">Watch Progress</span>
                      <span className="text-[18px] font-extrabold text-foreground tracking-tight tabular-nums mt-1 block">
                        {episodesWatched} / {entry.episodesTotal || '?'} <span className="text-xs font-semibold text-muted-foreground uppercase">episodes</span>
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={handleDecrementEpisode} disabled={episodesWatched <= 0} className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted text-muted-foreground transition-all cursor-pointer disabled:opacity-40"><Minus size={13} strokeWidth={2.5} /></button>
                      <button onClick={handleIncrementEpisode} disabled={entry.episodesTotal ? episodesWatched >= entry.episodesTotal : false} className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"><Plus size={13} strokeWidth={2.5} /></button>
                    </div>
                  </div>
                  {entry.episodesTotal && (
                    <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden border border-border/20">
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
                      <Star key={val} size={16} className={val <= (entry.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/15'} />
                    ))}
                  </div>
                  <span className="text-[13px] font-extrabold text-amber-500 font-display">{(entry.rating || 0)}/10</span>
                </div>
              )}

              {/* Review */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase mb-2">My Notes & Review</span>
                <div className="bg-muted/30 border border-border/40 rounded-[20px] p-5 text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap relative group/notes min-h-[120px] shadow-sm">
                  {entry.review ? entry.review : <em className="text-muted-foreground/50 font-normal">No review or notes added yet. Click edit to write something!</em>}
                  <button onClick={onEditClick} className="absolute bottom-3 right-3 opacity-0 group-hover/notes:opacity-100 flex items-center gap-1 px-3.5 py-1.5 bg-muted/80 border border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full text-[11px] font-semibold transition-all cursor-pointer shadow-sm">
                    <Edit2 size={11} strokeWidth={2.2} /> Edit Notes
                  </button>
                </div>
              </div>

              {/* Episode Tracker */}
              {entry.type !== 'Movie' && displayEpisodes.length > 0 && (
                <div className="border border-border/40 rounded-[20px] overflow-hidden bg-muted/10 shadow-sm">
                  <div className="px-5 py-4 bg-muted/20 border-b border-border/40 flex items-center gap-2">
                    <Tv size={14} className="text-primary" />
                    <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase flex-1">Episodes & Seasons</span>
                    <span className="text-[11px] bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-lg font-bold">{episodesWatched} / {displayEpisodes.length}</span>
                  </div>

                  <div className="divide-y divide-border/20">
                    {Object.keys(episodesBySeason).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b).map((seasonNum) => {
                      const seasonEps = episodesBySeason[seasonNum] || [];
                      const activeSeason = currentOrNextEpisode?.season || 1;
                      const totalSeasonsCount = Object.keys(episodesBySeason).filter(k => !isNaN(Number(k)) && Number(k) > 0).length;
                      const isExpanded = expandedSeasons[seasonNum] !== undefined ? expandedSeasons[seasonNum] : (totalSeasonsCount === 1 || seasonNum === activeSeason);
                      const watchedInSeason = seasonEps.filter(ep => ep.globalIndex < episodesWatched).length;
                      const totalInSeason = seasonEps.length;

                      return (
                        <div key={seasonNum} className="flex flex-col">
                          <button onClick={() => setExpandedSeasons(prev => ({ ...prev, [seasonNum]: !prev[seasonNum] }))} className="w-full px-5 py-3.5 hover:bg-muted/30 transition-colors flex items-center justify-between text-left cursor-pointer border-b border-border/20">
                            <div className="flex items-center gap-2.5">
                              {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                              <span className="text-[13px] font-bold text-foreground">Season {seasonNum}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {watchedInSeason === totalInSeason ? (
                                <span className="text-[10px] text-emerald-500 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">Completed</span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground bg-muted/60 border border-border/40 px-2 py-0.5 rounded-md">{watchedInSeason} / {totalInSeason}</span>
                              )}
                            </div>
                          </button>

                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-muted/5">
                                <div className="divide-y divide-border/20 max-h-[220px] overflow-y-auto">
                                  {seasonEps.map(({ episode, globalIndex }) => {
                                    const isWatched = globalIndex < episodesWatched;
                                    return (
                                      <button key={globalIndex} onClick={() => handleEpisodeClick(globalIndex, isWatched)} className={`w-full px-5 py-3 hover:bg-primary/5 transition-all flex items-center justify-between text-left border-l-2 ${isWatched ? 'border-primary bg-primary/5' : 'border-transparent'} cursor-pointer group`}>
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isWatched ? 'bg-primary border-primary text-white' : 'border-border/60 bg-muted/50 group-hover:border-primary/50'}`}>
                                            {isWatched && <Check size={11} strokeWidth={3} />}
                                          </div>
                                          <span className={`text-[12px] font-medium transition-colors ${isWatched ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                            Ep {episode.number || (globalIndex + 1)}: {episode.name}
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
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