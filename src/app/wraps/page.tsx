"use client";

import { useState } from 'react';
import { useMedia } from '@/context/MediaContext';
import { RecapModal } from '@/components/dashboard/RecapModal';
import { Calendar, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WrapsPage() {
  const { entries, genres } = useMedia();
  const [recapType, setRecapType] = useState<'weekly' | 'monthly' | null>(null);

  return (
    <div className="min-h-screen bg-background pb-20 pt-8 sm:pt-12 px-4 sm:px-6 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight text-foreground flex items-center gap-3">
          Your Wraps <Sparkles className="text-primary" size={28} />
        </h1>
        <p className="text-muted-foreground mt-2 font-mono uppercase tracking-[0.2em] text-xs font-bold">
          Cinematic Time Capsules
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Wrap */}
        <button 
          onClick={() => setRecapType('weekly')}
          className="group relative overflow-hidden rounded-[32px] p-8 text-left bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-out" />
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500 group-hover:scale-110 transform origin-top-right">
            <Calendar size={80} className="text-blue-500" />
          </div>
          <div className="relative z-10 flex flex-col gap-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <Calendar className="text-blue-500" size={28} strokeWidth={2.5} />
            </div>
            <h4 className="text-3xl font-black font-display tracking-tight text-foreground">Weekly Wrap</h4>
            <p className="text-base font-medium text-muted-foreground">Look back at your cinematic journey over the last 7 days.</p>
          </div>
        </button>

        {/* Monthly Wrap */}
        <button 
          onClick={() => setRecapType('monthly')}
          className="group relative overflow-hidden rounded-[32px] p-8 text-left bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-out" />
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500 group-hover:scale-110 transform origin-top-right">
            <Calendar size={80} className="text-purple-500" />
          </div>
          <div className="relative z-10 flex flex-col gap-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <Calendar className="text-purple-500" size={28} strokeWidth={2.5} />
            </div>
            <h4 className="text-3xl font-black font-display tracking-tight text-foreground">Monthly Wrap</h4>
            <p className="text-base font-medium text-muted-foreground">Discover your trends for the last 30 days.</p>
          </div>
        </button>
      </div>

      {recapType && (
        <RecapModal 
          isOpen={!!recapType} 
          onClose={() => setRecapType(null)} 
          entries={entries} 
          genres={genres} 
          type={recapType} 
        />
      )}
    </div>
  );
}
