// src/lib/googleDrive.ts
import { MediaEntry, JournalEntry } from './db';

const BACKUP_INDEX_NAME = 'kino-index.json';
const LEGACY_BACKUP_NAME = 'kino-backup.json';
const CHUNK_PREFIX = 'kino-chunk-';
const CHUNK_SIZE = 50; // items per chunk (reduced to 50 to avoid 5MB Drive limits on images)

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

async function listAllKinoFiles(accessToken: string, _isRetry = false): Promise<DriveFile[]> {
  const query = encodeURIComponent(`name contains 'kino-' and trashed=false`);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,name,size,modifiedTime)&orderBy=modifiedTime desc&t=${Date.now()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store'
  });

  if (response.status === 401) throw new TokenExpiredError();
  if (!response.ok) throw new Error(`Failed to query Drive files: Status ${response.status}`);

  const data = await response.json();
  const files = (data.files || []).map((f: { id: string; name: string; size?: string }) => ({ ...f, size: Number(f.size || 0) }));

  // Drive's listing can occasionally come back empty right after a real write elsewhere
  // (eventual consistency), not because the account is actually empty. Treating that blip as
  // "no backup exists" is exactly how a transient glitch turns into deleting a real library —
  // one retry closes almost all of that gap before any caller acts on "no files."
  if (files.length === 0 && !_isRetry) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return listAllKinoFiles(accessToken, true);
  }

  return files;
}

async function uploadMultipart(accessToken: string, content: string, fileName: string, fileId?: string): Promise<string> {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata: { name: string; parents?: string[] } = { name: fileName };
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
  journal?: JournalEntry[];
  timestamp?: number;
}

export interface BackupMetadata {
  id: string;
  name: string;
  size: number;
  modifiedTime?: string;
  files: { name: string; size: number }[];
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
    files: existingFiles.map(f => ({ name: f.name, size: f.size || 0 })).sort((a, b) => a.name.localeCompare(b.name))
  };
}

export async function uploadBackupToDrive(
  accessToken: string,
  rawData: BackupData | MediaEntry[],
  options?: { trustEmptyEntries?: boolean; trustEmptyState?: boolean }
): Promise<boolean> {
  const data = Array.isArray(rawData) ? { entries: rawData, genres: [], franchises: [] } : rawData;
  const entries = data.entries || [];
  const genres = data.genres || [];
  const franchises = data.franchises || [];

  const existingFiles = await listAllKinoFiles(accessToken);
  const existingChunkCount = existingFiles.filter(f => f.name.startsWith(CHUNK_PREFIX)).length;
  const existingIndexFile = existingFiles.find(f => f.name === BACKUP_INDEX_NAME);

  // Safety net #1 (the critical one): refuse to let an upload that thinks there are zero
  // entries delete chunk files Drive still has — that deletion is permanent (files.delete
  // bypasses trash), so this is the one guard that actually protects irrecoverable data.
  // `trustEmptyEntries` must specifically reflect that THIS session has itself observed real
  // (non-empty) entries at some point — not just "some field somewhere was non-empty" (a fresh
  // session seeds default genres on load regardless, which must never count as trust here).
  if (entries.length === 0 && existingChunkCount > 0 && !options?.trustEmptyEntries) {
    throw new Error(
      'Refusing to sync: local library shows zero entries but Drive still has existing chunk files. ' +
      'This usually means the app has not finished loading your data yet — refresh instead of editing.'
    );
  }

  // Safety net #2 (softer): the index file (genres/sagas) is overwritten, not deleted, so a
  // stale revision is more likely recoverable — but still worth refusing when it looks like a
  // session that never saw real data at all is about to blank it out.
  if (entries.length === 0 && genres.length === 0 && franchises.length === 0 && existingIndexFile && !options?.trustEmptyState) {
    throw new Error(
      'Refusing to sync: local library is empty but Drive still has an existing backup. ' +
      'This usually means the app has not finished loading your data yet — refresh instead of editing.'
    );
  }

  // 1. Partition entries and separate heavy images
  const chunks: MediaEntry[][] = [];
  const imageChunks: Record<string, string>[] = [];

  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunkEntries = entries.slice(i, i + CHUNK_SIZE);
    const chunkMap: Record<string, string> = {};

    const textEntries = chunkEntries.map(e => {
      if (e.coverImage) {
        chunkMap[String(e.id)] = e.coverImage;
      }
      const { coverImage: _coverImage, ...rest } = e;
      return rest as MediaEntry;
    });

    chunks.push(textEntries);
    imageChunks.push(chunkMap);
  }

  // 2. Upload chunks that changed
  for (let i = 0; i < chunks.length; i++) {
    const chunkName = `${CHUNK_PREFIX}${i}.json`;
    const content = JSON.stringify(chunks[i]);
    const hash = cyrb53(content);
    
    // Skip if unchanged in this session
    if (chunkHashes[chunkName] !== hash) {
      const existing = existingFiles.find(f => f.name === chunkName);
      if (existing) {
        await uploadMultipart(accessToken, content, chunkName, existing.id);
      } else {
        const newId = await uploadMultipart(accessToken, content, chunkName);
        existingFiles.push({ id: newId, name: chunkName, size: 0 }); // optimistic update
      }
      chunkHashes[chunkName] = hash;
    }

    // Upload corresponding Image chunk
    const imgChunkName = `kino-images-${i}.json`;
    const imgContent = JSON.stringify(imageChunks[i]);
    const imgHash = cyrb53(imgContent);
    
    if (chunkHashes[imgChunkName] !== imgHash) {
      const existingImg = existingFiles.find(f => f.name === imgChunkName);
      if (existingImg) {
        await uploadMultipart(accessToken, imgContent, imgChunkName, existingImg.id);
      } else {
        const newId = await uploadMultipart(accessToken, imgContent, imgChunkName);
        existingFiles.push({ id: newId, name: imgChunkName, size: 0 });
      }
      chunkHashes[imgChunkName] = imgHash;
    }
  }

  // 3. Upload Index
  const indexData = {
    genres: data.genres,
    franchises: data.franchises,
    journal: data.journal || [],
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

  // 4. Cleanup unused chunks, image chunks, and legacy files
  for (const file of existingFiles) {
    if (file.name.startsWith(CHUNK_PREFIX)) {
      const idx = parseInt(file.name.replace(CHUNK_PREFIX, '').replace('.json', ''), 10);
      if (idx >= chunks.length) {
        await deleteFileFromDrive(accessToken, file.id);
        delete chunkHashes[file.name];
      }
    }
    if (file.name.startsWith('kino-images-')) {
      const idx = parseInt(file.name.replace('kino-images-', '').replace('.json', ''), 10);
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

export async function downloadBackupFromDrive(
  accessToken: string,
  onChunkLoaded?: (entries: MediaEntry[], isFirst: boolean) => void,
  onImagesLoaded?: (images: Record<string, string>) => void
): Promise<BackupData | MediaEntry[] | null> {
  const existingFiles = await listAllKinoFiles(accessToken);
  
  const indexFile = existingFiles.find(f => f.name === BACKUP_INDEX_NAME);
  const legacyFile = existingFiles.find(f => f.name === LEGACY_BACKUP_NAME);
  
  // Seamless migration from old single file
  if (!indexFile && legacyFile) {
    const text = await downloadFileContent(accessToken, legacyFile.id);
    try {
      const data = JSON.parse(text);
      if (onChunkLoaded) onChunkLoaded(Array.isArray(data) ? data : (data.entries || []), true);
      return data;
    } catch (_e) {
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
  } catch (_e) {
    return null;
  }

  // Read chunks sequentially for text (for instant UI render), images concurrently
  let allEntries: MediaEntry[] = [];
  const imagePromises: Promise<void>[] = [];

  for (let i = 0; i < (indexData.chunkCount || 0); i++) {
    const chunkName = `${CHUNK_PREFIX}${i}.json`;
    const imgChunkName = `kino-images-${i}.json`;
    
    const chunkFile = existingFiles.find(f => f.name === chunkName);
    const imgFile = existingFiles.find(f => f.name === imgChunkName);
    
    let textEntries: MediaEntry[] = [];
    if (chunkFile) {
      const text = await downloadFileContent(accessToken, chunkFile.id);
      chunkHashes[chunkName] = cyrb53(text);
      textEntries = JSON.parse(text);
      
      allEntries = allEntries.concat(textEntries);
      if (onChunkLoaded) onChunkLoaded(textEntries, i === 0);
    }

    if (imgFile) {
      const p = downloadFileContent(accessToken, imgFile.id).then(text => {
        chunkHashes[imgChunkName] = cyrb53(text);
        const images = JSON.parse(text);
        if (onImagesLoaded) onImagesLoaded(images);
        // Hydrate allEntries so the final return value has images
        for (const e of allEntries) {
          if (images[String(e.id)]) {
            e.coverImage = images[String(e.id)];
          }
        }
      }).catch(console.warn);
      imagePromises.push(p);
    }
  }

  // Await images to ensure background hydration finishes before returning full array
  await Promise.all(imagePromises);

  return {
    entries: allEntries,
    genres: indexData.genres || [],
    franchises: indexData.franchises || [],
    journal: indexData.journal || [],
    timestamp: indexData.timestamp
  };
}

export interface DriveRevision {
  id: string;
  modifiedTime?: string;
  size: number;
}

/** Prior revisions of a single Drive file (e.g. kino-index.json), newest first. Used by the
 * Data & Cloud recovery panel to check whether an overwritten backup is still recoverable —
 * `files.update` (what every upload here uses) creates a new revision rather than replacing
 * history outright, so a bad overwrite is often still sitting in an older revision. */
export async function listFileRevisions(accessToken: string, fileId: string): Promise<DriveRevision[]> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/revisions?fields=revisions(id,modifiedTime,size)`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
  );
  if (response.status === 401) throw new TokenExpiredError();
  if (!response.ok) throw new Error(`Failed to list revisions: Status ${response.status}`);
  const data = await response.json();
  const revisions: DriveRevision[] = (data.revisions || []).map((r: { id: string; modifiedTime?: string; size?: string }) => ({
    id: r.id,
    modifiedTime: r.modifiedTime,
    size: Number(r.size || 0),
  }));
  return revisions.reverse(); // API returns oldest first
}

/** Raw content of one specific revision of a file. */
export async function getRevisionContent(accessToken: string, fileId: string, revisionId: string): Promise<string> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/revisions/${revisionId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
  );
  if (response.status === 401) throw new TokenExpiredError();
  if (!response.ok) throw new Error(`Failed to fetch revision content: Status ${response.status}`);
  return await response.text();
}

export async function deleteBackupFromDrive(accessToken: string): Promise<boolean> {
  const existingFiles = await listAllKinoFiles(accessToken);
  // Delete sequentially to avoid rate limits
  for (const file of existingFiles) {
    try {
      await deleteFileFromDrive(accessToken, file.id);
    } catch (_e) {
      console.warn('Failed to delete', file.name);
    }
  }
  clearDriveCache();
  return true;
}
