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
