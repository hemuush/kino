"use client";

import { MediaForm } from '@/components/MediaForm';
import { useMedia } from '@/hooks/useMedia';
import { useRouter } from 'next/navigation';
import { MediaEntry } from '@/lib/db';

export default function AddMediaPage() {
  const { addEntry } = useMedia();
  const router = useRouter();

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden bg-background">
      <div className="w-full h-full flex justify-center items-center">
        <MediaForm
          onSave={async (entry) => {
            addEntry(entry as MediaEntry);
            router.push('/');
          }}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
