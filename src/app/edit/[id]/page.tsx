// src/app/edit/[id]/page.tsx
"use client";

import { MediaForm } from '@/components/MediaForm';
import { useMedia } from '@/hooks/useMedia';
import { useRouter, useParams } from 'next/navigation';
import { MediaEntry } from '@/lib/db';

export default function EditMediaPage() {
  const params = useParams();
  const id = params?.id as string;
  const { entries, updateEntry } = useMedia();
  const router = useRouter();

  // Protect against initial render without params
  if (!id) return null;

  const entry = entries.find(e => e.id === Number(id));

  if (!entry) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="p-8 text-center text-muted-foreground font-semibold bg-muted/20 border border-border/40 rounded-2xl">
          Media entry not found
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden bg-background">
      <div className="w-full h-full flex justify-center items-center">
        <MediaForm
          initialData={entry}
          onSave={async (updatedEntry) => {
            await updateEntry(updatedEntry as MediaEntry);
            router.push('/');
          }}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}