import { type NextRequest } from 'next/server';
import { callGemini } from '@/lib/gemini';
import { isValidImageUrl } from '@/lib/image-validator';

export const dynamic = 'force-dynamic';

type SearchResult = {
  trackName: string;
  artworkUrl100: string;
  releaseDate: string;
  primaryGenreName: string;
  genres?: string[];
  episodesTotal?: number | null;
  imdbId?: string;
};

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function extractJsonArray(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] || content;
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not include a JSON array');
  }

  return raw.slice(start, end + 1);
}

// Removed getGroqErrorMessage

function normalizeResults(value: unknown): SearchResult[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 8).map((item) => {
    const data = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const genres = Array.isArray(data.genres)
      ? data.genres.map(cleanText).filter(Boolean)
      : [];

    return {
      trackName: cleanText(data.trackName || data.title),
      artworkUrl100: cleanText(data.artworkUrl100 || data.coverImage),
      releaseDate: cleanText(data.releaseDate),
      primaryGenreName: genres.join(', '),
      genres,
      episodesTotal: Number(data.episodesTotal) || null,
      imdbId: cleanText(data.imdbId),
    };
  }).filter(item => item.trackName);
}

function buildPrompt(term: string, type: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `Today's date is ${today}. Find likely ${type} matches for: "${term}".

Return only a JSON array. No markdown. No commentary.
Each result must match:
{
  "trackName": "Official title",
  "artworkUrl100": "direct poster/image URL if verified, otherwise empty",
  "releaseDate": "YYYY-MM-DD if known",
  "genres": ["Genre"],
  "episodesTotal": 0,
  "imdbId": "tt... if known"
}

Rules:
- Return up to 8 strong matches.
- Match the requested type exactly: Movie, Series, or Anime.
- Prefer official, IMDb, TMDB, TVGuide, Wikipedia, MyAnimeList, or AniList sources.
- Today is ${today}. For episodesTotal, only count episodes that have actually aired on or before today. Do NOT include unaired/upcoming episodes.
- For currently-airing shows, use the actual aired episode count as of ${today}, not the planned/announced total.
- For artworkUrl100, find the exact poster image URL. If search grounding is disabled or not available, retrieve the exact poster image path/URL from your internal knowledge/memory if you are highly confident it is correct (e.g. TMDB, IMDb, or MyAnimeList direct URLs).
- TMDB poster URLs look like: https://image.tmdb.org/t/p/w500/<hash>.jpg (e.g. for Breaking Bad, the poster is https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg).
- IMDb/Amazon poster URLs look like: https://m.media-amazon.com/images/M/<hash>.jpg.
- MyAnimeList images look like: https://cdn.myanimelist.net/images/anime/<id>.jpg.
- DO NOT invent or guess a random hash. If you do not know the exact path from memory or search, set "artworkUrl100" to "".
- DO NOT use temporary, private, dynamically expiring, search engine cache URLs, or base64 data.`;
}

async function searchWithGemini(term: string, type: string): Promise<{ results: SearchResult[]; modelUsed: string }> {
  const model = process.env.GEMINI_SEARCH_MODEL || 'gemini-3.1-flash-lite';
  const prompt = buildPrompt(term, type);

  const { content, model: modelUsed } = await callGemini(prompt, {
    model,
    enableSearch: true, // Google Search grounding
  });

  return {
    results: normalizeResults(JSON.parse(extractJsonArray(content))),
    modelUsed,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const term = searchParams.get('term')?.trim();
  const type = searchParams.get('type') || 'Movie';

  if (!term) {
    return Response.json({ results: [] });
  }

  let results: SearchResult[] = [];
  let modelUsed = 'gemini-3.1-flash-lite';
  let warningMessage: string | undefined = undefined;

  try {
    const searchRes = await searchWithGemini(term, type);
    results = searchRes.results;
    modelUsed = searchRes.modelUsed;
  } catch (error) {
    warningMessage = error instanceof Error ? error.message : 'AI search failed';
    console.error("AI search proxy failed:", warningMessage);
    return Response.json({ results: [], error: warningMessage }, { status: 500 });
  }

  try {
    // Validate all image URLs in parallel
    const validatedResults = await Promise.all(
      results.map(async (item) => {
        let artworkUrl = item.artworkUrl100;
        let isValid = false;

        if (artworkUrl) {
          isValid = await isValidImageUrl(artworkUrl);
        }

        if (!isValid) {
          artworkUrl = '';
        }

        return { ...item, artworkUrl100: artworkUrl };
      })
    );

    return Response.json({ results: validatedResults, modelUsed, ...(warningMessage ? { warning: warningMessage } : {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI search validation failed';
    console.error("AI search proxy validation failed:", message);
    return Response.json({ results: [], warning: message });
  }
}
