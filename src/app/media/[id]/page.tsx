"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMedia } from '@/context/MediaContext';
import { MediaEntry, isEpisodic } from '@/lib/db';
import { PageLoader } from '@/components/ui/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Clock, Calendar, Edit3, Plus, Check, Heart, Film, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function MediaDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { entries, isLoading, updateEntry, deleteEntry, genres, franchises } = useMedia();
  const [entry, setEntry] = useState<MediaEntry | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isLoading && params?.id) {
      const found = entries.find(e => String(e.id) === String(params.id));
      if (found) {
        setEntry(found);
      } else {
        router.push('/');
      }
    }
  }, [entries, isLoading, params?.id, router]);

  if (isLoading || !entry) {
    return <PageLoader text="Loading media..." />;
  }

  const isEpisodicMedia = isEpisodic(entry);
  const releaseYear = entry.releaseDate ? entry.releaseDate.split('-')[0] : '';
  const displayGenres = (entry.genreIds || []).map(id => genres.find(g => g.id === id)?.name).filter(Boolean);
  const sagaName = entry.franchiseId ? franchises.find(f => f.id === entry.franchiseId)?.name : null;

  const displayEpisodes = (entry.episodes && entry.episodes.length > 0)
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

  const handleIncrementEpisode = async () => {
    if (!isEpisodicMedia) return;
    const current = entry.episodesWatched || 0;
    const total = entry.episodesTotal;
    
    if (total && current >= total) {
      toast.success("You've already finished this!");
      return;
    }
    
    const newCount = current + 1;
    const newStatus = (total && newCount >= total) ? 'Completed' : 'Watching';
    
    const updated = { ...entry, episodesWatched: newCount, status: newStatus as MediaEntry['status'] };
    
    if (newStatus === 'Completed') {
      toast.success(`Completed ${entry.title}! 🎉`);
    } else {
      toast.success(`Episode ${newCount} logged!`);
    }
    
    await updateEntry(updated);
    setEntry(updated);
  };

  const handleMarkCompleted = async () => {
    const updated = { ...entry, status: 'Completed' as MediaEntry['status'] };
    if (isEpisodicMedia && entry.episodesTotal) {
      updated.episodesWatched = entry.episodesTotal;
    }
    toast.success(`Marked as Completed! 🎉`);
    await updateEntry(updated);
    setEntry(updated);
  };

  const handleDelete = async () => {
    if (!entry || !entry.id) return;
    await deleteEntry(entry.id);
    toast.success(`Deleted ${entry.title}`);
    router.push('/');
  };

  return (
    <div className="absolute inset-0 bg-background text-foreground overflow-hidden flex flex-col">
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        {entry.coverImage ? (
          <>
            <motion.img
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 0.25, scale: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              src={entry.coverImage}
              alt=""
              className="w-full h-full object-cover blur-md"
            />
            {/* Cinematic Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
            <div className="absolute top-0 left-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px]" />
          </>
        )}
      </div>

      {/* Header Navigation */}
      <div className="relative z-20 pt-8 px-6 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/60 transition-colors">
          <ArrowLeft className="text-white" size={20} />
        </button>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setShowDeleteConfirm(true)} className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 backdrop-blur-md flex items-center justify-center hover:bg-red-500/20 hover:scale-105 transition-all shadow-lg">
            <Trash2 size={16} />
          </button>
          <button onClick={() => router.push(`/edit/${entry.id}`)} className="px-4 py-2 rounded-full bg-primary/90 hover:bg-primary text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg transition-transform hover:scale-105 border border-primary/20 backdrop-blur-md">
            <Edit3 size={14} /> Edit Entry
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-20 pt-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-10 lg:gap-16 items-start">
          
          {/* Left: Huge Poster */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.8 }}
            className="w-full max-w-[280px] md:max-w-[340px] shrink-0 mx-auto md:mx-0 relative group"
          >
            <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] border border-white/10 relative bg-card">
              {entry.coverImage ? (
                <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                  <span className="text-muted-foreground font-display font-bold uppercase tracking-widest text-sm px-4 text-center">{entry.title}</span>
                </div>
              )}
              {/* Gloss reflection */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none" />
            </div>

            {/* Favorite Floating Badge */}
            {entry.favorite && (
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-background animate-bounce-subtle">
                <Heart className="fill-white text-white" size={20} />
              </div>
            )}
          </motion.div>

          {/* Right: Info & Actions */}
          <div className="flex-1 space-y-6 md:pt-4">
            
            {/* Status & Type Badges */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap items-center gap-3">
              <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border ${entry.status === 'Completed' ? 'bg-green-500/20 text-green-500 border-green-500/30' : entry.status === 'Watching' ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-amber-500/20 text-amber-500 border-amber-500/30'}`}>
                {entry.status}
              </span>
              <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border border-border bg-card/50 text-muted-foreground">
                {entry.type === 'TV Show' ? 'Series' : entry.type}
              </span>
              {sagaName && (
                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border border-primary/30 bg-primary/10 text-primary flex items-center gap-1.5">
                  <Film size={10} /> {sagaName}
                </span>
              )}
            </motion.div>

            {/* Title */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black leading-[1.1] text-foreground tracking-tight drop-shadow-md">
                {entry.title}
              </h1>
              
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                {releaseYear && (
                  <div className="flex items-center gap-1.5"><Calendar size={14} /> {releaseYear}</div>
                )}
                {entry.runtime && entry.runtime > 0 && (
                  <div className="flex items-center gap-1.5"><Clock size={14} /> {entry.runtime} min{isEpisodicMedia ? '/ep' : ''}</div>
                )}
                {entry.status === 'Completed' && entry.rating > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    <Star size={14} className="fill-amber-500" /> {entry.rating}/10
                  </div>
                )}
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="pt-4 flex flex-wrap items-center gap-4">
              {isEpisodicMedia && entry.status === 'Watching' && (
                <button 
                  onClick={handleIncrementEpisode}
                  className="flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-primary/30"
                >
                  <Plus strokeWidth={3} size={18} />
                  Log Episode {entry.episodesWatched !== undefined ? entry.episodesWatched + 1 : 1}
                </button>
              )}
              
              {entry.status !== 'Completed' && (!isEpisodicMedia || entry.status === 'Plan to Watch') && (
                <button 
                  onClick={handleMarkCompleted}
                  className="flex items-center gap-2 bg-green-500 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-green-500/30"
                >
                  <Check strokeWidth={3} size={18} />
                  Mark as Completed
                </button>
              )}
              
              {isEpisodicMedia && (
                <div className="flex flex-col ml-4">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Progress</span>
                  <div className="text-xl font-display font-black text-foreground">
                    {entry.episodesWatched || 0} <span className="text-muted-foreground text-sm">/ {entry.episodesTotal || '?'}</span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Review / Notes */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="pt-8">
              {displayGenres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {displayGenres.map(g => (
                    <span key={g} className="px-4 py-1.5 bg-muted/40 rounded-lg text-xs font-bold text-muted-foreground uppercase tracking-wider">{g}</span>
                  ))}
                </div>
              )}
              
              {entry.review ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Review & Notes</h3>
                  <p className="text-base md:text-lg leading-relaxed text-foreground/80 font-medium whitespace-pre-wrap">
                    {entry.review}
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-muted/20 border border-border/50 text-center space-y-2">
                  <p className="text-sm text-muted-foreground font-semibold">No review or notes added yet.</p>
                  <button onClick={() => router.push(`/edit/${entry.id}`)} className="text-xs font-bold text-primary uppercase tracking-widest hover:underline">Add Review</button>
                </div>
              )}
            </motion.div>

            {/* Episodes List (if Episodic) */}
            {isEpisodicMedia && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Episodes</h3>
                  {seasons.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                      {seasons.map(s => (
                        <button
                          key={s}
                          onClick={() => setSelectedSeason(s)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${selectedSeason === s ? 'bg-primary/10 text-primary border-primary/20 shadow-sm' : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/30'}`}
                        >
                          Season {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {filteredEpisodes.length === 0 ? (
                    <div className="py-8 text-center bg-muted/10 rounded-2xl border border-border/50">
                      <p className="text-muted-foreground text-sm font-semibold">No episodes logged for this season.</p>
                      <button onClick={() => router.push(`/edit/${entry.id}`)} className="text-xs font-bold text-primary uppercase tracking-widest hover:underline mt-2">Edit to add episodes</button>
                    </div>
                  ) : (
                    filteredEpisodes.map((ep, idx) => {
                      const isWatched = episodesWatched >= (ep.number || idx + 1);
                      return (
                        <div
                          key={`${ep.season}-${ep.number}-${idx}`}
                          className={`rounded-xl border px-4 py-3.5 flex items-center gap-4 transition-all ${isWatched ? 'border-green-500/20 bg-green-500/5' : 'border-border/40 bg-muted/10 hover:border-border/80'}`}
                        >
                          <div className="w-10 h-10 flex items-center justify-center rounded-lg shrink-0 font-mono text-sm font-bold shadow-sm"
                            style={{ background: isWatched ? 'rgba(34,197,94,0.15)' : 'rgba(128,128,128,0.1)', color: isWatched ? '#22c55e' : 'var(--muted-fg)' }}>
                            {ep.number || idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-base font-bold truncate ${isWatched ? 'text-foreground' : 'text-foreground/80'}`}>
                              {ep.name}
                            </p>
                          </div>
                          {isWatched && <CheckCircle2 size={16} className="text-green-500 shrink-0 shadow-sm" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-card border border-border/60 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center z-10"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2">Delete {entry.title}?</h3>
              <p className="text-sm text-muted-foreground mb-6">This action cannot be undone. Are you absolutely sure?</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl bg-muted text-foreground font-bold hover:bg-muted/80 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-500/90 text-white font-bold hover:bg-red-500 transition-colors shadow-lg shadow-red-500/20">
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
