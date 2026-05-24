"use client";

import { useMedia } from '@/context/MediaContext';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function DangerZone() {
    const { wipeAllData } = useMedia();

    const handleWipeData = () => {
        const isConfirmed = window.confirm(
            "Are you absolutely sure you want to delete ALL data?\n\nThis includes your Google Drive backup and cannot be undone."
        );

        if (isConfirmed) {
            try {
                wipeAllData();
                toast.success("All data has been wiped for a fresh start.");
            } catch (error) {
                toast.error("Failed to wipe data. Please try again.");
            }
        }
    };

    return (
        <section className="bg-card glass border border-red-500/30 rounded-3xl p-5 shadow-sm flex flex-col justify-center h-full">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500/10 rounded-xl text-red-500 shrink-0">
                    <Trash2 size={18} />
                </div>
                <h2 className="text-lg font-bold font-display text-red-500">Danger Zone</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Permanently delete all entries, genres, and sagas from this device <b>AND</b> Google Drive. Cannot be undone.
            </p>
            <button
                onClick={handleWipeData}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer border border-red-500/30 text-sm active:scale-[0.98]"
            >
                Wipe All Data
            </button>
        </section>
    );
}