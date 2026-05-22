import { useState, useEffect, useCallback } from 'react';
import { MediaEntry, hydrateEpisodes } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { uploadBackupToDrive, downloadBackupFromDrive, TokenExpiredError } from '@/lib/googleDrive';

const sortEntries = (entriesList: MediaEntry[]): MediaEntry[] => {
  return [...entriesList].sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Hydrate a single entry: ensure all fields exist and episodes are populated.
 */
function hydrateEntry(entry: MediaEntry): MediaEntry {
  const base: MediaEntry = {
    ...entry,
    status: entry.status || 'Completed',
    favorite: entry.favorite ?? false,
    genre: entry.genre || [],
    episodesWatched: entry.type !== 'Movie' ? (entry.episodesWatched ?? 0) : undefined,
    episodesTotal: entry.type !== 'Movie' ? entry.episodesTotal : undefined,
    seasonsCount: entry.seasonsCount || undefined,
    episodes: entry.episodes || [],
    imdbId: entry.imdbId || undefined,
    lastRefreshedAt: entry.lastRefreshedAt || undefined,
  };
  // Ensure episodes array is populated if we have a total but empty array
  return hydrateEpisodes(base);
}

export function useMedia() {
  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { accessToken, logout } = useAuth();

  const handleTokenExpired = useCallback(() => {
    console.warn('Session expired. Redirecting to login...');
    logout();
  }, [logout]);

  // Load from local storage cache immediately on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('kino_media_entries');
      if (cached) {
        const parsed = JSON.parse(cached) as MediaEntry[];
        // Hydrate all entries from cache to ensure episodes exist
        setEntries(parsed.map(hydrateEntry));
        setIsLoading(false);
      }
    } catch (e) {
      console.warn("Failed to load cached media entries:", e);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setEntries([]);
      setIsLoading(false);
      return;
    }
    
    // Only set loading to true if we don't have cached entries yet
    setIsLoading(prev => prev && entries.length === 0);
    try {
      const data = await downloadBackupFromDrive(accessToken);
      if (data) {
        // Hydrate all entries from cloud to ensure fields + episodes exist
        const hydratedData = data.map(hydrateEntry);
        
        const sorted = sortEntries(hydratedData);
        setEntries(sorted);
        
        // Update local storage cache
        try {
          localStorage.setItem('kino_media_entries', JSON.stringify(sorted));
        } catch (e) {
          console.warn("Failed to write to localStorage cache:", e);
        }
      } else {
        setEntries([]);
        try {
          localStorage.removeItem('kino_media_entries');
        } catch (e) {}
      }
    } catch (e) {
      if (e instanceof TokenExpiredError) { handleTokenExpired(); return; }
      console.error("Failed to fetch data from drive", e);
      // Keep cached local entries if cloud retrieval fails
    }
    setIsLoading(false);
  }, [accessToken, handleTokenExpired, entries.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  const syncToCloud = async (latestEntries: MediaEntry[]) => {
    if (accessToken) {
      setSyncStatus('syncing');
      try {
        await uploadBackupToDrive(accessToken, latestEntries);
        console.log("Auto-synced to Google Drive");
        setSyncStatus('synced');
        // Reset status to idle after 3 seconds
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (e) {
        if (e instanceof TokenExpiredError) { 
          handleTokenExpired(); 
          setSyncStatus('idle');
          return; 
        }
        console.error("Auto-sync failed", e);
        setSyncStatus('error');
      }
    }
  };

  const addEntry = async (entry: Omit<MediaEntry, 'id' | 'createdAt'>) => {
    const newEntry: MediaEntry = {
      ...entry,
      status: entry.status || 'Completed',
      favorite: entry.favorite ?? false,
      genre: entry.genre || [],
      id: Date.now(), // Generate a client-side ID
      createdAt: Date.now(),
    };
    // Hydrate episodes before saving
    const hydrated = hydrateEpisodes(newEntry);
    
    const updated = sortEntries([hydrated, ...entries]);
    setEntries(updated);
    try {
      localStorage.setItem('kino_media_entries', JSON.stringify(updated));
    } catch (e) {}
    syncToCloud(updated); // Sync in background
  };

  const updateEntry = async (entry: MediaEntry) => {
    // Hydrate episodes before saving to ensure they're never lost
    const hydrated = hydrateEpisodes(entry);
    const updated = sortEntries(
      entries.map(e => e.id === hydrated.id ? hydrated : e)
    );
    setEntries(updated);
    try {
      localStorage.setItem('kino_media_entries', JSON.stringify(updated));
    } catch (e) {}
    syncToCloud(updated); // Sync in background
  };

  /**
   * Batch update multiple entries at once (used by auto-refresh).
   * Only syncs to cloud once after all updates are applied.
   */
  const batchUpdateEntries = async (updatedEntries: MediaEntry[]) => {
    const updatedMap = new Map(updatedEntries.map(e => [e.id, hydrateEpisodes(e)]));
    const newList = sortEntries(
      entries.map(e => updatedMap.get(e.id) || e)
    );
    setEntries(newList);
    try {
      localStorage.setItem('kino_media_entries', JSON.stringify(newList));
    } catch (e) {}
    syncToCloud(newList);
  };

  const deleteEntry = async (id: number) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    try {
      localStorage.setItem('kino_media_entries', JSON.stringify(updated));
    } catch (e) {}
    syncToCloud(updated); // Sync in background
  };

  return {
    entries,
    isLoading,
    syncStatus,
    addEntry,
    updateEntry,
    batchUpdateEntries,
    deleteEntry,
    refresh: loadData
  };
}
