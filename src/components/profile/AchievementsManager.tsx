"use client";

import { useMemo } from 'react';
import { useMedia } from '@/context/MediaContext';
import { Trophy, CalendarDays, Calendar, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SectionHeader } from '../ui/SectionHeader';

export function AchievementsManager() {
    const { entries } = useMedia();
    const router = useRouter();

    const badges = useMemo(() => {
        const b = [];
        const moviesWatched = entries.filter(e => e.type === 'Movie' && e.status === 'Completed').length;
        const showsWatched = entries.filter(e => e.type === 'TV Show' && e.status === 'Completed').length;
        const animesWatched = entries.filter(e => e.type === 'Anime' && e.status === 'Completed').length;
        const perfectScores = entries.filter(e => e.rating === 10).length;
        const highScores = entries.filter(e => e.rating >= 9).length;
        const hasFranchise = entries.some(e => e.franchiseId);
        const hasFavorites = entries.filter(e => e.favorite).length;
        const totalCompleted = entries.filter(e => e.status === 'Completed').length;
        
        const uniqueGenresUsed = new Set<string>();
        entries.forEach(e => {
            if (e.genreIds) e.genreIds.forEach(id => uniqueGenresUsed.add(id));
            else if (e.genre) e.genre.forEach(g => uniqueGenresUsed.add(g));
        });
        const hasManyGenres = uniqueGenresUsed.size;

        b.push({ id: 'first_blood', name: 'First Blood', desc: 'Added your first media', unlocked: entries.length > 0, icon: '🍿', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' });
        b.push({ id: 'getting_started', name: 'The Journey', desc: 'Completed 10 items', unlocked: totalCompleted >= 10, icon: '🎬', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' });
        b.push({ id: 'cinephile', name: 'Cinephile', desc: 'Completed 50 Movies', unlocked: moviesWatched >= 50, icon: '🎟️', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' });
        b.push({ id: 'movie_buff', name: 'Movie Buff', desc: 'Completed 100 Movies', unlocked: moviesWatched >= 100, icon: '🎥', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' });
        b.push({ id: 'binge_watcher', name: 'Binge Watcher', desc: 'Completed 10 TV Shows', unlocked: showsWatched >= 10, icon: '📺', color: 'bg-green-500/10 text-green-500 border-green-500/20' });
        b.push({ id: 'otaku', name: 'Otaku', desc: 'Completed 10 Anime Series', unlocked: animesWatched >= 10, icon: '🌸', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' });
        b.push({ id: 'weeb_master', name: 'Weeb Master', desc: 'Completed 50 Anime', unlocked: animesWatched >= 50, icon: '🎌', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' });
        b.push({ id: 'explorer', name: 'Explorer', desc: 'Tracked 5 different genres', unlocked: hasManyGenres >= 5, icon: '🧭', color: 'bg-teal-500/10 text-teal-500 border-teal-500/20' });
        b.push({ id: 'elite_taste', name: 'Elite Taste', desc: 'Rated 10 items 9+', unlocked: highScores >= 10, icon: '🍷', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' });
        b.push({ id: 'perfectionist', name: 'Perfectionist', desc: 'Rated 5 items 10/10', unlocked: perfectScores >= 5, icon: '⭐', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' });
        b.push({ id: 'saga_master', name: 'Saga Master', desc: 'Tracked a Franchise', unlocked: hasFranchise, icon: '📚', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' });
        b.push({ id: 'superfan', name: 'Superfan', desc: 'Favorited 5 items', unlocked: hasFavorites >= 5, icon: '❤️', color: 'bg-red-500/10 text-red-500 border-red-500/20' });
        b.push({ id: 'completionist', name: 'Completionist', desc: 'Completed 100 items', unlocked: totalCompleted >= 100, icon: '🏆', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' });
        b.push({ id: 'grandmaster', name: 'Grandmaster', desc: 'Completed 500 items', unlocked: totalCompleted >= 500, icon: '👑', color: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' });
        
        return b;
    }, [entries]);

    return (
        <section className="space-y-12">
            {/* Badges Section */}
            <div className="space-y-8">
                <div className="flex flex-col gap-4">
                    <SectionHeader
                        icon={<Trophy size={24} strokeWidth={2.5} />}
                        title="Achievements"
                        description="Track your milestones and earn badges based on your watch history and library curation."
                        compact
                    />

                    {/* Overall Progress */}
                    <div className="w-full bg-black/20 dark:bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col gap-3">
                        <div className="flex justify-between items-end">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Unlock Progress</span>
                            <span className="text-2xl font-black font-display text-primary">{badges.filter(b => b.unlocked).length} <span className="text-sm text-muted-foreground font-medium">/ {badges.length}</span></span>
                        </div>
                        <div className="h-3 w-full bg-background/50 rounded-full overflow-hidden shadow-inner border border-white/5">
                            <div 
                                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000 ease-out relative"
                                style={{ width: `${(badges.filter(b => b.unlocked).length / badges.length) * 100}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                    {badges.map((badge) => (
                        <div 
                            key={badge.id}
                            className={`group relative overflow-hidden rounded-3xl border-2 p-5 sm:p-6 flex flex-col items-center text-center transition-all duration-500 ${
                                badge.unlocked 
                                    ? `bg-gradient-to-b from-card/80 to-card/40 ${badge.color} border-current/20 shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-xl hover:-translate-y-2 hover:shadow-[0_15px_40px_rgb(0,0,0,0.12)] hover:border-current/40 cursor-pointer` 
                                    : 'bg-muted/10 border-dashed border-border/20 opacity-50 grayscale hover:grayscale-0 hover:opacity-80 transition-all duration-500'
                            }`}
                        >
                            {badge.unlocked && (
                                <div className="absolute -inset-24 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 group-hover:animate-[spin_4s_linear_infinite] transition-opacity duration-500 z-0" />
                            )}
                            <div className={`relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl sm:text-4xl mb-4 shadow-inner transition-transform duration-500 group-hover:scale-110 ${badge.unlocked ? badge.color.replace('text-', 'shadow-').replace('/10', '/30') + ' bg-background/50' : 'bg-muted/30'}`}>
                                {badge.icon}
                            </div>
                            <span className="relative z-10 text-[13px] sm:text-[14px] font-black uppercase tracking-widest text-foreground leading-tight mb-1">{badge.name}</span>
                            <span className="relative z-10 text-[10px] sm:text-[11px] text-muted-foreground font-semibold leading-snug">{badge.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recaps Section */}
            <div className="space-y-8 pt-8 border-t border-border/30">
                <SectionHeader
                    icon={<Calendar size={24} strokeWidth={2.5} />}
                    title="Your Wrapped"
                    description="Relive your cinematic journey. Generate your interactive Kino Wrapped for the week, month, or the whole year."
                    tone="purple"
                    compact
                />

                {/* Yearly Wrap — the flagship recap, given top billing and full width */}
                <button
                    onClick={() => router.push('/wraps?type=yearly')}
                    className="relative w-full group overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent p-6 sm:p-8 text-left transition-all hover:border-amber-500/50 hover:shadow-[0_0_50px_rgba(245,158,11,0.18)] hover:-translate-y-1"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500 group-hover:scale-110 transform origin-top-right">
                        <Sparkles size={96} className="text-amber-500" />
                    </div>
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                        <div className="w-14 h-14 shrink-0 rounded-2xl bg-amber-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                            <Sparkles className="text-amber-500" size={28} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Flagship</span>
                            <h4 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-foreground">Yearly Wrap</h4>
                            <p className="text-sm font-medium text-muted-foreground">Your whole year — hours watched, top genre, longest streak, and your standout title.</p>
                        </div>
                    </div>
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <button
                        onClick={() => router.push('/wraps?type=weekly')}
                        className="relative group overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 text-left transition-all hover:border-primary/50 hover:shadow-[0_0_40px_rgba(var(--primary),0.15)] hover:-translate-y-1"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500 group-hover:scale-110 transform origin-top-right">
                            <CalendarDays size={80} className="text-primary" />
                        </div>
                        <div className="relative z-10 flex flex-col gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                                <CalendarDays className="text-primary" size={28} strokeWidth={2.5} />
                            </div>
                            <h4 className="text-2xl font-black font-display tracking-tight text-foreground">Weekly Recap</h4>
                            <p className="text-sm font-medium text-muted-foreground">View your stats for the last 7 days.</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => router.push('/wraps?type=monthly')}
                        className="relative group overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-6 sm:p-8 text-left transition-all hover:border-purple-500/50 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] hover:-translate-y-1"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500 group-hover:scale-110 transform origin-top-right">
                            <Calendar size={80} className="text-purple-500" />
                        </div>
                        <div className="relative z-10 flex flex-col gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                                <Calendar className="text-purple-500" size={28} strokeWidth={2.5} />
                            </div>
                            <h4 className="text-2xl font-black font-display tracking-tight text-foreground">Monthly Recap</h4>
                            <p className="text-sm font-medium text-muted-foreground">Discover your trends for the last 30 days.</p>
                        </div>
                    </button>
                </div>
            </div>
        </section>
    );
}
