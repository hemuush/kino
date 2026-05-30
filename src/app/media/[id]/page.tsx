"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useMedia } from '@/context/MediaContext';
import { MediaEntry, isEpisodic } from '@/lib/db';
import { PageLoader } from '@/components/ui/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Clock, Calendar, Edit3, Plus, Check, Heart, Film, CheckCircle2, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function MediaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { entries, isLoading, updateEntry, deleteEntry, genres, franchises } = useMedia();
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const entry = React.useMemo(() => {
    if (isLoading || !id) return null;
    return entries.find(e => String(e.id) === String(id)) || null;
  }, [entries, isLoading, id]);

  useEffect(() => {
    if (!isLoading && id && !entry) {
      router.push('/');
    }
  }, [isLoading, id, entry, router]);

  const displayEpisodes = React.useMemo(() => {
    if (!entry) return [];
    return (entry.episodes && entry.episodes.length > 0)
      ? entry.episodes
      : (entry.episodesTotal ? Array.from({ length: Number(entry.episodesTotal) }, (_, i) => ({ name: `Episode ${i + 1}`, season: 1, number: i + 1 })) : []);
  }, [entry?.episodes, entry?.episodesTotal]);
    
  const seasons = React.useMemo(() => {
    return Array.from(new Set(displayEpisodes.map(ep => ep.season || 1))).sort((a, b) => a - b);
  }, [displayEpisodes]);
  
  useEffect(() => {
    if (seasons.length > 0 && !seasons.includes(selectedSeason)) {
      setSelectedSeason(seasons[0]);
    }
  }, [displayEpisodes, selectedSeason, seasons]);

  if (isLoading || !entry) {
    return <PageLoader text="Loading media..." />;
  }

  const isEpisodicMedia = isEpisodic(entry);
  const releaseYear = entry.releaseDate ? entry.releaseDate.split('-')[0] : '';
  const displayGenres = (entry.genreIds || []).map(gid => genres.find(g => g.id === gid)?.name).filter(Boolean);
  const sagaName = entry.franchiseId ? franchises.find(f => f.id === entry.franchiseId)?.name : null;

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
  };

  const handleMarkCompleted = async () => {
    const updated = { ...entry, status: 'Completed' as MediaEntry['status'] };
    if (isEpisodicMedia && entry.episodesTotal) {
      updated.episodesWatched = entry.episodesTotal;
    }
    toast.success(`Marked as Completed! 🎉`);
    await updateEntry(updated);
  };

  const handleDelete = async () => {
    if (!entry || !entry.id) return;
    await deleteEntry(entry.id);
    toast.success(`Deleted ${entry.title}`);
    router.push('/');
  };

  return (
    <div className="absolute inset-0 bg-background text-foreground overflow-y-auto overflow-x-hidden hide-scrollbar">
      
      {/* Top Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6 flex items-center justify-between pointer-events-none">
        <button 
          onClick={() => router.back()} 
          className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/60 transition-colors shadow-lg"
        >
          <ArrowLeft className="text-white" size={20} />
        </button>
        
        <div className="pointer-events-auto flex items-center gap-3">
          <button 
            onClick={() => setShowDeleteConfirm(true)} 
            className="w-10 h-10 rounded-full bg-red-500/80 text-white backdrop-blur-md flex items-center justify-center hover:bg-red-600 hover:scale-105 transition-all shadow-lg"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={() => router.push(`/edit/${entry.id}`)} 
            className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-xl transition-transform hover:scale-105"
          >
            <Edit3 size={14} /> Edit
          </button>
        </div>
      </div>

      {/* Cinematic Hero Backdrop */}
      <div className="relative w-full h-[35vh] md:h-[45vh] lg:h-[50vh] shrink-0">
        {entry.coverImage ? (
          <div className="absolute inset-0">
            <img 
              src={entry.coverImage} 
              className="w-full h-full object-cover opacity-50 blur-[2px] brightness-[0.7]" 
              alt="Backdrop" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-muted/20">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </div>
        )}
      </div>

      {/* Main Content (Overlapping) */}
      <div className="relative z-10 px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto -mt-24 md:-mt-56 lg:-mt-64 pb-24 flex flex-col md:flex-row gap-8 md:gap-12">
        
        {/* Left Col: Poster & Quick Actions */}
        <div className="flex flex-col items-center md:items-start shrink-0 w-full md:w-[260px] lg:w-[300px]">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}
            className="w-[180px] sm:w-[220px] md:w-full relative group shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] rounded-2xl md:rounded-3xl border border-white/10 bg-card overflow-hidden"
          >
            <div className="aspect-[2/3] w-full">
              {entry.coverImage ? (
                <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 p-4 text-center">
                  <Film className="w-12 h-12 text-muted-foreground/30 mb-2" />
                  <span className="text-muted-foreground font-display font-bold uppercase tracking-widest text-xs break-words">{entry.title}</span>
                </div>
              )}
            </div>

            {/* Favorite Floating Badge */}
            {entry.favorite && (
              <div className="absolute -top-3 -right-3 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-background z-20">
                <Heart className="fill-white text-white" size={16} />
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Col: Details */}
        <div className="flex-1 min-w-0 flex flex-col pt-4 md:pt-6 lg:pt-10 items-center md:items-start text-center md:text-left">
          
          {/* Status Badges */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap justify-center md:justify-start items-center gap-2 mb-4">
            <span className={`px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-full border ${entry.status === 'Completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : entry.status === 'Watching' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
              {entry.status}
            </span>
            <span className="px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-full border border-white/10 bg-white/5 text-white/80 backdrop-blur-md">
              {entry.type === 'TV Show' ? 'Series' : entry.type}
            </span>
            {sagaName && (
              <span className="px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-full border border-primary/20 bg-primary/10 text-primary flex items-center gap-1.5">
                <Film size={12} /> {sagaName}
              </span>
            )}
          </motion.div>

          {/* Title & Meta */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="w-full">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black leading-tight text-white tracking-tight drop-shadow-xl break-words mb-4">
              {entry.title}
            </h1>
            
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold text-white/60 uppercase tracking-widest">
              {releaseYear && (
                <div className="flex items-center gap-1.5"><Calendar size={14} className="text-white/40" /> {releaseYear}</div>
              )}
              {entry.runtime && entry.runtime > 0 && (
                <div className="flex items-center gap-1.5"><Clock size={14} className="text-white/40" /> {entry.runtime}m {isEpisodicMedia ? '/ ep' : ''}</div>
              )}
              {entry.status === 'Completed' && entry.rating > 0 && (
                <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
                  <Star size={14} className="fill-amber-400" /> <span className="pt-0.5">{entry.rating}/10</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Primary Actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8 flex flex-wrap justify-center md:justify-start items-center gap-4 w-full">
            {isEpisodicMedia && entry.status === 'Watching' && (
              <button 
                onClick={handleIncrementEpisode}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl font-bold uppercase tracking-widest text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-xl hover:shadow-primary/40 border border-primary-foreground/10"
              >
                <Plus strokeWidth={3} size={18} />
                Log Ep {entry.episodesWatched !== undefined ? entry.episodesWatched + 1 : 1}
              </button>
            )}
            
            {entry.status !== 'Completed' && (!isEpisodicMedia || entry.status === 'Plan to Watch') && (
              <button 
                onClick={handleMarkCompleted}
                className="flex items-center gap-2 bg-green-500/20 text-green-400 border border-green-500/30 px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl font-bold uppercase tracking-widest text-xs sm:text-sm hover:bg-green-500/30 active:scale-95 transition-all"
              >
                <Check strokeWidth={3} size={18} />
                Mark Completed
              </button>
            )}
            
            {isEpisodicMedia && (
              <div className="flex flex-col items-center md:items-start ml-2 md:ml-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                <span className="text-[9px] sm:text-[10px] text-white/50 uppercase tracking-widest font-bold">Progress</span>
                <div className="text-lg sm:text-xl font-display font-black text-white">
                  {entry.episodesWatched || 0} <span className="text-white/30 text-sm font-sans font-semibold">/ {entry.episodesTotal || '?'}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Genres & Review */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="w-full mt-10 md:mt-12">
            {displayGenres.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-8">
                {displayGenres.map(g => (
                  <span key={g} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] sm:text-xs font-bold text-white/70 uppercase tracking-wider">{g}</span>
                ))}
              </div>
            )}
            
            <div className="text-left w-full space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Info size={14} /> Review & Notes
              </h3>
              {entry.review ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 backdrop-blur-sm">
                  <p className="text-sm sm:text-base leading-relaxed text-white/90 font-medium whitespace-pre-wrap break-words">
                    {entry.review}
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 border-dashed text-center flex flex-col items-center justify-center space-y-3">
                  <p className="text-sm text-white/40 font-semibold">No review or notes added yet.</p>
                  <button onClick={() => router.push(`/edit/${entry.id}`)} className="text-xs font-bold text-white uppercase tracking-widest hover:text-primary transition-colors hover:underline">Write a Review</button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Episodes List (if Episodic) */}
          {isEpisodicMedia && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="w-full mt-12 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <Film size={14} /> Episodes
                </h3>
                {seasons.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 sm:pb-0">
                    {seasons.map(s => (
                      <button
                        key={s}
                        onClick={() => setSelectedSeason(s)}
                        className={`px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${selectedSeason === s ? 'bg-white text-black border-white shadow-sm' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
                      >
                        Season {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {filteredEpisodes.length === 0 ? (
                  <div className="py-10 text-center bg-white/5 rounded-2xl border border-white/10 border-dashed">
                    <p className="text-white/40 text-sm font-semibold">No episodes logged for this season.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredEpisodes.map((ep, idx) => {
                      const isWatched = episodesWatched >= (ep.number || idx + 1);
                      return (
                        <div
                          key={`${ep.season}-${ep.number}-${idx}`}
                          className={`rounded-xl border p-3 sm:p-4 flex items-center gap-4 transition-all ${isWatched ? 'border-green-500/30 bg-green-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                        >
                          <div className={`w-10 h-10 flex items-center justify-center rounded-lg shrink-0 font-mono text-xs sm:text-sm font-bold ${isWatched ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>
                            {ep.number || idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm sm:text-base font-bold truncate break-words ${isWatched ? 'text-white' : 'text-white/80'}`}>
                              {ep.name}
                            </p>
                          </div>
                          {isWatched && <CheckCircle2 size={16} className="text-green-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center z-10"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white mb-2">Delete {entry.title}?</h3>
              <p className="text-sm text-white/50 mb-8">This action cannot be undone. Are you absolutely sure?</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
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
