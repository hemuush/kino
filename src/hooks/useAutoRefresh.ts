import { useEffect, useRef, useState, useCallback } from 'react';
import { MediaEntry } from '@/lib/db';

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CONCURRENT = 3; // Max concurrent API requests to avoid rate-limiting

interface UseAutoRefreshOptions {
  entries: MediaEntry[];
  batchUpdateEntries: (entries: MediaEntry[]) => Promise<void>;
  isLoading: boolean;
}

interface AutoRefreshStatus {
  isRefreshing: boolean;
  refreshingCount: number;
  refreshedCount: number;
  totalToRefresh: number;
}

/**
 * Auto-refresh hook that runs on app mount.
 * Checks each 'Watching' and 'Plan to Watch' entry's lastRefreshedAt.
 * If >24h old, re-fetches details from /api/media/details and merges results.
 */
export function useAutoRefresh({ entries, batchUpdateEntries, isLoading }: UseAutoRefreshOptions): AutoRefreshStatus {
  const [status, setStatus] = useState<AutoRefreshStatus>({
    isRefreshing: false,
    refreshingCount: 0,
    refreshedCount: 0,
    totalToRefresh: 0,
  });
  const hasRunRef = useRef(false);

  const runRefresh = useCallback(async () => {
    if (hasRunRef.current || isLoading || entries.length === 0) return;
    hasRunRef.current = true;

    const now = Date.now();
    
    // Find stale entries: Watching or Plan to Watch, and not refreshed in 24h
    const staleEntries = entries.filter(e => {
      const isOngoing = e.status === 'Watching' || e.status === 'Plan to Watch';
      if (!isOngoing) return false;
      const lastRefresh = e.lastRefreshedAt || 0;
      return (now - lastRefresh) > REFRESH_INTERVAL_MS;
    });

    if (staleEntries.length === 0) return;

    setStatus({
      isRefreshing: true,
      refreshingCount: staleEntries.length,
      refreshedCount: 0,
      totalToRefresh: staleEntries.length,
    });

    const updatedEntries: MediaEntry[] = [];

    // Process in batches of MAX_CONCURRENT
    for (let i = 0; i < staleEntries.length; i += MAX_CONCURRENT) {
      const batch = staleEntries.slice(i, i + MAX_CONCURRENT);
      
      const results = await Promise.allSettled(
        batch.map(async (entry) => {
          try {
            const params = new URLSearchParams({
              title: entry.title,
              type: entry.type,
            });
            if (entry.imdbId) params.set('imdbId', entry.imdbId);

            const res = await fetch(`/api/media/details?${params.toString()}`);
            if (!res.ok) throw new Error(`API returned ${res.status}`);
            
            const data = await res.json();
            
            // Merge: keep user's watched progress, update episode metadata
            const mergedEntry: MediaEntry = {
              ...entry,
              lastRefreshedAt: Date.now(),
            };

            // Update episodes if we got new ones
            if (data.episodes && data.episodes.length > 0) {
              mergedEntry.episodes = data.episodes;
              mergedEntry.episodesTotal = data.episodes.length;
            }

            // Update seasons count if changed
            if (data.seasonsCount && data.seasonsCount !== entry.seasonsCount) {
              mergedEntry.seasonsCount = data.seasonsCount;
            }

            // Update genres if we got better data
            if (data.genres && data.genres.length > 0 && (!entry.genre || entry.genre.length === 0)) {
              mergedEntry.genre = data.genres;
            }

            return mergedEntry;
          } catch (err) {
            console.warn(`Auto-refresh failed for "${entry.title}":`, err);
            // Still mark as refreshed to avoid hammering on failure
            return {
              ...entry,
              lastRefreshedAt: Date.now(),
            } as MediaEntry;
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          updatedEntries.push(result.value);
        }
      }

      setStatus(prev => ({
        ...prev,
        refreshedCount: prev.refreshedCount + batch.length,
      }));
    }

    // Batch update all refreshed entries at once
    if (updatedEntries.length > 0) {
      await batchUpdateEntries(updatedEntries);
    }

    setStatus({
      isRefreshing: false,
      refreshingCount: 0,
      refreshedCount: staleEntries.length,
      totalToRefresh: staleEntries.length,
    });

    // Clear refreshed status after 5 seconds
    setTimeout(() => {
      setStatus({ isRefreshing: false, refreshingCount: 0, refreshedCount: 0, totalToRefresh: 0 });
    }, 5000);
  }, [entries, batchUpdateEntries, isLoading]);

  useEffect(() => {
    // Wait a moment after initial load before starting refresh
    const timer = setTimeout(runRefresh, 3000);
    return () => clearTimeout(timer);
  }, [runRefresh]);

  return status;
}
