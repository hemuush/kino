"use client";

import { useCallback, useEffect, useState } from 'react';
import JsonImporter from '@/components/settings/JsonImporter';
import { useMedia } from '@/context/MediaContext';
import { useAuth } from '@/context/AuthContext';
import { getBackupMetadataFromDrive, BackupMetadata, TokenExpiredError } from '@/lib/googleDrive';
import { Trash2, AlertTriangle, Database, RefreshCw, CheckCircle, Clock, AlertCircle, Cloud, Server, Box } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function formatLocalStorageSize() {
  try {
    let totalChars = 0;
    const keys = ['kino_entries', 'kino_genres', 'kino_franchises'];
    keys.forEach(k => {
      const val = localStorage.getItem(k);
      if (val) totalChars += val.length;
    });
    return formatBytes(totalChars * 2);
  } catch {
    return 'Unknown';
  }
}

function timeAgo(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function DataManager() {
  const { wipeAllData, importData, syncStatus, lastSyncedAt, entries, genres, franchises } = useMedia();
  const { accessToken, logout } = useAuth();
  const [backupMetadata, setBackupMetadata] = useState<BackupMetadata | null>(null);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);

  const localSize = formatLocalStorageSize();
  const entryCount = Object.keys(entries || {}).length;

  const loadBackupMetadata = useCallback(async () => {
    if (!accessToken) return;
    setIsMetadataLoading(true);
    try {
      const metadata = await getBackupMetadataFromDrive(accessToken);
      setBackupMetadata(metadata);
    } catch (error) {
      if (error instanceof TokenExpiredError || (error as Error).message?.includes('401')) {
        logout(false);
        return;
      }
      toast.error("Could not load Drive backup info.");
    } finally {
      setIsMetadataLoading(false);
    }
  }, [accessToken, logout]);

  useEffect(() => {
    Promise.resolve().then(() => {
      loadBackupMetadata();
    });
  }, [loadBackupMetadata]);

  useEffect(() => {
    if (syncStatus === 'synced') {
      Promise.resolve().then(() => {
        loadBackupMetadata();
      });
    }
  }, [syncStatus, loadBackupMetadata]);

  const handleWipeData = async () => {
    const isConfirmed = window.confirm(
      "CRITICAL WARNING:\n\nAre you absolutely sure you want to delete ALL data? This includes your Google Drive backup and cannot be undone."
    );

    if (isConfirmed) {
      try {
        await wipeAllData();
        toast.success("All data has been wiped successfully.");
      } catch {
        toast.error("Failed to wipe data.");
      }
    }
  };

  const modifiedLabel = backupMetadata?.modifiedTime
    ? new Date(backupMetadata.modifiedTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not synced yet';

  const isSynced = syncStatus === 'synced';
  const isSyncing = syncStatus === 'syncing';
  const isError = syncStatus === 'error';

  return (
    <div className="flex flex-col flex-1 gap-8 pb-16">
      
      {/* Premium Dashboard Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total Entries', value: entryCount, icon: Database, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Genres', value: genres.length, icon: Box, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Sagas', value: franchises.length, icon: Cloud, color: 'text-sky-500', bg: 'bg-sky-500/10' },
          { label: 'Local Cache', value: localSize, icon: Server, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
        ].map((stat, i) => (
          <div key={i} className="rounded-[24px] border border-border/80 bg-card/65 dark:bg-[#0c0c0d]/80 p-5 backdrop-blur-xl shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase font-bold">{stat.label}</p>
              <p className="text-3xl font-black text-foreground mt-1 font-display">{stat.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Sync Status Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className={`relative overflow-hidden rounded-[24px] border px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl shadow-sm`}
        style={{
          borderColor: isSynced ? 'rgba(34,197,94,0.3)' : isError ? 'rgba(239,68,68,0.3)' : 'rgba(41,151,255,0.3)',
          background: isSynced ? 'rgba(34,197,94,0.08)' : isError ? 'rgba(239,68,68,0.08)' : 'rgba(41,151,255,0.08)',
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -z-10 mix-blend-overlay"></div>
        <div className="flex items-center gap-4 z-10">
          <div className={`p-3 rounded-full ${isSynced ? 'bg-green-500/20 text-green-500' : isError ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
            {isSynced ? <CheckCircle size={24} /> : isSyncing ? <RefreshCw size={24} className="animate-spin" /> : isError ? <AlertCircle size={24} /> : <Clock size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {isSynced ? 'All changes saved to cloud' : isSyncing ? 'Syncing to Google Drive...' : isError ? 'Sync failed. Please check connection.' : 'Waiting for sync...'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSynced ? 'bg-green-400' : isSyncing ? 'bg-blue-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isSynced ? 'bg-green-500' : isSyncing ? 'bg-blue-500' : 'bg-red-500'}`}></span>
              </span>
              Auto-syncs invisibly in the background
            </p>
          </div>
        </div>
        <div className="text-right shrink-0 z-10 hidden sm:block">
          <p className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase font-bold">Last Synced</p>
          <p className="text-sm font-semibold text-foreground mt-1">{isSynced ? timeAgo(lastSyncedAt) : 'N/A'}</p>
        </div>
      </motion.div>

      {/* Google Drive Backup */}
      <motion.section 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-[24px] border border-border/80 bg-card/65 dark:bg-[#0c0c0d]/80 backdrop-blur-xl shadow-sm p-8"
      >
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">Cloud Storage</h3>
            <p className="text-sm text-muted-foreground mt-2">Manage your chunked architecture data in Google Drive.</p>
          </div>
          <button
            onClick={loadBackupMetadata}
            disabled={isMetadataLoading || !accessToken}
            className="rounded-full border border-foreground/15 bg-foreground/5 hover:bg-foreground/10 px-6 py-3 text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} className={isMetadataLoading ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="rounded-[20px] border border-border/40 bg-background/40 p-6 flex flex-col justify-between h-[140px]">
            <div>
              <p className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase font-bold">Drive Size</p>
              <div className="mt-2 text-4xl font-black text-foreground font-display">
                {isMetadataLoading ? (
                  <span className="animate-pulse text-muted-foreground">--</span>
                ) : backupMetadata ? (
                  formatBytes(Number(backupMetadata.size) || 0)
                ) : (
                  <span className="text-lg text-muted-foreground font-normal">No backup found</span>
                )}
              </div>
            </div>
            <p className="mt-auto text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Chunked Architecture</p>
          </div>
          <div className="rounded-[20px] border border-border/40 bg-background/40 p-6 flex flex-col justify-between h-[140px]">
            <div>
              <p className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase font-bold">Cloud Modified</p>
              <div className="mt-3 text-lg font-bold text-foreground">
                {isMetadataLoading ? 'Checking...' : modifiedLabel}
              </div>
            </div>
            <p className="mt-auto text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Synced from current device</p>
          </div>
        </div>
      </motion.section>

      {/* Import Section */}
      <motion.section 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="rounded-[24px] border border-border/80 bg-card/65 dark:bg-[#0c0c0d]/80 backdrop-blur-xl shadow-sm p-8"
      >
        <header className="mb-6">
          <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">Import Manual Backup</h3>
          <p className="text-sm text-muted-foreground mt-2">Restore your library from a raw JSON export file.</p>
        </header>
        <JsonImporter />
      </motion.section>



      {/* Danger Zone */}
      <motion.section 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="rounded-[24px] border border-red-500/20 bg-red-500/5 backdrop-blur-xl p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-2 h-full bg-red-500/80"></div>
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-2xl font-bold tracking-tight text-red-500 flex items-center gap-3">
              <AlertTriangle size={24} />
              Danger Zone
            </h3>
            <p className="text-sm text-red-400/80 mt-2 max-w-xl">
              This action will permanently delete all your entries, genres, and sagas from this device and your Google Drive. 
              Ensure you have a manual export if you wish to retain your data.
            </p>
          </div>
          <button
            onClick={handleWipeData}
            className="rounded-full bg-red-500 text-white hover:bg-red-600 transition px-6 py-3.5 text-sm font-bold flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <Trash2 size={18} />
            Wipe All Data
          </button>
        </header>
      </motion.section>
    </div>
  );
}
