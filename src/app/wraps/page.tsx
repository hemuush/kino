"use client";

import { useMedia } from '@/context/MediaContext';
import { RecapModal } from '@/components/dashboard/RecapModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function WrapsContent() {
  const { entries, genres } = useMedia();
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type') as 'weekly' | 'monthly' | 'yearly' | null;

  useEffect(() => {
    if (!typeParam) {
      router.replace('/settings');
    }
  }, [typeParam, router]);

  if (!typeParam) return null;

  return (
    <div className="fixed inset-0 bg-black z-[100] overflow-hidden">
      <RecapModal 
        isOpen={true} 
        onClose={() => router.back()} 
        entries={entries} 
        genres={genres} 
        type={typeParam} 
      />
    </div>
  );
}

export default function WrapsPage() {
  return (
    <Suspense fallback={null}>
      <WrapsContent />
    </Suspense>
  );
}
