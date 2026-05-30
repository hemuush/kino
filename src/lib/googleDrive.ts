// src/lib/googleDrive.ts
import { MediaEntry } from './db';

const BACKUP_INDEX_NAME = 'kino-index.json';
const LEGACY_BACKUP_NAME = 'kino-backup.json';
const CHUNK_PREFIX = 'kino-chunk-';
const CHUNK_SIZE = 500; // items per chunk

export class TokenExpiredError extends Error {
  constructor() {
    super('Token expired or invalid');
    this.name = 'TokenExpiredError';
  }
}

// Memory cache for hashes to skip unchanged chunks during upload
const chunkHashes: Record<string, string> = {};

// Fast string hashing (cyrb53)
const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};

export function clearDriveCache() {
  for (const key in chunkHashes) delete chunkHashes[key];
}

interface DriveFile { id: string; name: string; size?: number; modifiedTime?: string; }

async function listAllKinoFiles(accessToken: string): Promise<DriveFile[]> {
  const query = encodeURIComponent(`name contains 'kino-' and trashed=false`);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,name,size,modifiedTime)&orderBy=modifiedTime desc&t=${Date.now()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store'
  });

  if (response.status === 401) throw new TokenExpiredError();
  if (!response.ok) throw new Error(`Failed to query Drive files: Status ${response.status}`);

  const data = await response.json();
  return (data.files || []).map((f: any) => ({ ...f, size: Number(f.size || 0) }));
}

async function uploadMultipart(accessToken: string, content: string, fileName: string, fileId?: string): Promise<string> {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata: any = { name: fileName };
  if (!fileId) metadata.parents = ['appDataFolder'];

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    content +
    closeDelimiter;

  const url = fileId 
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const response = await fetch(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody,
  });

  if (response.status === 401) throw new TokenExpiredError();
  if (!response.ok) throw new Error(`Upload failed for ${fileName}`);
  
  const data = await response.json();
  return data.id;
}

async function downloadFileContent(accessToken: string, fileId: string): Promise<string> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&t=${Date.now()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store'
  });
  if (response.status === 401) throw new TokenExpiredError();
  if (!response.ok) throw new Error(`Download failed for ${fileId}`);
  return await response.text();
}

async function deleteFileFromDrive(accessToken: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 401) throw new TokenExpiredError();
}

export interface BackupData {
  entries: MediaEntry[];
  genres: { id: string; name: string }[];
  franchises: { id: string; name: string }[];
  timestamp?: number;
}

export interface BackupMetadata {
  id: string;
  name: string;
  size: number;
  modifiedTime?: string;
}

export async function getBackupMetadataFromDrive(accessToken: string): Promise<BackupMetadata | null> {
  const existingFiles = await listAllKinoFiles(accessToken);
  if (existingFiles.length === 0) return null;
  
  const totalSize = existingFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const indexFile = existingFiles.find(f => f.name === BACKUP_INDEX_NAME) || existingFiles[0];
  
  return {
    id: indexFile.id,
    name: 'Kino Library (Chunked)',
    size: totalSize,
    modifiedTime: indexFile.modifiedTime,
  };
}

export async function uploadBackupToDrive(accessToken: string, rawData: BackupData | MediaEntry[]): Promise<boolean> {
  const data = Array.isArray(rawData) ? { entries: rawData, genres: [], franchises: [] } : rawData;
  const entries = data.entries || [];
  
  // 1. Partition entries
  const chunks: MediaEntry[][] = [];
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    chunks.push(entries.slice(i, i + CHUNK_SIZE));
  }

  const existingFiles = await listAllKinoFiles(accessToken);
  
  // 2. Upload chunks that changed
  for (let i = 0; i < chunks.length; i++) {
    const chunkName = `${CHUNK_PREFIX}${i}.json`;
    const content = JSON.stringify(chunks[i]);
    const hash = cyrb53(content);
    
    // Skip if unchanged in this session
    if (chunkHashes[chunkName] === hash) continue;

    const existing = existingFiles.find(f => f.name === chunkName);
    if (existing) {
      await uploadMultipart(accessToken, content, chunkName, existing.id);
    } else {
      const newId = await uploadMultipart(accessToken, content, chunkName);
      existingFiles.push({ id: newId, name: chunkName, size: 0 }); // optimistic update
    }
    chunkHashes[chunkName] = hash;
  }

  // 3. Upload Index
  const indexData = {
    genres: data.genres,
    franchises: data.franchises,
    timestamp: data.timestamp || Date.now(),
    chunkCount: chunks.length,
    totalEntries: entries.length,
  };
  
  const indexContent = JSON.stringify(indexData);
  const indexHash = cyrb53(indexContent);
  if (chunkHashes[BACKUP_INDEX_NAME] !== indexHash) {
    const existingIndex = existingFiles.find(f => f.name === BACKUP_INDEX_NAME);
    if (existingIndex) {
      await uploadMultipart(accessToken, indexContent, BACKUP_INDEX_NAME, existingIndex.id);
    } else {
      await uploadMultipart(accessToken, indexContent, BACKUP_INDEX_NAME);
    }
    chunkHashes[BACKUP_INDEX_NAME] = indexHash;
  }

  // 4. Cleanup unused chunks and legacy files
  for (const file of existingFiles) {
    if (file.name.startsWith(CHUNK_PREFIX)) {
      const idx = parseInt(file.name.replace(CHUNK_PREFIX, '').replace('.json', ''), 10);
      if (idx >= chunks.length) {
        await deleteFileFromDrive(accessToken, file.id);
        delete chunkHashes[file.name];
      }
    }
    if (file.name === LEGACY_BACKUP_NAME) {
      await deleteFileFromDrive(accessToken, file.id);
    }
  }

  return true;
}

export async function downloadBackupFromDrive(accessToken: string): Promise<BackupData | MediaEntry[] | null> {
  const existingFiles = await listAllKinoFiles(accessToken);
  
  const indexFile = existingFiles.find(f => f.name === BACKUP_INDEX_NAME);
  const legacyFile = existingFiles.find(f => f.name === LEGACY_BACKUP_NAME);
  
  // Seamless migration from old single file
  if (!indexFile && legacyFile) {
    const text = await downloadFileContent(accessToken, legacyFile.id);
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }
  
  if (!indexFile) return null;

  // Read index
  const indexText = await downloadFileContent(accessToken, indexFile.id);
  let indexData;
  try {
    indexData = JSON.parse(indexText);
    chunkHashes[BACKUP_INDEX_NAME] = cyrb53(indexText);
  } catch (e) {
    return null;
  }

  // Read chunks concurrently
  const chunkPromises = [];
  for (let i = 0; i < (indexData.chunkCount || 0); i++) {
    const chunkName = `${CHUNK_PREFIX}${i}.json`;
    const chunkFile = existingFiles.find(f => f.name === chunkName);
    if (chunkFile) {
      chunkPromises.push(
        downloadFileContent(accessToken, chunkFile.id).then(text => {
          chunkHashes[chunkName] = cyrb53(text);
          return JSON.parse(text);
        })
      );
    }
  }

  const chunkResults = await Promise.all(chunkPromises);
  const allEntries = chunkResults.flat();

  return {
    entries: allEntries,
    genres: indexData.genres || [],
    franchises: indexData.franchises || [],
    timestamp: indexData.timestamp
  };
}

export async function deleteBackupFromDrive(accessToken: string): Promise<boolean> {
  const existingFiles = await listAllKinoFiles(accessToken);
  // Delete sequentially to avoid rate limits
  for (const file of existingFiles) {
    try {
      await deleteFileFromDrive(accessToken, file.id);
    } catch (e) {
      console.warn('Failed to delete', file.name);
    }
  }
  clearDriveCache();
  return true;
}
