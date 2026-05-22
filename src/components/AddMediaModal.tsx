"use client";

import { useState, useRef, useEffect } from 'react';
import { MediaType, WatchStatus, AVAILABLE_GENRES, EpisodeInfo } from '@/lib/db';
import { X, Check, Image as ImageIcon, Star, Heart, ArrowLeft, Tv, Calendar, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
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
    imdbId?: string;
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

interface SearchApiResult {
  trackName: string;
  artworkUrl100: string;
  genres?: string[];
  primaryGenreName?: string;
  episodesTotal?: number | null;
  releaseDate?: string;
  imdbId?: string;
}

interface SearchResult {
  title: string;
  coverImage: string;
  genres?: string[];
  episodesTotal?: number | null;
  apiId?: number;
  releaseDate?: string;
  imdbId?: string;
}

interface FetchedDetails {
  title: string;
  coverImage: string;
  releaseDate?: string;
  genres: string[];
  seasonsCount?: number;
  episodesTotal?: number;
  episodes?: EpisodeInfo[];
  imdbId?: string;
  warning?: string;
}

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
  const [imdbId, setImdbId] = useState('');

  // Preview / confirmation states
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [previewData, setPreviewData] = useState<FetchedDetails | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedPreviewSeasons, setExpandedPreviewSeasons] = useState<Record<number, boolean>>({ 1: true });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchApiResult[] | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const applyGenres = (genres: string[]) => {
    if (genres.length === 0) return;

    const matched = AVAILABLE_GENRES.filter(genre =>
      genres.some(sg =>
        sg.toLowerCase().includes(genre.toLowerCase()) ||
        genre.toLowerCase().includes(sg.toLowerCase())
      )
    );

    setSelectedGenres(matched.length > 0 ? matched : genres.slice(0, 5));
  };

  const applyPreview = (preview: FetchedDetails) => {
    setPreviewData(preview);
    setShowPreview(true);
    setTitle(preview.title);
    setCoverImage(preview.coverImage || '');
    if (preview.releaseDate) setReleaseDate(preview.releaseDate);
    if (preview.seasonsCount) setSeasonsCount(preview.seasonsCount);
    if (preview.episodesTotal) setEpisodesTotal(preview.episodesTotal);
    if (preview.episodes && preview.episodes.length > 0) setEpisodes(preview.episodes);
    if (preview.imdbId) setImdbId(preview.imdbId);
    applyGenres(preview.genres);
    setExpandedPreviewSeasons({ 1: true });
  };

  const fetchDetailsPreview = async (base: SearchResult) => {
    const lookupTitle = base.title.trim();
    if (!lookupTitle) return;

    setIsLoadingDetails(true);
    setIsSaving(false);

    if (base.coverImage) setCoverImage(base.coverImage);
    if (base.releaseDate) setReleaseDate(base.releaseDate);
    if (base.imdbId) setImdbId(base.imdbId);
    if (base.episodesTotal) setEpisodesTotal(base.episodesTotal);
    applyGenres(base.genres || []);

    try {
      const params = new URLSearchParams({ title: lookupTitle, type });
      if (base.imdbId) params.set('imdbId', base.imdbId);

      const detailsRes = await fetch(`/api/media/details?${params.toString()}`);
      if (!detailsRes.ok) throw new Error(`Details API returned ${detailsRes.status}`);

      const detailsData = await detailsRes.json();

      const preview: FetchedDetails = {
        title: detailsData.title || lookupTitle,
        coverImage: detailsData.coverImage || base.coverImage || coverImage || '',
        releaseDate: detailsData.releaseDate || base.releaseDate || releaseDate,
        genres: detailsData.genres || base.genres || [],
        seasonsCount: detailsData.seasonsCount,
        episodesTotal: detailsData.episodesTotal || base.episodesTotal || undefined,
        episodes: Array.isArray(detailsData.episodes) ? detailsData.episodes : [],
        imdbId: detailsData.imdbId || base.imdbId || imdbId || '',
        warning: detailsData.warning,
      };

      applyPreview(preview);
    } catch (e) {
      console.error("Failed to fetch detailed info", e);
      applyPreview({
        title: lookupTitle,
        coverImage: base.coverImage || coverImage || '',
        releaseDate: base.releaseDate || releaseDate,
        genres: base.genres || selectedGenres,
        seasonsCount: type !== 'Movie' ? seasonsCount : undefined,
        episodesTotal: type !== 'Movie' && base.episodesTotal ? base.episodesTotal : undefined,
        episodes: [],
        imdbId: base.imdbId || imdbId || '',
      });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  /** Confirm and save from preview */
  const handleConfirmPreview = async () => {
    if (!previewData || isSaving) return;
    setIsSaving(true);

    const finalEpisodesTotal = type !== 'Movie' && episodesTotal !== '' ? Number(episodesTotal) : undefined;
    const finalEpisodesWatched = type !== 'Movie'
      ? (status === 'Completed' && finalEpisodesTotal ? finalEpisodesTotal : Number(episodesWatched))
      : undefined;
    const finalRating = status === 'Completed' ? rating : 0;

    let finalEpisodes = type !== 'Movie' ? episodes : undefined;
    if (type !== 'Movie' && finalEpisodesTotal) {
      const eps = [...(finalEpisodes || [])];
      if (eps.length < finalEpisodesTotal) {
        for (let i = eps.length; i < finalEpisodesTotal; i++) {
          const estSeason = seasonsCount > 1
            ? Math.min(seasonsCount, Math.floor((i / finalEpisodesTotal) * seasonsCount) + 1)
            : 1;
          eps.push({ name: `Episode ${i + 1}`, season: estSeason, number: i + 1 });
        }
        finalEpisodes = eps;
      } else if (eps.length > finalEpisodesTotal) {
        finalEpisodes = eps.slice(0, finalEpisodesTotal);
      }
    }

    await onSave({
      title: previewData.title,
      type,
      status,
      coverImage: previewData.coverImage || coverImage,
      releaseDate: releaseDate || undefined,
      rating: finalRating,
      review,
      favorite,
      genre: selectedGenres,
      episodesWatched: finalEpisodesWatched,
      episodesTotal: finalEpisodesTotal,
      seasonsCount: type !== 'Movie' ? seasonsCount : undefined,
      episodes: finalEpisodes,
      imdbId: imdbId || undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryTerm = title.trim();
    if (!queryTerm || isSaving || isSearching) return;

    setIsSearching(true);
    setSearchResults(null);

    try {
      const params = new URLSearchParams({
        term: queryTerm,
        type: type,
      });
      const searchRes = await fetch(`/api/search/movie?${params.toString()}`);
      if (!searchRes.ok) throw new Error(`Search API returned ${searchRes.status}`);

      const searchData = await searchRes.json();
      const results = searchData.results || [];
      setSearchResults(results);
    } catch (err) {
      console.warn('[Search] Server API failed, falling back to manual entry:', err);
      // Fallback: directly fetch details using manual title without secondary AI search
      await fetchDetailsPreview({
        title: queryTerm,
        coverImage,
        genres: selectedGenres,
        episodesTotal: episodesTotal === '' ? null : Number(episodesTotal),
        releaseDate,
        imdbId,
      });
    } finally {
      setIsSearching(false);
    }
  };
  const displayRating = hoveredStar !== null ? hoveredStar : rating;

  // ---------- RENDER ----------

  // Loading overlay while searching
  if (isSearching) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center text-foreground">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-[101] bg-card rounded-2xl p-8 shadow-2xl border border-border/80 dark:border-primary/15 flex flex-col items-center gap-4 max-w-sm mx-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Loader2 size={24} className="text-primary animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="font-display text-[15px] font-bold mb-1">Searching AI</h3>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Finding matches for <strong className="text-foreground">{title}</strong>
              </p>
            </div>
            <div className="flex gap-1 mt-1">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // Loading overlay while fetching details
  if (isLoadingDetails) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center text-foreground">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-[101] bg-card rounded-2xl p-8 shadow-2xl border border-border/80 dark:border-primary/15 flex flex-col items-center gap-4 max-w-sm mx-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Loader2 size={24} className="text-primary animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="font-display text-[15px] font-bold mb-1">AI Search</h3>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Searching the web and collecting details for<br />
                <strong className="text-foreground">{title}</strong>
              </p>
            </div>
            <div className="flex gap-1 mt-1">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // ---------- SEARCH RESULTS SELECTION SCREEN ----------
  if (searchResults && !showPreview) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center text-foreground">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] bg-card rounded-t-[28px] sm:rounded-2xl overflow-hidden z-[101] flex flex-col shadow-2xl border border-border/80 dark:border-primary/15"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
              <button
                type="button"
                onClick={() => setSearchResults(null)}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Search
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-muted/65 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>

            {/* Selection Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div>
                <h3 className="font-display text-[15px] font-bold text-foreground">Select the correct match:</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">We found {searchResults.length} matches for "{title}"</p>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No matching titles found on Google Search grounding.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
                  {searchResults.map((result, idx) => {
                    const year = result.releaseDate ? result.releaseDate.split('-')[0] : '';
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => fetchDetailsPreview({
                          title: result.trackName,
                          coverImage: result.artworkUrl100,
                          genres: result.genres || (result.primaryGenreName ? result.primaryGenreName.split(',').map(g => g.trim()) : []),
                          episodesTotal: result.episodesTotal,
                          releaseDate: result.releaseDate,
                          imdbId: result.imdbId,
                        })}
                        className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-border/60 hover:border-primary/45 bg-muted/20 hover:bg-primary/5 transition-all text-left group cursor-pointer"
                      >
                        {/* Artwork */}
                        <div className="w-[45px] h-[65px] rounded-lg overflow-hidden bg-muted border border-border/40 shrink-0 shadow-sm relative">
                          {result.artworkUrl100 ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={result.artworkUrl100} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                              <ImageIcon size={16} />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-display text-[13px] font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {result.trackName}
                          </h4>

                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            {year && <span>{year}</span>}
                            {year && (result.genres || result.primaryGenreName) && <span className="text-border">·</span>}
                            {result.primaryGenreName && <span className="truncate">{result.primaryGenreName}</span>}
                          </div>

                          {type !== 'Movie' && result.episodesTotal !== undefined && (
                            <div className="text-[10px] text-muted-foreground/80 mt-1 flex items-center gap-1">
                              <Tv size={10} className="text-primary/70" />
                              <span>{result.episodesTotal ? `${result.episodesTotal} episodes` : 'Episodes info unknown'}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border/60 flex flex-col gap-2.5 bg-muted/10">
              <button
                type="button"
                onClick={() => fetchDetailsPreview({
                  title: title.trim(),
                  coverImage: '',
                  genres: selectedGenres,
                  episodesTotal: episodesTotal === '' ? null : Number(episodesTotal),
                  releaseDate,
                  imdbId,
                })}
                className="w-full py-3 rounded-xl text-[12px] font-bold border border-dashed border-border/80 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all cursor-pointer text-center bg-transparent"
              >
                None of these matches (Add manually as typed)
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // ---------- PREVIEW CONFIRMATION SCREEN ----------
  if (showPreview && previewData) {
    const airedEps = previewData.episodes?.length || 0;
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center text-foreground">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] bg-card rounded-t-[28px] sm:rounded-2xl overflow-hidden z-[101] flex flex-col shadow-2xl border border-border/80 dark:border-primary/15"
          >
            {/* Preview Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
              <button
                onClick={() => { setShowPreview(false); setPreviewData(null); }}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Search
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-muted/65 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>

            {/* Preview Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Hero: Poster + Title + Meta */}
              <div className="flex gap-4 items-start">
                {/* Poster */}
                <div className="w-[100px] shrink-0">
                  <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-muted border border-border/60 shadow-lg">
                    {previewData.coverImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={previewData.coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={24} className="text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Title & Quick Meta */}
                <div className="flex-1 min-w-0 pt-1">
                  <h2 className="font-display text-lg font-extrabold tracking-tight leading-tight mb-1.5">
                    {previewData.title}
                  </h2>

                  {/* Genres */}
                  {previewData.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {previewData.genres.slice(0, 5).map(g => (
                        <span key={g} className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Release Date */}
                  {previewData.releaseDate && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                      <Calendar size={11} className="text-primary" />
                      <span>{type === 'Movie' ? 'Released' : 'Premiered'}: <strong className="text-foreground">{previewData.releaseDate}</strong></span>
                    </div>
                  )}

                  {/* Seasons & Episodes */}
                  {type !== 'Movie' && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Tv size={11} className="text-primary" />
                      <span>
                        {previewData.seasonsCount && <><strong className="text-foreground">{previewData.seasonsCount}</strong> season{previewData.seasonsCount !== 1 ? 's' : ''} · </>}
                        <strong className="text-foreground">{airedEps}</strong> episodes found
                      </span>
                    </div>
                  )}
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
                      className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 cursor-pointer border ${status === st.value
                        ? 'bg-primary text-white shadow-md shadow-primary/25 border-primary/20 scale-[1.02]'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
                        }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Favorite Toggle */}
              <div className="flex items-center justify-between bg-muted/20 border border-border/60 px-4 py-3 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold">Mark as Favorite</span>
                  <span className="text-[11px] text-muted-foreground">Pin to your favorites dashboard</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFavorite(!favorite)}
                  className={`p-2.5 rounded-xl transition-all active:scale-95 cursor-pointer border ${favorite
                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
                    }`}
                >
                  <Heart size={16} className={favorite ? 'fill-red-500' : ''} />
                </button>
              </div>

              {/* Rating (only for Completed) */}
              <AnimatePresence>
                {status === 'Completed' && (
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
                            className={`transition-colors duration-150 w-[17px] h-[17px] sm:w-[22px] sm:h-[22px] ${value <= displayRating
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

              {/* Episodes preview info (for non-movies) with collapsible list */}
              {type !== 'Movie' && airedEps > 0 && (() => {
                const displayEpisodes = previewData.episodes || [];
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

                return (
                  <div className="border border-border/60 rounded-xl overflow-hidden bg-muted/10">
                    <div className="px-4 py-3 bg-muted/20 border-b border-border/60 flex items-center gap-2">
                      <Tv size={12} className="text-primary" />
                      <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/75 uppercase flex-1">
                        Scraped Episodes List
                      </span>
                      <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                        ✓ {airedEps} episodes
                      </span>
                    </div>

                    <div className="divide-y divide-border/20">
                      {Object.keys(episodesBySeason)
                        .map(Number)
                        .filter(n => !isNaN(n) && n > 0)
                        .sort((a, b) => a - b)
                        .map((seasonNum) => {
                          const seasonEps = episodesBySeason[seasonNum] || [];
                          const isExpanded = expandedPreviewSeasons[seasonNum] !== undefined
                            ? expandedPreviewSeasons[seasonNum]
                            : (seasonNum === 1);

                          const totalInSeason = seasonEps.length;

                          return (
                            <div key={seasonNum} className="flex flex-col">
                              {/* Season Header */}
                              <button
                                type="button"
                                onClick={() => setExpandedPreviewSeasons(prev => ({ ...prev, [seasonNum]: !isExpanded }))}
                                className="w-full px-4 py-2.5 hover:bg-muted/30 transition-colors flex items-center justify-between text-left cursor-pointer border-b border-border/20"
                              >
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown size={12} className="text-muted-foreground" />
                                  ) : (
                                    <ChevronRight size={12} className="text-muted-foreground" />
                                  )}
                                  <span className="text-[12px] font-bold text-foreground">
                                    Season {seasonNum}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    ({totalInSeason} {totalInSeason === 1 ? 'episode' : 'episodes'})
                                  </span>
                                </div>
                              </button>

                              {/* Episodes List (Collapsible) */}
                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className="overflow-hidden bg-muted/5"
                                  >
                                    <div className="divide-y divide-border/20 max-h-[160px] overflow-y-auto pr-1">
                                      {seasonEps.map(({ episode, globalIndex }) => (
                                        <div
                                          key={globalIndex}
                                          className="w-full px-4 py-2 flex items-center justify-between text-left"
                                        >
                                          <span className="text-[11px] font-medium text-foreground truncate mr-2">
                                            Ep {episode.number || (globalIndex + 1)}: {episode.name}
                                          </span>
                                          {episode.airDate && (
                                            <span className="text-[9px] text-muted-foreground/60 shrink-0">
                                              Aired: {episode.airDate}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })()}

              {previewData.warning && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-200 leading-relaxed">
                  {previewData.warning}
                </div>
              )}

              {/* Review */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Review <span className="text-muted-foreground/40 normal-case tracking-normal">(optional)</span>
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder={status === 'Completed' ? 'What did you think?' : 'Any notes?'}
                  className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-card rounded-xl px-4 py-3 text-foreground text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 border border-border/80 focus:border-primary/45 transition-all duration-200 min-h-[80px] resize-none"
                />
              </div>
            </div>

            {/* Preview Footer */}
            <div className="px-5 py-4 border-t border-border/60 flex gap-3 bg-muted/10">
              <button
                type="button"
                onClick={() => { setShowPreview(false); setPreviewData(null); }}
                className="flex-1 py-3 rounded-xl text-[13px] font-semibold bg-muted hover:bg-muted-hover border border-border/50 text-foreground transition-all cursor-pointer active:scale-98"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmPreview}
                disabled={isSaving}
                className="flex-[2] py-3 rounded-xl text-[13px] font-bold bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/25 border border-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] cursor-pointer"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  <Check size={16} strokeWidth={2.5} />
                )}
                {isSaving ? 'Saving...' : 'Confirm & Add'}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // ---------- MAIN FORM (search + manual entry) ----------
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
                      setEpisodes([]);
                      setEpisodesTotal('');
                      setEpisodesWatched(0);
                      setSeasonsCount(1);
                      setImdbId('');
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 cursor-pointer border ${type === mt.value
                      ? 'bg-primary text-white shadow-md shadow-primary/25 border-primary/20 scale-[1.02]'
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
                      }`}
                  >
                    {mt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder={type === 'Movie' ? 'e.g. Inception' : type === 'Series' ? 'e.g. Breaking Bad' : 'e.g. Death Note'}
                className="w-full bg-card hover:bg-muted/40 focus:bg-card rounded-xl px-4 py-3.5 text-foreground text-[15px] placeholder:text-muted-foreground/45 focus:outline-none focus:ring-2 focus:ring-primary/20 border border-border/80 focus:border-primary/45 transition-all duration-200"
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
              {isSaving ? 'Saving...' : 'Search with AI'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}