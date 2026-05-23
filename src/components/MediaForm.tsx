// src/components/MediaForm.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { MediaType, WatchStatus, AnimeType, EpisodeInfo, MediaEntry, Tag, isEpisodic } from '@/lib/db';
import { X, Check, Image as ImageIcon, Star, Heart, Upload, Clock, Film, ListPlus, Search, FolderPen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMedia } from '@/hooks/useMedia';
import { toast } from 'sonner';

interface MediaFormProps {
  onCancel: () => void;
  onSave: (entry: any) => Promise<void> | void;
  initialData?: MediaEntry | null;
}

const mediaTypes = ['Movie', 'TV Show', 'Anime'];
const statuses = ['Completed', 'Watching', 'Plan to Watch'];

export function MediaForm({ onCancel, onSave, initialData }: MediaFormProps) {
  const { entries, genres: dbGenres, franchises: dbFranchises, setGenres, setFranchises } = useMedia();
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

  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>(initialData?.genreIds || []);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string | null>(initialData?.franchiseId || null);

  const [episodesWatched, setEpisodesWatched] = useState<number | ''>(initialData?.episodesWatched ?? 0);
  const [episodesTotal, setEpisodesTotal] = useState<number | ''>(initialData?.episodesTotal ?? '');
  const [seasonsCount, setSeasonsCount] = useState<number | ''>(initialData?.seasonsCount ?? 1);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>(initialData?.episodes || []);
  const [activeSeasonTab, setActiveSeasonTab] = useState<number>(1);

  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url');

  const [genreSearch, setGenreSearch] = useState('');
  const [franchiseSearch, setFranchiseSearch] = useState('');
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showFranchiseDropdown, setShowFranchiseDropdown] = useState(false);
  const [formTab, setFormTab] = useState<'General' | 'Details' | 'Episodes'>('General');

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const currentIsEpisodic = isEpisodic({ type, animeType });

  useEffect(() => {
    if (episodes.length === 0) return;
    let needsFix = false;
    const seasonCounts: Record<number, number> = {};
    const newEps = [...episodes];

    for (let i = 0; i < newEps.length; i++) {
      const s = newEps[i].season || 1;
      if (!seasonCounts[s]) seasonCounts[s] = 0;
      seasonCounts[s]++;

      const expectedNumber = seasonCounts[s];
      if (newEps[i].number !== expectedNumber) {
        needsFix = true;
        if (newEps[i].name === `Episode ${newEps[i].number}`) {
          newEps[i].name = `Episode ${expectedNumber}`;
        }
        newEps[i].number = expectedNumber;
      }
    }
    if (needsFix) setEpisodes(newEps);
  }, []);

  useEffect(() => {
    if (currentIsEpisodic) {
      if (episodes.length > 0) {
        setEpisodesTotal(episodes.length);
        const uniqueSeasons = new Set(episodes.map(e => e.season || 1));
        setSeasonsCount(uniqueSeasons.size);
      } else {
        setEpisodesTotal('');
        setSeasonsCount(1);
      }
    }
  }, [episodes, currentIsEpisodic]);

  useEffect(() => {
    if (currentIsEpisodic) {
      if (episodes.length > 0) {
        const totalRuntime = episodes.reduce((acc, ep) => acc + (ep.runtime || 0), 0);
        setRuntime(totalRuntime > 0 ? totalRuntime : '');
      } else {
        setRuntime('');
      }
    }
  }, [episodes, currentIsEpisodic]);

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

    if (!isEditMode) {
      const duplicate = entries.find(entry => entry.title.toLowerCase() === title.trim().toLowerCase() && entry.type === type);
      if (duplicate) {
        toast.error(`"${title.trim()}" already exists.`, {
          description: "You can edit the existing entry instead.",
        });
        setIsSaving(false);
        return;
      }
    }

    const totalEps = episodesTotal === '' ? undefined : Number(episodesTotal);

    const payload = {
      ...(isEditMode ? { id: initialData?.id, createdAt: initialData?.createdAt } : { createdAt: Date.now() }),
      updatedAt: Date.now(), // DB modification time explicitly updated here
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
      episodesWatched: currentIsEpisodic ? (status === 'Completed' && totalEps ? totalEps : Number(episodesWatched)) : undefined,
      episodesTotal: currentIsEpisodic ? totalEps : undefined,
      seasonsCount: currentIsEpisodic ? Number(seasonsCount) : undefined,
      episodes: currentIsEpisodic ? episodes : undefined,
    };

    await onSave(payload);
    setIsSaving(false);
  };

  const displayRating = hoveredStar !== null ? hoveredStar : rating;

  return (
    <div className="w-full max-w-4xl bg-card rounded-2xl overflow-hidden flex flex-col border border-border/80 shadow-sm mx-auto h-full max-h-[800px]">
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-muted/40 to-muted/10 border-b border-border/60 shrink-0">
        <h2 className="font-display text-[18px] font-bold tracking-tight">{isEditMode ? 'Edit Media' : 'Add to Collection'}</h2>
      </div>

      <div className="flex border-b border-border/60 shrink-0 bg-muted/10 px-6 pt-3 gap-8">
        {(currentIsEpisodic ? ['General', 'Details', 'Episodes'] : ['General', 'Details']).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setFormTab(tab as any)}
            className={`pb-3 text-[12px] font-bold tracking-wider uppercase transition-all border-b-2 cursor-pointer ${formTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <form id="media-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5">
        {formTab === 'General' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-[2] space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Title</label>
                <input ref={titleRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Inception" className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[14px] border border-border/80 outline-none transition-all" />
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
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Film size={12} /> Saga</label>
                  {selectedFranchiseId ? (
                    <div className="flex items-center justify-between bg-primary/10 border border-primary/20 px-3 py-2.5 rounded-xl">
                      <span className="text-[13px] font-bold text-primary">{dbFranchises.find(f => f.id === selectedFranchiseId)?.name}</span>
                      <button type="button" onClick={() => setSelectedFranchiseId(null)} className="text-primary hover:text-red-500 cursor-pointer"><X size={14} /></button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input type="text" value={franchiseSearch} onFocus={() => setShowFranchiseDropdown(true)} onChange={(e) => setFranchiseSearch(e.target.value)} placeholder="Search or add saga..." className="w-full pl-9 pr-3 py-2.5 bg-muted/40 focus:bg-card rounded-xl text-[13px] border border-border/80 outline-none" />
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
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</label>
                  <div className="flex gap-1.5">
                    {statuses.map((st: any) => (
                      <button key={st} type="button" onClick={() => setStatus(st)} className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${status === st ? 'bg-primary text-white border-primary/20' : 'bg-muted/50 text-muted-foreground border-border/50'}`}>{st}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 relative">
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
          </div>
        )}

        {formTab === 'Details' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Release Date</label>
                <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[14px] border border-border/80 outline-none transition-all" />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Clock size={12} /> Runtime (min)</label>
                <input
                  type="number"
                  min="1"
                  value={runtime}
                  onChange={(e) => setRuntime(e.target.value ? Number(e.target.value) : '')}
                  placeholder={currentIsEpisodic && episodes.length > 0 ? "Auto" : "e.g. 120"}
                  readOnly={currentIsEpisodic && episodes.length > 0}
                  disabled={currentIsEpisodic && episodes.length > 0}
                  className={`w-full hover:bg-muted/60 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[14px] border border-border/80 outline-none transition-all ${currentIsEpisodic && episodes.length > 0 ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : 'bg-muted/40'}`}
                />
              </div>
            </div>

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

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Review / Notes</label>
              <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="What did you think?" className="w-full bg-muted/40 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[13px] border border-border/80 outline-none transition-all resize-none h-[200px]" />
            </div>
          </div>
        )}

        {formTab === 'Episodes' && currentIsEpisodic && (
          <div className="flex flex-col h-full animate-fade-in space-y-4">
            <div className="flex gap-3 shrink-0">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-semibold">Total Eps</label>
                <input
                  type="number"
                  min="1"
                  value={episodesTotal}
                  onChange={(e) => setEpisodesTotal(e.target.value ? Number(e.target.value) : '')}
                  readOnly={episodes.length > 0}
                  disabled={episodes.length > 0}
                  className={`w-full rounded-lg px-3 py-2 text-[13px] border border-border/80 outline-none ${episodes.length > 0 ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : 'bg-card'}`}
                  title={episodes.length > 0 ? "Managed by Episode Tracker" : ""}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-semibold">Watched</label>
                <input type="number" min="0" value={episodesWatched} onChange={(e) => setEpisodesWatched(e.target.value ? Number(e.target.value) : '')} className="w-full bg-card rounded-lg px-3 py-2 text-[13px] border border-border/80 outline-none" />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-semibold">Seasons</label>
                <input
                  type="number"
                  min="1"
                  value={seasonsCount}
                  onChange={(e) => setSeasonsCount(e.target.value ? Number(e.target.value) : '')}
                  readOnly={episodes.length > 0}
                  disabled={episodes.length > 0}
                  className={`w-full rounded-lg px-3 py-2 text-[13px] border border-border/80 outline-none ${episodes.length > 0 ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' : 'bg-card'}`}
                  title={episodes.length > 0 ? "Managed by Episode Tracker" : ""}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1"><Clock size={10} /> Total Time</label>
                <input
                  type="text"
                  value={runtime ? `${runtime} m` : ''}
                  readOnly
                  disabled
                  placeholder="0 m"
                  className="w-full bg-muted/50 text-muted-foreground cursor-not-allowed rounded-lg px-3 py-2 text-[13px] border border-border/80 outline-none"
                  title="Calculated from episodes"
                />
              </div>
            </div>

            {(() => {
              const availableSeasons = Array.from(new Set([...episodes.map(e => e.season || 1), activeSeasonTab])).sort((a, b) => a - b);
              const currentTab = activeSeasonTab;
              const seasonEpisodes = episodes.filter(e => e.season === currentTab);

              const handleAddSingleEpisode = (season: number) => {
                setEpisodes(prev => {
                  const sEps = prev.filter(e => e.season === season);
                  const nextNumber = sEps.length > 0 ? Math.max(...sEps.map(e => e.number || 1)) + 1 : 1;
                  return [...prev, { name: `Episode ${nextNumber}`, season, number: nextNumber, runtime: undefined, airDate: '' }];
                });
              };

              const handleBulkGenerate = (season: number, count: number) => {
                setEpisodes(prev => {
                  const sEps = prev.filter(e => e.season === season);
                  let nextNumber = sEps.length > 0 ? Math.max(...sEps.map(e => e.number || 1)) + 1 : 1;
                  const newEps: EpisodeInfo[] = [];
                  for (let i = 0; i < count; i++) {
                    newEps.push({ name: `Episode ${nextNumber}`, season, number: nextNumber, runtime: undefined, airDate: '' });
                    nextNumber++;
                  }
                  return [...prev, ...newEps];
                });
              };

              const handleDeleteEpisode = (idx: number) => {
                setEpisodes(prev => prev.filter((_, i) => i !== idx));
              };

              return (
                <div className="border border-border/40 rounded-xl overflow-hidden bg-muted/10 shadow-sm flex flex-col flex-1 min-h-[300px]">
                  <div className="flex items-center gap-2 p-2 bg-muted/30 overflow-x-auto hide-scrollbar border-b border-border/40 shrink-0">
                    {availableSeasons.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setActiveSeasonTab(s)}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded-xl transition-colors whitespace-nowrap cursor-pointer ${currentTab === s ? 'bg-primary text-white shadow-sm' : 'bg-muted border border-border/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
                      >
                        Season {s}
                      </button>
                    ))}
                    <button type="button" onClick={() => {
                      const maxS = Math.max(...availableSeasons);
                      setActiveSeasonTab(maxS + 1);
                    }} className="px-3 py-1.5 text-[11px] font-bold rounded-xl bg-transparent border border-dashed border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap ml-2 cursor-pointer">
                      + Add Season
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {seasonEpisodes.length === 0 ? (
                      <div className="h-full min-h-[250px] flex flex-col items-center justify-center p-6">
                        <span className="text-muted-foreground text-[12px] mb-5 font-medium">No episodes in Season {currentTab}.</span>
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                          <button type="button" onClick={() => handleAddSingleEpisode(currentTab)} className="bg-primary/10 text-primary border border-primary/20 px-5 py-2.5 rounded-xl text-[12px] font-bold hover:bg-primary/20 transition-colors shadow-sm cursor-pointer">+ Add 1 Episode</button>
                          <span className="text-muted-foreground/40 text-[10px] font-bold uppercase tracking-widest">OR</span>
                          <div className="flex bg-card border border-border/80 rounded-xl overflow-hidden focus-within:border-primary/50 transition-colors shadow-sm h-10">
                            <input id={`bulk-${currentTab}`} type="number" min="1" placeholder="Generate multiple..." className="w-36 px-4 py-2 text-[12px] bg-transparent outline-none font-medium" />
                            <button type="button" onClick={() => {
                              const input = document.getElementById(`bulk-${currentTab}`) as HTMLInputElement;
                              const count = Number(input.value);
                              if (count > 0) handleBulkGenerate(currentTab, count);
                            }} className="bg-muted/80 px-4 text-[11px] font-bold border-l border-border/80 hover:bg-muted transition-colors text-foreground cursor-pointer">Generate</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 p-3 min-w-[500px]">
                        <div className="flex px-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <div className="w-10 text-center">Ep</div>
                          <div className="flex-1 ml-2">Title</div>
                          <div className="w-20 text-center">Time (m)</div>
                          <div className="w-[110px] pl-2">Air Date</div>
                          <div className="w-8"></div>
                        </div>
                        {episodes.map((ep, idx) => {
                          if (ep.season !== currentTab) return null;
                          return (
                            <div key={idx} className="flex items-center gap-3 bg-card border border-border/40 rounded-xl p-2 hover:border-primary/30 transition-colors group">
                              <div className="w-10 text-[11px] font-bold text-muted-foreground font-mono flex-shrink-0 text-center bg-muted/50 rounded-md py-1.5 cursor-default">
                                {ep.number || 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={ep.name}
                                  onChange={(e) => {
                                    setEpisodes(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item));
                                  }}
                                  className="w-full bg-transparent border-none outline-none focus:text-primary transition-colors font-medium text-[13px] px-2 py-1 placeholder:text-muted-foreground/30"
                                  placeholder="Episode Title"
                                />
                              </div>
                              <div className="w-20 flex-shrink-0">
                                <div className="flex items-center gap-1 bg-muted/30 rounded-lg px-2 py-1.5 focus-within:bg-card focus-within:border-primary/40 border border-transparent transition-colors">
                                  <Clock size={10} className="text-muted-foreground shrink-0" />
                                  <input
                                    type="number"
                                    min="1"
                                    value={ep.runtime || ''}
                                    onChange={(e) => {
                                      setEpisodes(prev => prev.map((item, i) => i === idx ? { ...item, runtime: e.target.value ? Number(e.target.value) : undefined } : item));
                                    }}
                                    placeholder="Auto"
                                    className="w-full bg-transparent border-none outline-none text-[11px] text-center"
                                  />
                                </div>
                              </div>
                              <div className="w-[110px] flex-shrink-0">
                                <input
                                  type="date"
                                  value={ep.airDate || ''}
                                  onChange={(e) => {
                                    setEpisodes(prev => prev.map((item, i) => i === idx ? { ...item, airDate: e.target.value } : item));
                                  }}
                                  className="w-full bg-muted/30 hover:bg-muted/50 border-none outline-none text-muted-foreground text-[10px] rounded-lg px-2 py-1.5 transition-colors cursor-pointer"
                                />
                              </div>
                              <div className="w-8 flex-shrink-0 flex justify-end">
                                <button type="button" onClick={() => handleDeleteEpisode(idx)} className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer p-1.5 rounded-md hover:bg-red-500/10">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <button type="button" onClick={() => handleAddSingleEpisode(currentTab)} className="mt-1 w-full py-2.5 border-2 border-dashed border-border/60 rounded-xl text-muted-foreground font-bold text-[12px] hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                          <ListPlus size={14} /> Add Episode
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </form>

      <div className="px-6 py-4 bg-muted/10 border-t border-border/60 flex gap-3 shrink-0">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl text-[13px] font-bold bg-muted hover:bg-muted-hover text-foreground transition-all cursor-pointer">Cancel</button>
        <button type="submit" form="media-form" disabled={!title.trim() || isSaving} className="flex-[2] py-3 rounded-xl text-[13px] font-bold bg-primary text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer shadow-md hover:shadow-lg">
          {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
          {isSaving ? 'Saving...' : 'Save Data'}
        </button>
      </div>
    </div>
  );
}