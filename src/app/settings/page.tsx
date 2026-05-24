"use client";

import { useState } from 'react';
import { useMedia } from '@/context/MediaContext';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { SagasManager } from '@/components/settings/SagasManager';
import { GenresManager } from '@/components/settings/GenresManager';
import { DataManager } from '@/components/settings/DataManager';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { isLoading } = useMedia();
  const [activeTab, setActiveTab] = useState<'sagas' | 'genres' | 'data'>('sagas');

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground text-sm font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col px-4 sm:px-6 lg:px-8 py-6 lg:py-10 max-w-7xl mx-auto w-full h-full overflow-hidden">

      {/* Mobile Header Title */}
      <div className="md:hidden shrink-0 mb-4 px-1">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">Settings</h1>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6 lg:gap-8">

        {/* Left Sidebar Menu */}
        <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Right Content Area - Flex constraints passed down here */}
        <main className="flex flex-col flex-1 min-h-0 w-full md:max-w-3xl">
          {activeTab === 'sagas' && <SagasManager />}
          {activeTab === 'genres' && <GenresManager />}
          {activeTab === 'data' && <DataManager />}
        </main>

      </div>
    </div>
  );
}