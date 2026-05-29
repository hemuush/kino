// File: src/app/collection/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useMedia } from '@/context/MediaContext';
import MediaCard from '@/components/MediaCard';
import { MediaDetailModal } from '@/components/MediaDetailModal';
import { Plus, Film, X, Heart, Shuffle, Search, Settings, Terminal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MediaEntry, isEpisodic } from '@/lib/db';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageLoader } from '@/components/ui/Loader';

function CollectionContent() {
    const { entries, isLoading, updateEntry, deleteEntry, batchUpdateEntries, genres, franchises } = useMedia();
    useAutoRefresh({ entries, batchUpdateEntries, isLoading });
    const searchParams = useSearchParams();
    const router = useRouter();
    const typeParam = searchParams.get('type') as 'All' | 'Movie' | 'Series' | 'Anime' | null;

    const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);
    const [filter, setFilter] = useState<'All' | 'Movie' | 'Series' | 'Anime'>(typeParam || 'All');

    const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Watching' | 'Plan to Watch'>('All');
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [showFilters, setShowFilters] = useState(searchParams.get('filters') !== '0');
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [sortBy, setSortBy] = useState<'Recent' | 'Rating' | 'Title'>('Recent');
    const [viewMode, setViewMode] = useState<'poster' | 'list'>('poster');
    useEffect(() => {
        setSearchQuery(searchParams.get('q') || '');
        setShowFilters(searchParams.get('filters') !== '0');
    }, [searchParams]);

    // Command Menu state
    const [isCmdOpen, setIsCmdOpen] = useState(false);
    const [cmdSearch, setCmdSearch] = useState('');
    const [selectedCmdIdx, setSelectedCmdIdx] = useState(0);
    const cmdInputRef = useRef<HTMLInputElement>(null);

    // Filtered entries
    const sortedEntries = useMemo(() => {
        const filtered = entries.filter(e => {
            if (filter === 'Series' && e.type !== 'TV Show') return false;
            if (filter !== 'All' && filter !== 'Series' && e.type !== filter) return false;

            if (statusFilter !== 'All' && e.status !== statusFilter) return false;
            if (favoritesOnly && !e.favorite) return false;
            if (searchQuery.trim()) {
                const query = searchQuery.trim().toLowerCase();
                const year = e.releaseDate?.slice(0, 4) || '';
                const genreText = (e.genreIds || []).map(id => genres.find(g => g.id === id)?.name || '').join(' ');
                const franchiseText = e.franchiseId ? franchises.find(f => f.id === e.franchiseId)?.name || '' : '';
                const haystack = [
                    e.title,
                    e.type === 'TV Show' ? 'series tv show' : e.type,
                    e.status,
                    year,
                    e.review,
                    genreText,
                    franchiseText,
                ].filter(Boolean).join(' ').toLowerCase();
                return query.split(/\s+/).every(token => haystack.includes(token));
            }
            return true;
        });

        return filtered.sort((a, b) => {
            if (sortBy === 'Rating') return (b.rating || 0) - (a.rating || 0);
            if (sortBy === 'Title') return a.title.localeCompare(b.title);
            return b.createdAt - a.createdAt;
        });
    }, [entries, filter, statusFilter, searchQuery, favoritesOnly, sortBy, genres, franchises]);

    const handleIncrementWatched = (entry: MediaEntry) => {
        if (!isEpisodic(entry)) return;

        const max = entry.episodesTotal || 9999;
        const current = entry.episodesWatched || 0;

        if (current < max) {
            updateEntry({ ...entry, episodesWatched: current + 1 });
        }
    };

    const handleRandomPick = () => {
        const ptw = entries.filter(e => e.status === 'Plan to Watch');
        if (ptw.length === 0) {
            alert("No items in 'Plan to Watch'!");
            return;
        }
        const random = ptw[crypto.getRandomValues(new Uint32Array(1))[0] % ptw.length];
        setSelectedEntry(random);
    };

    const quickStats = useMemo(() => ([
        { label: 'Watching', value: entries.filter(e => e.status === 'Watching').length, onClick: () => setStatusFilter('Watching') },
        { label: 'Plan', value: entries.filter(e => e.status === 'Plan to Watch').length, onClick: () => setStatusFilter('Plan to Watch') },
        { label: 'Completed', value: entries.filter(e => e.status === 'Completed').length, onClick: () => setStatusFilter('Completed') },
        { label: 'Favorites', value: entries.filter(e => e.favorite).length, onClick: () => setFavoritesOnly(true) },
    ]), [entries]);

    // Listen for Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setCmdSearch('');
                setSelectedCmdIdx(0);
                setIsCmdOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsCmdOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when Command Menu opens
    useEffect(() => {
        if (isCmdOpen) {
            setTimeout(() => {
                cmdInputRef.current?.focus();
            }, 100);
        }
    }, [isCmdOpen]);

    // Command options list
    const cmdOptions = useMemo(() => {
        const base = [
            {
                id: 'add',
                title: 'Add New Media',
                description: 'Add a new movie, series, or anime to your watchlist',
                shortcut: 'A',
                icon: Plus,
                action: () => { router.push('/add'); setIsCmdOpen(false); }
            },
            {
                id: 'sagas',
                title: 'Jump to Sagas',
                description: 'Manage your sagas, custom timelines, and franchises',
                shortcut: 'S',
                icon: Film,
                action: () => { router.push('/sagas'); setIsCmdOpen(false); }
            },
            {
                id: 'settings',
                title: 'View Settings',
                description: 'Database sync status, backup controls, and dark theme toggles',
                shortcut: ',',
                icon: Settings,
                action: () => { router.push('/settings'); setIsCmdOpen(false); }
            },
            {
                id: 'random',
                title: 'Pick Random Watch',
                description: 'Choose a random title from your Plan to Watch pool',
                shortcut: 'R',
                icon: Shuffle,
                action: () => { handleRandomPick(); setIsCmdOpen(false); }
            }
        ];

        // Filter based on query
        if (!cmdSearch) return base;
        return base.filter(opt =>
            opt.title.toLowerCase().includes(cmdSearch.toLowerCase()) ||
            opt.description.toLowerCase().includes(cmdSearch.toLowerCase())
        );
    }, [cmdSearch, entries, router]);

    // Handle Keyboard events inside Command Menu
    const handleCmdKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedCmdIdx(prev => (prev + 1) % cmdOptions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedCmdIdx(prev => (prev - 1 + cmdOptions.length) % cmdOptions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (cmdOptions[selectedCmdIdx]) {
                cmdOptions[selectedCmdIdx].action();
            }
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col bg-background pb-4 lg:pb-6 pt-3 sm:pt-4 lg:pt-6 px-3 sm:px-6 lg:px-10 overflow-hidden w-full max-w-[1600px] mx-auto animate-fade-in animate-fade-up">
            {/* Header Area */}
            <div className="shrink-0 pb-4 border-b border-cyan-400/15">
                <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    <div className="hidden md:flex flex-col text-left">
                        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground flex items-center gap-2">
                            My Collection
                        </h1>
                        <p className="text-xs text-muted-foreground mt-1 font-semibold">{entries.length} Items Total</p>
                    </div>

                    <div className="flex w-full sm:w-auto items-center gap-2 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
                        <div className="hidden md:flex items-center rounded-full border border-border/70 bg-card/60 p-1 mr-1">
                            <button onClick={() => setViewMode('poster')} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${viewMode === 'poster' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}>Poster</button>
                            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${viewMode === 'list' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}>List</button>
                        </div>
                        {/* Cmd+K trigger button */}
                        <button
                            onClick={() => setIsCmdOpen(true)}
                            className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-full bg-card/70 dark:bg-neutral-950/65 hover:bg-muted dark:hover:bg-neutral-900 text-muted-foreground hover:text-foreground font-medium text-[12.5px] border border-border/80 dark:border-white/5 transition-all cursor-pointer shadow-sm"
                        >
                            <Terminal size={13} />
                            <span>Quick Menu</span>
                            <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-border/60 dark:border-white/10 bg-muted dark:bg-white/5 px-1.5 font-mono text-[9px] font-bold text-muted-foreground leading-none">
                                ⌘K
                            </kbd>
                        </button>
                        <button
                            onClick={handleRandomPick}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-500/15 font-semibold text-[12.5px] transition-colors whitespace-nowrap border border-amber-500/15 cursor-pointer"
                        >
                            <Shuffle size={13} /> Pick Random
                        </button>
                        
                        <div className="h-6 w-px bg-black/5 dark:bg-white/10 mx-1 hidden sm:block"></div>
                        <Link
                            href="/add"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-[13px] transition-all whitespace-nowrap shadow-sm cursor-pointer"
                        >
                            <Plus size={15} strokeWidth={2.5} /> Add Media
                        </Link>
                    </div>
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="max-w-[1600px] mx-auto pt-5 flex flex-col gap-4">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    {/* Horizontal scroll container for filters */}
                                    <div className="w-full min-w-0 overflow-x-auto hide-scrollbar pb-2 md:pb-0">
                                        <div className="flex w-max min-w-full items-center gap-3 md:w-auto md:min-w-0">
                                        {/* Neon Cyan Filter Pills: Type */}
                                        <div className="flex bg-card/70 dark:bg-neutral-950/65 p-1 rounded-full border border-border/80 dark:border-white/5 shadow-sm shrink-0">
                                            {(['All', 'Movie', 'Series', 'Anime'] as const).map(f => {
                                                const isActive = filter === f;
                                                return (
                                                    <button
                                                        key={f}
                                                        onClick={() => {
                                                            setFilter(f);
                                                            if (f === 'All') router.push('/collection');
                                                            else router.push(`/collection?type=${f}`);
                                                        }}
                                                        className={`px-4.5 py-1.5 text-[12px] font-bold rounded-full transition-all duration-300 cursor-pointer whitespace-nowrap ${isActive ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)] font-bold' : 'text-muted-foreground border border-transparent hover:text-foreground'}`}
                                                    >
                                                        {f}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Neon Cyan Filter Pills: Status */}
                                        <div className="flex bg-card/70 dark:bg-neutral-950/65 p-1 rounded-full border border-border/80 dark:border-white/5 shadow-sm shrink-0">
                                            {(['All', 'Completed', 'Watching', 'Plan to Watch'] as const).map(s => {
                                                const isActive = statusFilter === s;
                                                return (
                                                    <button
                                                        key={s}
                                                        onClick={() => setStatusFilter(s)}
                                                        className={`px-4.5 py-1.5 text-[12px] font-bold rounded-full transition-all duration-300 cursor-pointer whitespace-nowrap ${isActive ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)] font-bold' : 'text-muted-foreground border border-transparent hover:text-foreground'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <select
                                            value={sortBy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as 'Recent' | 'Rating' | 'Title')}
                                            className="bg-card/70 dark:bg-neutral-950/65 border border-border/80 dark:border-white/5 rounded-full px-4 py-2 text-[12.5px] font-semibold outline-none text-muted-foreground hover:text-foreground transition-colors cursor-pointer shadow-sm shrink-0"
                                        >
                                            <option value="Recent">Newest First</option>
                                            <option value="Rating">Highest Rated</option>
                                            <option value="Title">Alphabetical</option>
                                        </select>

                                        <button
                                            onClick={() => setFavoritesOnly(!favoritesOnly)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12.5px] font-semibold transition-all border cursor-pointer shadow-sm shrink-0 ${favoritesOnly ? 'bg-red-500/15 border-red-500/30 text-red-500' : 'bg-card/70 dark:bg-neutral-950/65 text-muted-foreground border-border/80 dark:border-white/5 hover:text-foreground hover:bg-muted dark:hover:bg-neutral-900'}`}
                                        >
                                            <Heart size={14} className={favoritesOnly ? "fill-red-500 text-red-500" : ""} /> Favorites
                                        </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar pt-4 z-10 relative pb-28 lg:pb-4">
                {isLoading ? (
                    <PageLoader text="Loading Library..." />
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 max-w-sm mx-auto text-center animate-fade-in">
                        <div className="w-16 h-16 bg-card/70 dark:bg-neutral-950/65 rounded-full flex items-center justify-center mb-6 border border-border/80 dark:border-white/5 shadow-sm">
                            <Film size={26} className="text-muted-foreground/50" />
                        </div>
                        <h2 className="text-[17px] font-bold mb-2 text-foreground">Your collection is empty</h2>
                        <p className="text-muted-foreground text-[13px] mb-8 leading-relaxed">Start tracking your movies, TV shows, and anime to build your personalized library.</p>
                        <Link href="/add" className="bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-full font-semibold text-[13px] shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-2">
                            <Plus size={15} strokeWidth={2.5} /> Add Your First Entry
                        </Link>
                    </div>
                ) : sortedEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                        <p className="text-muted-foreground font-medium text-sm">No matches found for your filters.</p>
                        <button onClick={() => { setSearchQuery(''); setFilter('All'); setStatusFilter('All'); setFavoritesOnly(false); router.push('/collection'); }} className="mt-4 text-primary font-semibold text-[13px] hover:underline">
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    <section>
                        {showFilters && (
                            <div className="mb-4 flex flex-wrap gap-2">
                                {quickStats.map((s) => (
                                    <button key={s.label} onClick={s.onClick} className="rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50">
                                        {s.label}: <span className="text-foreground">{s.value}</span>
                                    </button>
                                ))}
                                <button onClick={() => { setSearchQuery(''); setFilter('All'); setStatusFilter('All'); setFavoritesOnly(false); router.push('/collection'); }} className="rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
                                    Reset
                                </button>
                            </div>
                        )}
                        <div className="flex items-center justify-between mb-5 px-1">
                            <h2 className="text-[10px] font-bold text-muted-foreground/60 tracking-widest uppercase">
                                {searchQuery ? 'Search Results' : 'Your Collection'}
                            </h2>
                        </div>
                        {viewMode === 'poster' ? (
                            <motion.div layout className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-x-3 sm:gap-x-4 gap-y-5 sm:gap-y-6">
                                <AnimatePresence>
                                    {sortedEntries.map((entry, i) => (
                                        <MediaCard
                                            key={entry.id}
                                            entry={entry}
                                            onClick={() => setSelectedEntry(entry)}
                                            onFavoriteToggle={() => updateEntry({ ...entry, favorite: !entry.favorite })}
                                            onIncrementWatched={() => handleIncrementWatched(entry)}
                                            onStatusChange={(newStatus) => updateEntry({ ...entry, status: newStatus })}
                                            index={i}
                                        />
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        ) : (
                            <motion.div layout className="space-y-2">
                                <AnimatePresence>
                                    {sortedEntries.map((entry) => (
                                        <motion.div key={entry.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl border border-border/70 bg-card/70 p-3 flex items-center gap-3">
                                            <button onClick={() => setSelectedEntry(entry)} className="w-12 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                                                {entry.coverImage ? <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover" /> : null}
                                            </button>
                                            <button onClick={() => setSelectedEntry(entry)} className="text-left min-w-0 flex-1">
                                                <p className="font-semibold truncate">{entry.title}</p>
                                                <p className="text-xs text-muted-foreground">{entry.type} - {entry.status || 'Tracked'}</p>
                                            </button>
                                            <button onClick={() => updateEntry({ ...entry, favorite: !entry.favorite })} className="px-2 py-1 text-xs rounded-lg border border-border/70">Fav</button>
                                            {isEpisodic(entry) && <button onClick={() => handleIncrementWatched(entry)} className="px-2 py-1 text-xs rounded-lg border border-border/70">+1 Ep</button>}
                                            <select value={entry.status || 'Completed'} onChange={(e) => updateEntry({ ...entry, status: e.target.value as MediaEntry['status'] })} className="text-xs rounded-lg border border-border/70 bg-background px-2 py-1">
                                                <option>Completed</option>
                                                <option>Watching</option>
                                                <option>Plan to Watch</option>
                                            </select>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </section>
                )}
            </div>

            {/* Command Menu Modal Overlay (Cmd+K) */}
            <AnimatePresence>
                {isCmdOpen && (
                    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
                        {/* Background Grid Blur */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCmdOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                        />

                        {/* Modal Box */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="relative w-full max-w-xl bg-card/95 dark:bg-neutral-950/95 border border-border/80 dark:border-cyan-400/30 rounded-3xl overflow-hidden shadow-2xl m-4 z-10 flex flex-col"
                            onKeyDown={handleCmdKeyDown}
                        >
                            {/* Command Search Input */}
                            <div className="flex items-center border-b border-border/60 dark:border-white/5 px-4.5 py-3">
                                <Search size={18} className="text-cyan-400 mr-3" />
                                <input
                                    ref={cmdInputRef}
                                    type="text"
                                    placeholder="Type a command or search..."
                                    value={cmdSearch}
                                    onChange={(e) => setCmdSearch(e.target.value)}
                                    className="flex-1 bg-transparent text-foreground placeholder-muted-foreground/60 text-sm outline-none"
                                />
                                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/60 dark:border-white/10 bg-muted dark:bg-white/5 px-1.5 font-mono text-[9px] font-bold text-muted-foreground leading-none">
                                    ESC
                                </kbd>
                            </div>

                            {/* Commands List */}
                            <div className="max-h-[320px] overflow-y-auto p-2">
                                {cmdOptions.length > 0 ? (
                                    cmdOptions.map((opt, idx) => {
                                        const isSelected = idx === selectedCmdIdx;
                                        const Icon = opt.icon;
                                        return (
                                            <div
                                                key={opt.id}
                                                onClick={opt.action}
                                                onMouseEnter={() => setSelectedCmdIdx(idx)}
                                                className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all duration-200 select-none ${isSelected ? 'bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'border border-transparent hover:bg-muted/40 dark:hover:bg-white/5'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl border ${isSelected ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-muted dark:bg-white/5 border-border/60 dark:border-white/5 text-muted-foreground'}`}>
                                                        <Icon size={16} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`text-sm font-bold leading-tight ${isSelected ? 'text-cyan-400' : 'text-foreground'}`}>{opt.title}</p>
                                                        <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-none">{opt.description}</p>
                                                    </div>
                                                </div>
                                                <kbd className={`pointer-events-none inline-flex h-5 items-center justify-center min-w-[20px] rounded border px-1.5 font-mono text-[10px] font-bold leading-none transition-colors ${isSelected ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-400' : 'border-border/60 dark:border-white/10 bg-muted dark:bg-white/5 text-muted-foreground/60'}`}>
                                                    {opt.shortcut}
                                                </kbd>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-8 text-center text-muted-foreground/60 text-xs">
                                        No matching commands found.
                                    </div>
                                )}
                            </div>

                            {/* Command Footer */}
                            <div className="border-t border-border/60 dark:border-white/5 px-4.5 py-2.5 bg-muted/80 dark:bg-neutral-950/80 flex items-center justify-between text-[10px] text-muted-foreground/50 font-mono">
                                <span className="flex items-center gap-1.5">
                                    <span>↑↓ to navigate</span>
                                    <span>•</span>
                                    <span>↵ to select</span>
                                </span>
                                <span>Kino Command Menu</span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Detail Modal */}
            {selectedEntry && (
                <MediaDetailModal
                    entry={selectedEntry}
                    onClose={() => setSelectedEntry(null)}
                    onSave={async (updatedEntry) => {
                        updateEntry(updatedEntry);
                        setSelectedEntry(updatedEntry);
                    }}
                    onDelete={async (id) => {
                        deleteEntry(id);
                        setSelectedEntry(null);
                    }}
                />
            )}
        </div>
    );
}

export default function Collection() {
    return (
        <Suspense fallback={<PageLoader fullScreen text="Loading Collection..." />}>
            <CollectionContent />
        </Suspense>
    );
}
