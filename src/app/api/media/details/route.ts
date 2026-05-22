import { type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

interface EpisodeInfo {
  name: string;
  airDate?: string;
  season?: number;
  number?: number;
}

interface MediaDetailsResponse {
  title: string;
  releaseDate?: string;
  genres: string[];
  seasonsCount?: number;
  episodesTotal?: number;
  episodes?: EpisodeInfo[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get('title');
  const type = searchParams.get('type') || 'Series'; // Movie, Series, Anime
  const imdbId = searchParams.get('imdbId') || undefined;

  if (!title) {
    return Response.json({ error: 'Title is required' }, { status: 400 });
  }

  const GROQ_API_KEY = process.env.groq_api_key || process.env.GROQ_API_KEY;

  // Helper 1: Query Groq
  async function fetchFromGroq(titleStr: string, typeStr: string): Promise<MediaDetailsResponse> {
    if (!GROQ_API_KEY) throw new Error('Groq API Key not configured');

    const prompt = `You are a media database assistant. Return details for the ${typeStr}: "${titleStr}".
Output MUST be valid JSON only, matching this structure:
{
  "title": "...",
  "releaseDate": "YYYY-MM-DD",
  "genres": ["...", "..."],
  "seasonsCount": 5,
  "episodesTotal": 62,
  "episodes": [
    { "name": "...", "season": 1, "number": 1, "airDate": "YYYY-MM-DD" },
    ...
  ]
}
Include all episodes. If the exact airdate is unknown, use an estimate. No other text or explanation outside the JSON.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!res.ok) {
      throw new Error(`Groq API returned status ${res.status}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Groq returned empty response');
    }

    return JSON.parse(content) as MediaDetailsResponse;
  }

  // Helper 2: Query TVMaze (Series)
  async function fetchFromTVMaze(titleStr: string, imdbIdStr?: string): Promise<MediaDetailsResponse> {
    const TVMAZE_API_URL = 'https://api.tvmaze.com';
    let resolvedApiId: number | null = null;
    let resolvedGenres: string[] = [];
    let releaseDate = '';

    // 1. Try IMDb lookup
    if (imdbIdStr) {
      try {
        const res = await fetch(`${TVMAZE_API_URL}/lookup/shows?imdb=${imdbIdStr}`);
        if (res.ok) {
          const data = await res.json();
          resolvedApiId = data.id;
          resolvedGenres = data.genres || [];
          if (data.premiered) releaseDate = data.premiered;
        }
      } catch (e) {
        console.error("TVMaze IMDb lookup failed:", e);
      }
    }

    // 2. Try Title search
    if (!resolvedApiId) {
      const res = await fetch(`${TVMAZE_API_URL}/singlesearch/shows?q=${encodeURIComponent(titleStr)}`);
      if (res.ok) {
        const data = await res.json();
        resolvedApiId = data.id;
        resolvedGenres = data.genres || [];
        if (data.premiered) releaseDate = data.premiered;
      }
    }

    if (!resolvedApiId) {
      throw new Error("Could not find show on TVMaze");
    }

    // Fetch seasons
    const seasonsRes = await fetch(`${TVMAZE_API_URL}/shows/${resolvedApiId}/seasons`);
    let seasonsCount = 1;
    if (seasonsRes.ok) {
      const seasonsData = await seasonsRes.json();
      seasonsCount = seasonsData.length || 1;
    }

    // Fetch episodes
    const episodesRes = await fetch(`${TVMAZE_API_URL}/shows/${resolvedApiId}/episodes`);
    if (!episodesRes.ok) {
      throw new Error("Could not fetch episodes from TVMaze");
    }

    const episodesData = await episodesRes.json();
    const episodes = episodesData.map((ep: any) => ({
      name: ep.name || `Episode ${ep.number}`,
      airDate: ep.airdate || '',
      season: ep.season,
      number: ep.number
    }));

    return {
      title: titleStr,
      releaseDate,
      genres: resolvedGenres,
      seasonsCount,
      episodesTotal: episodes.length,
      episodes
    };
  }

  // Helper 3: Query Jikan (Anime)
  async function fetchFromJikan(titleStr: string): Promise<MediaDetailsResponse> {
    const JIKAN_API_URL = 'https://api.jikan.moe/v4';
    const searchRes = await fetch(`${JIKAN_API_URL}/anime?q=${encodeURIComponent(titleStr)}&limit=1`);
    if (!searchRes.ok) {
      throw new Error("Jikan search failed");
    }

    const searchData = await searchRes.json();
    const animeItem = (searchData.data || [])[0];
    if (!animeItem) {
      throw new Error("Anime not found in Jikan");
    }

    const resolvedApiId = animeItem.mal_id;
    const genres = (animeItem.genres || []).map((g: any) => g.name);
    const episodesTotalVal = animeItem.episodes || 0;
    let releaseDate = '';
    if (animeItem.aired?.from) {
      releaseDate = animeItem.aired.from.split('T')[0];
    }

    // Fetch episodes
    const episodesRes = await fetch(`${JIKAN_API_URL}/anime/${resolvedApiId}/episodes`);
    let episodes: EpisodeInfo[] = [];
    if (episodesRes.ok) {
      const epJson = await episodesRes.json();
      episodes = (epJson.data || []).map((ep: any) => ({
        name: ep.title || `Episode ${ep.mal_id}`,
        airDate: ep.aired ? ep.aired.split('T')[0] : '',
        season: 1,
        number: ep.mal_id
      }));
    }

    if (episodes.length === 0 && episodesTotalVal > 0) {
      episodes = Array.from({ length: episodesTotalVal }, (_, i) => ({
        name: `Episode ${i + 1}`,
        airDate: '',
        season: 1,
        number: i + 1
      }));
    }

    return {
      title: animeItem.title || titleStr,
      releaseDate,
      genres,
      seasonsCount: 1,
      episodesTotal: episodesTotalVal || episodes.length,
      episodes
    };
  }

  // Execution Strategy:
  // 1. Try Groq (smart metadata extraction, covers movies/series/anime)
  // 2. Fall back to structured APIs (TVMaze/Jikan) if Groq fails or is not configured
  try {
    if (GROQ_API_KEY) {
      try {
        console.log(`Fetching ${type} details from Groq for "${title}"...`);
        const details = await fetchFromGroq(title, type);
        return Response.json(details);
      } catch (err) {
        console.warn("Groq fetch failed, falling back to structured APIs:", err);
      }
    }

    // Structured Fallback
    if (type === 'Series') {
      const details = await fetchFromTVMaze(title, imdbId);
      return Response.json(details);
    } else if (type === 'Anime') {
      const details = await fetchFromJikan(title);
      return Response.json(details);
    } else {
      // Movie or other types
      return Response.json({
        title,
        genres: [],
        episodesTotal: undefined,
        seasonsCount: undefined,
        episodes: undefined
      });
    }
  } catch (error: any) {
    console.error("Unified media details API error:", error);
    return Response.json({ error: error.message || 'Failed to fetch media details' }, { status: 500 });
  }
}
