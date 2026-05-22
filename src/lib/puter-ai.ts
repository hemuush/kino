/**
 * Puter.js browser-side AI utility.
 * Provides a fallback LLM search when the server-side Gemini API quota is exhausted.
 * Puter.js runs entirely in the browser — no API keys required.
 * Models: openai/gpt-4o-mini, anthropic/claude-haiku-4-5, deepseek/deepseek-chat, etc.
 */

declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (
          prompt: string | Array<{ role: string; content: string }>,
          options?: { model?: string; stream?: boolean }
        ) => Promise<PuterAIResponse>;
      };
    };
  }
}

type PuterAIResponse =
  | string
  | {
      message?: {
        content?: string | Array<{ type: string; text: string }>;
      };
    };

export interface PuterSearchResult {
  trackName: string;
  artworkUrl100: string;
  releaseDate: string;
  genres: string[];
  episodesTotal: number | null;
  imdbId: string;
}

function isPuterAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.puter?.ai?.chat === 'function';
}

function extractText(response: PuterAIResponse): string {
  if (typeof response === 'string') return response;
  const content = response?.message?.content;
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((c) => (typeof c === 'object' && 'text' in c ? c.text : '')).join('');
  }
  return String(content);
}

function extractJsonArray(text: string): PuterSearchResult[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] || text;
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('No JSON array in response');
  return JSON.parse(raw.slice(start, end + 1));
}

function buildSearchPrompt(term: string, type: string): string {
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
- Match the requested type exactly: ${type}.
- Prefer official, IMDb, TMDB, TVGuide, Wikipedia, MyAnimeList, or AniList sources.
- Today is ${today}. For episodesTotal, only count episodes that have actually aired on or before today. Do NOT include unaired/upcoming episodes.
- For currently-airing shows, use the actual aired episode count as of ${today}, not the planned/announced total.
- For artworkUrl100, retrieve the exact poster image path/URL from your knowledge if highly confident (e.g. TMDB URLs like https://image.tmdb.org/t/p/w500/<hash>.jpg).
- TMDB poster URLs look like: https://image.tmdb.org/t/p/w500/<hash>.jpg
- IMDb/Amazon poster URLs look like: https://m.media-amazon.com/images/M/<hash>.jpg
- MyAnimeList images look like: https://cdn.myanimelist.net/images/anime/<id>.jpg
- DO NOT invent or guess a random hash. If unsure, set "artworkUrl100" to "".
- DO NOT use temporary, private, or expiring URLs.`;
}

const PUTER_MODEL_CASCADE = [
  'openai/gpt-4o-mini',
  'anthropic/claude-haiku-4-5',
  'deepseek/deepseek-chat',
  'google/gemini-2.0-flash',
  'meta-llama/llama-3.1-8b-instruct',
];

/**
 * Search for media using Puter.js browser-side AI.
 * Tries multiple models in cascade until one succeeds.
 */
export async function searchWithPuter(
  term: string,
  type: string
): Promise<{ results: PuterSearchResult[]; model: string }> {
  if (!isPuterAvailable()) {
    throw new Error('Puter.js is not loaded yet. Please try again in a moment.');
  }

  const prompt = buildSearchPrompt(term, type);
  let lastError: Error | null = null;

  for (const model of PUTER_MODEL_CASCADE) {
    try {
      console.log(`[Puter.js] Trying model: ${model}`);
      const response = await window.puter!.ai.chat(prompt, { model });
      const text = extractText(response);
      const results = extractJsonArray(text);
      console.log(`[Puter.js] Success with model: ${model}, found ${results.length} results`);
      return { results, model };
    } catch (err) {
      console.warn(`[Puter.js] Model ${model} failed:`, err instanceof Error ? err.message : err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('All Puter.js models failed');
}

/**
 * Wait for puter.js to load (max 5 seconds).
 */
export function waitForPuter(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isPuterAvailable()) {
      resolve();
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      if (isPuterAvailable()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Puter.js did not load in time'));
      }
    }, 100);
  });
}
