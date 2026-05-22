import { useState, useEffect, useCallback } from 'react';
import { MediaEntry } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { uploadBackupToDrive, downloadBackupFromDrive, TokenExpiredError } from '@/lib/googleDrive';

const sortEntries = (entriesList: MediaEntry[]): MediaEntry[] => {
  return [...entriesList].sort((a, b) => b.createdAt - a.createdAt);
};

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
        setEntries(JSON.parse(cached));
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
        // Hydrate data to make sure new fields exist
        const hydratedData = data.map(entry => ({
          ...entry,
          status: entry.status || 'Completed',
          favorite: entry.favorite ?? false,
          genre: entry.genre || [],
          episodesWatched: entry.type !== 'Movie' ? (entry.episodesWatched ?? 0) : undefined,
          episodesTotal: entry.type !== 'Movie' ? entry.episodesTotal : undefined,
          seasonsCount: entry.seasonsCount || undefined,
          episodes: entry.episodes || [],
        }));
        
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
    
    const updated = sortEntries([newEntry, ...entries]);
    setEntries(updated);
    try {
      localStorage.setItem('kino_media_entries', JSON.stringify(updated));
    } catch (e) {}
    syncToCloud(updated); // Sync in background
  };

  const updateEntry = async (entry: MediaEntry) => {
    const updated = sortEntries(
      entries.map(e => e.id === entry.id ? entry : e)
    );
    setEntries(updated);
    try {
      localStorage.setItem('kino_media_entries', JSON.stringify(updated));
    } catch (e) {}
    syncToCloud(updated); // Sync in background
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
    deleteEntry,
    refresh: loadData
  };
}
