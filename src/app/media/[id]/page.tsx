"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useMedia } from '@/context/MediaContext';
import { MediaEntry, isEpisodic, EpisodeInfo, getTotalRuntimeMinutes, sortEpisodes, getSeasonNumbers, materializeEpisodes, incrementRewatch, safeDateFormat } from '@/lib/db';
import { fireConfetti, fireEpicConfetti } from '@/lib/confetti';
import { PageLoader } from '@/components/ui/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Clock, Calendar, Edit3, Plus, Check, Heart, Film, CheckCircle2, Trash2, Info, Upload, Repeat } from 'lucide-react';
import { toast } from 'sonner';

export default function MediaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { entries, isLoading, updateEntry, deleteEntry, genres, franchises } = useMedia();
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingRating, setEditingRating] = useState(false);
  const [editingField, setEditingField] = useState<'title' | 'releaseDate' | 'runtime' | 'coverImage' | 'review' | 'episodesTotal' | 'saga' | 'genres' | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [editingEpisode, setEditingEpisode] = useState<EpisodeInfo | null>(null);
  const [tempEpisodeName, setTempEpisodeName] = useState('');
  const [tempEpisodeRuntime, setTempEpisodeRuntime] = useState<number | ''>('');
  const [tempEpisodeAirDate, setTempEpisodeAirDate] = useState('');
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

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
    return sortEpisodes(materializeEpisodes(entry));
  }, [entry]);

  const seasons = React.useMemo(() => {
    return getSeasonNumbers(displayEpisodes);
  }, [displayEpisodes]);

  const getMaterializedEpisodes = (): EpisodeInfo[] => materializeEpisodes(entry || {});
  
  useEffect(() => {
    if (seasons.length > 0 && !seasons.includes(selectedSeason)) {
      Promise.resolve().then(() => setSelectedSeason(seasons[0]));
    }
  }, [displayEpisodes, selectedSeason, seasons]);

  // Compute runtime — must be before early return to satisfy rules-of-hooks
  const isEpisodicEntry = entry ? isEpisodic(entry) : false;
  const { totalRuntime, averageRuntime } = React.useMemo(() => {
    if (!entry) return { totalRuntime: 0, averageRuntime: 0 };
    const totalRuntime = getTotalRuntimeMinutes(entry);
    
    if (!isEpisodicEntry) return { totalRuntime, averageRuntime: entry.runtime || 0 };
    
    const episodes = entry.episodes || [];
    let knownSum = 0;
    let knownCount = 0;
    for (const ep of episodes) {
      if (ep.runtime && ep.runtime > 0) {
        knownSum += ep.runtime;
        knownCount++;
      }
    }
    
    const baseRuntime = Number(entry.runtime || 0);
    const averageRuntime = knownCount > 0 ? Math.round(knownSum / knownCount) : baseRuntime;
    
    return { totalRuntime, averageRuntime };
  }, [entry, isEpisodicEntry]);

  if (isLoading || !entry) {
    return <PageLoader text="Loading media..." />;
  }

  const isEpisodicMedia = isEpisodicEntry;
  const releaseYear = entry.releaseDate ? entry.releaseDate.split('-')[0] : '';
  const displayGenres = (entry.genreIds || []).map(gid => genres.find(g => g.id === gid)?.name).filter(Boolean);
  const sagaName = entry.franchiseId ? franchises.find(f => f.id === entry.franchiseId)?.name : null;

  const filteredEpisodes = displayEpisodes.filter(ep => (ep.season || 1) === selectedSeason);

  const handleIncrementEpisode = async () => {
    if (!isEpisodicMedia) return;
    const currentWatched = entry.episodesWatched || 0;
    const newCount = currentWatched + 1;
    
    let currentEpisodes = getMaterializedEpisodes();
    
    const sortedEps = sortEpisodes(currentEpisodes);

    const unwatched = sortedEps.find(e => !e.watched);
    
    if (unwatched) {
      currentEpisodes = currentEpisodes.map(e => 
        (e.season === unwatched.season && e.number === unwatched.number) ? { ...e, watched: true } : e
      );
    } else {
      const lastEp = sortedEps[sortedEps.length - 1];
      const nextNum = lastEp ? (lastEp.number || 0) + 1 : 1;
      const season = lastEp ? (lastEp.season || 1) : 1;
      currentEpisodes.push({ name: `Episode ${nextNum}`, season, number: nextNum, watched: true });
    }

    let newStatus = entry.status;
    if (entry.episodesTotal && newCount >= Number(entry.episodesTotal)) {
      newStatus = 'Completed';
    }

    await updateEntry({ 
      ...entry, 
      episodesWatched: newCount,
      episodes: currentEpisodes,
      status: newStatus,
      episodesTotal: Math.max(entry.episodesTotal || 0, currentEpisodes.length)
    });
    
    if (newStatus === 'Completed') {
      fireEpicConfetti();
      toast.success(`Completed ${entry.title}! 🎉`);
    } else {
      fireConfetti();
      toast.success(`Episode ${newCount} logged!`);
    }
  };

  const handleMarkCompleted = async () => {
    const updated = { ...entry, status: 'Completed' as MediaEntry['status'] };
    if (isEpisodicMedia) {
      const currentEpisodes = getMaterializedEpisodes();
      updated.episodes = currentEpisodes.map(ep => ({ ...ep, watched: true }));
      updated.episodesWatched = updated.episodes.length;
    }
    fireEpicConfetti();
    toast.success(`Marked as Completed! 🎉`);
    await updateEntry(updated);
  };

  const handleUpdateStatus = async (newStatus: MediaEntry['status']) => {
    const updated = { ...entry, status: newStatus };
    if (newStatus === 'Completed' && isEpisodicMedia) {
      const currentEpisodes = getMaterializedEpisodes();
      updated.episodes = currentEpisodes.map(ep => ({ ...ep, watched: true }));
      updated.episodesWatched = updated.episodes.length;
    }
    await updateEntry(updated);
    setEditingStatus(false);
    if (newStatus === 'Completed') fireEpicConfetti();
    toast.success(`Status updated to ${newStatus}`);
  };

  const handleUpdateRating = async (newRating: number) => {
    await updateEntry({ ...entry, rating: newRating });
    setEditingRating(false);
    toast.success(`Rating updated to ${newRating}/10`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width > 800 ? 800 : img.width;
        canvas.height = img.height * (canvas.width / img.width);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setTempValue(canvas.toDataURL('image/webp', 0.8));
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveField = async () => {
    if (!editingField || !entry) return;
    
    if (editingField === 'title' && !tempValue.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    
    let newValue: string | number | undefined = tempValue;
    if (editingField === 'runtime' || editingField === 'episodesTotal') {
      newValue = tempValue === '' ? undefined : Math.max(0, Number(tempValue));
    } else if (editingField === 'saga') {
      newValue = tempValue === '' ? undefined : tempValue;
      await updateEntry({ ...entry, franchiseId: newValue });
      setEditingField(null);
      toast.success('Updated successfully!');
      return;
    } else if (editingField === 'genres') {
      const parsedGenres = JSON.parse(tempValue || '[]') as string[];
      await updateEntry({ ...entry, genreIds: parsedGenres });
      setEditingField(null);
      toast.success('Updated successfully!');
      return;
    }
    
    await updateEntry({ ...entry, [editingField]: newValue });
    setEditingField(null);
    toast.success('Updated successfully!');
  };

  const handleToggleEpisode = async (seasonNum: number, episodeNum: number) => {
    if (!isEpisodicMedia) return;
    
    const currentEpisodes = getMaterializedEpisodes();

    const epIndex = currentEpisodes.findIndex(e => (e.season || 1) === seasonNum && (e.number || 1) === episodeNum);
    if (epIndex >= 0) {
      currentEpisodes[epIndex] = { ...currentEpisodes[epIndex], watched: !currentEpisodes[epIndex].watched };
    } else {
      currentEpisodes.push({ name: `Episode ${episodeNum}`, season: seasonNum, number: episodeNum, watched: true });
    }

    const newWatchedCount = currentEpisodes.filter(e => e.watched).length;
    const newTotal = entry.episodesTotal || currentEpisodes.length;

    let newStatus = entry.status;
    if (newWatchedCount === 0) newStatus = 'Plan to Watch';
    else if (newWatchedCount >= newTotal && newTotal > 0) newStatus = 'Completed';
    else newStatus = 'Watching';
    
    await updateEntry({ 
      ...entry, 
      episodes: currentEpisodes,
      episodesWatched: newWatchedCount,
      status: newStatus
    });
  };

  const handleAddSeason = async () => {
    if (!isEpisodicMedia) return;
    const currentEpisodes = getMaterializedEpisodes();
    const oldLength = currentEpisodes.length;
    const maxSeason = currentEpisodes.length > 0 ? Math.max(...currentEpisodes.map(e => e.season || 1)) : 0;
    const nextSeason = maxSeason + 1;
    
    currentEpisodes.push({ name: `Episode 1`, season: nextSeason, number: 1, watched: false });
    
    await updateEntry({ 
      ...entry, 
      episodes: currentEpisodes,
      episodesTotal: entry.episodesTotal === oldLength ? currentEpisodes.length : Math.max(entry.episodesTotal || 0, currentEpisodes.length)
    });
    setSelectedSeason(nextSeason);
    toast.success(`Season ${nextSeason} added`);
  };

  const handleAddEpisode = async () => {
    if (!isEpisodicMedia) return;
    const currentEpisodes = getMaterializedEpisodes();
    const oldLength = currentEpisodes.length;
    const sEps = currentEpisodes.filter(e => e.season === selectedSeason);
    const nextNumber = sEps.length > 0 ? Math.max(...sEps.map(e => e.number || 1)) + 1 : 1;
    
    currentEpisodes.push({ name: `Episode ${nextNumber}`, season: selectedSeason, number: nextNumber, watched: false });
    
    await updateEntry({ 
      ...entry, 
      episodes: currentEpisodes,
      episodesTotal: entry.episodesTotal === oldLength ? currentEpisodes.length : Math.max(entry.episodesTotal || 0, currentEpisodes.length)
    });
    toast.success(`Episode ${nextNumber} added to Season ${selectedSeason}`);
  };

  const handleSaveEpisodeEdit = async () => {
    if (!editingEpisode || !isEpisodicMedia) return;
    const currentEpisodes = getMaterializedEpisodes();
    const oldLength = currentEpisodes.length;
    const idx = currentEpisodes.findIndex(e => e.season === editingEpisode.season && e.number === editingEpisode.number);
    
    const updatedEp = {
      ...editingEpisode,
      name: tempEpisodeName,
      runtime: tempEpisodeRuntime === '' ? undefined : Math.max(0, Number(tempEpisodeRuntime)),
      airDate: tempEpisodeAirDate,
    };

    if (idx !== -1) {
      currentEpisodes[idx] = { ...currentEpisodes[idx], ...updatedEp };
    } else {
      currentEpisodes.push(updatedEp);
    }

    await updateEntry({ 
      ...entry, 
      episodes: currentEpisodes,
      episodesTotal: entry.episodesTotal === oldLength ? currentEpisodes.length : Math.max(entry.episodesTotal || 0, currentEpisodes.length)
    });
    setEditingEpisode(null);
    toast.success('Episode details updated');
  };

  const handleDeleteEpisode = async () => {
    if (!editingEpisode || !isEpisodicMedia) return;
    const currentEpisodes = getMaterializedEpisodes();
    const oldLength = currentEpisodes.length;
    const idx = currentEpisodes.findIndex(e => e.season === editingEpisode.season && e.number === editingEpisode.number);
    if (idx !== -1) {
      currentEpisodes.splice(idx, 1);
      const newWatchedCount = currentEpisodes.filter(e => e.watched).length;
      await updateEntry({ 
        ...entry, 
        episodes: currentEpisodes,
        episodesTotal: entry.episodesTotal === oldLength ? currentEpisodes.length : Math.max(entry.episodesTotal || 0, currentEpisodes.length),
        episodesWatched: newWatchedCount
      });
      setEditingEpisode(null);
      
      const remainingInSeason = currentEpisodes.filter(e => e.season === editingEpisode.season);
      if (remainingInSeason.length === 0 && selectedSeason === editingEpisode.season) {
        setSelectedSeason(1);
      }
      
      toast.success('Episode deleted');
    }
  };

  const handleDelete = async () => {
    if (!entry || !entry.id) return;
    await deleteEntry(entry.id);
    toast.success(`Deleted ${entry.title}`);
    router.push('/');
  };

  const handleLogRewatch = async () => {
    const timestamp = Date.now();
    const rewatch = incrementRewatch(entry, timestamp);
    await updateEntry({ ...entry, ...rewatch });
    fireConfetti();
    toast.success(`Logged rewatch #${rewatch.rewatchCount} of "${entry.title}" 🔁`);
  };

  return (
    <div className="absolute inset-0 bg-background text-foreground overflow-y-auto overflow-x-hidden hide-scrollbar">
      
      {/* Top Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 md:p-6 flex items-center justify-between pointer-events-none">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-border/60 flex items-center justify-center hover:bg-black/60 transition-colors shadow-lg"
        >
          <ArrowLeft className="text-foreground" size={20} />
        </button>

        <div className="pointer-events-auto flex items-center gap-3">
          <button
            onClick={() => router.push(`/media/${entry.id}/edit`)}
            aria-label="Edit entry"
            title="Edit"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-border/60 flex items-center justify-center hover:bg-black/60 hover:text-primary hover:scale-105 transition-all shadow-lg"
          >
            <Edit3 size={16} className="text-foreground" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Delete entry"
            title="Delete"
            className="w-10 h-10 rounded-full bg-red-500/80 text-foreground backdrop-blur-md flex items-center justify-center hover:bg-red-600 hover:scale-105 transition-all shadow-lg"
          >
            <Trash2 size={16} />
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
            className="w-[180px] sm:w-[220px] md:w-full relative group shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] rounded-2xl md:rounded-3xl border border-border/60 bg-card overflow-hidden"
          >
            <div className="aspect-[2/3] w-full cursor-pointer relative" onClick={() => { setEditingField('coverImage'); setTempValue(entry.coverImage || ''); }}>
              {entry.coverImage ? (
                <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 p-4 text-center">
                  <Film className="w-12 h-12 text-muted-foreground/30 mb-2" />
                  <span className="text-muted-foreground font-display font-bold uppercase tracking-widest text-xs break-words">{entry.title}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
                <Edit3 className="text-foreground w-8 h-8" />
              </div>
            </div>

            {/* Favorite Floating Badge */}
            {entry.favorite && (
              <div className="absolute -top-3 -right-3 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-background z-20">
                <Heart className="fill-white text-foreground" size={16} />
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Col: Details */}
        <div className="flex-1 min-w-0 flex flex-col pt-4 md:pt-6 lg:pt-10 items-center md:items-start text-center md:text-left">
          
          {/* Status Badges */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap justify-center md:justify-start items-center gap-2 mb-4">
            <button 
              onClick={() => setEditingStatus(true)}
              className={`cursor-pointer transition-transform hover:scale-105 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-full border ${entry.status === 'Completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : entry.status === 'Watching' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}
            >
              {entry.status}
            </button>
            <span className="px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-full border border-border/60 bg-foreground/5 text-foreground/80 backdrop-blur-md">
              {entry.type === 'TV Show' ? 'Series' : entry.type}
            </span>
            <button 
              onClick={() => { setEditingField('saga'); setTempValue(entry.franchiseId || ''); }}
              className={`px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-full border transition-colors cursor-pointer flex items-center gap-1.5 ${sagaName ? 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/20' : 'border-border/60 bg-foreground/5 text-muted-foreground/70 hover:bg-foreground/10 border-dashed'}`}
            >
              <Film size={12} /> {sagaName || 'Set Saga'}
            </button>
          </motion.div>

          {/* Title & Meta */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="w-full">
            <h1 
              onClick={() => { setEditingField('title'); setTempValue(entry.title || ''); }} 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black leading-tight text-foreground tracking-tight drop-shadow-xl break-words mb-4 cursor-pointer hover:text-foreground/80 transition-colors inline-block"
            >
              {entry.title}
            </h1>
            
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              {releaseYear && (
                <button onClick={() => { setEditingField('releaseDate'); setTempValue(entry.releaseDate || ''); }} className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                  <Calendar size={14} className="text-muted-foreground/70" /> {releaseYear}
                </button>
              )}
              {totalRuntime > 0 && (
                <button 
                  onClick={() => { if (!isEpisodicMedia) { setEditingField('runtime'); setTempValue(entry.runtime?.toString() || ''); } }} 
                  className={`flex items-center gap-1.5 transition-colors ${!isEpisodicMedia ? 'cursor-pointer hover:text-foreground' : 'cursor-default'}`}
                  title={isEpisodicMedia ? 'Automatically calculated from episodes' : 'Edit runtime'}
                >
                  <Clock size={14} className="text-muted-foreground/70" /> {totalRuntime}m {isEpisodicMedia ? 'Total' : ''}
                </button>
              )}
              {isEpisodicMedia && averageRuntime > 0 && (
                <span className="flex items-center gap-1.5 text-muted-foreground cursor-default" title="Average runtime per episode">
                  <Clock size={14} className="text-foreground/20" /> {averageRuntime}m Avg
                </span>
              )}
              {entry.status === 'Completed' && (
                <button onClick={() => setEditingRating(true)} className="cursor-pointer hover:scale-105 transition-transform flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
                  <Star size={14} className="fill-amber-400" /> <span className="pt-0.5">{entry.rating || 0}/10</span>
                </button>
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
              <div className="flex flex-col items-center md:items-start ml-2 md:ml-4 bg-foreground/5 border border-border/60 rounded-xl px-4 py-2">
                <span className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Progress</span>
                <button 
                  onClick={() => { setEditingField('episodesTotal'); setTempValue(entry.episodesTotal?.toString() || ''); }}
                  className="text-lg sm:text-xl font-display font-black text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  {entry.episodesWatched || 0} <span className="text-muted-foreground/50 text-sm font-sans font-semibold">/ {entry.episodesTotal || '?'}</span>
                </button>
              </div>
            )}
          </motion.div>

          {/* Genres & Review */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="w-full mt-10 md:mt-12">
            <div 
              onClick={() => { setEditingField('genres'); setTempValue(JSON.stringify(entry.genreIds || [])); }}
              className="flex flex-wrap justify-center md:justify-start gap-2 mb-8 cursor-pointer group"
            >
              {displayGenres.length > 0 ? displayGenres.map(g => (
                <span key={g} className="px-3 py-1 bg-foreground/5 border border-border/60 rounded-lg text-[10px] sm:text-xs font-bold text-foreground/70 uppercase tracking-wider group-hover:border-border transition-colors">{g}</span>
              )) : (
                <span className="px-3 py-1 bg-foreground/5 border border-border/60 border-dashed rounded-lg text-[10px] sm:text-xs font-bold text-muted-foreground/70 uppercase tracking-wider group-hover:text-foreground transition-colors">Add Genres</span>
              )}
            </div>
            
            {entry.status === 'Completed' && (
              <div className="w-full mb-8 bg-foreground/5 border border-border/60 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="text-left">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2 mb-1.5">
                    <Repeat size={14} /> Rewatches
                  </h3>
                  {entry.rewatchCount ? (
                    <p className="text-sm font-semibold text-foreground">
                      Watched again <span className="text-primary">{entry.rewatchCount}×</span>
                      {entry.rewatchDates?.length ? (
                        <span className="text-muted-foreground font-normal"> · last {safeDateFormat(new Date(entry.rewatchDates[entry.rewatchDates.length - 1]).toISOString())}</span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Haven&apos;t rewatched this yet.</p>
                  )}
                </div>
                <button
                  onClick={handleLogRewatch}
                  className="shrink-0 flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold px-3.5 py-2 rounded-full transition-colors cursor-pointer"
                >
                  <Repeat size={13} /> Log Rewatch
                </button>
              </div>
            )}

            <div className="text-left w-full space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                <Info size={14} /> Review & Notes
              </h3>
              {entry.review ? (
                <div onClick={() => { setEditingField('review'); setTempValue(entry.review || ''); }} className="bg-foreground/5 border border-border/60 rounded-2xl p-5 sm:p-6 backdrop-blur-sm cursor-pointer hover:bg-foreground/10 transition-colors group">
                  <p className="text-sm sm:text-base leading-relaxed text-foreground/90 font-medium whitespace-pre-wrap break-words">
                    {entry.review}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-[10px] text-muted-foreground/50 uppercase tracking-widest font-bold group-hover:text-muted-foreground transition-colors">
                    <Edit3 size={12} /> Edit Review
                  </div>
                </div>
              ) : (
                <div onClick={() => { setEditingField('review'); setTempValue(''); }} className="p-6 rounded-2xl bg-foreground/5 border border-border/50 border-dashed text-center flex flex-col items-center justify-center space-y-3 cursor-pointer hover:bg-foreground/10 transition-colors group">
                  <p className="text-sm text-muted-foreground/70 font-semibold group-hover:text-muted-foreground transition-colors">No review or notes added yet.</p>
                  <span className="text-xs font-bold text-foreground uppercase tracking-widest transition-colors hover:underline">Write a Review</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Episodes List (if Episodic) */}
          {isEpisodicMedia && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="w-full mt-12 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2 shrink-0">
                  <Film size={14} /> Episodes
                </h3>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 sm:pb-0 w-full sm:w-auto">
                  {seasons.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSeason(s)}
                      className={`px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${selectedSeason === s ? 'bg-white text-foreground border-white shadow-sm' : 'bg-foreground/5 text-muted-foreground border-border/60 hover:bg-foreground/10'}`}
                    >
                      Season {s}
                    </button>
                  ))}
                  <button onClick={handleAddSeason} className="px-3 py-1.5 rounded-full bg-foreground/5 text-muted-foreground/70 hover:bg-foreground/10 hover:text-foreground transition-colors border border-border/60 flex items-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                    <Plus size={12} /> Season
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredEpisodes.length === 0 ? (
                  <div className="py-10 text-center bg-muted/10 rounded-2xl border border-border/50 border-dashed">
                    <p className="text-muted-foreground text-sm font-semibold">No episodes logged for this season.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredEpisodes.map((ep, idx) => {
                      const isWatched = entry.status === 'Completed' || ep.watched === true;
                      return (
                        <div
                          key={`${ep.season}-${ep.number}-${idx}`}
                          className={`relative w-full text-left rounded-xl border p-3 sm:p-4 flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-95 group ${isWatched ? 'border-green-500/30 bg-green-500/10' : 'border-border/50 bg-muted/30 hover:border-border'}`}
                        >
                          <button
                            className="absolute inset-0 w-full h-full cursor-pointer z-0"
                            onClick={() => handleToggleEpisode(ep.season || 1, ep.number || idx + 1)}
                            aria-label={`Toggle watched for ${ep.name}`}
                          />
                          <div className={`w-10 h-10 flex items-center justify-center rounded-lg shrink-0 font-mono text-xs sm:text-sm font-bold z-10 pointer-events-none ${isWatched ? 'bg-green-500/20 text-green-600 ' : 'bg-muted/50 text-muted-foreground dark:text-muted-foreground'}`}>
                            {ep.number || idx + 1}
                          </div>
                          <div className="flex-1 min-w-0 z-10 pointer-events-none">
                            <p className={`text-sm sm:text-base font-bold truncate break-words ${isWatched ? 'text-foreground dark:text-foreground' : 'text-foreground/80 dark:text-foreground/80'}`}>
                              {ep.name}
                            </p>
                            {ep.runtime && <p className="text-[10px] text-muted-foreground dark:text-muted-foreground font-bold uppercase tracking-widest">{ep.runtime} min</p>}
                          </div>
                          <div className="flex items-center gap-3 z-10">
                             <button onClick={() => {
                               setEditingEpisode(ep);
                               setTempEpisodeName(ep.name);
                               setTempEpisodeRuntime(ep.runtime || '');
                               setTempEpisodeAirDate(ep.airDate || '');
                             }} className="text-muted-foreground/50 dark:text-muted-foreground/50 hover:text-foreground dark:hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-foreground/10 dark:hover:bg-foreground/10 z-10 relative cursor-pointer">
                               <Edit3 size={14} />
                             </button>
                             {isWatched && <CheckCircle2 size={16} className="text-green-600  shrink-0 pointer-events-none" />}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Add Episode Button */}
                    <button onClick={handleAddEpisode} className="w-full h-full min-h-[72px] rounded-xl border border-dashed border-border/50 bg-muted/10 hover:bg-muted/20 hover:border-border transition-all flex flex-col items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
                      <Plus size={20} className="mb-1 opacity-50" />
                      <span className="text-xs font-bold uppercase tracking-widest">Add Episode</span>
                    </button>
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
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-card border border-border/60 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center z-10"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">Delete {entry.title}?</h3>
              <p className="text-sm text-muted-foreground mb-8">This action cannot be undone. Are you absolutely sure?</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl bg-foreground/10 text-foreground font-bold hover:bg-foreground/20 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-foreground font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inline Editors Modal */}
      <AnimatePresence>
        {editingStatus && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingStatus(false)} className="absolute inset-0 bg-background/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-card border border-border/60 rounded-3xl p-6 shadow-2xl flex flex-col items-center z-10">
              <h3 className="text-lg font-bold tracking-tight text-foreground mb-6 uppercase tracking-widest">Update Status</h3>
              <div className="flex flex-col gap-3 w-full">
                {(['Plan to Watch', 'Watching', 'Completed'] as const).map(s => (
                  <button key={s} onClick={() => handleUpdateStatus(s)} className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors border ${entry.status === s ? 'bg-primary/20 text-primary border-primary/30' : 'bg-foreground/5 text-foreground hover:bg-foreground/10 border-border/60'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {editingRating && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingRating(false)} className="absolute inset-0 bg-background/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-card border border-border/60 rounded-3xl p-6 shadow-2xl flex flex-col items-center z-10">
              <h3 className="text-lg font-bold tracking-tight text-foreground mb-6 uppercase tracking-widest">Update Rating</h3>
              <div className="flex gap-1 justify-center w-full mb-6" onMouseLeave={() => setHoveredStar(null)}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => {
                  const displayRating = hoveredStar !== null ? hoveredStar : (entry.rating || 0);
                  const active = star <= displayRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredStar(star)}
                      onClick={() => handleUpdateStatus('Completed').then(() => handleUpdateRating(star))}
                      className="p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star size={24} className={active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground/70 uppercase tracking-widest text-center font-bold">
                {hoveredStar || entry.rating || 0} / 10
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inline Field Edit Modal */}
      <AnimatePresence>
        {editingField && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingField(null)} className="absolute inset-0 bg-background/80 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-sm bg-card border border-border/60 p-6 rounded-3xl shadow-2xl flex flex-col items-center"
            >
              <h3 className="text-lg font-bold text-foreground mb-6 uppercase tracking-widest">
                Update {editingField === 'coverImage' ? 'Cover' : editingField === 'releaseDate' ? 'Release Date' : editingField}
              </h3>
              
              <div className="w-full space-y-4 text-left">
                {editingField === 'title' && (
                  <input autoFocus type="text" value={tempValue} onChange={e => setTempValue(e.target.value)} placeholder="Title" className="w-full bg-foreground/5 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border" />
                )}
                {editingField === 'coverImage' && (
                  <label className="flex flex-col items-center justify-center w-full h-32 bg-card hover:bg-muted/40 rounded-xl px-4 py-6 border-2 border-dashed border-border/80 cursor-pointer transition-colors group relative overflow-hidden">
                    {tempValue ? (
                      <div className="absolute inset-0 z-0">
                        <img src={tempValue} alt="Preview" className="w-full h-full object-cover opacity-30" />
                      </div>
                    ) : null}
                    <div className="relative z-10 flex flex-col items-center">
                      <Upload size={24} className="mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-muted-foreground font-semibold text-sm group-hover:text-foreground transition-colors">
                        Click to upload new poster
                      </span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
                {editingField === 'releaseDate' && (
                  <input autoFocus type="date" value={tempValue} onChange={e => setTempValue(e.target.value)} className="w-full bg-foreground/5 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border [color-scheme:dark]" />
                )}
                {editingField === 'runtime' && (
                  <input autoFocus type="number" value={tempValue} onChange={e => setTempValue(e.target.value)} placeholder="Runtime in minutes" className="w-full bg-foreground/5 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border" />
                )}
                {editingField === 'episodesTotal' && (
                  <input autoFocus type="number" value={tempValue} onChange={e => setTempValue(e.target.value)} placeholder="Total Episodes (e.g. 39)" className="w-full bg-foreground/5 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border" />
                )}
                {editingField === 'review' && (
                  <textarea autoFocus value={tempValue} onChange={e => setTempValue(e.target.value)} placeholder="Write your thoughts..." rows={5} className="w-full bg-foreground/5 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border resize-none" />
                )}
                {editingField === 'saga' && (
                  <select 
                    autoFocus 
                    value={tempValue} 
                    onChange={e => setTempValue(e.target.value)} 
                    className="w-full bg-foreground/5 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border"
                  >
                    <option value="" className="bg-card text-muted-foreground">No Saga</option>
                    {franchises.map(f => (
                      <option key={f.id} value={f.id} className="bg-card text-foreground">{f.name}</option>
                    ))}
                  </select>
                )}
                {editingField === 'genres' && (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {genres.map(g => {
                      let selectedIds: string[] = [];
                      try { selectedIds = JSON.parse(tempValue || '[]'); } catch (_e) {}
                      const isSelected = selectedIds.includes(g.id);
                      return (
                        <label key={g.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-primary/20 border-primary/30 text-foreground' : 'bg-foreground/5 border-border/60 text-muted-foreground hover:bg-foreground/10'}`}>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={isSelected}
                            onChange={() => {
                              const newIds = isSelected ? selectedIds.filter((id: string) => id !== g.id) : [...selectedIds, g.id];
                              setTempValue(JSON.stringify(newIds));
                            }}
                          />
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-border/80'}`}>
                            {isSelected && <Check size={12} className="text-primary-foreground" />}
                          </div>
                          <span className="font-bold uppercase tracking-widest text-xs">{g.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 w-full mt-8">
                <button onClick={() => setEditingField(null)} className="flex-1 py-3 rounded-xl bg-foreground/5 text-foreground/70 font-bold hover:bg-foreground/10 transition-colors">Cancel</button>
                <button onClick={handleSaveField} className="flex-1 py-3 rounded-xl bg-white text-foreground font-bold hover:bg-white/90 transition-colors">Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Episode Editing Modal */}
      <AnimatePresence>
        {editingEpisode && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingEpisode(null)} className="absolute inset-0 bg-background/80 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-sm bg-card border border-border/60 p-6 rounded-3xl shadow-2xl flex flex-col items-center"
            >
              <div className="flex items-center justify-between w-full mb-6">
                <h3 className="text-lg font-bold text-foreground">Edit Episode {editingEpisode.number}</h3>
                <button onClick={handleDeleteEpisode} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:scale-110 rounded-full transition-all cursor-pointer" title="Delete Episode">
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="w-full space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Episode Name</label>
                  <input type="text" value={tempEpisodeName} onChange={e => setTempEpisodeName(e.target.value)} className="w-full bg-foreground/5 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Runtime (mins)</label>
                  <input type="number" value={tempEpisodeRuntime} onChange={e => setTempEpisodeRuntime(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Auto" className="w-full bg-foreground/5 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Air Date</label>
                  <input type="date" value={tempEpisodeAirDate} onChange={e => setTempEpisodeAirDate(e.target.value)} className="w-full bg-foreground/5 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-border [color-scheme:dark]" />
                </div>
              </div>

              <div className="flex gap-3 w-full mt-8">
                <button onClick={() => setEditingEpisode(null)} className="flex-1 py-3 rounded-xl bg-foreground/5 text-foreground/70 font-bold hover:bg-foreground/10 transition-colors">Cancel</button>
                <button onClick={handleSaveEpisodeEdit} className="flex-1 py-3 rounded-xl bg-white text-foreground font-bold hover:bg-white/90 transition-colors">Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
