"use client";

import { useState, useRef, useEffect } from 'react';
import { MediaType, WatchStatus, AVAILABLE_GENRES, EpisodeInfo } from '@/lib/db';
import { X, Check, Image as ImageIcon, Star, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddMediaModalProps {
  onClose: () => void;
  onSave: (entry: {
    title: string;
    type: MediaType;
    status: WatchStatus;
    coverImage: string;
    releaseDate?: string;
    rating: number;
    review: string;
    favorite: boolean;
    genre: string[];
    episodesWatched?: number;
    episodesTotal?: number;
    seasonsCount?: number;
    episodes?: EpisodeInfo[];
  }) => void;
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

export function AddMediaModal({ onClose, onSave }: AddMediaModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MediaType>('Movie');
  const [status, setStatus] = useState<WatchStatus>('Completed');
  const [coverImage, setCoverImage] = useState('');
  const [rating, setRating] = useState(8);
  const [review, setReview] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  
  // Progress states
  const [episodesWatched, setEpisodesWatched] = useState(0);
  const [episodesTotal, setEpisodesTotal] = useState<number | ''>('');
  
  // Release date, seasons, and episodes states
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [seasonsCount, setSeasonsCount] = useState<number>(1);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Suggestion states
  const [suggestions, setSuggestions] = useState<{
    title: string;
    coverImage: string;
    genres?: string[];
    episodesTotal?: number | null;
    apiId?: number;
    releaseDate?: string;
    imdbId?: string;
  }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Suggestions Fetcher & Debounce
  useEffect(() => {
    if (!title.trim() || title.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        let results: {
          title: string;
          coverImage: string;
          genres?: string[];
          episodesTotal?: number | null;
          apiId?: number;
          releaseDate?: string;
          imdbId?: string;
        }[] = [];
        
        const res = await fetch(
          `/api/search/movie?term=${encodeURIComponent(title)}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          results = (data.results || []).map((item: any) => ({
            title: item.trackName || '',
            coverImage: item.artworkUrl100 || '',
            genres: [item.primaryGenreName].filter(Boolean),
            releaseDate: item.releaseDate ? item.releaseDate.split('T')[0] : '',
            imdbId: item.imdbId || '',
          }));
        }

        setSuggestions(results);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Suggestion fetch failed", err);
        }
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [title, type]);

  // Click outside listener for suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleGenre = (genreName: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreName) 
        ? prev.filter(g => g !== genreName)
        : [...prev, genreName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    
    // Pass sensible values for fields that are conditionally hidden
    const finalRating = status === 'Completed' ? rating : 0;
    const finalEpisodesTotal = type !== 'Movie' && episodesTotal !== '' ? Number(episodesTotal) : undefined;
    const finalEpisodesWatched = type !== 'Movie'
      ? (status === 'Completed' && finalEpisodesTotal ? finalEpisodesTotal : Number(episodesWatched))
      : undefined;

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
      title, 
      type, 
      status,
      coverImage, 
      releaseDate: releaseDate || undefined,
      rating: finalRating, 
      review,
      favorite,
      genre: selectedGenres,
      episodesWatched: finalEpisodesWatched,
      episodesTotal: finalEpisodesTotal,
      seasonsCount: type !== 'Movie' ? seasonsCount : undefined,
      episodes: finalEpisodes,
    });
  };

  const displayRating = hoveredStar !== null ? hoveredStar : rating;

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

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] bg-card rounded-t-[28px] sm:rounded-2xl overflow-hidden z-[101] flex flex-col shadow-2xl border border-border/80 dark:border-primary/15"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/60 bg-muted/20">
            <h2 className="font-display text-[17px] font-bold tracking-tight">Add to Collection</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-muted/65 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 focus-ring"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
            
            {/* Type Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
              <div className="flex gap-2">
                {mediaTypes.map((mt) => (
                  <button
                    key={mt.value}
                    type="button"
                    onClick={() => {
                      setType(mt.value);
                      setSuggestions([]);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 cursor-pointer border ${
                      type === mt.value
                        ? 'bg-primary text-white shadow-md shadow-primary/25 border-primary/20 scale-[1.02]'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
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
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 cursor-pointer border ${
                      status === st.value
                        ? 'bg-primary text-white shadow-md shadow-primary/25 border-primary/20 scale-[1.02]'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title with Autocomplete */}
            <div ref={dropdownRef} className="space-y-2 relative">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                required
                placeholder="e.g. Inception, Breaking Bad..."
                className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 border border-border/80 focus:border-primary/45 transition-all duration-200"
              />

              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {showSuggestions && (suggestions.length > 0 || isSearchingSuggestions) && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-border/30 backdrop-blur-xl"
                  >
                    {isSearchingSuggestions && suggestions.length === 0 && (
                      <div className="px-4 py-3.5 text-xs text-muted-foreground flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <span>Searching online database...</span>
                      </div>
                    )}
                    
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={async () => {
                          setTitle(suggestion.title);
                          if (suggestion.coverImage) {
                            setCoverImage(suggestion.coverImage);
                          }
                          if (suggestion.releaseDate) {
                            setReleaseDate(suggestion.releaseDate);
                          }
                          if (suggestion.episodesTotal) {
                            setEpisodesTotal(suggestion.episodesTotal);
                          } else {
                            setEpisodesTotal('');
                          }
                          if (suggestion.genres && suggestion.genres.length > 0) {
                            // Match online genres with AVAILABLE_GENRES list
                            const matched = AVAILABLE_GENRES.filter(genre => 
                              suggestion.genres?.some(sg => 
                                sg.toLowerCase().includes(genre.toLowerCase()) || 
                                genre.toLowerCase().includes(sg.toLowerCase())
                              )
                            );
                            setSelectedGenres(matched);
                          }
                          setSuggestions([]);
                          setShowSuggestions(false);

                          // Fetch Seasons & Episodes details dynamically
                          setIsLoadingDetails(true);
                          try {
                            const detailsRes = await fetch(
                              `/api/media/details?title=${encodeURIComponent(suggestion.title)}&type=${type}${suggestion.imdbId ? `&imdbId=${suggestion.imdbId}` : ''}`
                            );
                            if (detailsRes.ok) {
                              const detailsData = await detailsRes.json();
                              
                              if (detailsData.releaseDate) {
                                setReleaseDate(detailsData.releaseDate);
                              }
                              if (detailsData.seasonsCount) {
                                setSeasonsCount(detailsData.seasonsCount);
                              }
                              if (detailsData.episodesTotal) {
                                setEpisodesTotal(detailsData.episodesTotal);
                              }
                              if (detailsData.episodes && detailsData.episodes.length > 0) {
                                setEpisodes(detailsData.episodes);
                              }
                              
                              if (detailsData.genres && detailsData.genres.length > 0) {
                                const matched = AVAILABLE_GENRES.filter(genre => 
                                  detailsData.genres.some((sg: string) => 
                                    sg.toLowerCase().includes(genre.toLowerCase()) || 
                                    genre.toLowerCase().includes(sg.toLowerCase())
                                  )
                                );
                                setSelectedGenres(matched);
                              }
                            }
                          } catch (e) {
                            console.error("Failed to fetch detailed info", e);
                          } finally {
                            setIsLoadingDetails(false);
                          }
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-primary/5 hover:text-primary transition-all flex items-center gap-3 active:bg-primary/10 cursor-pointer"
                      >
                        {suggestion.coverImage ? (
                          <div className="w-7 h-10 rounded bg-muted overflow-hidden shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={suggestion.coverImage}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-7 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                            <ImageIcon size={12} className="text-muted-foreground/45" />
                          </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-[13px] font-medium line-clamp-1">
                            {suggestion.title}
                          </span>
                          {suggestion.genres && suggestion.genres.length > 0 && (
                            <span className="text-[10px] text-muted-foreground/75 truncate mt-0.5">
                              {suggestion.genres.join(', ')}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Favorite Toggle Button */}
            <div className="flex items-center justify-between bg-muted/20 border border-border/60 px-4 py-3 rounded-xl">
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold">Mark as Favorite</span>
                <span className="text-[11px] text-muted-foreground">Pin to your favorites dashboard</span>
              </div>
              <button
                type="button"
                onClick={() => setFavorite(!favorite)}
                className={`p-2.5 rounded-xl transition-all active:scale-95 cursor-pointer border ${
                  favorite 
                    ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
                }`}
              >
                <Heart size={16} className={favorite ? 'fill-red-500' : ''} />
              </button>
            </div>

            {/* Genres Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Genres / Tags</label>
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-muted/20 border border-border/60 rounded-xl max-h-[96px] sm:max-h-[140px] overflow-y-auto">
                {AVAILABLE_GENRES.map((genre) => {
                  const isSelected = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-semibold sm:font-bold transition-all duration-150 border cursor-pointer ${
                        isSelected 
                          ? 'bg-primary/10 text-primary border-primary/30 shadow-sm' 
                          : 'bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cover Image URL */}
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
                  className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl pl-10 pr-4 py-3 text-foreground text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 border border-border/80 focus:border-primary/45 transition-all duration-200"
                />
              </div>
              {coverImage && (
                <div className="mt-2 w-16 h-24 rounded-xl overflow-hidden bg-muted border border-border/40 shadow-sm">
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

            {/* Watch Progress (only for Series/Anime) */}
            {type !== 'Movie' && (
              <div className="bg-muted/20 border border-border/60 p-3 sm:p-4 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Watch Progress & Seasons</label>
                  {isLoadingDetails ? (
                    <span className="text-[10px] text-primary font-medium animate-pulse">Fetching...</span>
                  ) : episodes.length > 0 ? (
                    <span className="text-[10px] text-emerald-400 font-semibold">✓ {episodes.length} eps</span>
                  ) : null}
                </div>
                <div className="flex gap-2.5 items-center">
                  <div className="flex-1 space-y-1 min-w-0">
                    <label className="text-[9px] sm:text-[10px] text-muted-foreground block truncate">
                      <span className="inline sm:hidden">Watched</span>
                      <span className="hidden sm:inline">Episodes Watched</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={episodesWatched}
                      onChange={(e) => setEpisodesWatched(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-muted/40 focus:bg-card rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-foreground text-[13px] border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/45 transition-all"
                    />
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <label className="text-[9px] sm:text-[10px] text-muted-foreground block truncate">
                      <span className="inline sm:hidden">Total</span>
                      <span className="hidden sm:inline">Total Episodes</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={episodesTotal}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1);
                        setEpisodesTotal(val);
                      }}
                      placeholder="e.g. 12"
                      className="w-full bg-muted/40 focus:bg-card rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-foreground text-[13px] border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/45 transition-all"
                    />
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <label className="text-[9px] sm:text-[10px] text-muted-foreground block truncate">
                      <span className="inline sm:hidden">Seasons</span>
                      <span className="hidden sm:inline">Total Seasons</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={seasonsCount}
                      onChange={(e) => setSeasonsCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-muted/40 focus:bg-card rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-foreground text-[13px] border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/45 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Release Date / Premiere Date */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {type === 'Movie' ? 'Release Date' : 'Premiere Date'}
              </label>
              <input
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 border border-border/80 focus:border-primary/45 transition-all duration-200"
              />
            </div>

            {/* Conditionally Render Rating only for Completed */}
            <AnimatePresence>
              {status === 'Completed' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5 overflow-hidden"
                >
                  {/* Rating */}
                  <div className="space-y-3">
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
                placeholder={status === 'Completed' ? 'What did you think?' : 'Any notes?'}
                className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 border border-border/80 focus:border-primary/45 transition-all duration-200 min-h-[90px] resize-none"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/60 flex gap-3 bg-muted/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-[13px] font-semibold bg-muted hover:bg-muted-hover border border-border/50 text-foreground transition-all cursor-pointer active:scale-98"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isSaving}
              className="flex-[2] py-3 rounded-xl text-[13px] font-bold bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25 border border-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] cursor-pointer"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <Check size={16} strokeWidth={2.5} />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
