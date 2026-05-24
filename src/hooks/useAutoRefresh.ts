// src/hooks/useAutoRefresh.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { MediaEntry } from '@/lib/db';

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CONCURRENT = 3;

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

export function useAutoRefresh({ entries, batchUpdateEntries, isLoading }: UseAutoRefreshOptions): AutoRefreshStatus {
  const [status, setStatus] = useState<AutoRefreshStatus>({
    isRefreshing: false,
    refreshingCount: 0,
    refreshedCount: 0,
    totalToRefresh: 0,
  });

  const hasRunRef = useRef(false);
  // Store refs so useCallback doesn't need to rebuild on every single entry edit
  const entriesRef = useRef(entries);
  const updateRef = useRef(batchUpdateEntries);

  useEffect(() => {
    entriesRef.current = entries;
    updateRef.current = batchUpdateEntries;
  }, [entries, batchUpdateEntries]);

  const runRefresh = useCallback(async () => {
    // BUG 4 FIX: Check hasRunRef *inside* here so if the timer fires, it instantly aborts
    if (hasRunRef.current || isLoading || entriesRef.current.length === 0) return;
    hasRunRef.current = true;

    const now = Date.now();

    const staleEntries = entriesRef.current.filter(e => {
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

            const mergedEntry: MediaEntry = {
              ...entry,
              lastRefreshedAt: Date.now(),
            };

            if (data.episodes && data.episodes.length > 0) {
              mergedEntry.episodes = data.episodes;
              mergedEntry.episodesTotal = data.episodes.length;
            }

            if (data.seasonsCount && data.seasonsCount !== entry.seasonsCount) {
              mergedEntry.seasonsCount = data.seasonsCount;
            }

            return mergedEntry;
          } catch (err) {
            console.warn(`Auto-refresh failed for "${entry.title}":`, err);
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

    if (updatedEntries.length > 0) {
      await updateRef.current(updatedEntries);
    }

    setStatus({
      isRefreshing: false,
      refreshingCount: 0,
      refreshedCount: staleEntries.length,
      totalToRefresh: staleEntries.length,
    });

    setTimeout(() => {
      setStatus({ isRefreshing: false, refreshingCount: 0, refreshedCount: 0, totalToRefresh: 0 });
    }, 5000);
  }, [isLoading]);

  useEffect(() => {
    // BUG 4 FIX: Check hasRunRef *outside* to prevent queueing timers unnecessarily
    if (hasRunRef.current || isLoading) return;
    const timer = setTimeout(runRefresh, 3000);
    return () => clearTimeout(timer);
  }, [runRefresh, isLoading]);

  return status;
}