"use client";

import { useState, useEffect, useRef } from 'react';
import { MediaType, WatchStatus, EpisodeInfo, AVAILABLE_GENRES, MediaEntry } from '@/lib/db';
import { X, Check, Image as ImageIcon, Star, Heart, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddMediaModalProps {
  onClose: () => void;
  onSave: (entry: any) => Promise<void> | void;
  initialData?: MediaEntry | null;
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

export function AddMediaModal({ onClose, onSave, initialData }: AddMediaModalProps) {
  const isEditMode = !!initialData;

  const [title, setTitle] = useState(initialData?.title || '');
  const [type, setType] = useState<MediaType>(initialData?.type || 'Movie');
  const [status, setStatus] = useState<WatchStatus>(initialData?.status || 'Completed');
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || '');
  const [releaseDate, setReleaseDate] = useState(initialData?.releaseDate || new Date().toISOString().split('T')[0]);
  const [rating, setRating] = useState(initialData?.rating || 8);
  const [review, setReview] = useState(initialData?.review || '');
  const [favorite, setFavorite] = useState(initialData?.favorite || false);

  // Convert array of genres into comma-separated string for easy manual editing
  const [genresInput, setGenresInput] = useState(initialData?.genre?.join(', ') || '');

  const [episodesWatched, setEpisodesWatched] = useState<number | ''>(initialData?.episodesWatched ?? 0);
  const [episodesTotal, setEpisodesTotal] = useState<number | ''>(initialData?.episodesTotal ?? '');
  const [seasonsCount, setSeasonsCount] = useState<number | ''>(initialData?.seasonsCount ?? 1);

  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url');

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Compress image to save localStorage quota
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; // Resize width to save space
        let scaleSize = 1;
        if (img.width > MAX_WIDTH) {
          scaleSize = MAX_WIDTH / img.width;
        }
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Compress as JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCoverImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;
    setIsSaving(true);

    const totalEps = episodesTotal === '' ? undefined : Number(episodesTotal);
    const watchedEps = episodesWatched === '' ? 0 : Number(episodesWatched);
    const seasons = seasonsCount === '' ? 1 : Number(seasonsCount);

    // Generate basic episode array to keep compatibility with existing db structure
    let generatedEpisodes = initialData?.episodes || [];
    if (type !== 'Movie' && totalEps) {
      const eps = [...generatedEpisodes];
      if (eps.length < totalEps) {
        for (let i = eps.length; i < totalEps; i++) {
          const estSeason = seasons > 1
            ? Math.min(seasons, Math.floor((i / totalEps) * seasons) + 1)
            : 1;
          eps.push({
            name: `Episode ${i + 1}`,
            season: estSeason,
            number: i + 1
          });
        }
      } else if (eps.length > totalEps) {
        eps.length = totalEps; // Truncate if total reduced
      }
      generatedEpisodes = eps;
    }

    const payload = {
      ...(isEditMode ? { id: initialData?.id, createdAt: initialData?.createdAt } : {}),
      title: title.trim(),
      type,
      status,
      coverImage,
      releaseDate: releaseDate || undefined,
      rating: status === 'Completed' ? rating : 0,
      review: review.trim(),
      favorite,
      genre: genresInput.split(',').map(g => g.trim()).filter(Boolean),
      episodesWatched: type !== 'Movie' ? (status === 'Completed' && totalEps ? totalEps : watchedEps) : undefined,
      episodesTotal: type !== 'Movie' ? totalEps : undefined,
      seasonsCount: type !== 'Movie' ? seasons : undefined,
      episodes: type !== 'Movie' ? generatedEpisodes : undefined,
    };

    await onSave(payload);
    setIsSaving(false);
  };

  const displayRating = hoveredStar !== null ? hoveredStar : rating;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center text-foreground">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] bg-card rounded-t-[28px] sm:rounded-2xl overflow-hidden z-[111] flex flex-col shadow-2xl border border-border/80"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
            <h2 className="font-display text-[17px] font-bold tracking-tight">
              {isEditMode ? 'Edit Media Details' : 'Add to Collection'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-muted/65 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>

          {/* Form Body */}
          <form id="media-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {/* Title & Date */}
            <div className="flex gap-3">
              <div className="flex-[2] space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Breaking Bad"
                  className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[14px] border border-border/80 focus:border-primary/45 outline-none transition-all"
                />
              </div>
              <div className="flex-[1] space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-3 py-3 text-foreground text-[14px] border border-border/80 focus:border-primary/45 outline-none transition-all"
                />
              </div>
            </div>

            {/* Type & Status */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
                <div className="flex flex-col gap-1.5">
                  {mediaTypes.map((mt) => (
                    <button
                      key={mt.value}
                      type="button"
                      onClick={() => setType(mt.value)}
                      className={`py-2 rounded-lg text-[12px] font-bold transition-all border ${type === mt.value ? 'bg-primary text-white border-primary/20' : 'bg-muted/50 text-muted-foreground hover:text-foreground border-border/50'
                        }`}
                    >
                      {mt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                <div className="flex flex-col gap-1.5">
                  {statuses.map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => setStatus(st.value)}
                      className={`py-2 rounded-lg text-[12px] font-bold transition-all border ${status === st.value ? 'bg-primary text-white border-primary/20' : 'bg-muted/50 text-muted-foreground hover:text-foreground border-border/50'
                        }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Poster Upload / URL */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Poster Image</label>
              <div className="flex gap-4 items-start">
                <div className="w-[85px] h-[125px] rounded-xl overflow-hidden bg-muted border border-border/60 shrink-0 relative flex items-center justify-center">
                  {coverImage ? (
                    <img src={coverImage} alt="Poster" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={24} className="text-muted-foreground/30" />
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex bg-muted/30 p-1 rounded-lg w-fit border border-border/50">
                    <button type="button" onClick={() => setImageInputMode('url')} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors ${imageInputMode === 'url' ? 'bg-card shadow-sm text-foreground border border-border/50' : 'text-muted-foreground'}`}>URL</button>
                    <button type="button" onClick={() => setImageInputMode('upload')} className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-colors ${imageInputMode === 'upload' ? 'bg-card shadow-sm text-foreground border border-border/50' : 'text-muted-foreground'}`}>Upload</button>
                  </div>

                  {imageInputMode === 'url' ? (
                    <input
                      type="text"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="Paste image URL here..."
                      className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-3 py-3 text-[13px] border border-border/80 outline-none transition-all"
                    />
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full bg-muted/20 hover:bg-muted/40 rounded-xl px-3 py-4 border border-dashed border-border/80 cursor-pointer transition-all">
                      <Upload size={18} className="mb-2 text-muted-foreground" />
                      <span className="text-muted-foreground font-medium text-[12px]">Click to choose image</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Genres */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Genres (Comma Separated)</label>
              <input
                type="text"
                value={genresInput}
                onChange={(e) => setGenresInput(e.target.value)}
                placeholder="e.g. Action, Sci-Fi, Drama"
                className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[13px] border border-border/80 outline-none transition-all"
              />
            </div>

            {/* Episodes & Seasons */}
            {type !== 'Movie' && (
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Eps</label>
                  <input
                    type="number"
                    min="1"
                    value={episodesTotal}
                    onChange={(e) => setEpisodesTotal(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Total"
                    className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-3 py-2.5 text-[13px] border border-border/80 outline-none"
                  />
                </div>
                {status === 'Watching' && (
                  <div className="flex-1 space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Watched</label>
                    <input
                      type="number"
                      min="0"
                      value={episodesWatched}
                      onChange={(e) => setEpisodesWatched(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Watched"
                      className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-3 py-2.5 text-[13px] border border-border/80 outline-none"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Seasons</label>
                  <input
                    type="number"
                    min="1"
                    value={seasonsCount}
                    onChange={(e) => setSeasonsCount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Seasons"
                    className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-3 py-2.5 text-[13px] border border-border/80 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Favorite Toggle */}
            <div className="flex items-center justify-between bg-muted/20 border border-border/60 px-4 py-3 rounded-xl">
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold">Mark as Favorite</span>
                <span className="text-[11px] text-muted-foreground">Pin to your favorites dashboard</span>
              </div>
              <button
                type="button"
                onClick={() => setFavorite(!favorite)}
                className={`p-2.5 rounded-xl transition-all active:scale-95 border ${favorite ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-muted/50 text-muted-foreground border-border/50'
                  }`}
              >
                <Heart size={16} className={favorite ? 'fill-red-500' : ''} />
              </button>
            </div>

            {/* Rating */}
            <AnimatePresence>
              {status === 'Completed' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <div className="flex justify-between items-center pt-2">
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
                        className="p-1 transition-all hover:scale-125 active:scale-90 shrink-0"
                      >
                        <Star
                          className={`transition-colors duration-150 w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] ${value <= displayRating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Review */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Review <span className="text-muted-foreground/40 normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="What did you think?"
                className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[13px] border border-border/80 outline-none transition-all resize-none min-h-[80px]"
              />
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-5 py-4 border-t border-border/60 flex gap-3 bg-muted/10 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-[13px] font-semibold bg-muted hover:bg-muted-hover border border-border/50 text-foreground transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="media-form"
              disabled={!title.trim() || isSaving}
              className="flex-[2] py-3 rounded-xl text-[13px] font-bold bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25 border border-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <Check size={16} strokeWidth={2.5} />
              )}
              {isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Add to Tracker')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}