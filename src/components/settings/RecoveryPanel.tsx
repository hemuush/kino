"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMedia } from '@/context/MediaContext';
import { listFileRevisions, getRevisionContent, DriveRevision, TokenExpiredError } from '@/lib/googleDrive';
import { Tag } from '@/lib/db';
import { History, Search, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface RecoveredPreview {
  revisionId: string;
  genres: Tag[];
  franchises: Tag[];
  journalCount: number;
}

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

interface RecoveryPanelProps {
  /** The current kino-index.json file's Drive id — revisions are checked against this file. */
  indexFileId: string | null;
}

/**
 * Emergency recovery: kino-index.json (genres + sagas) is overwritten in place on every sync,
 * and Drive keeps prior revisions of overwritten files — so a bad overwrite is often still
 * sitting in an older revision. Entry chunk files, if deleted, are not recoverable this way
 * (Drive's delete bypasses trash entirely, taking any revisions with it) — this panel is
 * explicit about that so it never overpromises.
 */
export function RecoveryPanel({ indexFileId }: RecoveryPanelProps) {
  const { accessToken, logout } = useAuth();
  const { importData } = useMedia();

  const [isChecking, setIsChecking] = useState(false);
  const [revisions, setRevisions] = useState<DriveRevision[] | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<RecoveredPreview | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleCheck = async () => {
    if (!accessToken || !indexFileId) return;
    setIsChecking(true);
    setRevisions(null);
    setPreview(null);
    try {
      const revs = await listFileRevisions(accessToken, indexFileId);
      setRevisions(revs);
      if (revs.length === 0) {
        toast.info("No prior revisions found for your backup file.");
      }
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        logout(false);
        return;
      }
      toast.error("Could not check Drive's revision history.");
    } finally {
      setIsChecking(false);
    }
  };

  const handlePreview = async (rev: DriveRevision) => {
    if (!accessToken || !indexFileId) return;
    setPreviewingId(rev.id);
    setPreview(null);
    try {
      const text = await getRevisionContent(accessToken, indexFileId, rev.id);
      const data = JSON.parse(text);
      setPreview({
        revisionId: rev.id,
        genres: Array.isArray(data.genres) ? data.genres : [],
        franchises: Array.isArray(data.franchises) ? data.franchises : [],
        journalCount: Array.isArray(data.journal) ? data.journal.length : 0,
      });
    } catch {
      toast.error("Could not read that revision — it may not be valid JSON.");
    } finally {
      setPreviewingId(null);
    }
  };

  const handleRestore = async () => {
    if (!preview) return;
    setIsRestoring(true);
    try {
      await importData({ genres: preview.genres, franchises: preview.franchises });
      toast.success("Recovered genres and sagas merged back into your library.");
      setPreview(null);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!indexFileId) {
    return (
      <p className="text-sm text-muted-foreground">
        No backup file found on Drive yet — there is nothing to check revision history for.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
          This can only recover <strong>genres and sagas</strong> from a prior save of your backup file — Drive keeps revision
          history for files that get overwritten. It <strong>cannot</strong> recover deleted movie/show/anime entries — those
          live in separate files that, once deleted, are gone permanently with no revision history of their own.
        </p>
      </div>

      <button
        onClick={handleCheck}
        disabled={isChecking}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-sm font-bold transition-colors disabled:opacity-50"
      >
        <History size={15} className={isChecking ? 'animate-spin' : ''} />
        {isChecking ? 'Checking...' : 'Check for Recoverable Backup'}
      </button>

      {revisions && revisions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {revisions.length} prior revision{revisions.length === 1 ? '' : 's'} found — newest first
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {revisions.map((rev) => (
              <div key={rev.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background/50 border border-border/40">
                <div className="text-xs">
                  <p className="font-semibold text-foreground">
                    {rev.modifiedTime ? new Date(rev.modifiedTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown time'}
                  </p>
                  <p className="text-muted-foreground">{formatBytes(rev.size)}</p>
                </div>
                <button
                  onClick={() => handlePreview(rev)}
                  disabled={previewingId === rev.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-xs font-bold transition-colors disabled:opacity-50"
                >
                  <Search size={12} className={previewingId === rev.id ? 'animate-spin' : ''} />
                  Preview
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {preview && (
        <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-3">
          <p className="text-sm font-bold text-foreground">This revision contains:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>{preview.genres.length} genre{preview.genres.length === 1 ? '' : 's'}</li>
            <li>{preview.franchises.length} saga{preview.franchises.length === 1 ? '' : 's'}</li>
            {preview.journalCount > 0 && <li>{preview.journalCount} journal entr{preview.journalCount === 1 ? 'y' : 'ies'}</li>}
          </ul>
          <div className="flex gap-2">
            <button
              onClick={handleRestore}
              disabled={isRestoring}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
            >
              <Check size={13} /> {isRestoring ? 'Merging...' : 'Merge This Back In'}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted text-xs font-bold transition-colors"
            >
              <X size={13} /> Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
