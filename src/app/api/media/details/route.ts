import { type NextRequest } from 'next/server';
import { callGemini } from '@/lib/gemini';
import { isValidImageUrl } from '@/lib/image-validator';

export const dynamic = 'force-dynamic';

interface EpisodeInfo {
  name: string;
  airDate?: string;
  season?: number;
  number?: number;
}

interface MediaDetailsResponse {
  title: string;
  coverImage?: string;
  releaseDate?: string;
  genres: string[];
  seasonsCount?: number;
  episodesTotal?: number;
  episodes?: EpisodeInfo[];
  imdbId?: string;
  sources?: string[];
  warning?: string;
}

type EpisodeLike = {
  name?: unknown;
  title?: unknown;
  airDate?: unknown;
  season?: unknown;
  number?: unknown;
};

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanGenres(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(cleanText).filter(Boolean).slice(0, 8);
}

function normalizeEpisode(ep: EpisodeLike, index: number): EpisodeInfo {
  const season = Number.parseInt(String(ep.season ?? 1), 10);
  const number = Number.parseInt(String(ep.number ?? index + 1), 10);
  const airDate = cleanText(ep.airDate);

  return {
    name: cleanText(ep.name || ep.title) || `Episode ${Number.isFinite(number) ? number : index + 1}`,
    season: Number.isFinite(season) && season > 0 ? season : 1,
    number: Number.isFinite(number) && number > 0 ? number : index + 1,
    ...(airDate ? { airDate: airDate.split('T')[0] } : {}),
  };
}

function filterFutureEpisodes(episodes: EpisodeInfo[], cutoffDate?: string): EpisodeInfo[] {
  const cutoff = cutoffDate ? new Date(cutoffDate) : new Date();
  cutoff.setHours(23, 59, 59, 999);

  return episodes.filter(ep => {
    if (!ep.airDate) return true;
    const epDate = new Date(ep.airDate);
    if (Number.isNaN(epDate.getTime())) return true;
    return epDate <= cutoff;
  });
}

function extractJsonObject(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] || content;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not include a JSON object');
  }

  return raw.slice(start, end + 1);
}

// Removed getGroqErrorMessage

function normalizeDetails(value: unknown, fallbackTitle: string, imdbId?: string): MediaDetailsResponse {
  const data = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const episodes = Array.isArray(data.episodes)
    ? data.episodes.map((ep, index) => normalizeEpisode(ep as EpisodeLike, index))
    : [];
  const seasonsCount = Number(data.seasonsCount) || undefined;
  const episodesTotal = Number(data.episodesTotal) || episodes.length || undefined;

  return {
    title: cleanText(data.title) || fallbackTitle,
    coverImage: cleanText(data.coverImage) || undefined,
    releaseDate: cleanText(data.releaseDate) || undefined,
    genres: cleanGenres(data.genres),
    seasonsCount,
    episodesTotal,
    episodes,
    imdbId: imdbId || cleanText(data.imdbId) || undefined,
    sources: Array.isArray(data.sources) ? data.sources.map(cleanText).filter(Boolean).slice(0, 6) : undefined,
  };
}

async function fetchFromGemini(title: string, type: string, imdbId?: string): Promise<{ details: MediaDetailsResponse; modelUsed: string }> {
  const model = process.env.GEMINI_DETAILS_MODEL || 'gemini-3.1-flash-lite';
  const today = new Date().toISOString().split('T')[0];
  const prompt = `Today's date is ${today}. Find accurate media metadata for this ${type}: "${title}".

Return only one JSON object. No markdown. No commentary.

Rules:
- Match the requested type exactly: Movie, Series, or Anime.
- Prefer official websites, IMDb, TMDB, Rotten Tomatoes, TVGuide, Wikipedia, MyAnimeList, AniList, or streaming/service pages.
- CRITICAL: Today is ${today}. Only include episodes that have already aired on or before ${today}. Do NOT include future or unaired episodes.
- For currently-airing shows, episodesTotal must reflect only the actual aired count as of ${today}, not the planned season total.
- For Series and Anime, include every confirmed aired episode with exact episode names, season numbers, episode numbers, and air dates.
- If exact episode data cannot be verified, return as much verified metadata as possible and leave episodes as [].
- For coverImage, find the exact poster image URL. If search grounding is disabled or not available, retrieve the exact poster image path/URL from your internal knowledge/memory if you are highly confident it is correct (e.g. TMDB, IMDb, or MyAnimeList direct URLs).
- TMDB poster URLs look like: https://image.tmdb.org/t/p/w500/<hash>.jpg (e.g. for Breaking Bad, the poster is https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg).
- IMDb/Amazon poster URLs look like: https://m.media-amazon.com/images/M/<hash>.jpg.
- MyAnimeList images look like: https://cdn.myanimelist.net/images/anime/<id>.jpg.
- DO NOT invent or guess a random hash. If you do not know the exact path from memory or search, set "coverImage" to "".
- DO NOT use temporary, private, dynamically expiring, search engine cache URLs, or base64 data.
- releaseDate must be YYYY-MM-DD when known.
- sources should contain the URLs or source names used.

JSON shape:
{
  "title": "Official title",
  "coverImage": "https://...",
  "releaseDate": "YYYY-MM-DD",
  "genres": ["Drama", "Thriller"],
  "seasonsCount": 1,
  "episodesTotal": 0,
  "episodes": [
    { "name": "Episode title", "season": 1, "number": 1, "airDate": "YYYY-MM-DD" }
  ],
  "imdbId": "tt...",
  "sources": ["https://..."]
}`;

  const { content, model: modelUsed } = await callGemini(prompt, {
    model,
    enableSearch: true, // Google Search grounding
  });

  const parsed = JSON.parse(extractJsonObject(content));
  return {
    details: normalizeDetails(parsed, title, imdbId),
    modelUsed,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get('title')?.trim();
  const type = searchParams.get('type') || 'Movie';
  const imdbId = searchParams.get('imdbId') || undefined;
  const cutoffDate = searchParams.get('cutoff') || undefined;

  if (!title) {
    return Response.json({ error: 'Title is required' }, { status: 400 });
  }

  let details: MediaDetailsResponse | null = null;
  let modelUsed = 'gemini-3.1-flash-lite';
  let warningMessage: string | undefined = undefined;

  try {
    const fetchRes = await fetchFromGemini(title, type, imdbId);
    details = fetchRes.details;
    modelUsed = fetchRes.modelUsed;
  } catch (error) {
    warningMessage = error instanceof Error ? error.message : 'AI lookup failed';
    console.error("AI details lookup failed:", warningMessage);
    return Response.json({ error: warningMessage }, { status: 500 });
  }

  try {
    let coverImage = details.coverImage;
    let isValid = false;

    if (coverImage) {
      isValid = await isValidImageUrl(coverImage);
    }

    if (!isValid) {
      coverImage = undefined;
    }

    details.coverImage = coverImage;

    if (details.episodes && details.episodes.length > 0) {
      details.episodes = filterFutureEpisodes(details.episodes, cutoffDate);
      details.episodesTotal = details.episodes.length;
      details.seasonsCount = details.seasonsCount || Math.max(...details.episodes.map(ep => ep.season || 1));
    }

    return Response.json({ ...details, modelUsed, ...(warningMessage ? { warning: warningMessage } : {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI details validation failed';
    console.error("AI media details validation error:", message);

    return Response.json({
      title,
      genres: details?.genres || [],
      seasonsCount: type === 'Movie' ? undefined : (details?.seasonsCount || 1),
      episodesTotal: type === 'Movie' ? undefined : (details?.episodesTotal || 0),
      episodes: type === 'Movie' ? undefined : (details?.episodes || []),
      imdbId,
      modelUsed,
      warning: message,
    } satisfies MediaDetailsResponse & { modelUsed: string });
  }
}
