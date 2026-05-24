// src/context/MediaContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { MediaEntry, Tag, DEFAULT_GENRES } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { TokenExpiredError, downloadBackupFromDrive, uploadBackupToDrive, deleteBackupFromDrive, BackupData } from '@/lib/googleDrive';

interface MediaContextType {
  entries: MediaEntry[];
  isLoading: boolean;
  addEntry: (entry: MediaEntry) => Promise<void>;
  updateEntry: (entry: MediaEntry) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  genres: Tag[];
  setGenres: (genres: Tag[]) => void;
  franchises: Tag[];
  setFranchises: (franchises: Tag[]) => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  batchUpdateEntries: (entries: MediaEntry[]) => Promise<void>;
  wipeAllData: () => Promise<void>;
  importData: (data: { entries?: MediaEntry[], genres?: Tag[], franchises?: Tag[] }) => Promise<void>;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

let globalHasFetchedFromDrive = false;

export function MediaProvider({ children }: { children: ReactNode }) {
  const { accessToken, logout } = useAuth();

  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [genres, setGenres] = useState<Tag[]>([]);
  const [franchises, setFranchises] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<{ entries: MediaEntry[]; genres: Tag[]; franchises: Tag[]; }>({ entries: [], genres: [], franchises: [] });

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
        setIsLoading(false);
      }
    } catch (error) { console.error("Failed to parse local cache", error); }
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
        if (error instanceof TokenExpiredError || (error as Error).message?.includes('401')) { console.warn("Session expired"); logout(false); }
      }
    }, 10);
  }, [accessToken, logout]);

  useEffect(() => {
    if (!accessToken) { setIsLoading(false); return; }
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
            fetchedEntries = backup.map(e => { if ((e.type as any) === 'Series') return { ...e, type: 'TV Show' }; return e; });
          } else {
            fetchedEntries = backup.entries?.map(e => { if ((e.type as any) === 'Series') return { ...e, type: 'TV Show' }; return e; }) || [];
            fetchedGenres = backup.genres || [];
            fetchedFranchises = backup.franchises || [];
          }
        }
        const cloudTimestamp = backup && 'timestamp' in backup ? (backup as any).timestamp : 0;
        const localTimestamp = parseInt(localStorage.getItem('kino_timestamp') || '0', 10);

        if (localTimestamp > cloudTimestamp) {
          triggerUpload();
          return;
        }

        if (fetchedGenres.length === 0) { fetchedGenres = DEFAULT_GENRES.map(name => ({ id: crypto.randomUUID(), name })); }

        updateStateAndRef(fetchedEntries, fetchedGenres, fetchedFranchises);
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        if (error instanceof TokenExpiredError || (error as Error).message?.includes('401')) { logout(false); }
      } finally { setIsLoading(false); }
    };
    fetchFromDrive();
  }, [accessToken, logout, updateStateAndRef]);

  const batchUpdateEntries = async (updatedEntries: MediaEntry[]) => {
    const newEntries = latestDataRef.current.entries.map(e => {
      const updated = updatedEntries.find(ue => String(ue.id) === String(e.id));
      return updated || e;
    });
    updateStateAndRef(newEntries, undefined, undefined);
    triggerUpload();
  };

  const importData = async (data: { entries?: MediaEntry[], genres?: Tag[], franchises?: Tag[] }) => {
    let mergedEntries = [...latestDataRef.current.entries];
    let mergedGenres = [...latestDataRef.current.genres];
    let mergedFranchises = [...latestDataRef.current.franchises];
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
      let maxId = mergedEntries.reduce((max, e) => Math.max(max, Number(e.id) || 0), Date.now());

      data.entries.forEach(imported => {
        let entryToSave = { ...imported };

        // Smart Genre Mapping
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

        // Smart Franchise Mapping
        if (entryToSave.franchise && typeof entryToSave.franchise === 'string') {
          let existingFranchise = mergedFranchises.find(f => f.name.toLowerCase() === entryToSave.franchise!.toLowerCase());
          if (!existingFranchise) {
            existingFranchise = { id: crypto.randomUUID(), name: entryToSave.franchise };
            mergedFranchises.push(existingFranchise);
          }
          entryToSave.franchiseId = existingFranchise.id;
          delete entryToSave.franchise;
        }

        // Smart ID & Title Merging Logic
        let existingIndex = -1;

        if (entryToSave.id) {
          existingIndex = mergedEntries.findIndex(e => String(e.id) === String(entryToSave.id));
        }

        // Fallback to searching by Title (case-insensitive) if ID didn't match or wasn't provided
        if (existingIndex === -1 && entryToSave.title) {
          existingIndex = mergedEntries.findIndex(e => e.title.toLowerCase() === entryToSave.title.toLowerCase());
        }

        if (existingIndex >= 0) {
          // OVERWRITE: Merge new data into existing data based on Title or ID match
          mergedEntries[existingIndex] = {
            ...mergedEntries[existingIndex],
            ...entryToSave,
            id: mergedEntries[existingIndex].id, // Ensure we don't accidentally wipe the ID if matching by title
            updatedAt: Date.now()
          };
        } else {
          // CREATE NEW
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

  const addEntry = async (entry: MediaEntry) => { const newEntry = { ...entry, id: entry.id || Date.now(), createdAt: Date.now() }; const updatedEntries = [newEntry, ...latestDataRef.current.entries]; updateStateAndRef(updatedEntries, undefined, undefined); triggerUpload(); };
  const updateEntry = async (updatedEntry: MediaEntry) => { const updatedEntries = latestDataRef.current.entries.map(e => String(e.id) === String(updatedEntry.id) ? updatedEntry : e); updateStateAndRef(updatedEntries, undefined, undefined); triggerUpload(); };
  const deleteEntry = async (id: number) => { const updatedEntries = latestDataRef.current.entries.filter(e => String(e.id) !== String(id)); updateStateAndRef(updatedEntries, undefined, undefined); triggerUpload(); };
  const saveGenres = (newGenres: Tag[]) => { updateStateAndRef(undefined, newGenres, undefined); triggerUpload(); };
  const saveFranchises = (newFranchises: Tag[]) => { updateStateAndRef(undefined, undefined, newFranchises); triggerUpload(); };

  const wipeAllData = async () => {
    if (!accessToken) return;
    try { setSyncStatus('syncing'); await deleteBackupFromDrive(accessToken); } catch (error) { setSyncStatus('error'); }
    localStorage.removeItem('kino_entries'); localStorage.removeItem('kino_genres'); localStorage.removeItem('kino_franchises'); localStorage.removeItem('kino_timestamp');
    const emptyGenres = DEFAULT_GENRES.map(name => ({ id: crypto.randomUUID(), name }));
    setEntries([]); setGenres(emptyGenres); setFranchises([]);
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

export function useMedia() {
  const context = useContext(MediaContext);
  if (context === undefined) { throw new Error('useMedia must be used within a MediaProvider'); }
  return context;
}