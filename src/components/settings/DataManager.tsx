"use client";

import { useCallback, useEffect, useState } from 'react';
import JsonImporter from '@/components/settings/JsonImporter';
import { useMedia } from '@/context/MediaContext';
import { useAuth } from '@/context/AuthContext';
import { getBackupMetadataFromDrive, BackupMetadata, TokenExpiredError } from '@/lib/googleDrive';
import { Trash2, AlertTriangle, HardDriveUpload, Database, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

function formatBytes(bytes: number) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

export function DataManager() {
    const { wipeAllData } = useMedia();
    const { accessToken, logout } = useAuth();
    const [backupMetadata, setBackupMetadata] = useState<BackupMetadata | null>(null);
    const [isMetadataLoading, setIsMetadataLoading] = useState(false);

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
            toast.error("Could not load Drive backup size.");
        } finally {
            setIsMetadataLoading(false);
        }
    }, [accessToken, logout]);

    useEffect(() => {
        loadBackupMetadata();
    }, [loadBackupMetadata]);

    const handleWipeData = async () => {
        const isConfirmed = window.confirm(
            "CRITICAL WARNING:\n\nAre you absolutely sure you want to delete ALL data? This includes your Google Drive backup and cannot be undone."
        );

        if (isConfirmed) {
            try {
                await wipeAllData();
                toast.success("All data has been wiped successfully.");
            } catch (error) {
                toast.error("Failed to wipe data.");
            }
        }
    };

    const modifiedLabel = backupMetadata?.modifiedTime
        ? new Date(backupMetadata.modifiedTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
        : 'Not synced yet';

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-6 overflow-y-auto pr-2 pb-10 hide-scrollbar">

            <section className="shrink-0 bg-card glass border border-border/60 rounded-3xl p-6 shadow-sm">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                            <Database size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold font-display text-foreground">Google Drive Backup</h3>
                            <p className="text-sm text-muted-foreground">Current size saved in Drive app data.</p>
                        </div>
                    </div>
                    <button
                        onClick={loadBackupMetadata}
                        disabled={isMetadataLoading || !accessToken}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={isMetadataLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Drive Size</p>
                        <p className="mt-2 text-2xl font-black text-foreground">
                            {isMetadataLoading ? '...' : backupMetadata ? formatBytes(backupMetadata.size) : 'No backup'}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4 sm:col-span-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Last Updated</p>
                        <p className="mt-2 text-sm font-semibold text-foreground break-words">{isMetadataLoading ? 'Checking...' : modifiedLabel}</p>
                        <p className="mt-1 text-xs text-muted-foreground break-all">{backupMetadata?.name || 'kino-backup.json'}</p>
                    </div>
                </div>
            </section>

            {/* Import Section */}
            <section className="shrink-0 bg-card glass border border-border/60 rounded-3xl p-6 shadow-sm">
                <header className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                        <HardDriveUpload size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold font-display text-foreground">Import Backup</h3>
                        <p className="text-sm text-muted-foreground">Restore your library from a JSON file.</p>
                    </div>
                </header>
                <JsonImporter />
            </section>

            {/* Danger Zone Section */}
            <section className="shrink-0 bg-card border border-red-500/30 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                <header className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
                        <AlertTriangle size={20} />
                    </div>
                    <h3 className="text-lg font-bold font-display text-red-500">Danger Zone</h3>
                </header>

                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    This action will <b>permanently delete</b> all your entries, genres, and sagas from this device and your Google Drive. Ensure you have a manual export if you wish to retain your data.
                </p>

                <button
                    onClick={handleWipeData}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors cursor-pointer text-sm shadow-sm"
                >
                    <Trash2 size={16} />
                    Wipe All Data Permanently
                </button>
            </section>

        </div>
    );
}
