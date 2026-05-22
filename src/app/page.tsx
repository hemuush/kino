"use client";

import { useState } from 'react';
import { useMedia } from '@/hooks/useMedia';
import { MediaCard } from '@/components/MediaCard';
import { AddMediaModal } from '@/components/AddMediaModal';
import { MediaDetailModal } from '@/components/MediaDetailModal';
import { Plus, Film, X, Heart, Shuffle, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MediaEntry } from '@/lib/db';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

export default function Dashboard() {
  const { entries, isLoading, addEntry, updateEntry, deleteEntry, syncStatus, batchUpdateEntries } = useMedia();
  const autoRefresh = useAutoRefresh({ entries, batchUpdateEntries, isLoading });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MediaEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);

  // Filter States
  const [filter, setFilter] = useState<'All' | 'Movie' | 'Series' | 'Anime'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Watching' | 'Plan to Watch'>('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'rating-desc' | 'rating-asc' | 'title-asc' | 'title-desc'>('date-desc');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const activeFiltersCount =
    (filter !== 'All' ? 1 : 0) +
    (statusFilter !== 'All' ? 1 : 0) +
    (showFavoritesOnly ? 1 : 0) +
    (selectedGenreFilter !== null ? 1 : 0);

  const movies = entries.filter(e => e.type === 'Movie');
  const series = entries.filter(e => e.type === 'Series');
  const anime = entries.filter(e => e.type === 'Anime');

  const recentEntries = entries
    .filter(e => e.status === 'Watching' || e.status === 'Completed' || !e.status)
    .slice(0, 10);

  const usedGenres = Array.from(
    new Set(entries.flatMap(e => e.genre || []))
  ).sort();

  const filteredEntries = entries.filter(e => {
    if (filter !== 'All' && e.type !== filter) return false;
    const currentStatus = e.status || 'Completed';
    if (statusFilter !== 'All' && currentStatus !== statusFilter) return false;
    if (showFavoritesOnly && !e.favorite) return false;
    if (selectedGenreFilter && (!e.genre || !e.genre.includes(selectedGenreFilter))) return false;
    if (searchQuery.trim() !== '') {
      return e.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
    }
    return true;
  });

  const handleDecideForMe = () => {
    if (filteredEntries.length === 0) return;
    const activeEntries = filteredEntries.filter(e => e.status === 'Plan to Watch' || e.status === 'Watching');
    const pool = activeEntries.length > 0 ? activeEntries : filteredEntries;
    setSelectedEntry(pool[Math.floor(Math.random() * pool.length)]);
  };

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc': return b.createdAt - a.createdAt;
      case 'date-asc': return a.createdAt - b.createdAt;
      case 'rating-desc': return (b.rating || 0) - (a.rating || 0) || b.createdAt - a.createdAt;
      case 'rating-asc': return (a.rating || 0) - (b.rating || 0) || b.createdAt - a.createdAt;
      case 'title-asc': return a.title.localeCompare(b.title);
      case 'title-desc': return b.title.localeCompare(a.title);
      default: return 0;
    }
  });

  const handleIncrementWatched = (entry: MediaEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.type === 'Movie') return;
    const nextWatched = (entry.episodesWatched || 0) + 1;
    const total = entry.episodesTotal;

    if (total && nextWatched >= total) {
      const updated = { ...entry, episodesWatched: total, status: 'Completed' as const };
      updateEntry(updated);
      setEditingEntry(updated); // Open Edit modal to rate immediately
    } else {
      const updated = { ...entry, episodesWatched: nextWatched, status: entry.status === 'Plan to Watch' ? ('Watching' as const) : entry.status };
      updateEntry(updated);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 glass border-b border-border">
          <div className="flex items-center justify-between px-6 h-14 max-w-7xl mx-auto w-full">
            <div className="w-24 h-4 skeleton" />
            <div className="w-9 h-9 skeleton rounded-xl" />
          </div>
        </header>
        <div className="flex-1 px-4 sm:px-6 py-8 max-w-7xl mx-auto w-full">
          <div className="w-48 h-3 skeleton mb-8" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] skeleton rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[15px] sm:text-[17px] font-semibold tracking-tight">Dashboard</h1>
            <AnimatePresence mode="wait">
              {syncStatus !== 'idle' && (
                <motion.div initial={{ opacity: 0, scale: 0.8, x: -5 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8 }} className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${syncStatus === 'syncing' ? 'bg-primary/5 text-primary border-primary/20' : syncStatus === 'synced' ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' : 'bg-red-500/5 text-red-400 border-red-500/20'}`}>
                  {syncStatus === 'syncing' && <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                  {syncStatus === 'synced' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                  {syncStatus === 'error' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
                  <span className="hidden sm:inline">{syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'synced' ? 'Synced to Cloud' : 'Sync Error'}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 && <button onClick={handleDecideForMe} className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-card hover:bg-card-hover text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer animate-fade-in"><Shuffle size={15} strokeWidth={2} /></button>}
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-card hover:bg-card-hover text-foreground transition-all active:scale-95 cursor-pointer animate-fade-in"><Plus size={18} strokeWidth={2} /></button>
          </div>
        </div>
      </header>

      <div className="flex-1 px-3 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6 animate-fade-up">
        {entries.length > 0 && (
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground font-medium">
            <span>{movies.length} movies</span><span className="text-border">·</span>
            <span>{series.length} series</span><span className="text-border">·</span>
            <span>{anime.length} anime</span>
          </div>
        )}

        {/* Empty State */}
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-scale-in">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-5"><Film size={26} className="text-muted-foreground" strokeWidth={1.5} /></div>
            <h3 className="font-display text-xl font-bold mb-2 tracking-tight">Start your collection</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-[280px] leading-relaxed">Track every movie, series, and anime you watch.</p>
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] hover:opacity-90 cursor-pointer"><Plus size={16} strokeWidth={2} /> Add Your First</button>
          </div>
        )}

        {/* Filters */}
        {entries.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <input type="text" placeholder="Search titles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-muted/50 rounded-xl px-4 py-2.5 pl-10 text-[13px] placeholder:text-muted-foreground/60 border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-muted-foreground/60">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                  </div>
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-3.5 flex items-center text-muted-foreground/45 hover:text-foreground transition-colors cursor-pointer"><X size={14} strokeWidth={2.5} /></button>}
                </div>
                <button onClick={() => setShowFiltersPanel(!showFiltersPanel)} className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold border transition-all cursor-pointer ${showFiltersPanel || activeFiltersCount > 0 ? 'bg-primary/10 border-primary/30 text-primary shadow-sm shadow-primary/5' : 'bg-muted/50 border-border/40 hover:bg-muted hover:text-foreground text-muted-foreground'}`}>
                  <SlidersHorizontal size={14} strokeWidth={2.2} />
                  <span className="hidden xs:inline">Filters</span>
                  {activeFiltersCount > 0 && <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-primary text-white rounded-full">{activeFiltersCount}</span>}
                </button>
              </div>

              <div className="w-full sm:w-[190px]">
                <select value={sortBy} onChange={(e: any) => setSortBy(e.target.value)} className="w-full bg-muted/50 hover:bg-muted border border-border/40 rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1rem] bg-[right_0.8rem_center] bg-no-repeat pr-9">
                  <option value="date-desc">Date Added (Newest)</option><option value="date-asc">Date Added (Oldest)</option><option value="rating-desc">Rating (Highest)</option><option value="rating-asc">Rating (Lowest)</option><option value="title-asc">Title (A-Z)</option><option value="title-desc">Title (Z-A)</option>
                </select>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {showFiltersPanel && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-1">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-2.5 sm:gap-3 relative z-10">
                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto hide-scrollbar">
                      <div className="flex gap-1 p-1 bg-muted/50 border border-border/10 rounded-xl w-fit shrink-0">
                        {[{ label: 'All Type', value: 'All' }, { label: 'Movies', value: 'Movie' }, { label: 'Series', value: 'Series' }, { label: 'Anime', value: 'Anime' }].map((tab: any) => (
                          <button key={tab.value} onClick={() => setFilter(tab.value)} className={`relative px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${filter === tab.value ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>
                            {filter === tab.value && <motion.div layoutId="activeTabIndicator" className="absolute inset-0 bg-card rounded-lg shadow-sm border border-border/40 -z-10" />}
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1 p-1 bg-muted/50 border border-border/10 rounded-xl w-fit shrink-0">
                        {[{ label: 'All Status', value: 'All' }, { label: 'Watching', value: 'Watching' }, { label: 'Plan to Watch', value: 'Plan to Watch' }, { label: 'Completed', value: 'Completed' }].map((tab: any) => (
                          <button key={tab.value} onClick={() => setStatusFilter(tab.value)} className={`relative px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${statusFilter === tab.value ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>
                            {statusFilter === tab.value && <motion.div layoutId="activeStatusIndicator" className="absolute inset-0 bg-card rounded-lg shadow-sm border border-border/40 -z-10" />}
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-all cursor-pointer ${showFavoritesOnly ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-sm shadow-red-500/5' : 'bg-muted/50 border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
                        <Heart size={13} className={showFavoritesOnly ? 'fill-red-500' : ''} /><span>Favorites</span>
                      </button>
                      {activeFiltersCount > 0 && <button onClick={() => { setFilter('All'); setStatusFilter('All'); setShowFavoritesOnly(false); setSelectedGenreFilter(null); }} className="flex items-center gap-1 px-3 py-2 rounded-xl text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer hover:bg-muted">Reset</button>}
                    </div>
                  </div>

                  {usedGenres.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto hide-scrollbar py-1 -mx-1 px-1">
                      <button onClick={() => setSelectedGenreFilter(null)} className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border shrink-0 cursor-pointer ${selectedGenreFilter === null ? 'bg-primary/10 border-primary/30 text-primary font-bold shadow-sm' : 'bg-muted/40 border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground'}`}>All Genres</button>
                      {usedGenres.map((genre) => (
                        <button key={genre} onClick={() => setSelectedGenreFilter(selectedGenreFilter === genre ? null : genre)} className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border shrink-0 cursor-pointer ${selectedGenreFilter === genre ? 'bg-primary/15 border-primary/45 text-primary font-bold shadow-sm' : 'bg-muted/40 border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground'}`}>{genre}</button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Lists */}
        {recentEntries.length > 0 && !searchQuery && sortBy === 'date-desc' && filter === 'All' && statusFilter === 'All' && !showFavoritesOnly && !selectedGenreFilter && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-bold tracking-tight text-muted-foreground uppercase">Recently Added</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1">
              {recentEntries.map((entry, i) => (
                <div key={entry.id} className="w-[115px] sm:w-[150px] shrink-0">
                  <MediaCard entry={entry} onClick={() => setSelectedEntry(entry)} onFavoriteToggle={() => updateEntry({ ...entry, favorite: !entry.favorite })} onIncrementWatched={(e) => handleIncrementWatched(entry, e)} index={i} />
                </div>
              ))}
            </div>
          </section>
        )}

        {entries.length > 0 && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
              <AnimatePresence>
                {sortedEntries.map((entry, i) => (
                  <MediaCard key={entry.id} entry={entry} onClick={() => setSelectedEntry(entry)} onFavoriteToggle={() => updateEntry({ ...entry, favorite: !entry.favorite })} onIncrementWatched={(e) => handleIncrementWatched(entry, e)} index={i} />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}
      </div>

      {/* Manual Entry or Edit Modal */}
      {(isAddModalOpen || editingEntry) && (
        <AddMediaModal
          initialData={editingEntry}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingEntry(null);
          }}
          onSave={async (entry) => {
            if (editingEntry) {
              updateEntry(entry as MediaEntry);
              setSelectedEntry(entry as MediaEntry); // Update the active background view instantly
            } else {
              addEntry(entry as MediaEntry);
            }
            setIsAddModalOpen(false);
            setEditingEntry(null);
          }}
        />
      )}

      {/* View Detail Modal */}
      {selectedEntry && !editingEntry && (
        <MediaDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onEditClick={() => {
            setEditingEntry(selectedEntry);
            // Note: We don't nullify selectedEntry so it stays mounted underneath the Edit popover
          }}
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