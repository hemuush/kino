"use client";

import { useState, useEffect, useRef } from 'react';
import { MediaEntry, MediaType, WatchStatus, AVAILABLE_GENRES, EpisodeInfo } from '@/lib/db';
import { X, Edit2, Trash2, Calendar, Star, Check, ArrowLeft, Image as ImageIcon, Heart, Plus, Minus, ChevronDown, ChevronRight, Tv } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';

interface MediaDetailModalProps {
  entry: MediaEntry;
  onClose: () => void;
  onSave: (entry: MediaEntry) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const mediaTypes: { value: MediaType; label: string }[] = [
  { value: 'Movie', label: 'Movie' },
  { value: 'Series', label: 'Series' },
  { value: 'Anime', label: 'Anime' },
];

const statuses: { value: WatchStatus; label: string }[] = [
  { value: 'Completed', label: 'Completed' },
  { value: 'Watching', label: 'Watching' },
  { value: 'Plan to Watch', label: 'Plan to Watch' },
];

export function MediaDetailModal({ entry, onClose, onSave, onDelete }: MediaDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states
  const [title, setTitle] = useState(entry.title);
  const [type, setType] = useState<MediaType>(entry.type);
  const [status, setStatus] = useState<WatchStatus>(entry.status || 'Completed');
  const [coverImage, setCoverImage] = useState(entry.coverImage);
  const [rating, setRating] = useState(entry.rating || 8);
  const [review, setReview] = useState(entry.review || '');
  const [favorite, setFavorite] = useState(entry.favorite || false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(entry.genre || []);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  // Release date, seasons, and episodes states
  const [releaseDate, setReleaseDate] = useState(entry.releaseDate || new Date().toISOString().split('T')[0]);
  const [seasonsCount, setSeasonsCount] = useState<number>(entry.seasonsCount || 1);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>(entry.episodes || []);

  // Progress states
  const [episodesWatched, setEpisodesWatched] = useState(entry.episodesWatched || 0);
  const [episodesTotal, setEpisodesTotal] = useState<number | ''>(entry.episodesTotal || '');
  const [expandedSeasons, setExpandedSeasons] = useState<Record<number, boolean>>({ 1: true });

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (isEditing) {
      titleRef.current?.focus();
    }
  }, [isEditing]);

  // Sync state with updated entry from db/hook (e.g. from favoriting or quick updates)
  useEffect(() => {
    setTitle(entry.title);
    setType(entry.type);
    setStatus(entry.status || 'Completed');
    setCoverImage(entry.coverImage);
    setRating(entry.rating || 8);
    setReview(entry.review || '');
    setFavorite(entry.favorite || false);
    setSelectedGenres(entry.genre || []);
    setReleaseDate(entry.releaseDate || new Date().toISOString().split('T')[0]);
    setSeasonsCount(entry.seasonsCount || 1);
    setEpisodes(entry.episodes || []);
    setEpisodesWatched(entry.episodesWatched || 0);
    setEpisodesTotal(entry.episodesTotal || '');
  }, [entry]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;
    setIsSaving(true);

    const finalEpisodesTotal = type !== 'Movie' && episodesTotal !== '' ? Number(episodesTotal) : undefined;
    
    // Auto-complete trigger logic on submit if progress matches total
    let finalEpisodesWatched = type !== 'Movie' ? Number(episodesWatched) : undefined;
    let finalStatus = status;

    if (type !== 'Movie') {
      if (status === 'Completed' && finalEpisodesTotal) {
        finalEpisodesWatched = finalEpisodesTotal;
      } else if (finalEpisodesTotal && finalEpisodesWatched !== undefined && finalEpisodesWatched >= finalEpisodesTotal) {
        finalStatus = 'Completed';
        finalEpisodesWatched = finalEpisodesTotal;
      }
    }
    let finalEpisodes = type !== 'Movie' ? episodes : undefined;
    if (type !== 'Movie' && finalEpisodesTotal) {
      const eps = [...(finalEpisodes || [])];
      if (eps.length < finalEpisodesTotal) {
        for (let i = eps.length; i < finalEpisodesTotal; i++) {
          const estSeason = seasonsCount > 1 
            ? Math.min(seasonsCount, Math.floor((i / finalEpisodesTotal) * seasonsCount) + 1)
            : 1;
          eps.push({
            name: `Episode ${i + 1}`,
            season: estSeason,
            number: i + 1
          });
        }
        finalEpisodes = eps;
      } else if (eps.length > finalEpisodesTotal) {
        finalEpisodes = eps.slice(0, finalEpisodesTotal);
      }
    }
    
    await onSave({
      ...entry,
      title,
      type,
      status: finalStatus,
      coverImage,
      releaseDate: releaseDate || undefined,
      rating: finalStatus === 'Completed' ? rating : 0,
      review,
      favorite,
      genre: selectedGenres,
      episodesWatched: finalEpisodesWatched,
      episodesTotal: finalEpisodesTotal,
      seasonsCount: type !== 'Movie' ? seasonsCount : undefined,
      episodes: finalEpisodes,
    });
    
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleIncrementEpisode = async () => {
    if (type === 'Movie') return;
    const nextWatched = episodesWatched + 1;
    
    // If progress reaches total, set status to Completed and transition to Edit mode to prompt rating/date
    if (episodesTotal && nextWatched >= Number(episodesTotal)) {
      setEpisodesWatched(Number(episodesTotal));
      setStatus('Completed');
      setIsEditing(true); // Open edit form immediately
      await onSave({
        ...entry,
        episodesWatched: Number(episodesTotal),
        status: 'Completed',
      });
      return;
    }
    
    setEpisodesWatched(nextWatched);
    
    let newStatus = status;
    if (status === 'Plan to Watch') {
      newStatus = 'Watching';
      setStatus('Watching');
    }
    
    await onSave({
      ...entry,
      episodesWatched: nextWatched,
      status: newStatus,
    });
  };

  const handleDecrementEpisode = async () => {
    if (type === 'Movie') return;
    const nextWatched = Math.max(0, episodesWatched - 1);
    setEpisodesWatched(nextWatched);
    await onSave({
      ...entry,
      episodesWatched: nextWatched,
    });
  };

  const handleQuickToggleFavorite = async () => {
    const newFavorite = !favorite;
    setFavorite(newFavorite);
    await onSave({
      ...entry,
      favorite: newFavorite,
    });
  };

  const handleDelete = async () => {
    if (entry.id) {
      await onDelete(entry.id);
      onClose();
    }
  };

  const toggleGenre = (genreName: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreName) 
        ? prev.filter(g => g !== genreName)
        : [...prev, genreName]
    );
  };

  const displayRating = hoveredStar !== null ? hoveredStar : rating;
  const isCompleted = status === 'Completed';

  // Generate episodes list if empty but total is known (e.g. legacy entries)
  const displayEpisodes: EpisodeInfo[] = (episodes && episodes.length > 0)
    ? episodes
    : (episodesTotal ? Array.from({ length: Number(episodesTotal) }, (_, i) => ({
        name: `Episode ${i + 1}`,
        season: 1,
        number: i + 1,
        airDate: undefined,
      })) : []);

  // Group episodes by season safely, ensuring integer keys
  const episodesBySeason = displayEpisodes.reduce<Record<number, { episode: EpisodeInfo; globalIndex: number }[]>>((acc, ep, index) => {
    let s = 1;
    if (ep && ep.season !== undefined && ep.season !== null) {
      const parsed = parseInt(ep.season as any, 10);
      if (!isNaN(parsed) && parsed > 0) {
        s = parsed;
      }
    }
    if (!acc[s]) acc[s] = [];
    acc[s].push({ episode: { ...ep, season: s }, globalIndex: index });
    return acc;
  }, {});

  const currentOrNextEpisode = (type !== 'Movie' && displayEpisodes && displayEpisodes.length > 0)
    ? (displayEpisodes[episodesWatched] || displayEpisodes[displayEpisodes.length - 1] || null)
    : null;
  const activeEpisodeIndex = episodesWatched - 1;
  const activeEpisode = type !== 'Movie' && activeEpisodeIndex >= 0 && displayEpisodes && displayEpisodes[activeEpisodeIndex]
    ? displayEpisodes[activeEpisodeIndex]
    : null;

  const toggleSeasonExpand = (seasonNum: number) => {
    setExpandedSeasons(prev => ({
      ...prev,
      [seasonNum]: !prev[seasonNum]
    }));
  };

  const handleEpisodeClick = async (globalIndex: number, isCurrentlyWatched: boolean) => {
    if (type === 'Movie') return;
    const newWatched = isCurrentlyWatched ? globalIndex : globalIndex + 1;
    setEpisodesWatched(newWatched);
    
    let newStatus = status;
    const finalTotal = episodesTotal ? Number(episodesTotal) : displayEpisodes.length;
    
    if (newWatched >= finalTotal) {
      newStatus = 'Completed';
      setStatus('Completed');
      setIsEditing(true); // Open edit form immediately to prompt for rating/review
    } else if (newWatched > 0 && status === 'Plan to Watch') {
      newStatus = 'Watching';
      setStatus('Watching');
    }
    
    await onSave({
      ...entry,
      episodesWatched: newWatched,
      status: newStatus,
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center text-foreground">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-2xl md:max-w-4xl lg:max-w-5xl max-h-[85vh] sm:max-h-[92vh] bg-card rounded-t-[28px] sm:rounded-2xl overflow-hidden z-[101] flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-border/80 dark:border-primary/15 backdrop-blur-xl"
        >
          {/* Blurred Glow Backdrop of the movie poster behind everything */}
          {!isEditing && entry.coverImage && (
            <div className="absolute inset-0 h-[250px] overflow-hidden -z-10 pointer-events-none opacity-[0.08] blur-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.coverImage}
                alt=""
                className="w-full h-full object-cover scale-150"
              />
            </div>
          )}

          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 relative z-10">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="primary">{entry.type}</Badge>
                  {entry.status && entry.status !== 'Completed' && (
                    <Badge variant={entry.status === 'Watching' ? 'accent' : 'muted'}>
                      {entry.status}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!isEditing && (
                <>
                  {/* Quick Toggle Favorite Button */}
                  <button
                    onClick={handleQuickToggleFavorite}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border shadow-sm ${
                      favorite 
                        ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                        : 'bg-muted border-border/60 hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                    }`}
                    title={favorite ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Heart size={14} className={favorite ? 'fill-red-500' : ''} />
                  </button>

                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all focus-ring cursor-pointer text-xs font-bold"
                    title="Edit Entry"
                  >
                    <Edit2 size={12} strokeWidth={2.5} /> Edit Details
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all focus-ring cursor-pointer shadow-sm ${
                      showDeleteConfirm 
                        ? 'bg-red-500 border-red-600 text-white animate-pulse' 
                        : 'bg-muted border-border/60 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-foreground'
                    }`}
                    title="Delete Entry"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-muted border border-border/60 flex items-center justify-center hover:bg-muted/80 hover:text-foreground transition-colors focus-ring cursor-pointer shadow-sm"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Delete Confirmation Banner */}
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-500/10 border-b border-red-500/20 px-6 py-3.5 flex items-center justify-between z-10"
            >
              <span className="text-[12px] font-semibold text-red-400">
                Are you sure you want to delete this title?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-muted hover:bg-card-hover text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          )}

          {/* Content Area */}
          {isEditing ? (
            <form onSubmit={handleUpdate} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-start">
                {/* Column 1 */}
                <div className="space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
                    <input
                      ref={titleRef}
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      placeholder="e.g. Inception, Breaking Bad..."
                      className="w-full bg-muted rounded-xl px-4 py-3 text-foreground text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all border border-border/80 dark:border-border/60"
                    />
                  </div>

                  {/* Type Selector */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
                    <div className="flex gap-2">
                      {mediaTypes.map((mt) => (
                        <button
                          key={mt.value}
                          type="button"
                          onClick={() => setType(mt.value)}
                          className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                            type === mt.value
                              ? 'bg-primary text-white shadow-sm border border-primary/20'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {mt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Selector */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                    <div className="flex gap-2">
                      {statuses.map((st) => (
                        <button
                          key={st.value}
                          type="button"
                          onClick={() => setStatus(st.value)}
                          className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                            status === st.value
                              ? 'bg-primary text-white shadow-sm border border-primary/20'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Release Date / Premiere Date */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {type === 'Movie' ? 'Release Date' : 'Premiere Date'}
                    </label>
                    <input
                      type="date"
                      value={releaseDate}
                      onChange={(e) => setReleaseDate(e.target.value)}
                      className="w-full bg-muted rounded-xl px-4 py-3 text-foreground text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all border border-border/80 dark:border-border/60"
                    />
                  </div>

                  {/* Favorite toggle inside edit form */}
                  <div className="flex items-center justify-between bg-muted/30 border border-border/80 dark:border-border/60 px-4 py-3 rounded-xl">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold">Mark as Favorite</span>
                      <span className="text-[11px] text-muted-foreground">Pin to your favorites dashboard</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFavorite(!favorite)}
                      className={`p-2.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
                        favorite 
                          ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                          : 'bg-muted text-muted-foreground hover:text-foreground border border-border/30'
                      }`}
                    >
                      <Heart size={16} className={favorite ? 'fill-red-500' : ''} />
                    </button>
                  </div>

                  {/* Conditionally Render Rating only for Completed */}
                  <AnimatePresence>
                    {isCompleted && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-3 overflow-hidden"
                      >
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Rating</label>
                          <span className="text-[13px] font-bold text-primary tabular-nums">{displayRating}/10</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto hide-scrollbar py-0.5">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setRating(value)}
                              onMouseEnter={() => setHoveredStar(value)}
                              onMouseLeave={() => setHoveredStar(null)}
                              className="p-0.5 sm:p-1 transition-all hover:scale-125 active:scale-90 cursor-pointer shrink-0"
                            >
                              <Star
                                className={`transition-colors duration-150 w-[17px] h-[17px] sm:w-[22px] sm:h-[22px] ${
                                  value <= displayRating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-muted-foreground/20'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Column 2 */}
                <div className="space-y-4">
                  {/* Cover Image */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cover URL</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <ImageIcon size={15} className="text-muted-foreground/50" />
                      </div>
                      <input
                        type="url"
                        value={coverImage}
                        onChange={(e) => setCoverImage(e.target.value)}
                        placeholder="Paste poster URL..."
                        className="w-full bg-muted rounded-xl pl-10 pr-4 py-3 text-foreground text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all border border-border/80 dark:border-border/60"
                      />
                    </div>
                    {coverImage && (
                      <div className="mt-2 w-16 h-24 rounded-xl overflow-hidden bg-muted border border-border/80 dark:border-border/60 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverImage}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Genres / Tags Selector */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Genres / Tags</label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 border border-border/80 dark:border-border/60 rounded-xl max-h-[140px] overflow-y-auto">
                      {AVAILABLE_GENRES.map((genre) => {
                        const isSelected = selectedGenres.includes(genre);
                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => toggleGenre(genre)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 border cursor-pointer shadow-sm ${
                              isSelected 
                                ? 'bg-primary/10 text-primary border-primary/30 font-bold' 
                                : 'bg-muted text-muted-foreground border-border/60 hover:text-foreground hover:border-border'
                            }`}
                          >
                            {genre}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Watch Progress (only for Series/Anime) */}
                  {type !== 'Movie' && (
                    <div className="bg-muted/40 dark:bg-muted/10 border border-border/80 dark:border-border/60 p-4 rounded-xl space-y-3">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Watch Progress & Seasons</label>
                      <div className="flex gap-4 items-center">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] text-muted-foreground">Episodes Watched</label>
                          <input
                            type="number"
                            min={0}
                            value={episodesWatched}
                            onChange={(e) => setEpisodesWatched(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-muted rounded-lg px-3 py-2 text-foreground text-[13px] border border-border/80 dark:border-border/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] text-muted-foreground">Total Episodes</label>
                          <input
                            type="number"
                            min={1}
                            value={episodesTotal}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1);
                              setEpisodesTotal(val);
                            }}
                            placeholder="e.g. 12, 24 (optional)"
                            className="w-full bg-muted rounded-lg px-3 py-2 text-foreground text-[13px] border border-border/80 dark:border-border/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] text-muted-foreground">Total Seasons</label>
                          <input
                            type="number"
                            min={1}
                            value={seasonsCount}
                            onChange={(e) => setSeasonsCount(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full bg-muted rounded-lg px-3 py-2 text-foreground text-[13px] border border-border/80 dark:border-border/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Review */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Review</label>
                    <textarea
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      placeholder={isCompleted ? 'What did you think?' : 'Any notes?'}
                      className="w-full bg-muted rounded-xl px-4 py-3 text-foreground text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all border border-border/80 dark:border-border/60 min-h-[100px] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Edit Form Footer */}
              <div className="pt-4 mt-6 border-t border-border/40 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 rounded-xl text-[13px] font-semibold bg-muted hover:bg-card-hover text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || isSaving}
                  className="flex-[2] py-3 rounded-xl text-[13px] font-bold bg-primary hover:bg-primary-hover text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.98] cursor-pointer"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  ) : (
                    <Check size={16} strokeWidth={2.5} />
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8">
              {/* Left Column: Poster (Mobile: Horizontal row with Title on the right; Desktop: Sidebar) */}
              <div className="flex flex-row sm:flex-col gap-4 shrink-0 items-start w-full sm:w-[200px] md:w-[260px] lg:w-[300px]">
                {/* Poster Image */}
                <div className="w-[90px] sm:w-full shrink-0">
                  <div className="aspect-[2/3] rounded-[20px] overflow-hidden bg-muted border border-border/80 dark:border-border/60 shadow-md relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.coverImage || `https://placehold.co/300x450/0b0f19/1e293b?text=${encodeURIComponent(entry.title.substring(0, 10))}`}
                      alt={entry.title}
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/300x450/0b0f19/1e293b?text=${encodeURIComponent(entry.title.substring(0, 10))}`;
                      }}
                    />
                  </div>
                </div>

                {/* Mobile Title Block (Only visible on mobile screens) */}
                <div className="flex-1 min-w-0 sm:hidden">
                  <h2 className="font-display text-lg font-extrabold tracking-tight leading-tight mb-1.5 text-foreground">
                    {entry.title}
                  </h2>
                  
                  {/* Genres display */}
                  {entry.genre && entry.genre.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {entry.genre.map((g) => (
                        <Badge key={g} variant="muted" className="lowercase tracking-normal font-medium px-2.5 py-0.5 rounded-lg text-[9px]">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Date added / status message */}
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
                        <Calendar size={11} className="text-primary shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <span>
                            Last Ep: <strong className="text-foreground">S{activeEpisode.season}E{activeEpisode.number}</strong>
                          </span>
                        </div>
                      </div>
                    )}
                    {entry.type !== 'Movie' && !activeEpisode && entry.releaseDate && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Calendar size={11} className="text-muted-foreground" />
                        <span>Premiere: {new Date(entry.releaseDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Widgets & Metadata Stack */}
              <div className="flex-1 flex flex-col space-y-5 sm:space-y-6 min-w-0 w-full">
                {/* Desktop Title Block (Only visible on tablet/desktop) */}
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2 mb-2 group/title">
                    <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                      {entry.title}
                    </h2>
                  </div>
                  
                  {/* Genres display */}
                  {entry.genre && entry.genre.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {entry.genre.map((g) => (
                        <span
                          key={g}
                          className="bg-muted dark:bg-muted/50 border border-border/40 text-muted-foreground px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider select-none"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Last Watched Ep / Release Info */}
                  <div className="mt-3.5 space-y-1.5">
                    {entry.type === 'Movie' ? (
                      entry.releaseDate && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar size={14} className="text-primary shrink-0" />
                          <span>Released: <strong className="text-foreground">{new Date(entry.releaseDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong></span>
                        </div>
                      )
                    ) : (
                      <>
                        {activeEpisode ? (
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Calendar size={14} className="text-primary shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                              <span>
                                Last Watched Ep: <strong className="text-foreground">S{activeEpisode.season}E{activeEpisode.number} - {activeEpisode.name}</strong>
                              </span>
                              {activeEpisode.airDate && (
                                <span className="text-[11px] text-muted-foreground/80 mt-0.5">
                                  Aired: {new Date(activeEpisode.airDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          entry.releaseDate && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar size={14} className="text-primary shrink-0" />
                              <span>Premiere: <strong className="text-foreground">{new Date(entry.releaseDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong></span>
                            </div>
                          )
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Watch Progress (only for Series/Anime) */}
                {type !== 'Movie' && (
                  <div className="bg-muted/30 dark:bg-muted/10 border border-border/40 p-5 rounded-[20px] space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase block">
                          Watch Progress
                        </span>
                        <span className="text-[18px] font-extrabold text-foreground tracking-tight tabular-nums mt-1 block">
                          {episodesWatched} / {episodesTotal || '?'} <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">episodes</span>
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDecrementEpisode}
                          disabled={episodesWatched <= 0}
                          className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none active:scale-90 shadow-sm"
                          title="Decrement Episode"
                        >
                          <Minus size={13} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={handleIncrementEpisode}
                          disabled={episodesTotal ? episodesWatched >= episodesTotal : false}
                          className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:pointer-events-none active:scale-90 shadow-sm"
                          title="Increment Episode"
                        >
                          <Plus size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                    
                    {episodesTotal && (
                      <div className="w-full bg-muted/60 dark:bg-muted/30 rounded-full h-2 overflow-hidden border border-border/20">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(episodesWatched / Number(episodesTotal)) * 100}%` }}
                          className="bg-primary h-full rounded-full"
                          transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Rating display (shown if completed or rating is > 0) */}
                {(entry.status === 'Completed' || !entry.status || (entry.rating && entry.rating > 0)) && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                        <Star
                          key={val}
                          size={16}
                          className={val <= (entry.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/15'}
                        />
                      ))}
                    </div>
                    <span className="text-[13px] font-extrabold text-amber-500 font-display">
                      {(entry.rating || 0)}/10
                    </span>
                  </div>
                )}

                {/* Review Block */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase mb-2">
                    My Notes & Review
                  </span>
                  <div className="bg-muted/30 dark:bg-muted/10 border border-border/40 rounded-[20px] p-5 text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap relative group/notes min-h-[120px] shadow-sm">
                    {entry.review ? entry.review : (
                      <em className="text-muted-foreground/50 font-normal">No review or notes added yet. Click edit to write something!</em>
                    )}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="absolute bottom-3 right-3 opacity-0 group-hover/notes:opacity-100 flex items-center gap-1 px-3.5 py-1.5 bg-muted/80 dark:bg-muted/30 border border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
                    >
                      <Edit2 size={11} strokeWidth={2.2} /> Edit Notes
                    </button>
                  </div>
                </div>

                {/* Episodes & Seasons Collapsible Widget */}
                {type !== 'Movie' && displayEpisodes.length > 0 && (
                  <div className="border border-border/40 rounded-[20px] overflow-hidden bg-muted/10 shadow-sm">
                    <div className="px-5 py-4 bg-muted/20 dark:bg-muted/10 border-b border-border/40 flex items-center gap-2">
                      <Tv size={14} className="text-primary" />
                      <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase flex-1">
                        Episodes & Seasons
                      </span>
                      <span className="text-[11px] bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-lg font-bold">
                        {episodesWatched} / {displayEpisodes.length}
                      </span>
                    </div>

                    <div className="divide-y divide-border/20">
                      {Object.keys(episodesBySeason)
                        .map(Number)
                        .filter(n => !isNaN(n) && n > 0)
                        .sort((a, b) => a - b)
                        .map((seasonNum) => {
                          const seasonEps = episodesBySeason[seasonNum] || [];
                          const activeSeason = currentOrNextEpisode?.season || 1;
                          const totalSeasonsCount = Object.keys(episodesBySeason).filter(k => !isNaN(Number(k)) && Number(k) > 0).length;
                          const isExpanded = expandedSeasons[seasonNum] !== undefined
                            ? expandedSeasons[seasonNum]
                            : (totalSeasonsCount === 1 || seasonNum === activeSeason);
                          
                          // Count how many in this season are watched
                          const watchedInSeason = seasonEps.filter(ep => ep.globalIndex < episodesWatched).length;
                          const totalInSeason = seasonEps.length;
                          const isSeasonFullyWatched = watchedInSeason === totalInSeason;

                          return (
                            <div key={seasonNum} className="flex flex-col">
                              {/* Season Header */}
                              <button
                                type="button"
                                onClick={() => toggleSeasonExpand(seasonNum)}
                                className="w-full px-5 py-3.5 hover:bg-muted/30 transition-colors flex items-center justify-between text-left cursor-pointer border-b border-border/20"
                              >
                                <div className="flex items-center gap-2.5">
                                  {isExpanded ? (
                                    <ChevronDown size={14} className="text-muted-foreground" />
                                  ) : (
                                    <ChevronRight size={14} className="text-muted-foreground" />
                                  )}
                                  <span className="text-[13px] font-bold text-foreground">
                                    Season {seasonNum}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    ({totalInSeason} {totalInSeason === 1 ? 'episode' : 'episodes'})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isSeasonFullyWatched ? (
                                    <span className="text-[10px] text-emerald-500 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                      Completed
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground bg-muted/60 border border-border/40 px-2 py-0.5 rounded-md">
                                      {watchedInSeason} / {totalInSeason}
                                    </span>
                                  )}
                                </div>
                              </button>

                              {/* Episodes List (Collapsible) */}
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden bg-muted/5 dark:bg-muted/5"
                                  >
                                    <div className="divide-y divide-border/20 max-h-[220px] overflow-y-auto">
                                      {seasonEps.map(({ episode, globalIndex }) => {
                                        const isWatched = globalIndex < episodesWatched;
                                        return (
                                          <button
                                            key={globalIndex}
                                            type="button"
                                            onClick={() => handleEpisodeClick(globalIndex, isWatched)}
                                            className={`w-full px-5 py-3 hover:bg-primary/5 transition-all flex items-center justify-between text-left border-l-2 ${
                                              isWatched 
                                                ? 'border-primary bg-primary/5' 
                                                : 'border-transparent'
                                            } cursor-pointer group`}
                                          >
                                            <div className="flex items-center gap-3 min-w-0">
                                              {/* Premium Custom Checkbox */}
                                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                                isWatched 
                                                  ? 'bg-primary border-primary text-white' 
                                                  : 'border-border/60 bg-muted/50 group-hover:border-primary/50'
                                              }`}>
                                                {isWatched && <Check size={11} strokeWidth={3} />}
                                              </div>
                                              
                                              <div className="flex flex-col min-w-0">
                                                <span className={`text-[12px] font-medium transition-colors ${
                                                  isWatched ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                                                }`}>
                                                  Ep {episode.number || (globalIndex + 1)}: {episode.name}
                                                </span>
                                              </div>
                                            </div>

                                            {episode.airDate && (
                                              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                                                Aired: {new Date(episode.airDate).toLocaleDateString(undefined, { dateStyle: 'short' })}
                                              </span>
                                            )}
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
            </div>)}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
