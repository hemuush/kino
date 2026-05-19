export type MediaType = 'Movie' | 'Series' | 'Anime';

export interface MediaEntry {
  id?: number;
  title: string;
  type: MediaType;
  coverImage: string;
  watchDate: string; // ISO string
  rating: number; // 1-10
  review?: string;
  createdAt: number;
}
