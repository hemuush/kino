// src/lib/db.ts
export type MediaType = 'Movie' | 'TV Show' | 'Anime';
export type WatchStatus = 'Completed' | 'Watching' | 'Plan to Watch';
export type AnimeType = 'Show' | 'Movie';

export interface Tag {
  id: string;
  name: string;
  coverImage?: string;
  color?: string;
}

export interface EpisodeInfo {
  name: string;
  airDate?: string;
  season?: number;
  number?: number;
  runtime?: number;
  watched?: boolean;
}

export interface MediaEntry {
  id?: number | string;
  title: string;
  type: MediaType;
  animeType?: AnimeType;
  status?: WatchStatus;
  coverImage: string;
  releaseDate?: string;
  runtime?: number;

  franchiseId?: string;
  genreIds?: string[];

  franchise?: string;
  genre?: string[];

  rating: number;
  review?: string;
  favorite?: boolean;
  createdAt: number;
  updatedAt?: number;
  episodesWatched?: number;
  episodesTotal?: number;
  seasonsCount?: number;
  episodes?: EpisodeInfo[];
  imdbId?: string;
  lastRefreshedAt?: number;
}

export const DEFAULT_GENRES: string[] = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Slice of Life', 'Supernatural', 'Documentary', 'Animation'
];

export function isEpisodic(entry: Partial<MediaEntry>): boolean {
  if (entry.type === 'Anime') return entry.animeType === 'Show';
  if (entry.type === 'TV Show') return true;
  return false;
}

export function normalizeMediaType(type: unknown): MediaType {
  const value = String(type || '').trim().toLowerCase();
  if (value === 'series' || value === 'tv' || value === 'tv series' || value === 'show' || value === 'tv show') return 'TV Show';
  if (value === 'anime') return 'Anime';
  return 'Movie';
}

export function normalizeWatchStatus(status: unknown): WatchStatus {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'watching' || value === 'in progress') return 'Watching';
  if (value === 'completed' || value === 'finished' || value === 'done') return 'Completed';
  return 'Plan to Watch';
}

export function getWatchedRuntimeMinutes(entry: Partial<MediaEntry>): number {
  if (!isEpisodic(entry)) {
    const runtime = Number(entry.runtime || 0);
    return entry.status === 'Completed' || !entry.status ? runtime : 0;
  }

  // Episodic Logic
  let totalWatchedMins = 0;

  if (entry.episodes && entry.episodes.length > 0) {
    const sortedEps = [...entry.episodes].sort((a, b) => {
      if ((a.season || 1) !== (b.season || 1)) return (a.season || 1) - (b.season || 1);
      return (a.number || 1) - (b.number || 1);
    });

    let knownSum = 0;
    let knownCount = 0;
    
    // First pass: find average of known specific runtimes
    for (const ep of sortedEps) {
      if (ep.runtime && ep.runtime > 0) {
        knownSum += ep.runtime;
        knownCount++;
      }
    }
    
    const globalRuntime = Number(entry.runtime || 0);
    const avgRuntime = knownCount > 0 ? (knownSum / knownCount) : globalRuntime;
    
    // Second pass: sum watched episodes using precise booleans if available
    let _manualWatchedCount = 0;
    for (const ep of sortedEps) {
      if (ep.watched || entry.status === 'Completed') {
        totalWatchedMins += (ep.runtime && ep.runtime > 0 ? ep.runtime : avgRuntime);
        _manualWatchedCount++;
      }
    }
    
    // If show is completed, pad missing episodes (if total is higher than array length)
    if (entry.status === 'Completed' && entry.episodesTotal && entry.episodesTotal > sortedEps.length) {
      const diff = entry.episodesTotal - sortedEps.length;
      totalWatchedMins += (diff * avgRuntime);
    }
    
    return Math.round(totalWatchedMins);
  } else {
    // Legacy fallback (no episodes array tracking)
    const runtime = Number(entry.runtime || 0);
    if (runtime <= 0) return 0;
    const fallbackCount = Number(entry.episodesWatched || (entry.status === 'Completed' ? (entry.episodesTotal || 0) : 0));
    return fallbackCount * runtime;
  }
}

export function getTotalRuntimeMinutes(entry: Partial<MediaEntry>): number {
  if (!isEpisodic(entry)) {
    return Number(entry.runtime || 0);
  }

  if (entry.episodes && entry.episodes.length > 0) {
    let knownSum = 0;
    let knownCount = 0;
    for (const ep of entry.episodes) {
      if (ep.runtime && ep.runtime > 0) {
        knownSum += ep.runtime;
        knownCount++;
      }
    }
    
    const globalRuntime = Number(entry.runtime || 0);
    const avgRuntime = knownCount > 0 ? (knownSum / knownCount) : globalRuntime;
    
    let total = 0;
    for (const ep of entry.episodes) {
      total += (ep.runtime && ep.runtime > 0 ? ep.runtime : avgRuntime);
    }
    
    if (entry.episodesTotal && entry.episodesTotal > entry.episodes.length) {
      total += (entry.episodesTotal - entry.episodes.length) * avgRuntime;
    }
    
    return Math.round(total);
  } else {
    const runtime = Number(entry.runtime || 0);
    const count = Number(entry.episodesTotal || entry.episodesWatched || 1);
    return runtime * count;
  }
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
    let normalizedStr = dateStr;
    // BUG 2 FIX: Only append T12:00:00 if the string is strictly YYYY-MM-DD.
    // This prevents Safari/WebKit from throwing an Invalid Date crash on bare years.
    const isStrictDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

    if (isStrictDate) {
      normalizedStr = `${dateStr}T12:00:00`;
    }

    const d = new Date(normalizedStr);

    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, options || { dateStyle: 'medium' });
  } catch {
    return null;
  }
}
