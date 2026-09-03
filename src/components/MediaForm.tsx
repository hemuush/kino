// src/components/MediaForm.tsx
"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MediaType, WatchStatus, AnimeType, EpisodeInfo, MediaEntry, Tag, isEpisodic, getWatchedRuntimeMinutes } from '@/lib/db';
import { X, Check, Image as ImageIcon, Star, Heart, Upload, Clock, Film, ListPlus, Search, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMedia } from '@/context/MediaContext';
import { toast } from 'sonner';

interface MediaFormProps {
  onCancel: () => void;
  onSave: (entry: MediaEntry) => Promise<void> | void;
  initialData?: MediaEntry;
  hideEpisodesTab?: boolean;
}

const mediaTypes: MediaType[] = ['Movie', 'TV Show', 'Anime'];
const statuses: WatchStatus[] = ['Completed', 'Watching', 'Plan to Watch'];

type FormTabType = 'General' | 'Details' | 'Episodes';

const FieldWrapper = ({ label, icon, children }: { label: React.ReactNode, icon?: React.ReactNode, children: React.ReactNode }) => (
  <div className="space-y-2 flex flex-col w-full">
    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
      {icon} {label}
    </label>
    {children}
  </div>
);

export function MediaForm({ onCancel, onSave, initialData, hideEpisodesTab }: MediaFormProps) {
  const { entries, genres: dbGenres, franchises: dbFranchises, setGenres, setFranchises } = useMedia();
  const isEditMode = !!initialData;

  const [title, setTitle] = useState<string>(initialData?.title || '');
  const [type, setType] = useState<MediaType>(initialData?.type || 'Movie');
  const [animeType, setAnimeType] = useState<AnimeType>(initialData?.animeType || 'Show');
  const [status, setStatus] = useState<WatchStatus>(initialData?.status || 'Plan to Watch');
  const [coverImage, setCoverImage] = useState<string>(initialData?.coverImage || '');
  const [releaseDate, setReleaseDate] = useState<string>(initialData?.releaseDate || new Date().toISOString().split('T')[0]);
  const [runtime, setRuntime] = useState<number | ''>(initialData?.runtime || '');
  const [rating, setRating] = useState<number>(initialData?.rating || 8);
  const [review, setReview] = useState<string>(initialData?.review || '');
  const [favorite, setFavorite] = useState<boolean>(initialData?.favorite || false);

  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>(initialData?.genreIds || []);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string | null>(initialData?.franchiseId || null);

  const [episodesWatched, setEpisodesWatched] = useState<number | ''>(initialData?.episodesWatched ?? 0);
  const [episodesTotal, setEpisodesTotal] = useState<number | ''>(initialData?.episodesTotal ?? '');
  const [seasonsCount, setSeasonsCount] = useState<number | ''>(initialData?.seasonsCount ?? 1);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>(initialData?.episodes || []);
  const [activeSeasonTab, setActiveSeasonTab] = useState<number>(1);

  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [genreSearch, setGenreSearch] = useState<string>('');
  const [franchiseSearch, setFranchiseSearch] = useState<string>('');
  const [showGenreDropdown, setShowGenreDropdown] = useState<boolean>(false);
  const [showFranchiseDropdown, setShowFranchiseDropdown] = useState<boolean>(false);
  const [formTab, setFormTab] = useState<FormTabType>('General');

  const genreRef = useRef<HTMLDivElement>(null);
  const franchiseRef = useRef<HTMLDivElement>(null);

  const currentIsEpisodic = isEpisodic({ type, animeType });

  useEffect(() => {
    if (!currentIsEpisodic && formTab === 'Episodes') {
      setFormTab('General');
    }
  }, [currentIsEpisodic, formTab]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (genreRef.current && !genreRef.current.contains(event.target as Node)) setShowGenreDropdown(false);
      if (franchiseRef.current && !franchiseRef.current.contains(event.target as Node)) setShowFranchiseDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const calculatedStats = useMemo(() => {
    const watched = getWatchedRuntimeMinutes({
      type,
      animeType,
      status,
      runtime: runtime === '' ? undefined : Number(runtime),
      episodesWatched: currentIsEpisodic ? Number(episodesWatched || 0) : undefined,
      episodesTotal: currentIsEpisodic && episodesTotal !== '' ? Number(episodesTotal) : undefined,
      episodes,
    });

    if (!currentIsEpisodic) {
      return { avgRuntime: Number(runtime || 0), totalTime: Number(runtime || 0), watchedTime: watched };
    }

    const baseRuntime = Number(runtime || 0);
    const epsTotal = Number(episodesTotal || 0);
    const maxEps = Math.max(epsTotal, episodes.length);

    if (baseRuntime > 0) {
      return {
        avgRuntime: baseRuntime,
        totalTime: maxEps * baseRuntime,
        watchedTime: watched
      };
    }
    
    let knownRuntimesSum = 0;
    let knownRuntimesCount = 0;
    for (const ep of episodes) {
      if (ep.runtime && ep.runtime > 0) {
        knownRuntimesSum += ep.runtime;
        knownRuntimesCount++;
      }
    }

    const avg = knownRuntimesCount > 0 ? Math.round(knownRuntimesSum / knownRuntimesCount) : 0;
    const remainingEps = Math.max(0, maxEps - knownRuntimesCount);
    const total = knownRuntimesSum + (remainingEps * avg);

    return {
      avgRuntime: avg,
      totalTime: total,
      watchedTime: watched
    };
  }, [type, animeType, status, runtime, currentIsEpisodic, episodesWatched, episodesTotal, episodes]);

  // Auto-sync watched count and status based on episodes array
  useEffect(() => {
    if (currentIsEpisodic && episodes.length > 0) {
      const watchedCount = episodes.filter(e => e.watched).length;
      setEpisodesWatched(watchedCount);
      setEpisodesTotal(prev => {
        const current = Number(prev || 0);
        return current < episodes.length ? episodes.length : prev;
      });
      
      setStatus(_prevStatus => {
        const currentTotal = Number(episodesTotal || episodes.length);
        if (watchedCount === 0) return 'Plan to Watch';
        if (watchedCount >= currentTotal && currentTotal > 0) return 'Completed';
        return 'Watching';
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- episodesTotal is read via setStatus's updater to avoid a set-episodesTotal -> re-run cycle
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
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setCoverImage(canvas.toDataURL('image/webp', 0.8));
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
      // BUG 4 FIX: Ensure duplicate checks factor in the release year so remakes can be added
      const currentYear = releaseDate ? releaseDate.split('-')[0] : '';
      const duplicate = entries.find(entry => {
        const isSameTitle = entry.title.toLowerCase() === title.trim().toLowerCase();
        const isSameType = entry.type === type;
        const entryYear = entry.releaseDate ? entry.releaseDate.split('-')[0] : '';
        return isSameTitle && isSameType && (entryYear === currentYear || (!entryYear && !currentYear));
      });

      if (duplicate) {
        toast.error(`"${title.trim()}" already exists in your library.`, { description: "If this is a remake, please alter the release date to distinguish them." });
        setIsSaving(false);
        return;
      }
    }

    const finalEpisodesTotal = currentIsEpisodic && episodesTotal !== '' ? Number(episodesTotal) : (currentIsEpisodic && episodes.length > 0 ? episodes.length : undefined);
    let finalEpisodesWatched = currentIsEpisodic ? (status === 'Completed' && finalEpisodesTotal ? finalEpisodesTotal : Number(episodesWatched || 0)) : undefined;
    
    if (finalEpisodesWatched !== undefined && finalEpisodesTotal !== undefined) {
      finalEpisodesWatched = Math.min(finalEpisodesWatched, finalEpisodesTotal);
    }

    const payload: MediaEntry = {
      ...(isEditMode && initialData ? initialData : { id: Date.now(), createdAt: Date.now() }),
      updatedAt: Date.now(),
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
      episodesWatched: finalEpisodesWatched,
      episodesTotal: finalEpisodesTotal,
      seasonsCount: currentIsEpisodic && seasonsCount !== '' ? Number(seasonsCount) : undefined,
      episodes: currentIsEpisodic ? episodes.map(ep => ({ ...ep, watched: status === 'Completed' ? true : status === 'Plan to Watch' ? false : ep.watched })) : undefined,
    };

    try {
      await onSave(payload);
    } catch (error) {
      toast.error("An error occurred while saving.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const displayRating = hoveredStar !== null ? hoveredStar : rating;
  const tabs: FormTabType[] = currentIsEpisodic && !hideEpisodesTab ? ['General', 'Details', 'Episodes'] : ['General', 'Details'];

  // Pre-compute episode panel to avoid IIFE inside JSX (Turbopack parser limitation)
  const maxSeasonNum = Math.max(Number(seasonsCount) || 1, activeSeasonTab, ...episodes.map(e => e.season || 1));
  const availableSeasons = Array.from({ length: maxSeasonNum }, (_, i) => i + 1);
  const currentTab = activeSeasonTab;
  const seasonEpisodes = episodes.filter(e => e.season === currentTab);

  const handleAddSingleEpisode = (season: number) => {
    setEpisodes(prev => {
      const sEps = prev.filter(e => e.season === season);
      const nextNumber = sEps.length > 0 ? Math.max(...sEps.map(e => e.number || 1)) + 1 : 1;
      return [...prev, { name: `Episode ${nextNumber}`, season, number: nextNumber, runtime: undefined, airDate: '', watched: status === 'Completed' }];
    });
  };

  const handleBulkGenerate = (season: number, count: number) => {
    setEpisodes(prev => {
      const sEps = prev.filter(e => e.season === season);
      let nextNumber = sEps.length > 0 ? Math.max(...sEps.map(e => e.number || 1)) + 1 : 1;
      const newEps: EpisodeInfo[] = [];
      for (let i = 0; i < count; i++) {
        newEps.push({ name: `Episode ${nextNumber}`, season, number: nextNumber, runtime: undefined, airDate: '', watched: status === 'Completed' });
        nextNumber++;
      }
      return [...prev, ...newEps];
    });
  };

  const handleDeleteEpisode = (idx: number) => {
    setEpisodes(prev => prev.filter((_, i) => i !== idx));
  };

  const renderEpisodePanel = (
    <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-sm flex flex-col flex-1 min-h-[350px]">
      <div className="flex items-center gap-2 p-3 bg-muted/30 overflow-x-auto hide-scrollbar border-b border-border/80 shrink-0">
        {availableSeasons.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSeasonTab(s)}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${currentTab === s ? 'bg-primary text-primary-foreground shadow-md' : 'bg-background border border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            Season {s}
          </button>
        ))}
        <button type="button" onClick={() => { setActiveSeasonTab(Math.max(...availableSeasons) + 1); setSeasonsCount(prev => Number(prev) + 1); }} className="px-4 py-2 text-xs font-bold rounded-xl bg-transparent border-2 border-dashed border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap ml-2 cursor-pointer">
          + Add Season
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-auto p-2">
        {seasonEpisodes.length === 0 ? (
          <div className="h-full min-h-[250px] flex flex-col items-center justify-center p-6 text-center">
            <span className="text-muted-foreground text-sm mb-6 font-medium">No episodes added for Season {currentTab} yet.</span>
            <div className="flex flex-col sm:flex-row gap-5 items-center bg-background p-6 rounded-2xl border border-border shadow-sm">
              <button type="button" onClick={() => handleAddSingleEpisode(currentTab)} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm cursor-pointer whitespace-nowrap flex items-center gap-2">
                <ListPlus size={16} /> Add 1 Episode
              </button>
              <span className="text-muted-foreground/40 text-xs font-bold uppercase tracking-widest">OR</span>
              <div className="flex bg-card border border-border rounded-xl overflow-hidden focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm h-12 shrink-0">
                <input id={`bulk-${currentTab}`} type="number" min="1" placeholder="Generate multiple..." className="w-32 sm:w-40 px-4 py-2 text-sm bg-transparent outline-none font-medium placeholder:text-muted-foreground/50" />
                <button type="button" onClick={() => {
                  const input = document.getElementById(`bulk-${currentTab}`) as HTMLInputElement;
                  const count = Number(input.value);
                  if (count > 0) handleBulkGenerate(currentTab, count);
                }} className="bg-muted hover:bg-muted/80 px-5 text-xs font-bold border-l border-border transition-colors text-foreground cursor-pointer">Generate</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 min-w-[600px] p-2">
            <div className="flex px-4 pb-2 pt-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="w-10"></div>
              <div className="w-10 text-center">Ep</div>
              <div className="flex-1 ml-3">Title</div>
              <div className="w-24 text-center">Runtime (m)</div>
              <div className="w-[130px] pl-3">Air Date</div>
              <div className="w-10"></div>
            </div>
            {episodes.map((ep, idx) => {
              if (ep.season !== currentTab) return null;
              return (
                <div key={`${ep.season}-${ep.number || idx}`} className="flex items-center gap-3 bg-background border border-border/60 rounded-xl p-2 hover:border-primary/40 hover:shadow-sm transition-all group">
                  <div className="w-10 text-center flex-shrink-0">
                    <button type="button" onClick={() => setEpisodes(prev => prev.map((item, i) => i === idx ? { ...item, watched: !item.watched } : item))} className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer focus:outline-none">
                      <CheckCircle2 size={18} className={ep.watched ? 'text-green-500' : 'text-muted-foreground/30'} />
                    </button>
                  </div>
                  <div className="w-10 text-xs font-bold text-muted-foreground font-mono flex-shrink-0 text-center bg-muted/40 rounded-lg py-2.5 cursor-default">
                    {ep.number || 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={ep.name}
                      onChange={(e) => setEpisodes(prev => prev.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))}
                      className="w-full bg-transparent border-none outline-none focus:text-primary transition-colors font-semibold text-sm px-3 py-2 placeholder:text-muted-foreground/40 rounded-md focus:bg-muted/30"
                      placeholder="Episode Title"
                    />
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-3 py-2 focus-within:bg-card focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/40 border border-transparent transition-all">
                      <Clock size={12} className="text-muted-foreground shrink-0" />
                      <input
                        type="number"
                        min="1"
                        value={ep.runtime || ''}
                        onChange={(e) => setEpisodes(prev => prev.map((item, i) => i === idx ? { ...item, runtime: e.target.value ? Number(e.target.value) : undefined } : item))}
                        placeholder="Auto"
                        className="w-full bg-transparent border-none outline-none text-xs text-center font-medium"
                      />
                    </div>
                  </div>
                  <div className="w-[130px] flex-shrink-0">
                    <input
                      type="date"
                      value={ep.airDate || ''}
                      onChange={(e) => setEpisodes(prev => prev.map((item, i) => i === idx ? { ...item, airDate: e.target.value } : item))}
                      className="w-full bg-muted/30 hover:bg-muted/60 border-none outline-none text-muted-foreground text-xs rounded-lg px-3 py-2 transition-colors cursor-pointer focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                  <div className="w-10 flex-shrink-0 flex justify-end">
                    <button type="button" onClick={() => handleDeleteEpisode(idx)} className="text-muted-foreground hover:text-red-500 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all cursor-pointer p-2 rounded-lg hover:bg-red-500/10">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={() => handleAddSingleEpisode(currentTab)} className="mt-2 w-full py-4 border-2 border-dashed border-border rounded-xl text-muted-foreground font-bold text-sm hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
              <ListPlus size={16} /> Add Episode
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-[95%] sm:max-w-4xl rounded-[32px] overflow-hidden flex flex-col border border-white/10 bg-card/60 dark:bg-[#0c0c0d]/70 backdrop-blur-3xl shadow-2xl mx-auto h-full max-h-[850px] relative z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent dark:from-white/[0.02] pointer-events-none rounded-[32px]" />
      
      {/* Header */}
      <div className="flex flex-col items-center justify-center px-4 sm:px-8 pt-8 pb-4 shrink-0 relative z-10">
        <span className="text-[10px] font-mono tracking-[0.2em] text-primary/80 uppercase font-bold mb-2">{isEditMode ? 'EDIT_ENTRY' : 'NEW_ENTRY'}</span>
        <h2 className="font-display text-3xl font-black tracking-tight text-foreground">{isEditMode ? 'Edit Media' : 'Add to Collection'}</h2>
      </div>

      {/* Tab bar */}
      <div className="flex justify-center px-6 sm:px-8 pb-4 shrink-0 z-10 relative">
        <div className="flex p-1.5 bg-black/5 dark:bg-black/40 border border-white/5 backdrop-blur-xl rounded-full shadow-inner w-full max-w-md relative">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFormTab(tab)}
              className={`relative z-10 flex-1 py-2.5 text-xs font-bold tracking-wider uppercase transition-all rounded-full cursor-pointer ${
                formTab === tab
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {formTab === tab && (
                <motion.div
                  layoutId="activeFormTab"
                  className="absolute inset-0 bg-white/10 dark:bg-white/10 border border-white/10 shadow-md rounded-full -z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Form body */}
      <form id="media-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 pb-6 relative z-10">
        <AnimatePresence mode="wait">
          {formTab === 'General' && (
            <motion.div key="general" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4 sm:space-y-8">

              <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-[2]">
                  <FieldWrapper label="Title">
                    <input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Inception" className="w-full bg-black/5 dark:bg-black/40 shadow-inner rounded-2xl px-4 py-3.5 text-foreground text-sm border border-border/50 focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50 backdrop-blur-md placeholder:text-muted-foreground/50" />
                  </FieldWrapper>
                </div>
                <div className="flex-[1]">
                  <FieldWrapper label="Type">
                    <select value={type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as MediaType)} className="w-full bg-black/5 dark:bg-black/40 shadow-inner rounded-2xl px-4 py-3.5 text-foreground text-sm border border-border/50 focus:border-primary/50 outline-none transition-all cursor-pointer focus:ring-1 focus:ring-primary/50 backdrop-blur-md placeholder:text-muted-foreground/50 appearance-none">
                      {mediaTypes.map(mt => <option key={mt} value={mt}>{mt}</option>)}
                    </select>
                  </FieldWrapper>
                </div>
              </div>

              {type === 'Anime' && (
                <div className="flex p-1.5 bg-black/5 dark:bg-white/[0.03] rounded-xl border border-border/40 w-max">
                  {(['Show', 'Movie'] as AnimeType[]).map((at) => (
                    <button key={at} type="button" onClick={() => setAnimeType(at)} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${animeType === at ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{at}</button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <FieldWrapper label="Cover Image">
                  <div className="flex flex-col xs:flex-row gap-4 sm:gap-5 items-start">
                    <div className="w-[96px] h-[144px] sm:w-[100px] sm:h-[150px] rounded-xl overflow-hidden bg-muted/30 border border-border shrink-0 flex items-center justify-center shadow-sm relative group">
                      {coverImage ? (
                        <>
                          <img src={coverImage} alt="Poster" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <ImageIcon className="text-white w-6 h-6" />
                          </div>
                        </>
                      ) : <ImageIcon size={28} className="text-muted-foreground/40" />}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <label className="flex flex-col items-center justify-center w-full h-full bg-card hover:bg-muted/40 rounded-xl px-4 py-6 border-2 border-dashed border-border/80 cursor-pointer transition-colors group">
                        <Upload size={20} className="mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-muted-foreground font-semibold text-xs group-hover:text-foreground transition-colors">Click to upload image file</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>
                </FieldWrapper>

                <div className="space-y-4 sm:space-y-6">
                  <div className="space-y-2 relative" ref={franchiseRef}>
                    <FieldWrapper label="Saga / Franchise" icon={<Film size={12} />}>
                      {selectedFranchiseId ? (
                        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 px-4 py-3 rounded-xl shadow-sm">
                          <span className="text-sm font-bold text-primary">{dbFranchises.find(f => f.id === selectedFranchiseId)?.name}</span>
                          <button type="button" onClick={() => setSelectedFranchiseId(null)} className="text-primary/70 hover:text-red-500 hover:bg-red-500/10 p-1 rounded-md transition-colors cursor-pointer"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input type="text" value={franchiseSearch} onFocus={() => setShowFranchiseDropdown(true)} onChange={(e) => setFranchiseSearch(e.target.value)} placeholder="Search or add saga..." className="w-full pl-11 pr-4 py-3 bg-black/5 dark:bg-black/40 shadow-inner rounded-2xl text-sm border border-border/50 focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50 backdrop-blur-md placeholder:text-muted-foreground/50" />
                        </div>
                      )}
                      {showFranchiseDropdown && !selectedFranchiseId && (
                        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-xl z-50 max-h-[200px] overflow-y-auto overflow-x-hidden">
                          {dbFranchises.filter(f => f.name.toLowerCase().includes(franchiseSearch.toLowerCase())).map(f => (
                            <div key={f.id} onClick={() => { setSelectedFranchiseId(f.id); setShowFranchiseDropdown(false); setFranchiseSearch(''); }} className="px-4 py-3 text-sm hover:bg-muted cursor-pointer font-medium border-b border-border/40 last:border-0 transition-colors">{f.name}</div>
                          ))}
                          {franchiseSearch.trim() && !dbFranchises.find(f => f.name.toLowerCase() === franchiseSearch.toLowerCase()) && (
                            <div onClick={handleCreateFranchise} className="px-4 py-3 text-sm text-primary hover:bg-primary/10 cursor-pointer font-bold flex items-center gap-2 transition-colors"><ListPlus size={16} /> Create &quot;{franchiseSearch}&quot;</div>
                          )}
                        </div>
                      )}
                    </FieldWrapper>
                  </div>

                  <FieldWrapper label="Status">
                    <div className="flex p-1.5 bg-black/5 dark:bg-white/[0.03] rounded-xl border border-border/40">
                      {statuses.map((st) => (
                        <button key={st} type="button" onClick={() => setStatus(st)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${status === st ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{st}</button>
                      ))}
                    </div>
                  </FieldWrapper>

                  <div className="space-y-2 relative" ref={genreRef}>
                    <FieldWrapper label="Genres">
                      {selectedGenreIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {selectedGenreIds.map(id => {
                            const g = dbGenres.find(x => x.id === id);
                            if (!g) return null;
                            return (
                              <span key={id} className="bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-[10px] text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                {g.name} <button type="button" onClick={() => setSelectedGenreIds(selectedGenreIds.filter(x => x !== id))} className="hover:text-red-500 hover:bg-red-500/10 rounded-sm transition-colors cursor-pointer"><X size={14} /></button>
                              </span>
                            )
                          })}
                        </div>
                      )}
                      <div className="relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input type="text" value={genreSearch} onFocus={() => setShowGenreDropdown(true)} onChange={(e) => setGenreSearch(e.target.value)} placeholder="Add genre..." className="w-full pl-11 pr-4 py-3 bg-black/5 dark:bg-black/40 shadow-inner rounded-2xl text-sm border border-border/50 focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50 backdrop-blur-md placeholder:text-muted-foreground/50" />
                      </div>
                      {showGenreDropdown && (
                        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-xl shadow-xl z-50 max-h-[200px] overflow-y-auto">
                          {dbGenres.filter(g => !selectedGenreIds.includes(g.id) && g.name.toLowerCase().includes(genreSearch.toLowerCase())).map(g => (
                            <div key={g.id} onClick={() => { setSelectedGenreIds([...selectedGenreIds, g.id]); setShowGenreDropdown(false); setGenreSearch(''); }} className="px-4 py-3 text-sm hover:bg-muted cursor-pointer font-medium border-b border-border/40 last:border-0 transition-colors">{g.name}</div>
                          ))}
                          {genreSearch.trim() && !dbGenres.find(g => g.name.toLowerCase() === genreSearch.toLowerCase()) && (
                            <div onClick={handleCreateGenre} className="px-4 py-3 text-sm text-primary hover:bg-primary/10 cursor-pointer font-bold flex items-center gap-2 transition-colors"><ListPlus size={16} /> Create &quot;{genreSearch}&quot;</div>
                          )}
                        </div>
                      )}
                    </FieldWrapper>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {formTab === 'Details' && (
            <motion.div key="details" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <FieldWrapper label="Release Date">
                    <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="w-full bg-black/5 dark:bg-black/40 shadow-inner rounded-2xl px-4 py-3.5 text-foreground text-sm border border-border/50 focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50 backdrop-blur-md placeholder:text-muted-foreground/50" />
                  </FieldWrapper>
                </div>
                {!currentIsEpisodic && (
                  <div className="flex-1">
                    <FieldWrapper label="Runtime (min)" icon={<Clock size={12} />}>
                      <input type="number" min="1" value={runtime} onChange={(e) => setRuntime(e.target.value ? Number(e.target.value) : '')} placeholder="e.g. 120" className="w-full bg-black/5 dark:bg-black/40 shadow-inner rounded-2xl px-4 py-3.5 text-foreground text-sm border border-border/50 focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50 backdrop-blur-md placeholder:text-muted-foreground/50" />
                    </FieldWrapper>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-6 items-stretch">
                <div className="flex-1 flex items-center justify-between bg-card border border-border px-4 sm:px-6 py-4 rounded-2xl shadow-sm hover:border-primary/40 transition-colors">
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Heart size={16} /> Favorite</span>
                  <button type="button" onClick={() => setFavorite(!favorite)} className={`p-2.5 rounded-xl transition-all border cursor-pointer ${favorite ? 'bg-red-500/15 text-red-500 border-red-500/30 shadow-sm' : 'bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted'}`}><Heart size={20} className={favorite ? 'fill-red-500' : ''} /></button>
                </div>

                <AnimatePresence>
                  {status === 'Completed' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex-[2] min-w-0 bg-card border border-border px-4 sm:px-6 py-4 rounded-2xl shadow-sm">
                      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 shrink-0"><Star size={16} /> Rating</span>
                          <span className="text-lg sm:text-xl font-bold text-primary tabular-nums whitespace-nowrap">{displayRating}/10</span>
                        </div>
                        <div className="grid grid-cols-5 sm:flex sm:items-center gap-1 sm:gap-0.5 shrink-0">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                            <button key={value} type="button" onClick={() => setRating(value)} onMouseEnter={() => setHoveredStar(value)} onMouseLeave={() => setHoveredStar(null)} className="p-1 sm:p-0.5 transition-transform hover:scale-110 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md">
                              <Star className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-colors ${value <= displayRating ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-muted-foreground/20'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <FieldWrapper label="Review / Notes">
                <textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="What did you think?" className="w-full bg-black/5 dark:bg-black/40 shadow-inner rounded-2xl px-5 py-4 text-foreground text-sm border border-border/50 focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50 backdrop-blur-md placeholder:text-muted-foreground/50 resize-none min-h-[180px]" />
              </FieldWrapper>
            </motion.div>
          )}

          {formTab === 'Episodes' && currentIsEpisodic && (
            <motion.div key="episodes" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col h-full space-y-6">

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 shrink-0">
                <FieldWrapper label="Total Eps">
                  <input type="number" min="1" readOnly={episodes.length > 0} value={episodesTotal} onChange={(e) => setEpisodesTotal(e.target.value ? Number(e.target.value) : '')} className={`w-full bg-black/5 dark:bg-black/40 shadow-inner rounded-2xl px-4 py-3 text-sm border border-border/50 focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50 backdrop-blur-md placeholder:text-muted-foreground/50 ${episodes.length > 0 ? 'opacity-60 cursor-not-allowed' : ''}`} />
                </FieldWrapper>
                <FieldWrapper label="Watched Eps">
                  <input type="number" min="0" max={episodesTotal || undefined} readOnly={episodes.length > 0} value={episodesWatched} onChange={(e) => setEpisodesWatched(e.target.value ? Number(e.target.value) : '')} className={`w-full bg-black/5 dark:bg-black/40 shadow-inner rounded-2xl px-4 py-3 text-sm border border-border/50 focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50 backdrop-blur-md placeholder:text-muted-foreground/50 ${episodes.length > 0 ? 'opacity-60 cursor-not-allowed' : ''}`} />
                </FieldWrapper>
                <FieldWrapper label="Seasons">
                  <input type="number" min="1" value={seasonsCount} onChange={(e) => setSeasonsCount(e.target.value ? Number(e.target.value) : '')} className="w-full bg-black/5 dark:bg-black/40 shadow-inner rounded-2xl px-4 py-3 text-sm border border-border/50 focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50 backdrop-blur-md placeholder:text-muted-foreground/50" />
                </FieldWrapper>
                <FieldWrapper label="Avg Time / Ep" icon={<Clock size={12} />}>
                  <input type="number" min="1" value={runtime} onChange={(e) => setRuntime(e.target.value ? Number(e.target.value) : '')} placeholder={calculatedStats.avgRuntime > 0 && calculatedStats.avgRuntime !== Number(runtime) ? `Auto: ${calculatedStats.avgRuntime}` : "e.g. 24"} className="w-full bg-black/5 dark:bg-black/40 shadow-inner rounded-2xl px-4 py-3 text-sm border border-border/50 focus:border-primary/50 outline-none transition-all focus:ring-1 focus:ring-primary/50 backdrop-blur-md placeholder:text-muted-foreground/50" />
                </FieldWrapper>
                <FieldWrapper label="Total Time" icon={<Clock size={12} />}>
                  <div className="w-full bg-black/5 dark:bg-black/40 text-foreground font-bold flex items-center px-4 py-3 rounded-xl border border-border/50 shadow-inner text-sm">
                    {calculatedStats.totalTime} min
                  </div>
                </FieldWrapper>
                <FieldWrapper label="Time Watched" icon={<Clock size={12} />}>
                  <div className="w-full bg-primary/10 text-primary font-bold flex items-center px-4 py-3 rounded-xl border border-primary/20 shadow-sm text-sm">
                    {calculatedStats.watchedTime} min
                  </div>
                </FieldWrapper>
              </div>

              {renderEpisodePanel}
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Footer action bar */}
      <div className="px-6 sm:px-8 py-5 bg-card/50 dark:bg-black/50 border-t border-border/20 backdrop-blur-3xl flex gap-3 shrink-0 z-20 mt-auto">
        <button type="button" onClick={onCancel} className="flex-1 py-3.5 rounded-full text-sm font-bold bg-background/60 border border-border/60 hover:bg-muted text-foreground transition-all cursor-pointer shadow-sm">Cancel</button>
        <button type="submit" form="media-form" disabled={!title.trim() || isSaving} className="flex-[2] py-3.5 rounded-full text-sm font-bold bg-foreground text-background flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md hover:opacity-90">
          {isSaving ? <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" /> : <Check size={18} strokeWidth={2.5} />}
          {isSaving ? 'Saving Changes...' : 'Save Data'}
        </button>
      </div>
    </div>
  );
}
