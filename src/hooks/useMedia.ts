"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { MediaEntry, Tag, DEFAULT_GENRES } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { TokenExpiredError, downloadBackupFromDrive, uploadBackupToDrive, BackupData } from '@/lib/googleDrive';

let globalHasFetchedFromDrive = false;

export function useMedia() {
  const { accessToken, logout } = useAuth();

  // React State for UI Rendering
  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [genres, setGenres] = useState<Tag[]>([]);
  const [franchises, setFranchises] = useState<Tag[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // The mutable ref holds the absolute latest data to dodge React's stale closures during uploads
  const latestDataRef = useRef<{
    entries: MediaEntry[];
    genres: Tag[];
    franchises: Tag[];
  }>({ entries: [], genres: [], franchises: [] });

  // Helper to update React State, the Ref, AND LocalStorage instantly
  const updateStateAndRef = useCallback((
    newEntries?: MediaEntry[],
    newGenres?: Tag[],
    newFranchises?: Tag[]
  ) => {
    if (newEntries) {
      setEntries(newEntries);
      latestDataRef.current.entries = newEntries;
      localStorage.setItem('kino_entries', JSON.stringify(newEntries));
    }
    if (newGenres) {
      setGenres(newGenres);
      latestDataRef.current.genres = newGenres;
      localStorage.setItem('kino_genres', JSON.stringify(newGenres));
    }
    if (newFranchises) {
      setFranchises(newFranchises);
      latestDataRef.current.franchises = newFranchises;
      localStorage.setItem('kino_franchises', JSON.stringify(newFranchises));
    }
  }, []);

  // 1. INSTANT LOAD: Read from LocalStorage immediately on mount
  useEffect(() => {
    try {
      const storedEntries = localStorage.getItem('kino_entries');
      const storedGenres = localStorage.getItem('kino_genres');
      const storedFranchises = localStorage.getItem('kino_franchises');

      if (storedEntries || storedGenres || storedFranchises) {
        const parsedEntries = storedEntries ? JSON.parse(storedEntries) : [];
        const parsedGenres = storedGenres ? JSON.parse(storedGenres) : [];
        const parsedFranchises = storedFranchises ? JSON.parse(storedFranchises) : [];

        // Only update state directly here to avoid triggering unnecessary saves
        setEntries(parsedEntries);
        setGenres(parsedGenres);
        setFranchises(parsedFranchises);

        latestDataRef.current = {
          entries: parsedEntries,
          genres: parsedGenres,
          franchises: parsedFranchises
        };

        // Drop the loading screen instantly if we have local data
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to parse local cache", error);
    }
  }, []);

  // 2. UNIFIED UPLOAD: Reads purely from the instantaneous Ref
  const triggerUpload = useCallback(() => {
    if (!accessToken) return;

    if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current);
    setSyncStatus('syncing');

    uploadTimeoutRef.current = setTimeout(async () => {
      try {
        const { entries: currentEntries, genres: currentGenres, franchises: currentFranchises } = latestDataRef.current;

        await uploadBackupToDrive(accessToken, {
          entries: currentEntries,
          genres: currentGenres,
          franchises: currentFranchises,
          timestamp: Date.now()
        });

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

  // 3. BACKGROUND SYNC: Fetch from Google Drive on login/mount
  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    if (globalHasFetchedFromDrive) return;

    const fetchFromDrive = async () => {
      try {
        globalHasFetchedFromDrive = true;
        setSyncStatus('syncing');

        const backup = await downloadBackupFromDrive(accessToken) as BackupData | MediaEntry[] | null;

        let fetchedEntries: MediaEntry[] = [];
        let fetchedGenres: Tag[] = [];
        let fetchedFranchises: Tag[] = [];

        if (backup) {
          if (Array.isArray(backup)) {
            // Legacy Array format
            fetchedEntries = backup.map(e => {
              if ((e.type as any) === 'Series') return { ...e, type: 'TV Show' };
              return e;
            });
          } else {
            // New Object format
            fetchedEntries = backup.entries?.map(e => {
              if ((e.type as any) === 'Series') return { ...e, type: 'TV Show' };
              return e;
            }) || [];
            fetchedGenres = backup.genres || [];
            fetchedFranchises = backup.franchises || [];
          }
        }

        // Initialize default genres if Drive is completely empty
        if (fetchedGenres.length === 0) {
          fetchedGenres = DEFAULT_GENRES.map(name => ({ id: crypto.randomUUID(), name }));
        }

        // Overwrite local cache with the absolute truth from the cloud
        updateStateAndRef(fetchedEntries, fetchedGenres, fetchedFranchises);
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        if (error instanceof TokenExpiredError || (error as Error).message?.includes('401')) {
          console.warn("Session expired, logging out...");
          logout(false);
        } else {
          console.error("Failed to sync from Drive", error);
        }
      } finally {
        // Ensure loading is dropped even if the user had an empty local cache
        setIsLoading(false);
      }
    };

    fetchFromDrive();
  }, [accessToken, logout, updateStateAndRef]);

  // --- Entries Methods ---
  const saveEntries = async (newEntries: MediaEntry[]) => {
    updateStateAndRef(newEntries, undefined, undefined);
    triggerUpload();
  };

  const addEntry = async (entry: MediaEntry) => {
    const newEntry = { ...entry, id: entry.id || Date.now(), createdAt: Date.now() };
    const updatedEntries = [newEntry, ...latestDataRef.current.entries];

    updateStateAndRef(updatedEntries, undefined, undefined);
    triggerUpload();
  };

  const updateEntry = async (updatedEntry: MediaEntry) => {
    const updatedEntries = latestDataRef.current.entries.map(e =>
      String(e.id) === String(updatedEntry.id) ? updatedEntry : e
    );

    updateStateAndRef(updatedEntries, undefined, undefined);
    triggerUpload();
  };

  const deleteEntry = async (id: number) => {
    const updatedEntries = latestDataRef.current.entries.filter(e => String(e.id) !== String(id));

    updateStateAndRef(updatedEntries, undefined, undefined);
    triggerUpload();
  };

  // --- Tag/Dictionary Methods ---
  const saveGenres = (newGenres: Tag[]) => {
    updateStateAndRef(undefined, newGenres, undefined);
    triggerUpload();
  };

  const saveFranchises = (newFranchises: Tag[]) => {
    updateStateAndRef(undefined, undefined, newFranchises);
    triggerUpload();
  };

  return {
    entries,
    isLoading,
    addEntry,
    updateEntry,
    deleteEntry,
    genres,
    setGenres: saveGenres,
    franchises,
    setFranchises: saveFranchises,
    syncStatus,
    batchUpdateEntries: saveEntries
  };
}