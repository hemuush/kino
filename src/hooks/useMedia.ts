import { useState, useEffect, useCallback } from 'react';
import { MediaEntry, getAllMedia, addMedia, updateMedia, deleteMedia } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { uploadBackupToDrive } from '@/lib/googleDrive';

export function useMedia() {
  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { accessToken } = useAuth();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const data = await getAllMedia();
    setEntries(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const syncToCloud = async (latestEntries: MediaEntry[]) => {
    if (accessToken) {
      try {
        await uploadBackupToDrive(accessToken, latestEntries);
        console.log("Auto-synced to Google Drive");
      } catch (e) {
        console.error("Auto-sync failed", e);
      }
    }
  };

  const addEntry = async (entry: Omit<MediaEntry, 'id' | 'createdAt'>) => {
    await addMedia(entry);
    const updated = await getAllMedia();
    setEntries(updated);
    await syncToCloud(updated);
  };

  const updateEntry = async (entry: MediaEntry) => {
    await updateMedia(entry);
    const updated = await getAllMedia();
    setEntries(updated);
    await syncToCloud(updated);
  };

  const deleteEntry = async (id: number) => {
    await deleteMedia(id);
    const updated = await getAllMedia();
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
