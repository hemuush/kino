// src/app/edit/[id]/page.tsx
"use client";

import { MediaForm } from '@/components/MediaForm';
import { useMedia } from '@/context/MediaContext';
import { useRouter, useParams } from 'next/navigation';
import { MediaEntry } from '@/lib/db';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';

export default function EditMediaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { entries, updateEntry, isLoading } = useMedia();

  // Safely find the entry. useMemo prevents unnecessary re-renders.
  const entry = useMemo(() => {
    if (!params?.id || isLoading) return null;
    return entries.find(e => String(e.id) === String(params.id)) || null;
  }, [entries, params?.id, isLoading]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading entry...</p>
        </div>
      </div>
    );
  }

  if (!entry && !isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="p-10 flex flex-col items-center gap-3 text-center text-muted-foreground bg-muted/20 border border-border/40 rounded-3xl shadow-sm">
          <span className="text-4xl">🎬</span>
          <h2 className="font-semibold text-lg text-foreground">Entry Not Found</h2>
          <p className="text-sm">The media you are trying to edit doesn't exist or was removed.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async (updatedEntry: MediaEntry) => {
    try {
      await updateEntry(updatedEntry);
      toast.success("Entry updated successfully!");
      router.push('/');
    } catch (error) {
      toast.error("Failed to update entry.");
      console.error(error);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden bg-background/50 backdrop-blur-sm">
      <div className="w-full h-full flex justify-center items-center">
        {/* Important: we assert entry! here because we already handled the null case above */}
        <MediaForm
          initialData={entry!}
          onSave={handleSave}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}