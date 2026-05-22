export type MediaType = 'Movie' | 'Series' | 'Anime';
export type WatchStatus = 'Completed' | 'Watching' | 'Plan to Watch';
export type AnimeType = 'Show' | 'Movie';

export interface Tag {
  id: string;
  name: string;
  color?: string; // Optional: for UI styling
}

export interface EpisodeInfo {
  name: string;
  airDate?: string;
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