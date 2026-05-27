// File: src/app/collection/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useMedia } from '@/context/MediaContext';
import MediaCard from '@/components/MediaCard';
import { MediaDetailModal } from '@/components/MediaDetailModal';
import { Plus, Film, X, Heart, Shuffle, SlidersHorizontal, Search, Settings, Terminal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MediaEntry, isEpisodic } from '@/lib/db';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageLoader } from '@/components/ui/Loader';

function CollectionContent() {
    const { entries, isLoading, updateEntry, deleteEntry, batchUpdateEntries } = useMedia();
    useAutoRefresh({ entries, batchUpdateEntries, isLoading });
    const searchParams = useSearchParams();
    const router = useRouter();
    const typeParam = searchParams.get('type') as 'All' | 'Movie' | 'Series' | 'Anime' | null;

    const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);
    const [filter, setFilter] = useState<'All' | 'Movie' | 'Series' | 'Anime'>(typeParam || 'All');

    const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Watching' | 'Plan to Watch'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(true);
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [sortBy, setSortBy] = useState<'Recent' | 'Rating' | 'Title'>('Recent');

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
            if (searchQuery) {
                return e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.review?.toLowerCase().includes(searchQuery.toLowerCase());
            }
            return true;
        });

        return filtered.sort((a, b) => {
            if (sortBy === 'Rating') return (b.rating || 0) - (a.rating || 0);
            if (sortBy === 'Title') return a.title.localeCompare(b.title);
            return b.createdAt - a.createdAt;
        });
    }, [entries, filter, statusFilter, searchQuery, favoritesOnly, sortBy]);

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
        <div className="absolute inset-0 flex flex-col bg-[radial-gradient(circle_at_15%_0%,rgba(56,189,248,0.08),transparent_35%),radial-gradient(circle_at_85%_0%,rgba(251,191,36,0.06),transparent_38%),var(--background)] pb-4 lg:pb-6 pt-4 lg:pt-6 px-4 sm:px-8 lg:px-10 overflow-hidden w-full max-w-[1600px] mx-auto animate-fade-in animate-fade-up">
            {/* Ambient background glow orbs */}
            <div className="absolute top-[15%] left-[25%] w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px] bg-purple-500/5 rounded-full blur-[110px] pointer-events-none" />

            {/* Header Area */}
            <div className="shrink-0 pb-4 border-b border-cyan-400/15">
                <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    <div className="flex flex-col text-left">
                        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground flex items-center gap-2">
                            My Collection
                        </h1>
                        <p className="text-xs text-muted-foreground mt-1 font-semibold">{entries.length} Items Total</p>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
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
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-[12.5px] transition-all whitespace-nowrap border cursor-pointer shadow-sm ${showFilters ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25 shadow-cyan-500/5' : 'bg-card/70 dark:bg-neutral-950/65 text-foreground hover:bg-muted dark:hover:bg-neutral-900 border-border/80 dark:border-white/5'}`}
                        >
                            <SlidersHorizontal size={13} /> Filters
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
                                    {/* Search Bar */}
                                    <div className="relative w-full md:max-w-[340px] shrink-0">
                                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search collection..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-card/70 dark:bg-neutral-950/65 focus:bg-muted/80 rounded-full pl-11 pr-4 py-2 text-[13.5px] outline-none border border-border/80 dark:border-white/5 focus:border-cyan-400/35 transition-all text-foreground shadow-inner"
                                        />
                                        {searchQuery && (
                                            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                                <X size={15} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Horizontal scroll container for the rest of filters on mobile, normal flex on desktop */}
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
            <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar pt-4 z-10 relative pb-28">
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
                        <div className="flex items-center justify-between mb-5 px-1">
                            <h2 className="text-[10px] font-bold text-muted-foreground/60 tracking-widest uppercase">
                                {searchQuery ? 'Search Results' : 'Your Collection'}
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-x-4 gap-y-6">
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
                        </div>
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
