// src/app/edit/[id]/page.tsx
"use client";

import React, { use } from 'react';
import { MediaForm } from '@/components/MediaForm';
import { useMedia } from '@/context/MediaContext';
import { useRouter } from 'next/navigation';
import { MediaEntry } from '@/lib/db';
import { PageLoader } from '@/components/ui/Loader';
import { toast } from 'sonner';

export default function EditMediaPage(props: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(props.params);
  const router = useRouter();
  const { entries, updateEntry, isLoading } = useMedia();

  const entry = !resolvedParams?.id || isLoading ? null : entries.find(e => String(e.id) === String(resolvedParams.id)) || null;

  if (isLoading) {
    return <PageLoader text="Loading entry..." />;
  }

  if (!entry && !isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background text-foreground overflow-hidden">
        {/* Dot-matrix backing */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--border)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-40 z-0" />
        {/* Ambient glow */}
        <div className="absolute top-[-10%] left-[10%] w-[45%] h-[35%] bg-primary/3 rounded-full blur-[140px] pointer-events-none z-0" />

        <div className="relative z-10 rounded-[24px] border border-border/80 bg-card/65 dark:bg-[#0c0c0d]/80 backdrop-blur-xl shadow-sm p-10 flex flex-col items-center gap-3 text-center text-muted-foreground max-w-sm w-full mx-4">
          <span className="text-4xl">🎬</span>
          <span className="text-[10px] font-mono tracking-[0.2em] text-primary/70 uppercase font-bold mt-1">ERROR // NOT_FOUND</span>
          <h2 className="font-semibold text-lg text-foreground">Entry Not Found</h2>
          <p className="text-sm">The media you are trying to edit doesn&apos;t exist or was removed.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-full bg-foreground text-background hover:bg-foreground/90 transition px-6 py-3 text-xs font-bold shadow-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async (updatedEntry: MediaEntry) => {
    // updateEntry saves to localStorage immediately — no error expected here
    await updateEntry(updatedEntry);
    toast.success(`"${updatedEntry.title}" updated! ✓`, {
      description: 'Changes saved and syncing to Drive...',
      duration: 3000,
    });
    router.back();
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-background text-foreground">
      {/* Dot-matrix backing */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-100 z-0" />
      {/* Ambient glow blobs */}
      <div className="absolute top-[-10%] left-[5%] w-[45%] h-[35%] bg-primary/3 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[5%] right-[5%] w-[40%] h-[30%] bg-primary/3 rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 w-full h-full flex justify-center items-center p-4 sm:p-6 lg:p-8">
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
