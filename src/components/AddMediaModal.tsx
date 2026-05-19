"use client";

import { useState, useRef, useEffect } from 'react';
import { MediaType } from '@/lib/db';
import { X, Check, Image as ImageIcon, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const mediaTypes: { value: MediaType; label: string }[] = [
  { value: 'Movie', label: 'Movie' },
  { value: 'Series', label: 'Series' },
  { value: 'Anime', label: 'Anime' },
];

export function AddMediaModal({ onClose, onSave }: AddMediaModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<MediaType>('Movie');
  const [coverImage, setCoverImage] = useState('');
  const [watchDate, setWatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [rating, setRating] = useState(8);
  const [review, setReview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    await onSave({ title, type, coverImage, watchDate, rating, review });
  };

  const displayRating = hoveredStar !== null ? hoveredStar : rating;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="relative w-full max-w-lg max-h-[90vh] bg-card rounded-t-[28px] sm:rounded-2xl overflow-hidden z-[101] flex flex-col shadow-2xl border border-border"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="font-display text-[17px] font-bold tracking-tight">Add to Collection</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-card-hover transition-colors focus-ring"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
            
            {/* Type Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
              <div className="flex gap-2">
                {mediaTypes.map((mt) => (
                  <button
                    key={mt.value}
                    type="button"
                    onClick={() => setType(mt.value)}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                      type === mt.value
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Inception, Breaking Bad..."
                className="w-full bg-muted rounded-xl px-4 py-3 text-foreground text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cover URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <ImageIcon size={15} className="text-muted-foreground/50" />
                </div>
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="Paste poster URL..."
                  className="w-full bg-muted rounded-xl pl-10 pr-4 py-3 text-foreground text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
              {coverImage && (
                <div className="mt-2 w-16 h-24 rounded-xl overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>

            {/* Watch Date */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Watch Date</label>
              <input
                type="date"
                value={watchDate}
                onChange={(e) => setWatchDate(e.target.value)}
                required
                className="w-full bg-muted rounded-xl px-4 py-3 text-foreground text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            {/* Rating */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Rating</label>
                <span className="text-[13px] font-bold text-primary tabular-nums">{displayRating}/10</span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoveredStar(value)}
                    onMouseLeave={() => setHoveredStar(null)}
                    className="p-0.5 transition-transform hover:scale-110 active:scale-90"
                  >
                    <Star
                      size={22}
                      className={`transition-colors duration-150 ${
                        value <= displayRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-muted-foreground/20'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Review */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Review <span className="text-muted-foreground/40 normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="What did you think?"
                className="w-full bg-muted rounded-xl px-4 py-3 text-foreground text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all min-h-[80px] resize-none"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-[13px] font-semibold bg-muted hover:bg-card-hover text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || isSaving}
              className="flex-[2] py-3 rounded-xl text-[13px] font-bold bg-foreground text-background transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none hover:opacity-90 active:scale-[0.98]"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <Check size={16} strokeWidth={2.5} />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
