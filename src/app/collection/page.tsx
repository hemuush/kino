"use client";

import { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
import { useMedia } from '@/context/MediaContext';
import MediaCard from '@/components/MediaCard';
import { MediaDetailModal } from '@/components/MediaDetailModal';
import { Plus, Film, Heart, Shuffle, Search, Settings, Terminal, LayoutGrid, List, SlidersHorizontal, Activity, Play, Star, CheckCircle, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MediaEntry, isEpisodic } from '@/lib/db';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageLoader } from '@/components/ui/Loader';

function CollectionContent() {
    const { entries, isLoading, updateEntry, deleteEntry, batchUpdateEntries, genres, franchises } = useMedia();
    const searchParams = useSearchParams();
    const router = useRouter();
    const typeParam = searchParams.get('type') as 'All' | 'Movie' | 'Series' | 'Anime' | null;

    const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);
    const [filter, setFilter] = useState<'All' | 'Movie' | 'Series' | 'Anime'>(typeParam || 'All');

    const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Watching' | 'Plan to Watch'>('All');
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [sortBy, setSortBy] = useState<'Recent' | 'Rating' | 'Title'>('Recent');
    const [viewMode, setViewMode] = useState<'poster' | 'list'>('poster');
    const [visibleCount, setVisibleCount] = useState(60);

    const searchQuery = searchParams.get('q') || '';

    // Command Menu state
    const [isCmdOpen, setIsCmdOpen] = useState(false);
    const [cmdSearch, setCmdSearch] = useState('');
    const [selectedCmdIdx, setSelectedCmdIdx] = useState(0);
    const cmdInputRef = useRef<HTMLInputElement>(null);
    
    // Dock state
    const [isFilterDockOpen, setIsFilterDockOpen] = useState(false);

    // Derived states
    const recentEntry = useMemo(() => {
        if (!entries || entries.length === 0) return null;
        return [...entries].sort((a, b) => b.createdAt - a.createdAt)[0];
    }, [entries]);

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

    // Infinite Scroll Observer
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useCallback((node: HTMLDivElement) => {
        if (isLoading) return;
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && sortedEntries.length > visibleCount) {
                setVisibleCount(prev => prev + 60);
            }
        }, { rootMargin: '400px' });
        if (node) observerRef.current.observe(node);
    }, [isLoading, sortedEntries.length, visibleCount]);

    const handleIncrementWatched = (entry: MediaEntry, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
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
                setIsFilterDockOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (isCmdOpen) {
            setTimeout(() => {
                cmdInputRef.current?.focus();
            }, 100);
        }
    }, [isCmdOpen]);

    const cmdOptions = useMemo(() => {
        const base = [
            { id: 'add', title: 'Add New Media', description: 'Add a new movie, series, or anime', shortcut: 'A', icon: Plus, action: () => { router.push('/add'); setIsCmdOpen(false); } },
            { id: 'sagas', title: 'Jump to Sagas', description: 'Manage custom timelines and franchises', shortcut: 'S', icon: Film, action: () => { router.push('/sagas'); setIsCmdOpen(false); } },
            { id: 'settings', title: 'View Settings', description: 'App settings and database sync', shortcut: ',', icon: Settings, action: () => { router.push('/settings'); setIsCmdOpen(false); } },
            { id: 'random', title: 'Pick Random Watch', description: 'Choose a random title from Plan to Watch', shortcut: 'R', icon: Shuffle, action: () => { handleRandomPick(); setIsCmdOpen(false); } }
        ];

        if (!cmdSearch) return base;
        return base.filter(opt => opt.title.toLowerCase().includes(cmdSearch.toLowerCase()) || opt.description.toLowerCase().includes(cmdSearch.toLowerCase()));
    }, [cmdSearch, entries, router]);

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
        <div className="absolute inset-0 overflow-y-auto bg-background text-foreground scroll-smooth hide-scrollbar">
            {/* Ambient Backing */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-100 z-0" />
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-[2400px] py-4 sm:py-6 px-4 sm:px-8 lg:px-12 pb-48">
                


                {/* Content Only */}

                {/* Library Section */}
                <section>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-[11px] font-mono tracking-[0.2em] text-muted-foreground uppercase font-bold">
                            {searchQuery ? 'Search Results' : 'Full Library'}
                        </h2>
                        <span className="text-xs font-semibold text-muted-foreground">{sortedEntries.length} items</span>
                    </div>

                    {isLoading ? (
                        <div className="py-20 flex justify-center"><PageLoader text="Loading Library..." /></div>
                    ) : entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 rounded-full bg-card/65 border border-border/80 flex items-center justify-center mb-6 shadow-sm">
                                <Film size={32} className="text-muted-foreground/50" />
                            </div>
                            <h2 className="text-2xl font-display font-bold mb-2">Empty Collection</h2>
                            <p className="text-muted-foreground text-sm mb-8 max-w-sm">Your library is currently empty. Start adding media to build your personal collection.</p>
                            <Link href="/add" className="bg-foreground text-background px-6 py-3 rounded-full font-bold text-sm shadow-md hover:bg-foreground/90 transition-all flex items-center gap-2">
                                <Plus size={18} strokeWidth={3} /> Add First Entry
                            </Link>
                        </div>
                    ) : sortedEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center border border-border/40 rounded-[32px] bg-card/20 backdrop-blur-sm">
                            <Search size={32} className="text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-bold mb-1">No Matches Found</h3>
                            <p className="text-muted-foreground text-sm">Try adjusting your filters or search query.</p>
                            <button onClick={() => { setFilter('All'); setStatusFilter('All'); setFavoritesOnly(false); router.push('/collection'); }} className="mt-6 font-bold text-sm text-primary hover:underline">
                                Clear all filters
                            </button>
                        </div>
                    ) : (
                        viewMode === 'poster' ? (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8">
                                <AnimatePresence mode="popLayout">
                                    {sortedEntries.slice(0, visibleCount).map((entry, i) => (
                                        <motion.div
                                            key={entry.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                                        >
                                            <MediaCard
                                                entry={entry}
                                                onClick={() => router.push(`/media/${entry.id}`)}
                                                onFavoriteToggle={() => updateEntry({ ...entry, favorite: !entry.favorite })}
                                                onIncrementWatched={() => handleIncrementWatched(entry)}
                                                onStatusChange={(newStatus) => updateEntry({ ...entry, status: newStatus })}
                                                index={i}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <AnimatePresence mode="popLayout">
                                    {sortedEntries.slice(0, visibleCount).map((entry, i) => (
                                        <motion.div
                                            key={entry.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.2) }}
                                            className="rounded-[24px] border border-border/80 bg-card/65 dark:bg-[#0c0c0d]/80 backdrop-blur-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/50 transition-colors shadow-sm cursor-pointer group"
                                            onClick={() => router.push(`/media/${entry.id}`)}
                                        >
                                            <div className="flex gap-4 flex-1 items-center">
                                                <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/50">
                                                    {entry.coverImage ? <img src={entry.coverImage} alt={entry.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : null}
                                                </div>
                                                <div className="text-left min-w-0 flex-1">
                                                    <p className="font-display font-bold text-base sm:text-lg truncate">{entry.title}</p>
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mt-1">
                                                        <span>{entry.type}</span>
                                                        <span className="w-1 h-1 rounded-full bg-border" />
                                                        <span>{entry.releaseDate?.slice(0, 4) || 'Unknown Year'}</span>
                                                        <span className="w-1 h-1 rounded-full bg-border" />
                                                        <span className={entry.status === 'Completed' ? 'text-emerald-500' : entry.status === 'Watching' ? 'text-cyan-500' : 'text-amber-500'}>{entry.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end gap-2 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => updateEntry({ ...entry, favorite: !entry.favorite })} className={`p-2.5 rounded-full border transition-all ${entry.favorite ? 'border-red-500/30 bg-red-500/10 text-red-500' : 'border-border/80 bg-background hover:bg-muted text-muted-foreground'}`}>
                                                    <Heart size={16} className={entry.favorite ? "fill-red-500" : ""} />
                                                </button>
                                                {isEpisodic(entry) && (
                                                    <button onClick={(e) => handleIncrementWatched(entry, e)} className="px-4 py-2.5 text-xs font-bold rounded-full border border-border/80 bg-background hover:bg-muted transition-colors flex items-center gap-1">
                                                        <Plus size={14} /> Ep {entry.episodesWatched || 0}
                                                    </button>
                                                )}
                                                <select
                                                    value={entry.status || 'Completed'}
                                                    onChange={(e) => updateEntry({ ...entry, status: e.target.value as MediaEntry['status'] })}
                                                    className="px-4 py-2.5 text-xs font-bold rounded-full border border-border/80 bg-background outline-none cursor-pointer hover:bg-muted transition-colors appearance-none pr-8 relative"
                                                    style={{ backgroundImage: 'linear-gradient(45deg, transparent 50%, gray 50%), linear-gradient(135deg, gray 50%, transparent 50%)', backgroundPosition: 'calc(100% - 15px) calc(1em + 2px), calc(100% - 11px) calc(1em + 2px)', backgroundSize: '4px 4px, 4px 4px', backgroundRepeat: 'no-repeat' }}
                                                >
                                                    <option value="Completed">Completed</option>
                                                    <option value="Watching">Watching</option>
                                                    <option value="Plan to Watch">Plan to Watch</option>
                                                </select>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )
                    )}

                    {/* Infinite Scroll Trigger */}
                    {!isLoading && sortedEntries.length > visibleCount && (
                        <div ref={loadMoreRef} className="flex justify-center mt-12 mb-8 relative z-20 h-10">
                            <PageLoader text="Loading more..." />
                        </div>
                    )}
                </section>
            </div>

            {/* Floating Segmented Dock (Apple/Nothing style) */}
            <div className="fixed bottom-[88px] lg:bottom-8 left-1/2 -translate-x-1/2 z-40 w-[95%] sm:w-auto flex justify-center pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-0.5 sm:gap-2 p-1.5 sm:p-2 rounded-full border border-border/80 bg-card/80 dark:bg-[#0c0c0d]/80 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative">
                    {/* Types */}
                    <div className="flex items-center overflow-x-auto hide-scrollbar snap-x">
                        {(['All', 'Movie', 'Series', 'Anime'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => {
                                    setFilter(f);
                                    if (f === 'All') router.push('/collection');
                                    else router.push(`/collection?type=${f}`);
                                }}
                                className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-sm font-bold transition-all duration-300 snap-center whitespace-nowrap ${filter === f ? 'bg-foreground text-background shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    
                    <div className="w-px h-6 bg-border/80 mx-1 sm:mx-2 shrink-0" />
                    
                    {/* View Modes */}
                    <div className="flex items-center shrink-0">
                        <button onClick={() => setViewMode('poster')} className={`p-2 sm:p-2.5 rounded-full transition-all ${viewMode === 'poster' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                            <LayoutGrid size={16} />
                        </button>
                        <button onClick={() => setViewMode('list')} className={`p-2 sm:p-2.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                            <List size={16} />
                        </button>
                    </div>
                    
                    <div className="w-px h-6 bg-border/80 mx-1 sm:mx-2 shrink-0" />
                    
                    {/* Add Media Button */}
                    <Link href="/add" className="p-2 sm:p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0">
                        <Plus size={16} strokeWidth={3} />
                    </Link>
                    
                    {/* Filter Toggle */}
                    <button onClick={() => setIsFilterDockOpen(!isFilterDockOpen)} className={`p-2 sm:p-2.5 rounded-full transition-all shrink-0 ${isFilterDockOpen ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                        <SlidersHorizontal size={16} />
                    </button>

                    {/* Expanded Filters Popover */}
                    <AnimatePresence>
                        {isFilterDockOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: -20, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                                className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] sm:w-max max-w-[90vw] p-4 sm:p-5 rounded-3xl border border-border bg-card/95 dark:bg-[#0c0c0d]/95 backdrop-blur-md shadow-2xl flex flex-col gap-4 sm:gap-5 origin-bottom z-50"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest w-16">Status</span>
                                    <div className="flex flex-wrap gap-1 bg-muted/30 p-1.5 rounded-3xl border border-border/50">
                                        {(['All', 'Completed', 'Watching', 'Plan to Watch'] as const).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setStatusFilter(s)}
                                                className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${statusFilter === s ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest w-16">Sort & Filter</span>
                                    <div className="flex flex-wrap gap-2">
                                        <select
                                            value={sortBy}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as "Title" | "Recent" | "Rating")}
                                            className="bg-muted/30 text-foreground border border-border/50 rounded-full px-5 py-2 text-xs font-bold outline-none cursor-pointer appearance-none hover:bg-muted/50 transition-colors"
                                        >
                                            <option value="Recent">Newest First</option>
                                            <option value="Rating">Highest Rated</option>
                                            <option value="Title">Alphabetical</option>
                                        </select>
                                        
                                        <button
                                            onClick={() => setFavoritesOnly(!favoritesOnly)}
                                            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all border ${favoritesOnly ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                                        >
                                            <Heart size={14} className={favoritesOnly ? "fill-red-500 text-red-500" : ""} /> Favorites
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Command Menu Modal Overlay */}
            <AnimatePresence>
                {isCmdOpen && (
                    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCmdOpen(false)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                            className="relative w-full max-w-xl bg-card dark:bg-[#0c0c0d] border border-border/80 rounded-[32px] overflow-hidden shadow-2xl z-10 flex flex-col"
                            onKeyDown={handleCmdKeyDown}
                        >
                            <div className="flex items-center border-b border-border/60 px-6 py-4">
                                <Search size={20} className="text-muted-foreground mr-3" />
                                <input
                                    ref={cmdInputRef}
                                    type="text"
                                    placeholder="Type a command or search..."
                                    value={cmdSearch}
                                    onChange={(e) => setCmdSearch(e.target.value)}
                                    className="flex-1 bg-transparent text-foreground placeholder-muted-foreground font-medium outline-none text-base"
                                />
                                <kbd className="pointer-events-none inline-flex items-center justify-center rounded bg-muted px-2 py-1 font-mono text-[10px] font-bold text-muted-foreground">
                                    ESC
                                </kbd>
                            </div>

                            <div className="max-h-[350px] overflow-y-auto p-3">
                                {cmdOptions.length > 0 ? (
                                    cmdOptions.map((opt, idx) => {
                                        const isSelected = idx === selectedCmdIdx;
                                        const Icon = opt.icon;
                                        return (
                                            <div
                                                key={opt.id}
                                                onClick={opt.action}
                                                onMouseEnter={() => setSelectedCmdIdx(idx)}
                                                className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-200 select-none ${isSelected ? 'bg-foreground text-background' : 'hover:bg-muted text-foreground'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-background/20' : 'bg-muted'}`}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold">{opt.title}</p>
                                                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-background/70' : 'text-muted-foreground'}`}>{opt.description}</p>
                                                    </div>
                                                </div>
                                                <kbd className={`pointer-events-none inline-flex items-center justify-center min-w-[24px] rounded px-2 py-1 font-mono text-[10px] font-bold ${isSelected ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'}`}>
                                                    {opt.shortcut}
                                                </kbd>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-12 text-center text-muted-foreground font-medium text-sm">
                                        No matching commands found.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Detail Modal */}
            <AnimatePresence>
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
            </AnimatePresence>
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
