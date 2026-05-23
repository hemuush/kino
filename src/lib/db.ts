export type MediaType = 'Movie' | 'TV Show' | 'Anime';
export type WatchStatus = 'Completed' | 'Watching' | 'Plan to Watch';
export type AnimeType = 'Show' | 'Movie';

export interface Tag {
  id: string;
  name: string;
  coverImage?: string;
  color?: string; // Optional: for UI styling
}

export interface EpisodeInfo {
  name: string;
  airDate?: string; // Exactly when this episode aired
  season?: number;
  number?: number;
  runtime?: number; // Exact runtime of this specific episode
}

export interface MediaEntry {
  id?: number;
  title: string;
  type: MediaType;
  animeType?: AnimeType;
  status?: WatchStatus;
  coverImage: string;
  releaseDate?: string;
  runtime?: number; // General runtime (Movie length, or avg episode length)

  // Normalization: Linked by ID
  franchiseId?: string;
  genreIds?: string[];

  // Legacy fields (kept for backward compatibility/migration)
  franchise?: string;
  genre?: string[];

  rating: number;
  review?: string;
  favorite?: boolean;
  createdAt: number;
  episodesWatched?: number;
  episodesTotal?: number;
  seasonsCount?: number;
  episodes?: EpisodeInfo[];
  imdbId?: string;
  lastRefreshedAt?: number;
}

export const DEFAULT_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Slice of Life', 'Supernatural', 'Documentary', 'Animation'
];

/**
 * Architectural Helper: Determines if an entry should have episodes.
 * Handles the edge case where Anime can be either a Show or a Movie.
 */
export function isEpisodic(entry: Partial<MediaEntry>): boolean {
  if (entry.type === 'Anime') return entry.animeType === 'Show';
  if (entry.type === 'TV Show') return true;
  return false;
}

export function formatRuntime(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function safeDateFormat(
  dateStr: string | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const lower = dateStr.trim().toLowerCase();
  if (!lower || lower === 'unknown' || lower === 'tbd' || lower === 'n/a' || lower === 'null') return null;

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, options || { dateStyle: 'medium' });
  } catch {
    return null;
  }
}