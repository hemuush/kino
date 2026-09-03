"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, Sparkles, CheckCircle2, Star } from 'lucide-react';
import Link from 'next/link';
import { KinoLogo } from '@/components/KinoLogo';
import { AmbientGlow } from '@/components/ui/AmbientGlow';

interface ShareData {
  t?: string;
  h?: number | string;
  c?: number | string;
  g?: string;
  tm?: string;
}

function ShareContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const d = searchParams.get('d');
    Promise.resolve().then(() => {
      try {
        if (d) {
          const decoded = JSON.parse(decodeURIComponent(atob(d)));
          setData(decoded);
        } else {
          setError(true);
        }
      } catch (_e) {
        setError(true);
      }
    });
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold font-display text-foreground">Invalid Share Link</h1>
        <p className="text-muted-foreground mt-2 mb-6">This recap link is broken or malformed.</p>
        <Link href="/" className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl">
          Build Your Own Tracker
        </Link>
      </div>
    );
  }

  if (!data) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Immersive background glows */}
      <AmbientGlow glows={[
        "top-[-10%] right-[-10%] w-[70%] h-[60%] bg-primary/20 blur-[140px]",
        "bottom-[-10%] left-[-10%] w-[70%] h-[60%] bg-purple-500/20 blur-[140px]",
      ]} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
        className="w-full max-w-sm sm:max-w-md aspect-[4/5] sm:aspect-auto bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-4xl sm:rounded-[40px] p-6 sm:p-10 flex flex-col relative z-10 overflow-hidden"
      >
        {/* Card internal glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-purple-500/10 pointer-events-none" />

        <div className="flex-1 flex flex-col items-center justify-center space-y-8 sm:space-y-10 relative z-10">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-widest uppercase mb-4">
              <Sparkles size={12} className="mr-1.5" />
              {data.t === 'weekly' ? 'Weekly Recap' : 'Monthly Recap'}
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tight text-foreground leading-none">
              Cinema<br/>Journey
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
            <div className="bg-black/20 dark:bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center space-y-1">
              <span className="text-3xl sm:text-4xl font-bold font-display text-blue-400">{data.h}</span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1">
                <Clock size={10} /> Hours
              </span>
            </div>
            <div className="bg-black/20 dark:bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center space-y-1">
              <span className="text-3xl sm:text-4xl font-bold font-display text-emerald-400">{data.c}</span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1">
                <CheckCircle2 size={10} /> Finished
              </span>
            </div>
          </div>

          <div className="w-full space-y-3 sm:space-y-4">
            <div className="bg-black/20 dark:bg-black/40 border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <TrendingUp size={20} className="text-purple-400" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Top Genre</span>
                  <span className="text-lg sm:text-xl font-bold text-foreground leading-tight">{data.g}</span>
                </div>
              </div>
            </div>

            {data.tm && (
              <div className="bg-black/20 dark:bg-black/40 border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
                    <Star size={20} className="text-yellow-400" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Favorite Find</span>
                    <span className="text-sm sm:text-base font-bold text-foreground leading-tight truncate">{data.tm}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
        
        {/* Bottom Logo branding */}
        <div className="mt-6 pt-6 border-t border-white/5 flex justify-center w-full">
          <KinoLogo />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 relative z-10 text-center"
      >
        <Link href="/" className="px-8 py-3.5 bg-foreground hover:bg-foreground/90 text-background font-bold font-display uppercase tracking-widest text-[10px] rounded-full transition-transform hover:scale-105 inline-block shadow-xl">
          Build Your Own Tracker
        </Link>
      </motion.div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <ShareContent />
    </Suspense>
  );
}
