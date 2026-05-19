"use client";

import { useState } from 'react';
import { useMedia } from '@/hooks/useMedia';
import { MediaCard } from '@/components/MediaCard';
import { AddMediaModal } from '@/components/AddMediaModal';
import { Plus, Film } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Dashboard() {
  const { entries, isLoading, addEntry, deleteEntry } = useMedia();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Movie' | 'Series' | 'Anime'>('All');

  const movies = entries.filter(e => e.type === 'Movie');
  const series = entries.filter(e => e.type === 'Series');
  const anime = entries.filter(e => e.type === 'Anime');
  const recentEntries = entries.slice(0, 10);

  const filteredEntries = filter === 'All' ? entries : entries.filter(e => e.type === filter);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center justify-between px-6 h-14 max-w-7xl mx-auto w-full">
            <div className="w-24 h-4 skeleton" />
            <div className="w-9 h-9 skeleton rounded-xl" />
          </div>
        </header>
        <div className="flex-1 px-4 sm:px-6 py-8 max-w-7xl mx-auto w-full">
          <div className="w-48 h-3 skeleton mb-8" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] skeleton rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filterTabs = [
    { label: 'All', value: 'All' as const },
    { label: 'Movies', value: 'Movie' as const },
    { label: 'Series', value: 'Series' as const },
    { label: 'Anime', value: 'Anime' as const },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Header — minimal */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-6 h-14 max-w-7xl mx-auto w-full">
          <h1 className="font-display text-[17px] font-semibold tracking-tight">Dashboard</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-card hover:bg-card-hover text-foreground transition-all active:scale-95"
          >
            <Plus size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-8 animate-fade-up">
        
        {/* Inline stats — clean text, no cards */}
        {entries.length > 0 && (
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground font-medium">
            <span>{movies.length} movies</span>
            <span className="text-border">·</span>
            <span>{series.length} series</span>
            <span className="text-border">·</span>
            <span>{anime.length} anime</span>
          </div>
        )}

        {/* Empty State */}
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-scale-in">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-5">
              <Film size={26} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-xl font-bold mb-2 tracking-tight">Start your collection</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-[280px] leading-relaxed">
              Track every movie, series, and anime you watch.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] hover:opacity-90"
            >
              <Plus size={16} strokeWidth={2} /> Add Your First
            </button>
          </div>
        )}

        {/* Recently Added — horizontal scroll */}
        {recentEntries.length > 0 && (
          <section className="space-y-4" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold tracking-tight">Recently Added</h2>
              <span className="text-[12px] text-muted-foreground">{recentEntries.length} titles</span>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar snap-x-mandatory pb-1 -mx-1 px-1">
              <AnimatePresence>
                {recentEntries.map((entry, i) => (
                  <div key={entry.id} className="w-[130px] sm:w-[150px] shrink-0">
                    <MediaCard entry={entry} onDelete={deleteEntry} index={i} />
                  </div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Full Collection */}
        {entries.length > 0 && (
          <section className="space-y-5" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold tracking-tight">Collection</h2>
              <span className="text-[12px] text-muted-foreground">{filteredEntries.length} titles</span>
            </div>
            
            {/* Filter Tabs — refined segmented control */}
            <div className="flex gap-1 p-1 bg-muted/60 rounded-xl w-fit">
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-250 ${
                    filter === tab.value
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
              <AnimatePresence>
                {filteredEntries.map((entry, i) => (
                  <MediaCard key={entry.id} entry={entry} onDelete={deleteEntry} index={i} />
                ))}
              </AnimatePresence>
            </div>

            {filteredEntries.length === 0 && (
              <div className="text-center py-16 text-sm text-muted-foreground">
                No {filter.toLowerCase()} in your collection yet.
              </div>
            )}
          </section>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <AddMediaModal
          onClose={() => setIsModalOpen(false)}
          onSave={async (entry) => {
            await addEntry(entry);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
