"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMedia } from '@/context/MediaContext';
import { format } from 'date-fns';
import { MonitorPlay, X } from 'lucide-react';

export function AmbientMode({ onClose }: { onClose: () => void }) {
  const { entries } = useMedia();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [time, setTime] = useState(new Date());
  
  // Filter only entries with a valid cover image
  const validEntries = useMemo(() => {
    return entries.filter(e => e.coverImage && e.coverImage.trim() !== '');
  }, [entries]);

  // Shuffle entries once on mount so it's random
  const shuffledEntries = useMemo(() => {
    const shuffled = [...validEntries];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [validEntries]);

  // Timer for clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Timer for image cycling
  useEffect(() => {
    if (shuffledEntries.length <= 1) return;
    
    const cycleTimer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % shuffledEntries.length);
    }, 15000); // 15 seconds per image
    
    return () => clearInterval(cycleTimer);
  }, [shuffledEntries.length]);

  // Handle keyboard exit (Esc key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (shuffledEntries.length === 0) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-white p-6">
        <MonitorPlay size={48} className="text-white/20 mb-6" />
        <h2 className="text-2xl font-display font-bold tracking-widest uppercase mb-2">Ambient Mode</h2>
        <p className="text-white/50 text-center max-w-md">
          You don't have any media with cover images yet. Add some posters to your collection to use Ambient Mode.
        </p>
        <button 
          onClick={onClose}
          className="mt-8 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold tracking-widest uppercase text-sm transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  const currentEntry = shuffledEntries[currentIndex];

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden cursor-default">
      {/* Background Images */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentEntry.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 3, ease: 'easeInOut' }}
          className="absolute inset-0 w-full h-full"
        >
          <img 
            src={currentEntry.coverImage} 
            alt={currentEntry.title}
            className="w-full h-full object-cover opacity-60"
          />
          {/* Subtle gradient overlays to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Interactive Overlay to detect activity and show controls */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-8 md:p-12">
        
        {/* Top Header - Controls */}
        <div className="flex justify-between items-start opacity-0 hover:opacity-100 transition-opacity duration-500">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-white/70 text-xs tracking-[0.2em] uppercase font-bold">
            Kino Ambient
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Bottom Content - Clock & Movie Info */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pointer-events-none">
          {/* Clock */}
          <div className="flex flex-col text-white">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-display font-black tracking-tighter leading-none drop-shadow-2xl">
              {format(time, 'HH:mm')}
            </h1>
            <p className="text-lg md:text-2xl font-bold tracking-[0.2em] uppercase text-white/70 mt-2 ml-1">
              {format(time, 'EEEE, MMMM do')}
            </p>
          </div>

          {/* Movie Info */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentEntry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="md:text-right text-white max-w-sm"
            >
              <h3 className="text-xl md:text-3xl font-display font-bold tracking-tight drop-shadow-lg truncate">
                {currentEntry.title}
              </h3>
              <p className="text-xs md:text-sm tracking-[0.2em] uppercase font-bold text-white/50 mt-1">
                {currentEntry.type} {currentEntry.releaseDate ? `· ${currentEntry.releaseDate.split('-')[0]}` : ''}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
