"use client";

import { MediaEntry } from '@/lib/db';
import { motion } from 'framer-motion';
import { Star, Calendar, Trash2 } from 'lucide-react';
import styles from './MediaCard.module.css';

interface MediaCardProps {
  entry: MediaEntry;
  onDelete?: (id: number) => void;
}

const typeColors: Record<string, string> = {
  Movie: '#6366f1',
  Series: '#ec4899',
  Anime: '#10b981',
};

export function MediaCard({ entry, onDelete }: MediaCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={styles.cardWrapper}
    >
      <div className={styles.container}>
        <div className={styles.actions}>
          <span
            className={styles.typeBadge}
            style={{ background: typeColors[entry.type] || '#6366f1' }}
          >
            {entry.type}
          </span>
          {onDelete && entry.id && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(entry.id!); }}
              className={styles.deleteBtn}
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        <div className={styles.imageContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.coverImage || 'https://via.placeholder.com/300x450?text=No+Image'}
            alt={entry.title}
            className={styles.image}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=No+Image';
            }}
          />
          <div className={styles.overlay}>
            <h3 className={styles.title}>{entry.title}</h3>
            <div className={styles.meta}>
              <span className={styles.metaItem}>
                <Star size={12} fill="#fbbf24" color="#fbbf24" /> {entry.rating}/10
              </span>
              <span className={styles.metaItem}>
                <Calendar size={12} /> {new Date(entry.watchDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
