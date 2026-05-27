"use client";

import { MediaForm } from '@/components/MediaForm';
import { useMedia } from '@/context/MediaContext';
import { useRouter } from 'next/navigation';
import { MediaEntry } from '@/lib/db';

export default function AddMediaPage() {
  const { addEntry } = useMedia();
  const router = useRouter();

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[radial-gradient(circle_at_10%_0%,rgba(56,189,248,0.09),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(251,191,36,0.08),transparent_40%),var(--background)] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="hidden md:flex mb-5 items-center justify-between rounded-2xl border border-border/70 bg-card/65 px-4 py-3 backdrop-blur-xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-foreground">Add New Media</h1>
            <p className="text-sm text-muted-foreground mt-1">Build your collection with complete metadata, episodes, and ratings.</p>
          </div>
          <button
            onClick={() => router.back()}
            className="rounded-xl border border-border/70 bg-background/70 px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            Back
          </button>
        </div>

        <div className="w-full flex justify-center items-start pb-20">
        <MediaForm
          onSave={async (entry) => {
            await addEntry(entry as MediaEntry);
            router.push('/');
          }}
          onCancel={() => router.back()}
        />
        </div>
      </div>
    </div>
  );
}
