import { useState, useEffect, useCallback } from 'react';
import { MediaEntry } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { uploadBackupToDrive, downloadBackupFromDrive, TokenExpiredError } from '@/lib/googleDrive';

export function useMedia() {
  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { accessToken, logout } = useAuth();

  const handleTokenExpired = useCallback(() => {
    console.warn('Session expired. Redirecting to login...');
    logout();
  }, [logout]);

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setEntries([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const data = await downloadBackupFromDrive(accessToken);
      if (data) {
        // Sort descending by date
        const sortedData = data.sort((a, b) => {
           // First sort by watch date
           const dateDiff = new Date(b.watchDate).getTime() - new Date(a.watchDate).getTime();
           if (dateDiff !== 0) return dateDiff;
           // If watch dates are identical, fallback to creation time
           return b.createdAt - a.createdAt;
        });
        setEntries(sortedData);
      } else {
        setEntries([]);
      }
    } catch (e) {
      if (e instanceof TokenExpiredError) { handleTokenExpired(); return; }
      console.error("Failed to fetch data from drive", e);
      setEntries([]);
    }
    setIsLoading(false);
  }, [accessToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const syncToCloud = async (latestEntries: MediaEntry[]) => {
    if (accessToken) {
      try {
        await uploadBackupToDrive(accessToken, latestEntries);
        console.log("Auto-synced to Google Drive");
      } catch (e) {
        if (e instanceof TokenExpiredError) { handleTokenExpired(); return; }
        console.error("Auto-sync failed", e);
      }
    }
  };

  const addEntry = async (entry: Omit<MediaEntry, 'id' | 'createdAt'>) => {
    const newEntry: MediaEntry = {
      ...entry,
      id: Date.now(), // Generate a client-side ID
      createdAt: Date.now(),
    };
    
    const updated = [newEntry, ...entries].sort((a, b) => {
       const dateDiff = new Date(b.watchDate).getTime() - new Date(a.watchDate).getTime();
       if (dateDiff !== 0) return dateDiff;
       return b.createdAt - a.createdAt;
    });
    
    setEntries(updated);
    await syncToCloud(updated);
  };

  const updateEntry = async (entry: MediaEntry) => {
    const updated = entries.map(e => e.id === entry.id ? entry : e).sort((a, b) => {
       const dateDiff = new Date(b.watchDate).getTime() - new Date(a.watchDate).getTime();
       if (dateDiff !== 0) return dateDiff;
       return b.createdAt - a.createdAt;
    });
    setEntries(updated);
    await syncToCloud(updated);
  };

  const deleteEntry = async (id: number) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    await syncToCloud(updated);
  };

  return {
    entries,
    isLoading,
    addEntry,
    updateEntry,
    deleteEntry,
    refresh: loadData
  };
}
