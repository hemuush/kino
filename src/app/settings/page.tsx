"use client";

import { useState } from 'react';
import { useMedia } from '@/context/MediaContext';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { SagasManager } from '@/components/settings/SagasManager';
import { GenresManager } from '@/components/settings/GenresManager';
import { DataManager } from '@/components/settings/DataManager';
import { AchievementsManager } from '@/components/settings/AchievementsManager';
import { PageLoader } from '@/components/ui/Loader';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
  const { isLoading } = useMedia();
  const [activeTab, setActiveTab] = useState<'sagas' | 'genres' | 'data' | 'achievements'>('data');

  if (isLoading) {
    return <PageLoader text="Loading settings..." />;
  }

  return (
    <div className="absolute inset-0 overflow-y-auto bg-background text-foreground scroll-smooth hide-scrollbar pb-32">
      {/* Background aesthetics */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:20px_20px] opacity-100"></div>
        <div className="absolute top-[10%] left-[20%] w-[45%] h-[35%] bg-primary/5 rounded-full blur-[140px] mix-blend-screen dark:mix-blend-lighten"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[35%] h-[40%] bg-blue-500/5 rounded-full blur-[140px] mix-blend-screen dark:mix-blend-lighten"></div>
      </div>


      <div className="relative z-10 mx-auto w-full max-w-[1400px] py-4 sm:py-6 px-4 sm:px-8 lg:px-12">

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Left Sidebar Menu */}
          <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Right Content Area */}
          <main className="flex-1 min-w-0 w-full relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                {activeTab === 'sagas' && <SagasManager />}
                {activeTab === 'genres' && <GenresManager />}
                {activeTab === 'data' && <DataManager />}
                {activeTab === 'achievements' && <AchievementsManager />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
