"use client";

import { useState, useEffect, useRef } from 'react';
import { MediaType, WatchStatus, AnimeType, EpisodeInfo, MediaEntry } from '@/lib/db';
import { X, Check, Image as ImageIcon, Star, Heart, Upload, Clock, Film, ListPlus, FolderPen } from 'lucide-react';
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
  const [animeType, setAnimeType] = useState<AnimeType>(initialData?.animeType || 'Show');
  const [status, setStatus] = useState<WatchStatus>(initialData?.status || 'Completed');
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || '');
  const [releaseDate, setReleaseDate] = useState(initialData?.releaseDate || new Date().toISOString().split('T')[0]);
  const [runtime, setRuntime] = useState<number | ''>(initialData?.runtime || '');
  const [franchise, setFranchise] = useState(initialData?.franchise || '');
  const [rating, setRating] = useState(initialData?.rating || 8);
  const [review, setReview] = useState(initialData?.review || '');
  const [favorite, setFavorite] = useState(initialData?.favorite || false);
  const [genresInput, setGenresInput] = useState(initialData?.genre?.join(', ') || '');

  const [episodesWatched, setEpisodesWatched] = useState<number | ''>(initialData?.episodesWatched ?? 0);
  const [episodesTotal, setEpisodesTotal] = useState<number | ''>(initialData?.episodesTotal ?? '');
  const [seasonsCount, setSeasonsCount] = useState<number | ''>(initialData?.seasonsCount ?? 1);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>(initialData?.episodes || []);

  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url');
  const [imageError, setImageError] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Update episodes list when total episodes changes
  useEffect(() => {
    const isEpisodic = type === 'Series' || (type === 'Anime' && animeType === 'Show');
    if (isEpisodic && episodesTotal !== '') {
      const total = Number(episodesTotal);
      if (episodes.length < total) {
        const newEps = [...episodes];
        for (let i = episodes.length; i < total; i++) {
          newEps.push({ name: `Episode ${i + 1}`, season: 1, number: i + 1 });
        }
        setEpisodes(newEps);
      } else if (episodes.length > total) {
        setEpisodes(episodes.slice(0, total));
      }
    }
  }, [episodesTotal, type, animeType, episodes]);

  // High Quality WebP Image Compressor with strict 200KB limit
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let quality = 0.95;
        let maxWidth = 1000;
        let dataUrl = '';

        const compress = () => {
          const canvas = document.createElement('canvas');
          const scale = maxWidth / img.width;
          canvas.width = img.width > maxWidth ? maxWidth : img.width;
          canvas.height = img.width > maxWidth ? img.height * scale : img.height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }

          dataUrl = canvas.toDataURL('image/webp', quality);

          // Calculate approx size in KB
          const sizeKB = (dataUrl.length * (3 / 4)) / 1024;

          if (sizeKB > 200 && quality > 0.3) {
            quality -= 0.15;
            if (quality <= 0.5) maxWidth *= 0.8;
            compress(); // Recurse until it fits
          } else if (sizeKB > 200) {
            setImageError('Image too complex to fit under 200KB. Try another.');
          } else {
            setCoverImage(dataUrl);
          }
        };
        compress();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const updateEpisodeName = (index: number, newName: string) => {
    const updated = [...episodes];
    updated[index].name = newName;
    setEpisodes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;
    setIsSaving(true);

    const isEpisodic = type === 'Series' || (type === 'Anime' && animeType === 'Show');
    const totalEps = episodesTotal === '' ? undefined : Number(episodesTotal);
    const watchedEps = episodesWatched === '' ? 0 : Number(episodesWatched);
    const seasons = seasonsCount === '' ? 1 : Number(seasonsCount);
    const runTimeFinal = runtime === '' ? undefined : Number(runtime);

    const payload = {
      ...(isEditMode ? { id: initialData?.id, createdAt: initialData?.createdAt } : {}),
      title: title.trim(),
      type,
      animeType: type === 'Anime' ? animeType : undefined,
      status,
      coverImage,
      releaseDate: releaseDate || undefined,
      runtime: !isEpisodic ? runTimeFinal : undefined,
      franchise: franchise.trim() || undefined,
      rating: status === 'Completed' ? rating : 0,
      review: review.trim(),
      favorite,
      genre: genresInput.split(',').map(g => g.trim()).filter(Boolean),
      episodesWatched: isEpisodic ? (status === 'Completed' && totalEps ? totalEps : watchedEps) : undefined,
      episodesTotal: isEpisodic ? totalEps : undefined,
      seasonsCount: isEpisodic ? seasons : undefined,
      episodes: isEpisodic ? episodes : undefined,
    };

    await onSave(payload);
    setIsSaving(false);
  };

  const isEpisodic = type === 'Series' || (type === 'Anime' && animeType === 'Show');
  const displayRating = hoveredStar !== null ? hoveredStar : rating; // Fixed the missing variable!

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center text-foreground">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }} transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-card rounded-t-[28px] sm:rounded-2xl overflow-hidden z-[111] flex flex-col shadow-2xl border border-border/80"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-muted/40 to-muted/10 border-b border-border/60 shrink-0">
            <h2 className="font-display text-[18px] font-bold tracking-tight">
              {isEditMode ? 'Edit Details' : 'Add to Collection'}
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-all cursor-pointer"><X size={15} strokeWidth={2.5} /></button>
          </div>

          {/* Body */}
          <form id="media-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Core Info */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-[2] space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Title</label>
                  <input ref={titleRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Inception" className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[14px] border border-border/80 focus:border-primary/50 outline-none transition-all" />
                </div>
                <div className="flex-[1] space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Type</label>
                  <select value={type} onChange={(e: any) => setType(e.target.value)} className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-3 py-3 text-foreground text-[14px] border border-border/80 focus:border-primary/50 outline-none transition-all cursor-pointer">
                    <option value="Movie">Movie</option>
                    <option value="Series">Series</option>
                    <option value="Anime">Anime</option>
                  </select>
                </div>
              </div>

              {type === 'Anime' && (
                <div className="flex gap-2 bg-muted/20 p-1.5 rounded-xl border border-border/40">
                  {(['Show', 'Movie'] as AnimeType[]).map((at) => (
                    <button key={at} type="button" onClick={() => setAnimeType(at)} className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${animeType === at ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}>{at}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Poster & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Cover Image (Max 200KB)</label>
                <div className="flex gap-4 items-start">
                  <div className="w-[90px] h-[135px] rounded-xl overflow-hidden bg-muted border border-border/60 shrink-0 flex items-center justify-center">
                    {coverImage ? <img src={coverImage} alt="Poster" className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-muted-foreground/30" />}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex bg-muted/30 p-1 rounded-lg w-full border border-border/50">
                      <button type="button" onClick={() => setImageInputMode('url')} className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${imageInputMode === 'url' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>URL</button>
                      <button type="button" onClick={() => setImageInputMode('upload')} className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${imageInputMode === 'upload' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}>Upload</button>
                    </div>
                    {imageInputMode === 'url' ? (
                      <input type="text" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="Paste URL..." className="w-full bg-muted/40 rounded-xl px-3 py-3 text-[12px] border border-border/80 outline-none" />
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full bg-muted/20 hover:bg-muted/40 rounded-xl px-3 py-3 border border-dashed border-border/80 cursor-pointer">
                        <Upload size={16} className="mb-1 text-muted-foreground" />
                        <span className="text-muted-foreground font-medium text-[11px]">Choose File</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    )}
                    {imageError && <p className="text-[10px] text-red-500 font-medium">{imageError}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Release Date</label>
                  <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="w-full bg-muted/40 focus:bg-card rounded-xl px-3 py-2.5 text-[13px] border border-border/80 outline-none cursor-text" />
                </div>

                {/* Runtime for Movies */}
                {!isEpisodic && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Clock size={12} /> Runtime (Minutes)</label>
                    <input type="number" min="1" value={runtime} onChange={(e) => setRuntime(e.target.value ? Number(e.target.value) : '')} placeholder="e.g. 120" className="w-full bg-muted/40 focus:bg-card rounded-xl px-3 py-2.5 text-[13px] border border-border/80 outline-none" />
                  </div>
                )}

                {/* Franchise/Series Collection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Film size={12} /> Franchise / Collection</label>
                  <input type="text" value={franchise} onChange={(e) => setFranchise(e.target.value)} placeholder="e.g. Harry Potter, MCU" className="w-full bg-muted/40 focus:bg-card rounded-xl px-3 py-2.5 text-[13px] border border-border/80 outline-none" />
                </div>
              </div>
            </div>

            {/* Status & Genres */}
            <div className="bg-muted/10 border border-border/40 p-4 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</label>
                  <div className="flex gap-1.5">
                    {statuses.map((st) => (
                      <button key={st.value} type="button" onClick={() => setStatus(st.value)} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${status === st.value ? 'bg-primary text-white border-primary/20' : 'bg-muted/50 text-muted-foreground border-border/50'}`}>{st.label}</button>
                    ))}
                  </div>
                </div>
                <div className="flex-[1.5] space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Genres</label>
                  <input type="text" value={genresInput} onChange={(e) => setGenresInput(e.target.value)} placeholder="Action, Sci-Fi, Drama" className="w-full bg-muted/40 focus:bg-card rounded-xl px-3 py-2 text-[13px] border border-border/80 outline-none h-[38px]" />
                </div>
              </div>
            </div>

            {/* Episodes Data (Shows only) */}
            {isEpisodic && (
              <div className="bg-muted/20 border border-border/60 rounded-xl overflow-hidden">
                <div className="p-4 bg-muted/30 border-b border-border/40 flex items-center gap-2">
                  <ListPlus size={16} className="text-primary" />
                  <span className="font-bold text-[13px] uppercase tracking-wider">Episodes Tracker</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-semibold">Total Eps</label>
                      <input type="number" min="1" value={episodesTotal} onChange={(e) => setEpisodesTotal(e.target.value ? Number(e.target.value) : '')} className="w-full bg-card rounded-lg px-3 py-2 text-[13px] border border-border/80 outline-none" />
                    </div>
                    {status === 'Watching' && (
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] text-muted-foreground font-semibold">Watched</label>
                        <input type="number" min="0" value={episodesWatched} onChange={(e) => setEpisodesWatched(e.target.value ? Number(e.target.value) : '')} className="w-full bg-card rounded-lg px-3 py-2 text-[13px] border border-border/80 outline-none" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] text-muted-foreground font-semibold">Seasons</label>
                      <input type="number" min="1" value={seasonsCount} onChange={(e) => setSeasonsCount(e.target.value ? Number(e.target.value) : '')} className="w-full bg-card rounded-lg px-3 py-2 text-[13px] border border-border/80 outline-none" />
                    </div>
                  </div>

                  {/* Manual Episode List Editor */}
                  {episodes.length > 0 && episodes.length <= 100 && (
                    <div className="mt-4 border border-border/40 rounded-lg overflow-hidden max-h-[180px] overflow-y-auto">
                      <div className="sticky top-0 bg-muted/80 backdrop-blur-md px-3 py-1.5 border-b border-border/40 text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <FolderPen size={12} /> Edit Episode Titles
                      </div>
                      <div className="divide-y divide-border/20">
                        {episodes.map((ep, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-card/50">
                            <span className="text-[10px] text-muted-foreground font-mono w-6">{idx + 1}.</span>
                            <input type="text" value={ep.name} onChange={(e) => updateEpisodeName(idx, e.target.value)} className="flex-1 bg-transparent text-[12px] focus:outline-none focus:text-primary transition-colors" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Favorite & Rating */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1 w-full flex items-center justify-between bg-muted/20 border border-border/60 px-4 py-3.5 rounded-xl">
                <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Favorite</span>
                <button type="button" onClick={() => setFavorite(!favorite)} className={`p-2 rounded-lg transition-all border cursor-pointer ${favorite ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-muted/50 text-muted-foreground border-border/50'}`}>
                  <Heart size={16} className={favorite ? 'fill-red-500' : ''} />
                </button>
              </div>

              <AnimatePresence>
                {status === 'Completed' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-[1.5] w-full flex items-center justify-between bg-muted/20 border border-border/60 px-4 py-3 rounded-xl">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Rating</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[14px] font-bold text-primary tabular-nums mr-2">{displayRating}/10</span>
                      <div className="flex items-center">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                          <button key={value} type="button" onClick={() => setRating(value)} onMouseEnter={() => setHoveredStar(value)} onMouseLeave={() => setHoveredStar(null)} className="p-0.5 transition-all hover:scale-125 cursor-pointer">
                            <Star className={`w-[16px] h-[16px] transition-colors ${value <= displayRating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Review */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Review / Notes</label>
              <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="What did you think?" className="w-full bg-muted/40 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[13px] border border-border/80 outline-none transition-all resize-none min-h-[80px]" />
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 bg-muted/10 border-t border-border/60 flex gap-3 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-[13px] font-bold bg-muted hover:bg-muted-hover text-foreground transition-all cursor-pointer">Cancel</button>
            <button type="submit" form="media-form" disabled={!title.trim() || isSaving} className="flex-[2] py-3 rounded-xl text-[13px] font-bold bg-primary text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer">
              {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
              {isSaving ? 'Saving...' : 'Save Media'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}