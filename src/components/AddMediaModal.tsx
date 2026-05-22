"use client";

import { useState, useEffect, useRef } from 'react';
import { MediaType, WatchStatus, AnimeType, EpisodeInfo, MediaEntry, Tag } from '@/lib/db';
// Added FolderPen to the imports below!
import { X, Check, Image as ImageIcon, Star, Heart, Upload, Clock, Film, ListPlus, Search, FolderPen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMedia } from '@/hooks/useMedia';

interface AddMediaModalProps {
  onClose: () => void;
  onSave: (entry: any) => Promise<void> | void;
  initialData?: MediaEntry | null;
}

const mediaTypes = ['Movie', 'Series', 'Anime'];
const statuses = ['Completed', 'Watching', 'Plan to Watch'];

export function AddMediaModal({ onClose, onSave, initialData }: AddMediaModalProps) {
  const { genres: dbGenres, franchises: dbFranchises, setGenres, setFranchises } = useMedia();
  const isEditMode = !!initialData;

  const [title, setTitle] = useState(initialData?.title || '');
  const [type, setType] = useState<MediaType>(initialData?.type || 'Movie');
  const [animeType, setAnimeType] = useState<AnimeType>(initialData?.animeType || 'Show');
  const [status, setStatus] = useState<WatchStatus>(initialData?.status || 'Completed');
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || '');
  const [releaseDate, setReleaseDate] = useState(initialData?.releaseDate || new Date().toISOString().split('T')[0]);
  const [runtime, setRuntime] = useState<number | ''>(initialData?.runtime || '');
  const [rating, setRating] = useState(initialData?.rating || 8);
  const [review, setReview] = useState(initialData?.review || '');
  const [favorite, setFavorite] = useState(initialData?.favorite || false);

  // Normalized Data State
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>(initialData?.genreIds || []);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string | null>(initialData?.franchiseId || null);

  // Progress/Episodes
  const [episodesWatched, setEpisodesWatched] = useState<number | ''>(initialData?.episodesWatched ?? 0);
  const [episodesTotal, setEpisodesTotal] = useState<number | ''>(initialData?.episodesTotal ?? '');
  const [seasonsCount, setSeasonsCount] = useState<number | ''>(initialData?.seasonsCount ?? 1);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>(initialData?.episodes || []);

  // UI State
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url');

  // Autocomplete Lookups
  const [genreSearch, setGenreSearch] = useState('');
  const [franchiseSearch, setFranchiseSearch] = useState('');
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showFranchiseDropdown, setShowFranchiseDropdown] = useState(false);

  // Synchronize dynamic episodes array length
  useEffect(() => {
    const isEpisodic = type === 'Series' || (type === 'Anime' && animeType === 'Show');
    if (isEpisodic && episodesTotal !== '') {
      const total = Number(episodesTotal);
      if (episodes.length !== total) {
        const newEps = [...episodes];
        if (newEps.length < total) {
          for (let i = newEps.length; i < total; i++) {
            newEps.push({ name: `Episode ${i + 1}`, season: 1, number: i + 1, runtime: typeof runtime === 'number' ? runtime : undefined });
          }
        } else {
          newEps.length = total;
        }
        setEpisodes(newEps);
      }
    }
  }, [episodesTotal, type, animeType, runtime, episodes]);

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
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setCoverImage(canvas.toDataURL('image/webp', 0.8));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCreateFranchise = () => {
    if (!franchiseSearch.trim()) return;
    const newFranchise: Tag = { id: crypto.randomUUID(), name: franchiseSearch.trim() };
    setFranchises([...dbFranchises, newFranchise]);
    setSelectedFranchiseId(newFranchise.id);
    setFranchiseSearch('');
    setShowFranchiseDropdown(false);
  };

  const handleCreateGenre = () => {
    if (!genreSearch.trim()) return;
    const newGenre: Tag = { id: crypto.randomUUID(), name: genreSearch.trim() };
    setGenres([...dbGenres, newGenre]);
    setSelectedGenreIds([...selectedGenreIds, newGenre.id]);
    setGenreSearch('');
    setShowGenreDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;
    setIsSaving(true);

    const isEpisodic = type === 'Series' || (type === 'Anime' && animeType === 'Show');
    const totalEps = episodesTotal === '' ? undefined : Number(episodesTotal);

    const payload = {
      ...(isEditMode ? { id: initialData?.id, createdAt: initialData?.createdAt } : {}),
      title: title.trim(),
      type,
      animeType: type === 'Anime' ? animeType : undefined,
      status,
      coverImage,
      releaseDate: releaseDate || undefined,
      runtime: runtime === '' ? undefined : Number(runtime),
      franchiseId: selectedFranchiseId || undefined,
      genreIds: selectedGenreIds,
      rating: status === 'Completed' ? rating : 0,
      review: review.trim(),
      favorite,
      episodesWatched: isEpisodic ? (status === 'Completed' && totalEps ? totalEps : Number(episodesWatched)) : undefined,
      episodesTotal: isEpisodic ? totalEps : undefined,
      seasonsCount: isEpisodic ? Number(seasonsCount) : undefined,
      episodes: isEpisodic ? episodes : undefined,
    };

    await onSave(payload);
    setIsSaving(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center text-foreground">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }} className="relative w-full max-w-2xl max-h-[90vh] bg-card rounded-t-[28px] sm:rounded-2xl overflow-hidden z-[111] flex flex-col shadow-2xl border border-border/80">

          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-muted/40 to-muted/10 border-b border-border/60 shrink-0">
            <h2 className="font-display text-[18px] font-bold tracking-tight">{isEditMode ? 'Edit Media' : 'Add to Collection'}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-all cursor-pointer"><X size={15} strokeWidth={2.5} /></button>
          </div>

          <form id="media-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Title & Type */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-[2] space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Inception" className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[14px] border border-border/80 outline-none transition-all" />
              </div>
              <div className="flex-[1] space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Type</label>
                <select value={type} onChange={(e: any) => setType(e.target.value)} className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-3 py-3 text-foreground text-[14px] border border-border/80 outline-none transition-all cursor-pointer">
                  {mediaTypes.map(mt => <option key={mt} value={mt}>{mt}</option>)}
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

            {/* Poster & Collections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Cover Image</label>
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
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2 relative">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Film size={12} /> Collection / Universe</label>
                  {selectedFranchiseId ? (
                    <div className="flex items-center justify-between bg-primary/10 border border-primary/20 px-3 py-2.5 rounded-xl">
                      <span className="text-[13px] font-bold text-primary">{dbFranchises.find(f => f.id === selectedFranchiseId)?.name}</span>
                      <button type="button" onClick={() => setSelectedFranchiseId(null)} className="text-primary hover:text-red-500 cursor-pointer"><X size={14} /></button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input type="text" value={franchiseSearch} onFocus={() => setShowFranchiseDropdown(true)} onChange={(e) => setFranchiseSearch(e.target.value)} placeholder="Search or add collection..." className="w-full pl-9 pr-3 py-2.5 bg-muted/40 focus:bg-card rounded-xl text-[13px] border border-border/80 outline-none" />
                      </div>
                      {showFranchiseDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/80 rounded-xl shadow-xl z-50 max-h-[150px] overflow-y-auto">
                          {dbFranchises.filter(f => f.name.toLowerCase().includes(franchiseSearch.toLowerCase())).map(f => (
                            <div key={f.id} onClick={() => { setSelectedFranchiseId(f.id); setShowFranchiseDropdown(false); setFranchiseSearch(''); }} className="px-3 py-2 text-[13px] hover:bg-muted cursor-pointer font-medium">{f.name}</div>
                          ))}
                          {franchiseSearch.trim() && !dbFranchises.find(f => f.name.toLowerCase() === franchiseSearch.toLowerCase()) && (
                            <div onClick={handleCreateFranchise} className="px-3 py-2 text-[13px] text-primary hover:bg-primary/10 cursor-pointer font-bold flex items-center gap-2"><ListPlus size={14} /> Create "{franchiseSearch}"</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date</label>
                    <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="w-full bg-muted/40 focus:bg-card rounded-xl px-3 py-2.5 text-[13px] border border-border/80 outline-none" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Clock size={12} /> Runtime</label>
                    <input type="number" min="1" value={runtime} onChange={(e) => setRuntime(e.target.value ? Number(e.target.value) : '')} placeholder="Min" className="w-full bg-muted/40 focus:bg-card rounded-xl px-3 py-2.5 text-[13px] border border-border/80 outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Genres */}
            <div className="bg-muted/10 border border-border/40 p-4 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</label>
                  <div className="flex gap-1.5">
                    {statuses.map((st: any) => (
                      <button key={st} type="button" onClick={() => setStatus(st)} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${status === st ? 'bg-primary text-white border-primary/20' : 'bg-muted/50 text-muted-foreground border-border/50'}`}>{st}</button>
                    ))}
                  </div>
                </div>

                {/* Tag Search System */}
                <div className="flex-[1.5] space-y-2 relative">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Genres</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedGenreIds.map(id => {
                      const g = dbGenres.find(x => x.id === id);
                      if (!g) return null;
                      return (
                        <span key={id} className="bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1">
                          {g.name} <button type="button" onClick={() => setSelectedGenreIds(selectedGenreIds.filter(x => x !== id))} className="hover:text-red-500 cursor-pointer"><X size={12} /></button>
                        </span>
                      )
                    })}
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" value={genreSearch} onFocus={() => setShowGenreDropdown(true)} onChange={(e) => setGenreSearch(e.target.value)} placeholder="Add genre..." className="w-full pl-9 pr-3 py-2 bg-muted/40 focus:bg-card rounded-xl text-[13px] border border-border/80 outline-none" />
                  </div>
                  {showGenreDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/80 rounded-xl shadow-xl z-50 max-h-[150px] overflow-y-auto">
                      {dbGenres.filter(g => !selectedGenreIds.includes(g.id) && g.name.toLowerCase().includes(genreSearch.toLowerCase())).map(g => (
                        <div key={g.id} onClick={() => { setSelectedGenreIds([...selectedGenreIds, g.id]); setShowGenreDropdown(false); setGenreSearch(''); }} className="px-3 py-2 text-[13px] hover:bg-muted cursor-pointer font-medium">{g.name}</div>
                      ))}
                      {genreSearch.trim() && !dbGenres.find(g => g.name.toLowerCase() === genreSearch.toLowerCase()) && (
                        <div onClick={handleCreateGenre} className="px-3 py-2 text-[13px] text-primary hover:bg-primary/10 cursor-pointer font-bold flex items-center gap-2"><ListPlus size={14} /> Create "{genreSearch}"</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Advanced Episodes Tracker */}
            {(type === 'Series' || (type === 'Anime' && animeType === 'Show')) && (
              <div className="bg-muted/20 border border-border/60 rounded-xl overflow-hidden">
                <div className="p-4 bg-muted/30 border-b border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListPlus size={16} className="text-primary" />
                    <span className="font-bold text-[13px] uppercase tracking-wider">Episodes Architecture</span>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1.5"><label className="text-[10px] text-muted-foreground font-semibold">Total Eps</label><input type="number" min="1" value={episodesTotal} onChange={(e) => setEpisodesTotal(e.target.value ? Number(e.target.value) : '')} className="w-full bg-card rounded-lg px-3 py-2 text-[13px] border border-border/80 outline-none" /></div>
                    <div className="flex-1 space-y-1.5"><label className="text-[10px] text-muted-foreground font-semibold">Watched</label><input type="number" min="0" value={episodesWatched} onChange={(e) => setEpisodesWatched(e.target.value ? Number(e.target.value) : '')} className="w-full bg-card rounded-lg px-3 py-2 text-[13px] border border-border/80 outline-none" /></div>
                    <div className="flex-1 space-y-1.5"><label className="text-[10px] text-muted-foreground font-semibold">Seasons</label><input type="number" min="1" value={seasonsCount} onChange={(e) => setSeasonsCount(e.target.value ? Number(e.target.value) : '')} className="w-full bg-card rounded-lg px-3 py-2 text-[13px] border border-border/80 outline-none" /></div>
                  </div>

                  {episodes.length > 0 && episodes.length <= 150 && (
                    <div className="mt-4 border border-border/40 rounded-lg overflow-hidden max-h-[220px] overflow-y-auto">
                      <div className="sticky top-0 bg-muted/90 backdrop-blur-md px-3 py-2 border-b border-border/40 flex items-center gap-2">
                        <FolderPen size={12} className="text-muted-foreground" /> <span className="text-[10px] font-bold text-muted-foreground uppercase">Detailed Episode Data</span>
                      </div>
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="px-3 py-1.5 font-semibold text-muted-foreground w-12">Ep</th>
                            <th className="px-3 py-1.5 font-semibold text-muted-foreground">Title</th>
                            <th className="px-3 py-1.5 font-semibold text-muted-foreground w-20">Season</th>
                            <th className="px-3 py-1.5 font-semibold text-muted-foreground w-24">Runtime (m)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {episodes.map((ep, idx) => (
                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-1.5 text-muted-foreground font-mono">{idx + 1}</td>
                              <td className="px-3 py-1.5">
                                <input type="text" value={ep.name} onChange={(e) => { const n = [...episodes]; n[idx].name = e.target.value; setEpisodes(n); }} className="w-full bg-transparent outline-none focus:text-primary transition-colors font-medium text-[12px]" />
                              </td>
                              <td className="px-3 py-1.5">
                                <input type="number" min="1" value={ep.season || 1} onChange={(e) => { const n = [...episodes]; n[idx].season = Number(e.target.value); setEpisodes(n); }} className="w-full bg-card border border-border/50 rounded px-2 py-0.5 outline-none text-center" />
                              </td>
                              <td className="px-3 py-1.5">
                                <input type="number" min="1" value={ep.runtime || ''} onChange={(e) => { const n = [...episodes]; n[idx].runtime = e.target.value ? Number(e.target.value) : undefined; setEpisodes(n); }} placeholder="Global" className="w-full bg-card border border-border/50 rounded px-2 py-0.5 outline-none text-center" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Favorite & Rating */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1 w-full flex items-center justify-between bg-muted/20 border border-border/60 px-4 py-3.5 rounded-xl">
                <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Favorite</span>
                <button type="button" onClick={() => setFavorite(!favorite)} className={`p-2 rounded-lg transition-all border cursor-pointer ${favorite ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-muted/50 text-muted-foreground border-border/50'}`}><Heart size={16} className={favorite ? 'fill-red-500' : ''} /></button>
              </div>

              <AnimatePresence>
                {status === 'Completed' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-[1.5] w-full flex items-center justify-between bg-muted/20 border border-border/60 px-4 py-3 rounded-xl">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Rating</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[14px] font-bold text-primary tabular-nums mr-2">{hoveredStar !== null ? hoveredStar : rating}/10</span>
                      <div className="flex items-center">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                          <button key={value} type="button" onClick={() => setRating(value)} onMouseEnter={() => setHoveredStar(value)} onMouseLeave={() => setHoveredStar(null)} className="p-0.5 transition-all hover:scale-125 cursor-pointer">
                            <Star className={`w-[16px] h-[16px] transition-colors ${value <= (hoveredStar !== null ? hoveredStar : rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Review / Notes</label>
              <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="What did you think?" className="w-full bg-muted/40 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[13px] border border-border/80 outline-none transition-all resize-none min-h-[80px]" />
            </div>
          </form>

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