"use client";

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMedia } from '@/context/MediaContext';
import { MediaForm } from '@/components/MediaForm';
import { MediaEntry } from '@/lib/db';
import { PageLoader } from '@/components/ui/Loader';
import { toast } from 'sonner';

export default function EditMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { entries, isLoading, updateEntry } = useMedia();

  const entry = entries.find(e => String(e.id) === String(id)) || null;

  useEffect(() => {
    if (!isLoading && id && !entry) {
      router.replace('/');
    }
  }, [isLoading, id, entry, router]);

  const handleSave = async (updated: MediaEntry) => {
    await updateEntry(updated);
    toast.success(`"${updated.title}" updated!`);
    router.push(`/media/${id}`);
  };

  if (isLoading || !entry) {
    return <PageLoader text="Loading editor..." />;
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-background text-foreground">
      {/* Dot-matrix backing */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-100 z-0" />

      {/* Ambient glow blobs */}
      <div className="absolute top-[-10%] left-[5%] w-[45%] h-[35%] bg-primary/3 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[5%] right-[5%] w-[40%] h-[30%] bg-primary/3 rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 w-full h-full flex justify-center items-center p-4 sm:p-6 lg:p-8">
        <MediaForm
          initialData={entry}
          onSave={handleSave}
          onCancel={() => router.push(`/media/${id}`)}
        />
      </div>
    </div>
  );
}
