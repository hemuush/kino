"use client";

import { useState } from 'react';
import { MediaType } from '@/lib/db';
import { X, Save } from 'lucide-react';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { MediaCard } from './MediaCard';
import styles from './AddMediaModal.module.css';

interface AddMediaModalProps {
  onClose: () => void;
  onSave: (entry: {
    title: string;
    type: MediaType;
    coverImage: string;
    watchDate: string;
    rating: number;
    review: string;
  }) => void;
}

export function AddMediaModal({ onClose, onSave }: AddMediaModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MediaType>('Movie');
  const [coverImage, setCoverImage] = useState('');
  const [watchDate, setWatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [rating, setRating] = useState(8);
  const [review, setReview] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title, type, coverImage, watchDate, rating, review });
  };

  const previewEntry = {
    title: title || 'Title',
    type,
    coverImage,
    watchDate,
    rating,
    review,
    createdAt: Date.now()
  };

  return (
    <div className={`animate-in ${styles.overlay}`}>
      <div className={styles.backdrop} onClick={onClose} />
      
      <div className={`glass-card ${styles.modal}`}>
        <button onClick={onClose} className={styles.closeBtn}>
          <X size={20} />
        </button>

        {/* Left Column: Form */}
        <div>
          <h2 className={styles.title}>Log New Media</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              label="Title"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Inception"
            />

            <div className={styles.row}>
              <Select
                label="Type"
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as MediaType)}
                options={[
                  { value: 'Movie', label: 'Movie' },
                  { value: 'Series', label: 'Series' },
                  { value: 'Anime', label: 'Anime' },
                ]}
              />
              <Input
                label="Watch Date"
                id="watchDate"
                type="date"
                value={watchDate}
                onChange={(e) => setWatchDate(e.target.value)}
                required
              />
            </div>

            <Input
              label="Cover Image URL"
              id="coverImage"
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://example.com/poster.jpg"
            />

            <div className={styles.rangeContainer}>
              <div className={styles.rangeHeader}>
                <label htmlFor="rating" className={styles.rangeLabel}>Rating</label>
                <span className={styles.rangeValue}>{rating} / 10</span>
              </div>
              <input
                type="range"
                id="rating"
                min="1"
                max="10"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className={styles.rangeInput}
              />
            </div>

            <Textarea
              label="Review (Optional)"
              id="review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="What did you think about it?"
            />

            <Button type="submit" variant="primary" style={{ marginTop: '0.5rem' }}>
              <Save size={18} /> Save Entry
            </Button>
          </form>
        </div>

        {/* Right Column: Live Preview */}
        <div className={styles.previewSection}>
          <span className={styles.previewTitle}>Live Preview</span>
          <div className={styles.previewWrapper}>
            <MediaCard entry={previewEntry} />
          </div>
        </div>

      </div>
    </div>
  );
}
