function isTrustedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const trustedDomains = [
      'tmdb.org',
      'themoviedb.org',
      'imdb.com',
      'media-amazon.com',
      'wikipedia.org',
      'wikimedia.org',
      'myanimelist.net',
      'anilist.co',
      'favim.com',
      'tumblr.com',
      'placehold.co'
    ];
    return trustedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

function hasImageExtension(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    return (
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.jpeg') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.webp') ||
      pathname.endsWith('.gif') ||
      pathname.includes('.jpg/') ||
      pathname.includes('.jpeg/') ||
      pathname.includes('.png/') ||
      pathname.includes('.webp/')
    );
  } catch {
    return false;
  }
}

/**
 * Validates whether a given URL points to a valid, reachable image.
 * Performs HEAD and GET requests, handling trusted image domains and CORS blocks gracefully.
 */
export async function isValidImageUrl(url: string): Promise<boolean> {
  if (!url) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;

  const trusted = isTrustedDomain(url);
  const hasExt = hasImageExtension(url);

  let statusCode: number | null = null;
  let contentType: string | null = null;

  // 1. Try HEAD request first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout

    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'image/jpeg,image/png,image/webp,image/*;q=0.8,*/*;q=0.5'
      }
    });
    
    clearTimeout(timeoutId);
    statusCode = res.status;
    contentType = res.headers.get('content-type');
  } catch (e) {
    // HEAD failed
  }

  // 2. Try GET request if HEAD failed or was non-200
  if (statusCode === null || statusCode < 200 || statusCode >= 300) {
    try {
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), 2500); // 2.5s timeout
      
      const getRes = await fetch(url, {
        method: 'GET',
        signal: getController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
          'Accept': 'image/jpeg,image/png,image/webp,image/*;q=0.8,*/*;q=0.5'
        }
      });
      
      clearTimeout(getTimeoutId);
      statusCode = getRes.status;
      contentType = getRes.headers.get('content-type');
    } catch (e) {
      // GET failed
    }
  }

  // Evaluate results
  if (statusCode !== null) {
    if (statusCode === 404) {
      return false; // Explicitly does not exist
    }
    
    if (statusCode >= 200 && statusCode < 300) {
      if (contentType && contentType.toLowerCase().startsWith('image/')) {
        return true;
      }
      // If it returned 200 but content-type is missing or wrong, check trusted + extension
      if (trusted && hasExt) {
        return true;
      }
      return false;
    }
    
    // If it returned 403, 401, 405, 500, etc., but it's a trusted domain and has image format,
    // we assume it is valid but blocks direct backend scrapers (hotlinking protection).
    if (trusted && (hasExt || url.includes('tmdb.org') || url.includes('media-amazon.com'))) {
      return true;
    }
    return false;
  }

  // If request failed completely (network error / timeout)
  if (trusted && hasExt) {
    return true; // Assume valid if it's a trusted image CDN URL
  }

  return false;
}


