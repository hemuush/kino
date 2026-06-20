"use client";

import { useMemo, useState } from 'react';
import { useMedia } from '@/context/MediaContext';
import { Trophy, CalendarDays, Calendar } from 'lucide-react';
import { RecapModal } from '../dashboard/RecapModal';

export function AchievementsManager() {
    const { entries, genres } = useMedia();
    const [recapType, setRecapType] = useState<'weekly' | 'monthly' | null>(null);

    const badges = useMemo(() => {
        const b = [];
        const moviesWatched = entries.filter(e => e.type === 'Movie' && e.status === 'Completed').length;
        const showsWatched = entries.filter(e => e.type === 'TV Show' && e.status === 'Completed').length;
        const animesWatched = entries.filter(e => e.type === 'Anime' && e.status === 'Completed').length;
        const perfectScores = entries.filter(e => e.rating === 10).length;
        const hasFranchise = entries.some(e => e.franchiseId);
        const hasFavorites = entries.filter(e => e.favorite).length;
        const totalCompleted = entries.filter(e => e.status === 'Completed').length;

        b.push({
            id: 'first_blood', name: 'First Blood', desc: 'Added your first media',
            unlocked: entries.length > 0, icon: '🍿', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
        });
        b.push({
            id: 'cinephile', name: 'Cinephile', desc: 'Completed 50 Movies',
            unlocked: moviesWatched >= 50, icon: '🎟️', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
        });
        b.push({
            id: 'binge_watcher', name: 'Binge Watcher', desc: 'Completed 10 TV Shows',
            unlocked: showsWatched >= 10, icon: '📺', color: 'bg-green-500/10 text-green-500 border-green-500/20'
        });
        b.push({
            id: 'otaku', name: 'Otaku', desc: 'Completed 10 Anime Series',
            unlocked: animesWatched >= 10, icon: '🌸', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20'
        });
        b.push({
            id: 'perfectionist', name: 'Perfectionist', desc: 'Rated 5 items 10/10',
            unlocked: perfectScores >= 5, icon: '⭐', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
        });
        b.push({
            id: 'saga_master', name: 'Saga Master', desc: 'Tracked a Franchise',
            unlocked: hasFranchise, icon: '📚', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        });
        b.push({
            id: 'superfan', name: 'Superfan', desc: 'Favorited 5 items',
            unlocked: hasFavorites >= 5, icon: '❤️', color: 'bg-red-500/10 text-red-500 border-red-500/20'
        });
        b.push({
            id: 'completionist', name: 'Completionist', desc: 'Completed 100 items',
            unlocked: totalCompleted >= 100, icon: '🏆', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
        });
        
        return b;
    }, [entries]);

    return (
        <section className="space-y-10">
            {/* Badges Section */}
            <div className="space-y-6">
                <div className="flex flex-col gap-1">
                    <h3 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-foreground flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-xl text-primary shadow-[0_0_20px_-5px_rgba(var(--primary),0.3)]">
                            <Trophy size={24} strokeWidth={2.5} />
                        </div>
                        Achievements
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-2xl mt-1">
                        Track your milestones and earn badges based on your watch history and library curation.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {badges.map((badge) => (
                        <div 
                            key={badge.id}
                            className={`rounded-2xl border-2 p-4 flex flex-col items-center text-center transition-all ${badge.unlocked ? `bg-card/65 ${badge.color} border-border/40 shadow-sm backdrop-blur-md hover:scale-105 cursor-default` : 'bg-muted/30 border-dashed border-border/30 opacity-60 grayscale'}`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-3 shadow-inner ${badge.unlocked ? badge.color : 'bg-muted'}`}>
                                {badge.icon}
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">{badge.name}</span>
                            <span className="text-[9px] mt-1 text-muted-foreground font-medium leading-tight">{badge.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recaps Section */}
            <div className="space-y-6 pt-4 border-t border-border/50">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground flex items-center gap-2">
                        <Calendar className="text-primary" size={24} />
                        Your History & Recaps
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                        Relive your cinematic journey. Generate your interactive Kino Wrapped for the past week or month.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                        onClick={() => setRecapType('weekly')}
                        className="relative group overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-6 text-left transition-all hover:border-primary/50 hover:shadow-[0_0_30px_rgba(var(--primary),0.15)]"
                    >
                        <div className="absolute inset-0 bg-primary/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                        <div className="relative z-10 flex flex-col gap-2">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                                <CalendarDays className="text-primary" size={24} />
                            </div>
                            <h4 className="text-xl font-bold font-display">Weekly Wrapped</h4>
                            <p className="text-sm text-muted-foreground">View your stats for the last 7 days.</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => setRecapType('monthly')}
                        className="relative group overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent p-6 text-left transition-all hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]"
                    >
                        <div className="absolute inset-0 bg-purple-500/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                        <div className="relative z-10 flex flex-col gap-2">
                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-2">
                                <Calendar className="text-purple-500" size={24} />
                            </div>
                            <h4 className="text-xl font-bold font-display text-purple-400">Monthly Wrapped</h4>
                            <p className="text-sm text-muted-foreground">Discover your trends for the last 30 days.</p>
                        </div>
                    </button>
                </div>
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
        </section>
    );
}
