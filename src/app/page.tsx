"use client";

import { useState } from 'react';
import { useMedia } from '@/hooks/useMedia';
import { MediaCard } from '@/components/MediaCard';
import { AddMediaModal } from '@/components/AddMediaModal';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/Button';
import { Plus, Film, Clapperboard, Tv, Sparkles } from 'lucide-react';
import { MediaType } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';

export default function Dashboard() {
  const { entries, isLoading, addEntry, deleteEntry } = useMedia();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'All' | MediaType>('All');

  const filteredEntries = filter === 'All'
    ? entries
    : entries.filter(e => e.type === filter);

  const movieCount = entries.filter(e => e.type === 'Movie').length;
  const seriesCount = entries.filter(e => e.type === 'Series').length;
  const animeCount = entries.filter(e => e.type === 'Anime').length;

  if (isLoading) {
    return <Loader fullScreen text="Loading your collection..." />;
  }

  const filterOptions = ['All', 'Movie', 'Series', 'Anime'] as const;

  return (
    <div className={`animate-in ${styles.container}`}>

      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1>Your Collection</h1>
          <p>{entries.length} titles tracked</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary">
          <Plus size={16} /> Add Media
        </Button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={`glass-card ${styles.statCard}`}>
          <span className={styles.statValue}>{movieCount}</span>
          <span className={styles.statLabel}><Clapperboard size={14} style={{display:'inline', verticalAlign:'text-bottom', marginRight:4}} />Movies</span>
        </div>
        <div className={`glass-card ${styles.statCard}`}>
          <span className={styles.statValue}>{seriesCount}</span>
          <span className={styles.statLabel}><Tv size={14} style={{display:'inline', verticalAlign:'text-bottom', marginRight:4}} />Series</span>
        </div>
        <div className={`glass-card ${styles.statCard}`}>
          <span className={styles.statValue}>{animeCount}</span>
          <span className={styles.statLabel}><Sparkles size={14} style={{display:'inline', verticalAlign:'text-bottom', marginRight:4}} />Anime</span>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.filters}>
          {filterOptions.map((opt) => (
            <button
              key={opt}
              className={styles.filterBtn}
              data-active={filter === opt}
              onClick={() => setFilter(opt)}
            >
              {filter === opt && (
                <motion.div
                  layoutId="activeFilter"
                  className={styles.activeFilterBg}
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              {opt}
            </button>
          ))}
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className={styles.emptyState}>
          <Film size={48} className={styles.emptyIcon} />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>No {filter !== 'All' ? filter.toLowerCase() : ''} titles yet</h2>
            <p style={{ fontSize: '0.9rem' }}>Start tracking your media collection.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} variant="secondary">
            <Plus size={16} /> Add Your First
          </Button>
        </div>
      ) : (
        <motion.div layout className={styles.grid}>
          <AnimatePresence mode="popLayout">
            {filteredEntries.map((entry) => (
              <MediaCard
                key={entry.id}
                entry={entry}
                onDelete={deleteEntry}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

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
