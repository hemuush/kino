"use client";

import { useMedia } from "@/context/MediaContext";
import { motion } from "framer-motion";
import { Clock, Heart, PlayCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { isEpisodic } from "@/lib/db";
import { useMemo } from "react";

export default function ProfileBentoPage() {
  const { entries, isLoading } = useMedia();

  const stats = useMemo(() => {
    if (!entries.length) return null;

    let totalWatchMinutes = 0;
    entries.forEach(e => {
        if (e.status === 'Completed' || e.status === 'Watching') {
            if (e.type === 'Movie') totalWatchMinutes += 120; // Avg 2 hours per movie
            else if (isEpisodic(e)) totalWatchMinutes += (e.episodesWatched || 0) * 24; // Avg 24m per ep
        }
    });

    const favorites = entries.filter(e => e.favorite).slice(0, 4);
    const currentlyWatching = entries.filter(e => e.status === 'Watching').sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    
    // Calculate a mock rarity based on completion
    const completedCount = entries.filter(e => e.status === 'Completed').length;
    let badge = { name: "Beginner", icon: "🌱", color: "from-green-500 to-emerald-500" };
    if (completedCount >= 100) badge = { name: "Grandmaster", icon: "👑", color: "from-amber-400 to-orange-500" };
    else if (completedCount >= 50) badge = { name: "Cinephile", icon: "🍿", color: "from-purple-500 to-pink-500" };
    else if (completedCount >= 10) badge = { name: "Explorer", icon: "🧭", color: "from-blue-400 to-cyan-500" };

    return { totalWatchMinutes, favorites, currentlyWatching, badge, completedCount };
  }, [entries]);

  if (isLoading || !stats) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  const { totalWatchMinutes, favorites, currentlyWatching, badge, completedCount } = stats;
  const daysWatched = Math.floor(totalWatchMinutes / (24 * 60));
  const hoursWatched = Math.floor((totalWatchMinutes % (24 * 60)) / 60);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative overflow-hidden">
      {/* Ambient BG */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 relative z-10">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight text-white flex items-center gap-3">
              Your Profile <Sparkles className="text-primary" size={28} />
            </h1>
            <p className="text-muted-foreground mt-2 font-mono uppercase tracking-[0.2em] text-xs font-bold">Public Bento Box</p>
          </div>
          <Link href="/" className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all shadow-sm">
            Back to Dashboard
          </Link>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 auto-rows-[160px] gap-4 sm:gap-6">
          
          {/* Watch Time Widget (2x2 on Desktop) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
            className="md:col-span-2 md:row-span-2 rounded-[32px] p-8 bg-gradient-to-br from-card/80 to-background border border-white/5 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Clock size={200} />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
                <Clock size={16} /> Total Time Tracked
              </div>
              <div>
                <div className="text-6xl sm:text-7xl font-black font-display tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50">
                  {daysWatched}<span className="text-2xl sm:text-3xl text-white/40 ml-1">d</span> {hoursWatched}<span className="text-2xl sm:text-3xl text-white/40 ml-1">h</span>
                </div>
                <p className="text-muted-foreground font-medium mt-2">Spent exploring cinematic universes.</p>
              </div>
            </div>
          </motion.div>

          {/* Current Binge Widget (2x1) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
            className="md:col-span-2 lg:col-span-2 rounded-[32px] p-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/10 shadow-xl overflow-hidden group"
          >
            <div className="w-full h-full rounded-[28px] bg-card/90 backdrop-blur-xl p-6 flex items-center gap-6 relative overflow-hidden">
                {currentlyWatching?.coverImage && (
                    <div className="absolute inset-0 opacity-20 blur-2xl">
                        <img src={currentlyWatching.coverImage} className="w-full h-full object-cover" alt="" />
                    </div>
                )}
                {currentlyWatching ? (
                    <>
                        <img src={currentlyWatching.coverImage} alt={currentlyWatching.title} className="w-24 h-32 rounded-xl object-cover shadow-lg border border-white/10 z-10" />
                        <div className="z-10 flex-1">
                            <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-widest text-xs mb-2">
                                <PlayCircle size={14} /> Current Binge
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-white line-clamp-2">{currentlyWatching.title}</h3>
                            {isEpisodic(currentlyWatching) && (
                                <p className="text-white/60 font-medium mt-2">Episode {currentlyWatching.episodesWatched}</p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="z-10 text-center w-full">
                        <p className="text-muted-foreground font-semibold">Not watching anything currently.</p>
                    </div>
                )}
            </div>
          </motion.div>

          {/* Rarest Badge (1x1) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.3 }}
            className="rounded-[32px] p-6 bg-card border border-white/5 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden group"
          >
            <div className={`absolute inset-0 bg-gradient-to-b ${badge.color} opacity-10`} />
            <div className="text-5xl mb-3 drop-shadow-2xl group-hover:scale-110 transition-transform duration-500">{badge.icon}</div>
            <h4 className="text-white font-bold text-lg leading-tight">{badge.name}</h4>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{completedCount} Entries</p>
          </motion.div>

          {/* Hall of Fame - Top Favorites (2x2 or 2x1) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.4 }}
            className="md:col-span-3 lg:col-span-4 rounded-[32px] p-6 sm:p-8 bg-card border border-white/5 shadow-xl"
          >
            <div className="flex items-center gap-2 text-rose-400 font-bold uppercase tracking-widest text-xs mb-6">
                <Heart size={16} /> Hall of Fame
            </div>
            {favorites.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {favorites.map(fav => (
                        <div key={fav.id} className="aspect-[2/3] rounded-2xl overflow-hidden relative group">
                            <img src={fav.coverImage} alt={fav.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                <span className="text-white font-bold text-sm line-clamp-2">{fav.title}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="w-full py-10 flex items-center justify-center rounded-2xl border border-dashed border-white/10">
                    <p className="text-muted-foreground font-semibold">No favorites selected yet.</p>
                </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
