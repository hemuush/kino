// src/context/MediaContext.tsx
"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { MediaEntry, Tag, DEFAULT_GENRES, MediaType } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { TokenExpiredError, downloadBackupFromDrive, uploadBackupToDrive, deleteBackupFromDrive, BackupData } from '@/lib/googleDrive';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface MediaContextType {
  entries: MediaEntry[];
  isLoading: boolean;
  addEntry: (entry: MediaEntry) => Promise<void>;
  updateEntry: (entry: MediaEntry) => Promise<void>;
  deleteEntry: (id: number | string) => Promise<void>;
  genres: Tag[];
  setGenres: (genres: Tag[]) => void;
  franchises: Tag[];
  setFranchises: (franchises: Tag[]) => void;
  syncStatus: SyncStatus;
  batchUpdateEntries: (entries: MediaEntry[]) => Promise<void>;
  wipeAllData: () => Promise<void>;
  importData: (data: { entries?: MediaEntry[], genres?: Tag[], franchises?: Tag[] }) => Promise<void>;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export function MediaProvider({ children }: { children: ReactNode }) {
  const { accessToken, logout } = useAuth();

  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [genres, setGenres] = useState<Tag[]>([]);
  const [franchises, setFranchises] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<{ entries: MediaEntry[]; genres: Tag[]; franchises: Tag[]; }>({ entries: [], genres: [], franchises: [] });
  const hasFetchedFromDriveRef = useRef<boolean>(false);
  const cacheCorruptedRef = useRef<boolean>(false);

  // BUG 3 FIX: Prevent tab closure data loss during debounce queue
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warn only when there is a pending local upload debounce queue.
      // Do not warn during background download/initial sync reads.
      if (uploadTimeoutRef.current) {
        e.preventDefault();
        e.returnValue = 'Data is currently saving to Google Drive. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [syncStatus]);

  const updateStateAndRef = useCallback((newEntries?: MediaEntry[], newGenres?: Tag[], newFranchises?: Tag[]) => {
    if (newEntries) { setEntries(newEntries); latestDataRef.current.entries = newEntries; localStorage.setItem('kino_entries', JSON.stringify(newEntries)); }
    if (newGenres) { setGenres(newGenres); latestDataRef.current.genres = newGenres; localStorage.setItem('kino_genres', JSON.stringify(newGenres)); }
    if (newFranchises) { setFranchises(newFranchises); latestDataRef.current.franchises = newFranchises; localStorage.setItem('kino_franchises', JSON.stringify(newFranchises)); }
    localStorage.setItem('kino_timestamp', Date.now().toString());
  }, []);

  useEffect(() => {
    try {
      const storedEntries = localStorage.getItem('kino_entries');
      const storedGenres = localStorage.getItem('kino_genres');
      const storedFranchises = localStorage.getItem('kino_franchises');
      if (storedEntries || storedGenres || storedFranchises) {
        const parsedEntries = storedEntries ? JSON.parse(storedEntries) : [];
        const parsedGenres = storedGenres ? JSON.parse(storedGenres) : [];
        const parsedFranchises = storedFranchises ? JSON.parse(storedFranchises) : [];
        setEntries(parsedEntries); setGenres(parsedGenres); setFranchises(parsedFranchises);
        latestDataRef.current = { entries: parsedEntries, genres: parsedGenres, franchises: parsedFranchises };
      }
    } catch (error) {
      console.error("Failed to parse local cache, flagging as corrupted", error);
      cacheCorruptedRef.current = true;
    }
  }, []);

  const triggerUpload = useCallback(() => {
    if (!accessToken) return;
    if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current);
    setSyncStatus('syncing');
    uploadTimeoutRef.current = setTimeout(async () => {
      try {
        const { entries: currentEntries, genres: currentGenres, franchises: currentFranchises } = latestDataRef.current;
        await uploadBackupToDrive(accessToken, { entries: currentEntries, genres: currentGenres, franchises: currentFranchises, timestamp: Date.now() });
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        if (error instanceof TokenExpiredError || (error as Error).message?.includes('401')) {
          console.warn("Session expired");
          logout(false);
        }
      } finally {
        uploadTimeoutRef.current = null;
      }
    }, 1000);
  }, [accessToken, logout]);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      hasFetchedFromDriveRef.current = false;
      return;
    }

    if (hasFetchedFromDriveRef.current) return;

    const fetchFromDrive = async () => {
      setIsLoading(true);
      try {
        hasFetchedFromDriveRef.current = true;
        setSyncStatus('syncing');
        const backup = await downloadBackupFromDrive(accessToken) as BackupData | MediaEntry[] | null;
        let fetchedEntries: MediaEntry[] = [];
        let fetchedGenres: Tag[] = [];
        let fetchedFranchises: Tag[] = [];

        if (backup) {
          if (Array.isArray(backup)) {
            fetchedEntries = backup.map(e => { if (e.type === ('Series' as unknown as MediaType)) return { ...e, type: 'TV Show' }; return e; });
          } else {
            fetchedEntries = backup.entries?.map(e => { if (e.type === ('Series' as unknown as MediaType)) return { ...e, type: 'TV Show' }; return e; }) || [];
            fetchedGenres = backup.genres || [];
            fetchedFranchises = backup.franchises || [];
          }
        }

        const cloudTimestamp = backup && 'timestamp' in backup && typeof backup.timestamp === 'number' ? backup.timestamp : 0;
        const localTimestamp = parseInt(localStorage.getItem('kino_timestamp') || '0', 10);

        if (localTimestamp > cloudTimestamp && !cacheCorruptedRef.current) {
          triggerUpload();
        } else {
          if (fetchedGenres.length === 0) {
            fetchedGenres = DEFAULT_GENRES.map(name => ({ id: crypto.randomUUID(), name }));
          }
          updateStateAndRef(fetchedEntries, fetchedGenres, fetchedFranchises);
        }
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        if (error instanceof TokenExpiredError || (error as Error).message?.includes('401')) {
          logout(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchFromDrive();
  }, [accessToken, logout, triggerUpload, updateStateAndRef]);

  const batchUpdateEntries = async (updatedEntries: MediaEntry[]) => {
    const newEntries = latestDataRef.current.entries.map(e => {
      const updated = updatedEntries.find(ue => String(ue.id) === String(e.id));
      return updated || e;
    });
    updateStateAndRef(newEntries, undefined, undefined);
    triggerUpload();
  };

  const importData = async (data: { entries?: MediaEntry[], genres?: Tag[], franchises?: Tag[] }) => {
    const mergedEntries = [...latestDataRef.current.entries];
    const mergedGenres = [...latestDataRef.current.genres];
    const mergedFranchises = [...latestDataRef.current.franchises];
    let hasChanges = false;

    if (data.genres && data.genres.length > 0) {
      hasChanges = true;
      data.genres.forEach(imported => {
        const existing = mergedGenres.find(g => g.id === imported.id || g.name.toLowerCase() === imported.name.toLowerCase());
        if (!existing) mergedGenres.push({ ...imported, id: imported.id || crypto.randomUUID() });
      });
    }

    if (data.franchises && data.franchises.length > 0) {
      hasChanges = true;
      data.franchises.forEach(imported => {
        const existing = mergedFranchises.find(f => f.id === imported.id || f.name.toLowerCase() === imported.name.toLowerCase());
        if (!existing) mergedFranchises.push({ ...imported, id: imported.id || crypto.randomUUID() });
      });
    }

    if (data.entries && data.entries.length > 0) {
      hasChanges = true;

      let maxId = mergedEntries.reduce((max, e) => {
        const numId = parseInt(String(e.id), 10);
        return Math.max(max, isNaN(numId) ? 0 : numId);
      }, Date.now());

      data.entries.forEach(imported => {
        const entryToSave = { ...imported };

        if (entryToSave.genre && Array.isArray(entryToSave.genre)) {
          const mappedGenreIds: string[] = [];
          entryToSave.genre.forEach(genreName => {
            if (typeof genreName !== 'string') return;
            let existingGenre = mergedGenres.find(g => g.name.toLowerCase() === genreName.toLowerCase());
            if (!existingGenre) {
              existingGenre = { id: crypto.randomUUID(), name: genreName };
              mergedGenres.push(existingGenre);
            }
            mappedGenreIds.push(existingGenre.id);
          });
          entryToSave.genreIds = [...new Set([...(entryToSave.genreIds || []), ...mappedGenreIds])];
          delete entryToSave.genre;
        }

        if (entryToSave.franchise && typeof entryToSave.franchise === 'string') {
          let existingFranchise = mergedFranchises.find(f => f.name.toLowerCase() === entryToSave.franchise!.toLowerCase());
          if (!existingFranchise) {
            existingFranchise = { id: crypto.randomUUID(), name: entryToSave.franchise };
            mergedFranchises.push(existingFranchise);
          }
          entryToSave.franchiseId = existingFranchise.id;
          delete entryToSave.franchise;
        }

        let existingIndex = -1;
        if (entryToSave.id) {
          existingIndex = mergedEntries.findIndex(e => String(e.id) === String(entryToSave.id));
        }

        if (existingIndex === -1 && entryToSave.title) {
          existingIndex = mergedEntries.findIndex(e => e.title.toLowerCase() === entryToSave.title.toLowerCase());
        }

        if (existingIndex >= 0) {
          mergedEntries[existingIndex] = {
            ...mergedEntries[existingIndex],
            ...entryToSave,
            id: mergedEntries[existingIndex].id,
            updatedAt: Date.now()
          };
        } else {
          maxId++;
          mergedEntries.unshift({ ...entryToSave, id: entryToSave.id || maxId, createdAt: entryToSave.createdAt || Date.now() });
        }
      });
    }

    if (hasChanges) {
      updateStateAndRef(mergedEntries, mergedGenres, mergedFranchises);
      triggerUpload();
    }
  };

  const addEntry = async (entry: MediaEntry) => {
    const newEntry = { ...entry, id: entry.id || Date.now(), createdAt: Date.now() };
    const updatedEntries = [newEntry, ...latestDataRef.current.entries];
    updateStateAndRef(updatedEntries, undefined, undefined);
    triggerUpload();
  };

  const updateEntry = async (updatedEntry: MediaEntry) => {
    const updatedEntries = latestDataRef.current.entries.map(e => String(e.id) === String(updatedEntry.id) ? updatedEntry : e);
    updateStateAndRef(updatedEntries, undefined, undefined);
    triggerUpload();
  };

  const deleteEntry = async (id: number | string) => {
    const updatedEntries = latestDataRef.current.entries.filter(e => String(e.id) !== String(id));
    updateStateAndRef(updatedEntries, undefined, undefined);
    triggerUpload();
  };

  const saveGenres = (newGenres: Tag[]) => {
    updateStateAndRef(undefined, newGenres, undefined);
    triggerUpload();
  };

  const saveFranchises = (newFranchises: Tag[]) => {
    updateStateAndRef(undefined, undefined, newFranchises);
    triggerUpload();
  };

  const wipeAllData = async () => {
    if (!accessToken) return;
    try {
      setSyncStatus('syncing');
      await deleteBackupFromDrive(accessToken);
    } catch (error) {
      setSyncStatus('error');
      console.error(error);
    }
    localStorage.removeItem('kino_entries');
    localStorage.removeItem('kino_genres');
    localStorage.removeItem('kino_franchises');
    localStorage.removeItem('kino_timestamp');
    const emptyGenres = DEFAULT_GENRES.map(name => ({ id: crypto.randomUUID(), name }));
    setEntries([]);
    setGenres(emptyGenres);
    setFranchises([]);
    latestDataRef.current = { entries: [], genres: emptyGenres, franchises: [] };
    setSyncStatus('idle');
  };

  return (
    <MediaContext.Provider value={{
      entries, isLoading, addEntry, updateEntry, deleteEntry, genres, setGenres: saveGenres, franchises, setFranchises: saveFranchises, syncStatus, batchUpdateEntries, wipeAllData, importData
    }}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMedia(): MediaContextType {
  const context = useContext(MediaContext);
  if (context === undefined) { throw new Error('useMedia must be used within a MediaProvider'); }
  return context;
}
