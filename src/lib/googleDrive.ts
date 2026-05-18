import { MediaEntry } from './db';

const BACKUP_FILE_NAME = 'kino-backup.json';

// Helper to find if the backup file already exists in the appDataFolder
async function findBackupFileId(accessToken: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Drive API Error:', response.status, errText);
    throw new Error(`Failed to query Drive files: Status ${response.status}`);
  }
  
  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

export async function uploadBackupToDrive(accessToken: string, entries: MediaEntry[]): Promise<boolean> {
  try {
    const fileId = await findBackupFileId(accessToken);
    const fileContent = JSON.stringify(entries, null, 2);
    const metadata: any = {
      name: BACKUP_FILE_NAME,
    };

    // You can only set parents on creation, not on update
    if (!fileId) {
      metadata.parents = ['appDataFolder'];
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileContent], { type: 'application/json' }));

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    // If it exists, we update it via PATCH
    if (fileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
      method = 'PATCH';
    }

    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Drive API Upload Error:', response.status, errText);
      throw new Error(`Upload failed: Status ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Drive upload error:', error);
    return false;
  }
}

export async function downloadBackupFromDrive(accessToken: string): Promise<MediaEntry[] | null> {
  try {
    const fileId = await findBackupFileId(accessToken);
    if (!fileId) {
      // File doesn't exist yet, nothing to restore
      return null;
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data as MediaEntry[];
  } catch (error) {
    console.error('Drive download error:', error);
    return null;
  }
}
