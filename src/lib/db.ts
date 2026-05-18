import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type MediaType = 'Movie' | 'Series' | 'Anime';

export interface MediaEntry {
  id?: number;
  title: string;
  type: MediaType;
  coverImage: string;
  watchDate: string; // ISO string
  rating: number; // 1-10
  review?: string;
  createdAt: number;
}

export interface KinoDB extends DBSchema {
  entries: {
    key: number;
    value: MediaEntry;
    indexes: {
      'by-date': string;
      'by-type': string;
      'by-rating': number;
      'by-created': number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<KinoDB>> | null = null;

export const initDB = async () => {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<KinoDB>('kino-store', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('entries')) {
          const store = db.createObjectStore('entries', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by-date', 'watchDate');
          store.createIndex('by-type', 'type');
          store.createIndex('by-rating', 'rating');
          store.createIndex('by-created', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
};

export const addMedia = async (entry: Omit<MediaEntry, 'id' | 'createdAt'>) => {
  const db = await initDB();
  if (!db) return null;
  const newEntry: MediaEntry = {
    ...entry,
    createdAt: Date.now(),
  };
  return db.add('entries', newEntry);
};

export const updateMedia = async (entry: MediaEntry) => {
  const db = await initDB();
  if (!db) return null;
  return db.put('entries', entry);
};

export const deleteMedia = async (id: number) => {
  const db = await initDB();
  if (!db) return null;
  return db.delete('entries', id);
};

export const clearAllMedia = async () => {
  const db = await initDB();
  if (!db) return null;
  return db.clear('entries');
};

export const getAllMedia = async () => {
  const db = await initDB();
  if (!db) return [];
  // return sorted by date descending (newest watched first) by default
  const tx = db.transaction('entries', 'readonly');
  const store = tx.objectStore('entries');
  const index = store.index('by-date');
  let cursor = await index.openCursor(null, 'prev');
  
  const entries: MediaEntry[] = [];
  while (cursor) {
    entries.push(cursor.value);
    cursor = await cursor.continue();
  }
  return entries;
};

export const importData = async (jsonData: string) => {
  try {
    const data: MediaEntry[] = JSON.parse(jsonData);
    const db = await initDB();
    if (!db) return false;
    const tx = db.transaction('entries', 'readwrite');
    // Clear existing? Optional. We will just add/merge.
    // For simplicity, if ID exists, put, else add
    for (const item of data) {
      await tx.store.put(item);
    }
    await tx.done;
    return true;
  } catch (error) {
    console.error('Import failed', error);
    return false;
  }
};
