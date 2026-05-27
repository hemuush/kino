"use client";

import JsonImporter from '@/components/settings/JsonImporter';
import { useMedia } from '@/context/MediaContext';
import { Trash2, AlertTriangle, HardDriveUpload } from 'lucide-react';
import { toast } from 'sonner';

export function DataManager() {
    const { wipeAllData } = useMedia();

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

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-6 overflow-y-auto pr-2 pb-10 hide-scrollbar">

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
