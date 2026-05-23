'use client';

import React, { useState, useMemo } from 'react';
import { useMedia } from '@/context/MediaContext';
import { MediaEntry, formatRuntime } from '@/lib/db';

export default function SagasPage() {
  // 1. Fetch data from your custom hook
  const { entries, franchises, isLoading } = useMedia();

  // 2. State Configuration
  const [selectedSaga, setSelectedSaga] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<MediaEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // New state for search
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  // 3. Data Processing & Grouping based on your MediaEntry schema
  const groupedSagas = useMemo(() => {
    const groups: Record<string, MediaEntry[]> = {};

    entries.forEach((entry) => {
      // Determine the saga/franchise name
      let sagaName = entry.franchise; // Check legacy string field first

      // If it uses the new normalized franchiseId, look up the name in the franchises array
      if (entry.franchiseId && franchises.length > 0) {
        const foundFranchise = franchises.find(f => f.id === entry.franchiseId);
        if (foundFranchise) {
          sagaName = foundFranchise.name;
        }
      }

      // Skip if this entry doesn't belong to a franchise
      if (!sagaName || typeof sagaName !== 'string' || sagaName.trim() === '') return;

      const trimmedSagaName = sagaName.trim();
      if (!groups[trimmedSagaName]) groups[trimmedSagaName] = [];
      groups[trimmedSagaName].push(entry);
    });

    // Sort items chronologically inside each saga based on releaseDate
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateA - dateB;
      });
    });

    return groups;
  }, [entries, franchises]);

  // All available saga names
  const sagaNames = Object.keys(groupedSagas).sort();

  // 4. Filter saga names based on search term
  const filteredSagaNames = useMemo(() => {
    if (!searchTerm.trim()) return sagaNames;
    return sagaNames.filter(name =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sagaNames, searchTerm]);

  const currentSagaItems = selectedSaga ? groupedSagas[selectedSaga] : [];

  // 5. Handlers
  const handleSelectSaga = (saga: string) => {
    setSelectedSaga(saga);
    setSelectedMovie(groupedSagas[saga][0]); // Preselect first entry in the sidebar
    setMobileView('list'); // Show the list of movies first on mobile!
  };

  const handleCloseSidebar = () => {
    setSelectedSaga(null);
    setSelectedMovie(null);
  };

  // Helper to extract year from releaseDate
  const getYear = (dateString?: string) => {
    if (!dateString) return 'Unknown Year';
    try {
      return new Date(dateString).getFullYear().toString();
    } catch {
      return 'Unknown Year';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p>Loading your Sagas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex w-full bg-background text-foreground overflow-hidden">

      {/* ========================================================
        LEFT SIDEBAR: The Master List
        ========================================================
      */}
      <div
        className={`flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out shrink-0
          ${selectedSaga ? 'w-full md:w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}
          ${selectedSaga && mobileView === 'list' ? 'flex' : 'hidden md:flex'}
        `}
      >
        <div className="p-5 border-b border-border flex items-center gap-3 min-w-[20rem]">
          <button
            onClick={handleCloseSidebar}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to Sagas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex-1 overflow-hidden">
            <h2 className="font-bold text-lg truncate text-foreground">{selectedSaga}</h2>
            <p className="text-xs text-muted-foreground">{currentSagaItems.length} Entries</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-w-[20rem] p-3 pb-28 space-y-2 hide-scrollbar">
          {currentSagaItems.map((media, index) => {
            const isActive = selectedMovie?.id === media.id;
            return (
              <button
                key={media.id || index}
                onClick={() => {
                  setSelectedMovie(media);
                  setMobileView('detail');
                }}
                className={`w-full flex items-center gap-4 p-2 rounded-xl text-left transition-all ${isActive
                  ? 'bg-blue-600/10 border border-blue-500/50'
                  : 'border border-transparent hover:bg-muted/55'
                  }`}
              >
                <div className="relative w-12 h-16 shrink-0 rounded-md overflow-hidden bg-muted">
                  {media.coverImage && (
                    <img src={media.coverImage} alt={media.title} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute top-0 left-0 bg-black/60 w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-br-md text-white backdrop-blur-sm">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className={`font-semibold text-sm truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {media.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">{getYear(media.releaseDate)}</p>
                    {media.type && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{media.type}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================
        MAIN CONTENT: The Saga Grid OR The Detail View
        ========================================================
      */}
      <div 
        className={`flex-1 overflow-y-auto relative bg-background pb-6 lg:pb-0
          ${!selectedSaga ? 'block' : (mobileView === 'detail' ? 'block' : 'hidden md:block')}
        `}
      >

        {/* VIEW A: NO SAGA SELECTED (Grid of Sagas) */}
        {!selectedSaga && (
          <div className="p-6 md:p-12 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Your Sagas</h1>
                <p className="text-muted-foreground mt-2 text-lg">Organized collections and cinematic universes.</p>
              </div>

              {/* SEARCH BAR */}
              <div className="relative w-full md:w-72 lg:w-96">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search franchises..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </header>

            {sagaNames.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-2xl">
                <p className="text-muted-foreground font-medium">No franchises found in your library.</p>
                <p className="text-muted-foreground/60 text-sm mt-2">Add a &quot;franchise&quot; to your media entries to see them here.</p>
              </div>
            ) : filteredSagaNames.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 border border-border bg-card rounded-2xl">
                <p className="text-muted-foreground font-medium">No sagas match &quot;{searchTerm}&quot;</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-3 text-primary hover:text-primary/80 text-sm font-semibold"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
                {filteredSagaNames.map((saga) => {
                  const firstMedia = groupedSagas[saga][0];
                  const count = groupedSagas[saga].length;

                  return (
                    <div
                      key={saga}
                      onClick={() => handleSelectSaga(saga)}
                      className="group cursor-pointer flex flex-col bg-card rounded-2xl overflow-hidden shadow-xl border border-border hover:border-primary transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                        {firstMedia?.coverImage && (
                          <img
                            src={firstMedia.coverImage}
                            alt={saga}
                            className="w-full h-full object-cover blur-[2px] scale-105 group-hover:scale-115 transition-transform duration-700 ease-out opacity-60 group-hover:opacity-80"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                        <div className="absolute bottom-4 left-5 right-5 z-10">
                          <span className="inline-block px-2.5 py-1 bg-card/65 backdrop-blur-md text-foreground text-xs font-semibold rounded-md mb-2 border border-border">
                            {count} {count === 1 ? 'Entry' : 'Entries'}
                          </span>
                          <h3 className="font-bold text-xl leading-tight text-foreground drop-shadow-md truncate">
                            {saga}
                          </h3>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW B: MEDIA DETAIL (When a saga is selected) */}
        {selectedSaga && selectedMovie && (
          <div className="relative min-h-full animate-in fade-in duration-500">
            {/* Mobile Back Button */}
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/10 text-xs font-bold transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Back to List
            </button>

            {/* Backdrop Header */}
            <div className="relative h-[35vh] md:h-[50vh] w-full bg-card overflow-hidden">
              {selectedMovie.coverImage && (
                <img
                  src={selectedMovie.coverImage}
                  alt={`${selectedMovie.title} Backdrop`}
                  className="w-full h-full object-cover opacity-30 blur-2xl scale-125"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            </div>

            {/* Media Info Overlay */}
            <div className="relative -mt-24 md:-mt-40 px-6 md:px-8 pb-28 max-w-5xl mx-auto flex flex-col md:flex-row gap-6 md:gap-8">
              <div className="shrink-0 mx-auto md:mx-0">
                <div className="w-40 md:w-64 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-border bg-card">
                  {selectedMovie.coverImage ? (
                    <img
                      src={selectedMovie.coverImage}
                      alt={selectedMovie.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-medium">No Image</div>
                  )}
                </div>
              </div>

              <div className="flex-1 pt-4 md:pt-40 text-left">
                <div className="flex flex-wrap items-center gap-3 mb-3 justify-center md:justify-start">
                  <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wider">
                    {getYear(selectedMovie.releaseDate)}
                  </span>

                  {selectedMovie.type && (
                    <span className="px-3 py-1 bg-muted text-muted-foreground border border-border rounded-full text-xs font-semibold">
                      {selectedMovie.type} {selectedMovie.animeType === 'Movie' ? '(Movie)' : ''}
                    </span>
                  )}

                  {selectedMovie.runtime && (
                    <span className="text-muted-foreground text-sm font-medium flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatRuntime(selectedMovie.runtime)}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-foreground mb-4 drop-shadow-sm text-center md:text-left">
                  {selectedMovie.title}
                </h1>

                <div className="flex flex-wrap gap-4 mb-6 justify-center md:justify-start">
                  {selectedMovie.status && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className={`w-2 h-2 rounded-full ${selectedMovie.status === 'Completed' ? 'bg-green-500' : selectedMovie.status === 'Watching' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                      {selectedMovie.status}
                    </div>
                  )}
                  {selectedMovie.rating > 0 && (
                    <div className="flex items-center gap-1 text-sm font-semibold text-yellow-500">
                      <span>★</span> {selectedMovie.rating}/10
                    </div>
                  )}
                </div>

                <div className="space-y-4 text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl text-center md:text-left">
                  {selectedMovie.review ? (
                    <p>{selectedMovie.review}</p>
                  ) : (
                    <p className="text-muted-foreground/60 italic">No review or overview provided for this entry.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
