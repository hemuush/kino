"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaEntry, Tag, DEFAULT_GENRES } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { TokenExpiredError, downloadBackupFromDrive, uploadBackupToDrive } from '@/lib/googleDrive';

let globalHasFetchedFromDrive = false;
let uploadTimeout: NodeJS.Timeout | null = null;

export function useMedia() {
  const { accessToken, logout } = useAuth();
  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [genres, setGenres] = useState<Tag[]>([]);
  const [franchises, setFranchises] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const isInitialLoadDone = useRef(false);

  // Load and Migrate Data (Local Storage First)
  useEffect(() => {
    try {
      const storedEntries = localStorage.getItem('kino_entries');
      const storedGenres = localStorage.getItem('kino_genres');
      const storedFranchises = localStorage.getItem('kino_franchises');

      let parsedEntries: MediaEntry[] = storedEntries ? JSON.parse(storedEntries) : [];
      let parsedGenres: Tag[] = storedGenres ? JSON.parse(storedGenres) : [];
      let parsedFranchises: Tag[] = storedFranchises ? JSON.parse(storedFranchises) : [];

      // Migrate old 'Series' data to 'TV Show'
      parsedEntries = parsedEntries.map(e => {
        if ((e.type as any) === 'Series') {
          return { ...e, type: 'TV Show' };
        }
        return e;
      });

      if (parsedGenres.length === 0) {
        parsedGenres = DEFAULT_GENRES.map(name => ({
          id: crypto.randomUUID(),
          name
        }));
      }

      setGenres(parsedGenres);
      setFranchises(parsedFranchises);
      setEntries(parsedEntries);
    } catch (error) {
      console.error("Failed to load DB", error);
    } finally {
      setIsLoading(false);
      isInitialLoadDone.current = true;
    }
  }, []);

  // Sync from Google Drive on login/mount
  useEffect(() => {
    if (!accessToken || !isInitialLoadDone.current) return;
    if (globalHasFetchedFromDrive) return;

    const fetchFromDrive = async () => {
      try {
        globalHasFetchedFromDrive = true;
        setSyncStatus('syncing');
        const backup = await downloadBackupFromDrive(accessToken);
        if (backup && Array.isArray(backup)) {
          setEntries(backup);
          localStorage.setItem('kino_entries', JSON.stringify(backup));
        }
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        if (error instanceof TokenExpiredError || (error as Error).message?.includes('401')) {
          console.warn("Session expired, automatically logging out...");
          logout(false);
        } else {
          console.error("Failed to sync from Drive", error);
        }
      }
    };

    fetchFromDrive();
  }, [accessToken]);

  // Upload to Google Drive wrapper
  const uploadToDrive = useCallback((newEntries: MediaEntry[]) => {
    if (!accessToken) return;

    if (uploadTimeout) clearTimeout(uploadTimeout);
    setSyncStatus('syncing');

    uploadTimeout = setTimeout(async () => {
      try {
        await uploadBackupToDrive(accessToken, newEntries);
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        if (error instanceof TokenExpiredError || (error as Error).message?.includes('401')) {
          console.warn("Session expired, automatically logging out...");
          logout(false);
        } else {
          console.error("Failed to upload to Drive", error);
        }
      }
    }, 2000);
  }, [accessToken, logout]);

  // --- Entries Methods ---
  const saveEntries = async (newEntries: MediaEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem('kino_entries', JSON.stringify(newEntries));
    uploadToDrive(newEntries);
  };

  const addEntry = async (entry: MediaEntry) => {
    // Generate a robust unique ID if needed
    const newEntry = { ...entry, id: entry.id || Date.now(), createdAt: Date.now() };
    setEntries(prev => {
      const updated = [newEntry, ...prev];
      localStorage.setItem('kino_entries', JSON.stringify(updated));
      uploadToDrive(updated);
      return updated;
    });
  };

  const updateEntry = async (updatedEntry: MediaEntry) => {
    setEntries(prev => {
      const updated = prev.map(e => String(e.id) === String(updatedEntry.id) ? updatedEntry : e);
      localStorage.setItem('kino_entries', JSON.stringify(updated));
      uploadToDrive(updated);
      return updated;
    });
  };

  const deleteEntry = async (id: number) => {
    setEntries(prev => {
      const updated = prev.filter(e => String(e.id) !== String(id));
      localStorage.setItem('kino_entries', JSON.stringify(updated));
      uploadToDrive(updated);
      return updated;
    });
  };

  // --- Tag/Dictionary Methods ---
  const saveGenres = (newGenres: Tag[]) => {
    setGenres(newGenres);
    localStorage.setItem('kino_genres', JSON.stringify(newGenres));
  };

  const saveFranchises = (newFranchises: Tag[]) => {
    setFranchises(newFranchises);
    localStorage.setItem('kino_franchises', JSON.stringify(newFranchises));
  };

  return {
    entries, isLoading, addEntry, updateEntry, deleteEntry,
    genres, setGenres: saveGenres,
    franchises, setFranchises: saveFranchises,
    syncStatus,
    batchUpdateEntries: saveEntries
  };
}