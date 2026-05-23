import { MediaEntry } from './db';

const BACKUP_FILE_NAME = 'kino-backup.json';

export class TokenExpiredError extends Error {
  constructor() {
    super('Token expired or invalid');
    this.name = 'TokenExpiredError';
  }
}

let cachedFileId: string | null = null;

export function clearDriveCache() {
  cachedFileId = null;
}

async function findBackupFileId(accessToken: string): Promise<string | null> {
  if (cachedFileId) return cachedFileId;
  const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) {
    throw new TokenExpiredError();
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error('Drive API Error:', response.status, errText);
    throw new Error(`Failed to query Drive files: Status ${response.status}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    cachedFileId = data.files[0].id;
    return cachedFileId;
  }
  return null;
}

export interface BackupData {
  entries: MediaEntry[];
  genres: any[];
  franchises: any[];
  timestamp?: number;
}

export async function uploadBackupToDrive(accessToken: string, data: BackupData | MediaEntry[]): Promise<boolean> {
  const fileId = await findBackupFileId(accessToken);
  const fileContent = JSON.stringify(data, null, 2);
  const metadata: any = {
    name: BACKUP_FILE_NAME,
  };

  if (!fileId) {
    metadata.parents = ['appDataFolder'];
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let method = 'POST';

  if (fileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    method = 'PATCH';
  }

  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  if (response.status === 401) {
    throw new TokenExpiredError();
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error('Drive API Upload Error:', response.status, errText);
    throw new Error(`Upload failed: Status ${response.status}`);
  }

  return true;
}

export async function downloadBackupFromDrive(accessToken: string): Promise<BackupData | MediaEntry[] | null> {
  const fileId = await findBackupFileId(accessToken);
  if (!fileId) {
    return null;
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) {
    throw new TokenExpiredError();
  }

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  return await response.json();
}