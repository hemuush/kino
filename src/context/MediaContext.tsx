// src/context/MediaContext.tsx
"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
import { MediaEntry, Tag, JournalEntry, DEFAULT_GENRES, normalizeMediaType, normalizeWatchStatus } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { TokenExpiredError, downloadBackupFromDrive, uploadBackupToDrive, deleteBackupFromDrive, getBackupMetadataFromDrive, BackupData } from '@/lib/googleDrive';
import { toast } from 'sonner';

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
  journal: JournalEntry[];
  addJournalEntry: (date: string, text: string) => Promise<void>;
  updateJournalEntry: (id: string, updates: { date?: string; text?: string }) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  batchUpdateEntries: (entries: MediaEntry[]) => Promise<void>;
  wipeAllData: () => Promise<void>;
  importData: (data: { entries?: MediaEntry[], genres?: Tag[], franchises?: Tag[], journal?: JournalEntry[] }) => Promise<void>;
  forceSync: () => Promise<void>;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export function MediaProvider({ children }: { children: ReactNode }) {
  const { accessToken, logout } = useAuth();

  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [genres, setGenres] = useState<Tag[]>([]);
  const [franchises, setFranchises] = useState<Tag[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef<{ entries: MediaEntry[]; genres: Tag[]; franchises: Tag[]; journal: JournalEntry[]; }>({ entries: [], genres: [], franchises: [], journal: [] });
  const hasFetchedFromDriveRef = useRef<boolean>(false);
  // True once this session has legitimately observed non-empty data — let uploadBackupToDrive's
  // empty-state guards tell "the user really did delete everything" apart from "local state
  // never actually loaded." hasSeenRealEntriesRef is the critical one (protects the irrecoverable
  // chunk files) and must only flip true for real entries, never for e.g. the default genre seed
  // a fresh load applies regardless — see googleDrive.ts for why that distinction matters.
  const hasSeenRealEntriesRef = useRef<boolean>(false);
  const hasSeenRealDataRef = useRef<boolean>(false);

  // Warn before unload when upload is pending
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploadTimeoutRef.current) {
        e.preventDefault();
        e.returnValue = 'Data is currently saving to Google Drive. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [syncStatus]);

  // updateStateAndRef: immediately write to React state
  const updateStateAndRef = useCallback((newEntries?: MediaEntry[], newGenres?: Tag[], newFranchises?: Tag[], newJournal?: JournalEntry[]) => {
    if (newEntries !== undefined) {
      setEntries(newEntries);
      latestDataRef.current.entries = newEntries;
      if (newEntries.length > 0) {
        hasSeenRealEntriesRef.current = true;
        hasSeenRealDataRef.current = true;
      }
    }
    if (newGenres !== undefined) {
      setGenres(newGenres);
      latestDataRef.current.genres = newGenres;
      if (newGenres.length > 0) hasSeenRealDataRef.current = true;
    }
    if (newFranchises !== undefined) {
      setFranchises(newFranchises);
      latestDataRef.current.franchises = newFranchises;
      if (newFranchises.length > 0) hasSeenRealDataRef.current = true;
    }
    if (newJournal !== undefined) {
      setJournal(newJournal);
      latestDataRef.current.journal = newJournal;
    }
  }, []);

  // Load defaults on mount if needed
  useEffect(() => {
    // Wait for auth to fetch from cloud.
  }, []);

  // triggerUpload: debounced Drive upload after every mutation
  const triggerUpload = useCallback((silent = false) => {
    if (!accessToken) return;
    if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current);
    setSyncStatus('syncing');
    uploadTimeoutRef.current = setTimeout(async () => {
      try {
        const { entries: currentEntries, genres: currentGenres, franchises: currentFranchises, journal: currentJournal } = latestDataRef.current;
        await uploadBackupToDrive(accessToken, {
          entries: currentEntries,
          genres: currentGenres,
          franchises: currentFranchises,
          journal: currentJournal,
          timestamp: Date.now()
        }, { trustEmptyEntries: hasSeenRealEntriesRef.current, trustEmptyState: hasSeenRealDataRef.current });
        setSyncStatus('synced');
        setLastSyncedAt(Date.now());
        // Drive upload successful
        if (!silent) {
          // Update drive size cache
        }
      } catch (error) {
        setSyncStatus('error');
        if (error instanceof TokenExpiredError || (error as Error).message?.includes('401')) {
          console.warn("Session expired during sync");
          logout(false);
        } else if ((error as Error).message?.startsWith('Refusing to sync')) {
          console.error("Drive sync blocked by safety guard:", error);
          toast.error("Sync paused to protect your data", {
            description: "Your library may not have finished loading. Refresh the page before making more changes.",
            duration: 8000,
          });
        } else {
          console.error("Drive sync error:", error);
        }
      } finally {
        uploadTimeoutRef.current = null;
      }
    }, 800);
  }, [accessToken, logout]);

  // Fetch from Drive on auth, but load from IDB first for instant rendering
  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      hasFetchedFromDriveRef.current = false;
      return;
    }

    if (hasFetchedFromDriveRef.current) return;

    const fetchFromDrive = async () => {
      if (latestDataRef.current.entries.length === 0) {
        setIsLoading(true); // Must block until Drive fetches
      }

      try {
        hasFetchedFromDriveRef.current = true;
        setSyncStatus('syncing');
        const backup = await downloadBackupFromDrive(
          accessToken,
          (chunkEntries, isFirst) => {
            if (isFirst) {
              updateStateAndRef(chunkEntries, undefined, undefined);
              setIsLoading(false);
            } else {
              // Append to existing
              const newEntries = [...latestDataRef.current.entries, ...chunkEntries];
              updateStateAndRef(newEntries, undefined, undefined);
            }
          },
          (images) => {
            // Hydrate images into current state without waiting for everything
            const updated = latestDataRef.current.entries.map(e => {
              if (images[String(e.id)]) {
                return { ...e, coverImage: images[String(e.id)] };
              }
              return e;
            });
            updateStateAndRef(updated, undefined, undefined);
          }
        ) as BackupData | MediaEntry[] | null;
        
        let fetchedEntries: MediaEntry[] = [];
        let fetchedGenres: Tag[] = [];
        let fetchedFranchises: Tag[] = [];
        let fetchedJournal: JournalEntry[] = [];

        if (backup) {
          if (Array.isArray(backup)) {
            fetchedEntries = backup.map(e => ({ ...e, type: normalizeMediaType(e.type), status: normalizeWatchStatus(e.status) }));
          } else {
            fetchedEntries = backup.entries?.map(e => ({ ...e, type: normalizeMediaType(e.type), status: normalizeWatchStatus(e.status) })) || [];
            fetchedGenres = backup.genres || [];
            fetchedFranchises = backup.franchises || [];
            fetchedJournal = backup.journal || [];
          }
        }

        const cloudTimestamp = backup && 'timestamp' in backup && typeof backup.timestamp === 'number' ? backup.timestamp : 0;

        if (backup) {
          // Drive data exists — use Drive data
          if (fetchedGenres.length === 0) {
            fetchedGenres = DEFAULT_GENRES.map(name => ({ id: crypto.randomUUID(), name }));
          }
          // Use Drive data entirely
          // Note: fetchedEntries is already hydrated, we overwrite to ensure consistency with genres/franchises
          updateStateAndRef(fetchedEntries, fetchedGenres, fetchedFranchises, fetchedJournal);
          if (cloudTimestamp > 0) setLastSyncedAt(cloudTimestamp);
        } else {
          // No drive data, keep local data, ensure genres exist
          if (latestDataRef.current.genres.length === 0) {
            const defaultGenres = DEFAULT_GENRES.map(name => ({ id: crypto.randomUUID(), name }));
            updateStateAndRef(undefined, defaultGenres, undefined);
          }
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
  }, [accessToken, logout, updateStateAndRef]);

  const forceSync = useCallback(async () => {
    if (!accessToken) return;
    setSyncStatus('syncing');
    try {
      await uploadBackupToDrive(accessToken, {
        entries: latestDataRef.current.entries,
        genres: latestDataRef.current.genres,
        franchises: latestDataRef.current.franchises,
        journal: latestDataRef.current.journal,
        timestamp: Date.now()
      }, { trustEmptyEntries: hasSeenRealEntriesRef.current, trustEmptyState: hasSeenRealDataRef.current });
      setSyncStatus('synced');
      setLastSyncedAt(Date.now());
      toast.success("Successfully synchronized to Drive.");
    } catch (error) {
      setSyncStatus('error');
      if ((error as Error).message?.startsWith('Refusing to sync')) {
        toast.error("Sync paused to protect your data", {
          description: "Your library may not have finished loading. Refresh the page before forcing a sync.",
          duration: 8000,
        });
      } else {
        toast.error("Failed to sync to Drive.");
      }
    }
  }, [accessToken]);

  // Cross-device Sync: Listen for window focus to check if another device updated the library
  useEffect(() => {
    if (!accessToken || !lastSyncedAt) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const metadata = await getBackupMetadataFromDrive(accessToken);
          if (metadata && metadata.modifiedTime) {
            const driveModified = new Date(metadata.modifiedTime).getTime();
            if (driveModified > lastSyncedAt + 30000) {
              setSyncStatus('syncing');
              const backup = await downloadBackupFromDrive(accessToken) as BackupData | MediaEntry[] | null;
              if (backup) {
                let fetchedEntries = [];
                let fetchedGenres: Tag[] = [];
                let fetchedFranchises: Tag[] = [];
                let fetchedJournal: JournalEntry[] = [];
                if (Array.isArray(backup)) {
                  fetchedEntries = backup.map(e => ({ ...e, type: normalizeMediaType(e.type), status: normalizeWatchStatus(e.status) }));
                } else {
                  fetchedEntries = backup.entries?.map(e => ({ ...e, type: normalizeMediaType(e.type), status: normalizeWatchStatus(e.status) })) || [];
                  fetchedGenres = backup.genres || [];
                  fetchedFranchises = backup.franchises || [];
                  fetchedJournal = backup.journal || [];
                }
                updateStateAndRef(fetchedEntries, fetchedGenres, fetchedFranchises, fetchedJournal);
                setLastSyncedAt(Date.now());
                toast.success("Library updated from another device");
              }
              setSyncStatus('synced');
            }
          }
        } catch (e) {
          console.warn("Visibility sync failed", e);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [accessToken, lastSyncedAt, updateStateAndRef]);

  const batchUpdateEntries = useCallback(async (updatedEntries: MediaEntry[]) => {
    const newEntries = latestDataRef.current.entries.map(e => {
      const updated = updatedEntries.find(ue => String(ue.id) === String(e.id));
      return updated || e;
    });
    updateStateAndRef(newEntries, undefined, undefined);
    triggerUpload(true);
  }, [updateStateAndRef, triggerUpload]);

  const importData = useCallback(async (data: { entries?: MediaEntry[], genres?: Tag[], franchises?: Tag[], journal?: JournalEntry[] }) => {
    const mergedEntries = [...latestDataRef.current.entries];
    const mergedGenres = [...latestDataRef.current.genres];
    const mergedFranchises = [...latestDataRef.current.franchises];
    const mergedJournal = [...latestDataRef.current.journal];
    let hasChanges = false;

    if (data.journal && data.journal.length > 0) {
      hasChanges = true;
      data.journal.forEach(imported => {
        const existingIndex = mergedJournal.findIndex(j => j.id === imported.id);
        if (existingIndex >= 0) {
          mergedJournal[existingIndex] = { ...mergedJournal[existingIndex], ...imported };
        } else {
          mergedJournal.push({ ...imported, id: imported.id || crypto.randomUUID() });
        }
      });
    }

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
        const entryToSave: MediaEntry = {
          ...imported,
          type: normalizeMediaType(imported.type),
          animeType: normalizeMediaType(imported.type) === 'Anime' ? (imported.animeType || 'Show') : undefined,
          status: normalizeWatchStatus(imported.status),
          coverImage: imported.coverImage || '',
          rating: Number(imported.rating || 0),
          createdAt: imported.createdAt || Date.now(),
        };

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
          const existingEntry = mergedEntries[existingIndex];
          mergedEntries[existingIndex] = {
            ...existingEntry,
            ...entryToSave,
            id: existingEntry.id,
            coverImage: entryToSave.coverImage || existingEntry.coverImage || '',
            createdAt: existingEntry.createdAt || entryToSave.createdAt || Date.now(),
            updatedAt: Date.now()
          };
        } else {
          maxId++;
          mergedEntries.unshift({ ...entryToSave, id: entryToSave.id || maxId, createdAt: entryToSave.createdAt || Date.now() });
        }
      });
    }

    if (hasChanges) {
      updateStateAndRef(mergedEntries, mergedGenres, mergedFranchises, mergedJournal);
      triggerUpload();
      toast.success(`Import complete! ${data.entries?.length || 0} entries processed.`);
    }
  }, [updateStateAndRef, triggerUpload]);

  const addEntry = useCallback(async (entry: MediaEntry) => {
    const newEntry = { ...entry, id: entry.id || Date.now(), createdAt: Date.now() };
    const updatedEntries = [newEntry, ...latestDataRef.current.entries];
    updateStateAndRef(updatedEntries, undefined, undefined);
    triggerUpload();
  }, [updateStateAndRef, triggerUpload]);

  const updateEntry = useCallback(async (updatedEntry: MediaEntry) => {
    const updatedEntries = latestDataRef.current.entries.map(e =>
      String(e.id) === String(updatedEntry.id) ? { ...updatedEntry, updatedAt: Date.now() } : e
    );
    updateStateAndRef(updatedEntries, undefined, undefined);
    triggerUpload();
  }, [updateStateAndRef, triggerUpload]);

  const deleteEntry = useCallback(async (id: number | string) => {
    const updatedEntries = latestDataRef.current.entries.filter(e => String(e.id) !== String(id));
    updateStateAndRef(updatedEntries, undefined, undefined);
    triggerUpload();
  }, [updateStateAndRef, triggerUpload]);

  const saveGenres = useCallback((newGenres: Tag[]) => {
    updateStateAndRef(undefined, newGenres, undefined);
    triggerUpload(true);
  }, [updateStateAndRef, triggerUpload]);

  const saveFranchises = useCallback((newFranchises: Tag[]) => {
    updateStateAndRef(undefined, undefined, newFranchises);
    triggerUpload(true);
  }, [updateStateAndRef, triggerUpload]);

  const addJournalEntry = useCallback(async (date: string, text: string) => {
    const newEntry: JournalEntry = { id: crypto.randomUUID(), date, text, createdAt: Date.now() };
    const updatedJournal = [newEntry, ...latestDataRef.current.journal];
    updateStateAndRef(undefined, undefined, undefined, updatedJournal);
    triggerUpload();
  }, [updateStateAndRef, triggerUpload]);

  const updateJournalEntry = useCallback(async (id: string, updates: { date?: string; text?: string }) => {
    const updatedJournal = latestDataRef.current.journal.map(j =>
      j.id === id ? { ...j, ...updates, updatedAt: Date.now() } : j
    );
    updateStateAndRef(undefined, undefined, undefined, updatedJournal);
    triggerUpload();
  }, [updateStateAndRef, triggerUpload]);

  const deleteJournalEntry = useCallback(async (id: string) => {
    const updatedJournal = latestDataRef.current.journal.filter(j => j.id !== id);
    updateStateAndRef(undefined, undefined, undefined, updatedJournal);
    triggerUpload();
  }, [updateStateAndRef, triggerUpload]);

  const wipeAllData = useCallback(async () => {
    if (!accessToken) return;
    try {
      setSyncStatus('syncing');
      await deleteBackupFromDrive(accessToken);
    } catch (error) {
      setSyncStatus('error');
      console.error(error);
    }

    const emptyGenres = DEFAULT_GENRES.map(name => ({ id: crypto.randomUUID(), name }));
    setEntries([]);
    setGenres(emptyGenres);
    setFranchises([]);
    setJournal([]);
    latestDataRef.current = { entries: [], genres: emptyGenres, franchises: [], journal: [] };
    setLastSyncedAt(null);
    setSyncStatus('idle');
  }, [accessToken]);

  const contextValue = useMemo(() => ({
    entries, isLoading, addEntry, updateEntry, deleteEntry,
    genres, setGenres: saveGenres,
    franchises, setFranchises: saveFranchises,
    journal, addJournalEntry, updateJournalEntry, deleteJournalEntry,
    syncStatus, lastSyncedAt,
    batchUpdateEntries, wipeAllData, importData, forceSync
  }), [entries, isLoading, addEntry, updateEntry, deleteEntry, genres, saveGenres, franchises, saveFranchises, journal, addJournalEntry, updateJournalEntry, deleteJournalEntry, syncStatus, lastSyncedAt, batchUpdateEntries, wipeAllData, importData, forceSync]);

  return (
    <MediaContext.Provider value={contextValue}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMedia(): MediaContextType {
  const context = useContext(MediaContext);
  if (context === undefined) { throw new Error('useMedia must be used within a MediaProvider'); }
  return context;
}
