"use client";

import { useState, useEffect } from 'react';
import { MediaEntry, Tag, DEFAULT_GENRES } from '@/lib/db';

export function useMedia() {
  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [genres, setGenres] = useState<Tag[]>([]);
  const [franchises, setFranchises] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load and Migrate Data
  useEffect(() => {
    try {
      const storedEntries = localStorage.getItem('kino_entries');
      const storedGenres = localStorage.getItem('kino_genres');
      const storedFranchises = localStorage.getItem('kino_franchises');

      let parsedEntries: MediaEntry[] = storedEntries ? JSON.parse(storedEntries) : [];
      let parsedGenres: Tag[] = storedGenres ? JSON.parse(storedGenres) : [];
      let parsedFranchises: Tag[] = storedFranchises ? JSON.parse(storedFranchises) : [];

      // Initialize default genres if absolutely empty
      if (parsedGenres.length === 0) {
        parsedGenres = DEFAULT_GENRES.map(name => ({
          id: crypto.randomUUID(),
          name
        }));
      }

      // Auto-Migration: Convert old string tags to ID-based entities
      let needsSave = false;
      parsedEntries = parsedEntries.map(entry => {
        let modified = false;

        // Migrate Genres
        if (entry.genre && entry.genre.length > 0 && (!entry.genreIds || entry.genreIds.length === 0)) {
          const newGenreIds: string[] = [];
          entry.genre.forEach(gName => {
            let existing = parsedGenres.find(g => g.name.toLowerCase() === gName.toLowerCase());
            if (!existing) {
              existing = { id: crypto.randomUUID(), name: gName };
              parsedGenres.push(existing);
            }
            newGenreIds.push(existing.id);
          });
          entry.genreIds = newGenreIds;
          delete entry.genre; // Clean up old data
          modified = true;
        }

        // Migrate Franchises
        if (entry.franchise && !entry.franchiseId) {
          let existing = parsedFranchises.find(f => f.name.toLowerCase() === entry.franchise?.toLowerCase());
          if (!existing) {
            existing = { id: crypto.randomUUID(), name: entry.franchise };
            parsedFranchises.push(existing);
          }
          entry.franchiseId = existing.id;
          delete entry.franchise;
          modified = true;
        }

        if (modified) needsSave = true;
        return entry;
      });

      setGenres(parsedGenres);
      setFranchises(parsedFranchises);
      setEntries(parsedEntries);

      if (needsSave || !storedGenres) {
        localStorage.setItem('kino_entries', JSON.stringify(parsedEntries));
        localStorage.setItem('kino_genres', JSON.stringify(parsedGenres));
        localStorage.setItem('kino_franchises', JSON.stringify(parsedFranchises));
      }
    } catch (error) {
      console.error("Failed to load DB", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Entries Methods ---
  // Changed to async to satisfy Promise<void> requirement
  const saveEntries = async (newEntries: MediaEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem('kino_entries', JSON.stringify(newEntries));
  };

  const addEntry = async (entry: MediaEntry) => {
    const newEntry = { ...entry, id: Date.now(), createdAt: Date.now() };
    await saveEntries([newEntry, ...entries]);
  };

  const updateEntry = async (updatedEntry: MediaEntry) => {
    await saveEntries(entries.map(e => e.id === updatedEntry.id ? updatedEntry : e));
  };

  const deleteEntry = async (id: number) => {
    await saveEntries(entries.filter(e => e.id !== id));
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
    syncStatus: 'synced',
    batchUpdateEntries: saveEntries
  };
}