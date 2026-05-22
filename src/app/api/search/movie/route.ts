import { type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const term = searchParams.get('term');
  if (!term) {
    return Response.json({ results: [] });
  }

  const IMDB_API_URL = process.env.NEXT_PUBLIC_IMDB_API_URL || 'https://imdb.iamidiotareyoutoo.com';
  try {
    const url = `${IMDB_API_URL}/search?q=${encodeURIComponent(term)}`;
    const res = await fetch(url);
    if (!res.ok) {
      return Response.json({ results: [] }, { status: res.status });
    }
    const data = await res.json();
    
    // Map IMDb API search results format to the expected client format:
    const results = (data.description || []).map((item: any) => ({
      trackName: item['#TITLE'] || '',
      artworkUrl100: item['#IMG_POSTER'] || '',
      releaseDate: item['#YEAR'] ? `${item['#YEAR']}-01-01` : '',
      primaryGenreName: '', // Genres are not returned by this search API, but they can be manually selected in the UI.
      imdbId: item['#IMDB_ID'] || '',
    }));

    return Response.json({ results });
  } catch (error) {
    console.error("IMDb search proxy failed:", error);
    return Response.json({ results: [] }, { status: 500 });
  }
}

