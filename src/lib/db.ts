export type MediaType = 'Movie' | 'Series' | 'Anime';

export type WatchStatus = 'Completed' | 'Watching' | 'Plan to Watch';

export interface EpisodeInfo {
  name: string;
  airDate?: string; // ISO or YYYY-MM-DD
  season?: number;
  number?: number;
}

export interface MediaEntry {
  id?: number;
  title: string;
  type: MediaType;
  status?: WatchStatus;
  coverImage: string;
  releaseDate?: string; // ISO or YYYY-MM-DD
  rating: number; // 1-10
  review?: string;
  favorite?: boolean;
  genre?: string[];
  createdAt: number;
  episodesWatched?: number;
  episodesTotal?: number;
  seasonsCount?: number;
  episodes?: EpisodeInfo[];
  imdbId?: string; // IMDb ID for re-fetching details
  lastRefreshedAt?: number; // Timestamp of last auto-refresh
}

export const AVAILABLE_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'Slice of Life',
  'Supernatural'
];

/**
 * Safely format a date string. Returns formatted date or null if invalid.
 * Prevents RangeError crashes from invalid date strings like "unknown", "TBD", etc.
 */
export function safeDateFormat(
  dateStr: string | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  // Quick reject known bad values
  const lower = dateStr.trim().toLowerCase();
  if (!lower || lower === 'unknown' || lower === 'tbd' || lower === 'n/a' || lower === 'null') {
    return null;
  }

  try {
    const d = new Date(dateStr);
    // Check for Invalid Date
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, options || { dateStyle: 'medium' });
  } catch {
    return null;
  }
}

/**
 * Generate placeholder episodes array from episodesTotal and seasonsCount.
 * Used to hydrate entries that have episodesTotal but no episodes array.
 */
export function generateEpisodesList(
  episodesTotal: number,
  seasonsCount: number = 1
): EpisodeInfo[] {
  return Array.from({ length: episodesTotal }, (_, i) => {
    const estSeason = seasonsCount > 1
      ? Math.min(seasonsCount, Math.floor((i / episodesTotal) * seasonsCount) + 1)
      : 1;
    return {
      name: `Episode ${i + 1}`,
      season: estSeason,
      number: i + 1,
    };
  });
}

/**
 * Ensure an entry always has a valid episodes array.
 * If episodes is empty but episodesTotal exists, generates placeholder episodes.
 * Use this before any save/update to prevent losing episode data.
 */
export function hydrateEpisodes(entry: MediaEntry): MediaEntry {
  if (entry.type === 'Movie') return entry;

  const episodes = entry.episodes || [];
  const total = entry.episodesTotal || 0;

  if (episodes.length > 0) return entry;
  if (total <= 0) return entry;

  return {
    ...entry,
    episodes: generateEpisodesList(total, entry.seasonsCount || 1),
  };
}
