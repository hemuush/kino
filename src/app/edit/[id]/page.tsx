"use client";

import { MediaForm } from '@/components/MediaForm';
import { useMedia } from '@/hooks/useMedia';
import { useRouter } from 'next/navigation';
import { MediaEntry } from '@/lib/db';
import { use } from 'react';

export default function EditMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { entries, updateEntry } = useMedia();
  const router = useRouter();

  const entry = entries.find(e => e.id === Number(id));

  if (!entry) return <div className="p-8 text-center text-muted-foreground font-semibold">Media not found</div>;

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden bg-background">
      <div className="w-full h-full flex justify-center items-center">
        <MediaForm 
          initialData={entry}
          onSave={async (updatedEntry) => {
            updateEntry(updatedEntry as MediaEntry);
            router.push('/');
          }}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
