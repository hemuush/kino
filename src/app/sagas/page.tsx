'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Film, Layers3, Star, Tv } from 'lucide-react';
import { useMedia } from '@/context/MediaContext';
import { MediaEntry, formatRuntime } from '@/lib/db';
import { PageLoader } from '@/components/ui/Loader';

function getYear(dateString?: string) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.getFullYear().toString();
}

function SagaPoster({ media, title }: { media?: MediaEntry; title: string }) {
  return (
    <div className="overflow-hidden rounded-xl bg-muted">
      {media?.coverImage ? (
        <img
          src={media.coverImage}
          alt={media.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-3 text-center text-[10px] font-black uppercase tracking-wider text-muted-foreground/50">
          {title}
        </div>
      )}
    </div>
  );
}

export default function SagasPage() {
  const { entries, franchises, isLoading } = useMedia();
  const searchParams = useSearchParams();

  const [selectedSaga, setSelectedSaga] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<MediaEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('detail');

  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
  }, [searchParams]);

  const groupedSagas = useMemo(() => {
    const groups: Record<string, MediaEntry[]> = {};

    entries.forEach((entry) => {
      let sagaName = entry.franchise;

      if (entry.franchiseId && franchises.length > 0) {
        const foundFranchise = franchises.find((franchise) => franchise.id === entry.franchiseId);
        if (foundFranchise) sagaName = foundFranchise.name;
      }

      if (!sagaName || typeof sagaName !== 'string' || !sagaName.trim()) return;

      const trimmedSagaName = sagaName.trim();
      if (!groups[trimmedSagaName]) groups[trimmedSagaName] = [];
      groups[trimmedSagaName].push(entry);
    });

    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateA - dateB;
      });
    });

    return groups;
  }, [entries, franchises]);

  const sagaNames = useMemo(() => Object.keys(groupedSagas).sort(), [groupedSagas]);

  const filteredSagaNames = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return sagaNames;

    return sagaNames.filter((name) => {
      const items = groupedSagas[name] || [];
      const haystack = [
        name,
        ...items.map((item) => `${item.title} ${item.type} ${getYear(item.releaseDate)}`),
      ].join(' ').toLowerCase();

      return query.split(/\s+/).every((token) => haystack.includes(token));
    });
  }, [groupedSagas, sagaNames, searchTerm]);

  const currentSagaItems = selectedSaga ? groupedSagas[selectedSaga] || [] : [];
  const selectedSagaRuntime = currentSagaItems.reduce((total, item) => total + (item.runtime || 0), 0);
  const totalSagaEntries = Object.values(groupedSagas).reduce((total, items) => total + items.length, 0);
  const largestSagaCount = Math.max(0, ...Object.values(groupedSagas).map((items) => items.length));

  const handleSelectSaga = (saga: string) => {
    setSelectedSaga(saga);
    setSelectedMovie(groupedSagas[saga][0] || null);
    setMobileView('detail');
  };

  const handleCloseSaga = () => {
    setSelectedSaga(null);
    setSelectedMovie(null);
    setMobileView('detail');
  };

  if (isLoading) return <PageLoader text="Loading your Sagas..." />;

  return (
    <div className="absolute inset-0 flex w-full overflow-hidden bg-background text-foreground">
      <aside
        className={`flex shrink-0 flex-col border-r border-border bg-card transition-all duration-300 ease-in-out ${
          selectedSaga ? 'w-full opacity-100 md:w-[340px]' : 'w-0 overflow-hidden border-none opacity-0'
        } ${selectedSaga && mobileView === 'list' ? 'flex' : 'hidden md:flex'}`}
      >
        <div className="flex min-w-[20rem] items-center gap-3 border-b border-border p-4 sm:p-5">
          <button
            onClick={handleCloseSaga}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to all sagas"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-foreground">{selectedSaga}</h2>
            <p className="text-xs text-muted-foreground">{currentSagaItems.length} entries</p>
          </div>
        </div>

        <div className="min-w-[20rem] flex-1 space-y-2 overflow-y-auto p-3 pb-6 hide-scrollbar">
          {currentSagaItems.map((media, index) => {
            const isActive = selectedMovie?.id === media.id;
            return (
              <button
                key={media.id || index}
                onClick={() => {
                  setSelectedMovie(media);
                  setMobileView('detail');
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-all ${
                  isActive ? 'border-primary/35 bg-primary/10 shadow-sm' : 'border-transparent hover:bg-muted/55'
                }`}
              >
                <div className="relative h-[4.5rem] w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {media.coverImage ? <img src={media.coverImage} alt={media.title} className="h-full w-full object-cover" /> : null}
                  <div className="absolute left-0 top-0 flex h-5 w-5 items-center justify-center rounded-br-md bg-black/65 text-[10px] font-bold text-white backdrop-blur-sm">
                    {index + 1}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`truncate text-sm font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>{media.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted-foreground">{getYear(media.releaseDate)}</p>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{media.type}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main
        className={`relative flex-1 overflow-y-auto bg-background pb-6 lg:pb-0 ${
          !selectedSaga ? 'block' : mobileView === 'detail' ? 'block' : 'hidden md:block'
        }`}
      >
        {!selectedSaga && (
          <div className="mx-auto max-w-[1600px] p-4 duration-500 animate-in fade-in sm:p-6 lg:p-10">
            <header className="mb-5 flex flex-col justify-between gap-4 sm:mb-8 md:flex-row md:items-end">
              <div>
                <div className="mb-2 hidden items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary md:flex">
                  <Layers3 size={15} /> Franchise Library
                </div>
                <h1 className="hidden text-4xl font-extrabold tracking-tight text-foreground md:block">Sagas</h1>
                <p className="mt-2 hidden text-base text-muted-foreground md:block">
                  Browse connected stories, cinematic universes, and custom timelines.
                </p>
                <div className="flex items-center justify-between md:hidden">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Franchises</p>
                    <h1 className="text-2xl font-black text-foreground">{filteredSagaNames.length} Sagas</h1>
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-3 py-2 text-right">
                    <p className="text-lg font-black">{sagaNames.length}</p>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>

              <div className="hidden min-w-[360px] grid-cols-3 gap-3 md:grid">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-2xl font-black">{sagaNames.length}</p>
                  <p className="text-xs font-semibold text-muted-foreground">Sagas</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-2xl font-black">{totalSagaEntries}</p>
                  <p className="text-xs font-semibold text-muted-foreground">Entries</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-2xl font-black">{largestSagaCount}</p>
                  <p className="text-xs font-semibold text-muted-foreground">Largest</p>
                </div>
              </div>
            </header>

            {sagaNames.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border">
                <p className="font-medium text-muted-foreground">No franchises found in your library.</p>
                <p className="mt-2 text-sm text-muted-foreground/60">Add a franchise to your media entries to see them here.</p>
              </div>
            ) : filteredSagaNames.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-border bg-card">
                <p className="font-medium text-muted-foreground">No sagas match &quot;{searchTerm}&quot;</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
                {filteredSagaNames.map((saga) => {
                  const items = groupedSagas[saga];
                  const firstMedia = items[0];
                  const latestYear = items.reduce((latest, item) => {
                    const year = Number(getYear(item.releaseDate));
                    return Number.isFinite(year) ? Math.max(latest, year) : latest;
                  }, 0);

                  return (
                    <button
                      key={saga}
                      onClick={() => handleSelectSaga(saga)}
                      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                        <div className="absolute inset-0 grid grid-cols-[1.2fr_0.8fr] gap-1.5 p-2">
                          <SagaPoster media={items[0]} title={saga} />
                          <div className="grid grid-rows-2 gap-1.5">
                            <SagaPoster media={items[1]} title={saga} />
                            <SagaPoster media={items[2]} title={saga} />
                          </div>
                        </div>
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-lg bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm">
                            {items.length} {items.length === 1 ? 'Entry' : 'Entries'}
                          </span>
                          {!!latestYear && (
                            <span className="hidden rounded-lg bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md sm:inline-flex">
                              {latestYear}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="line-clamp-2 text-base font-bold leading-tight text-foreground sm:text-lg">{saga}</h3>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Film size={13} /> Open saga
                          </span>
                          <span className="font-semibold">{getYear(firstMedia?.releaseDate)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedSaga && selectedMovie && (
          <div className="relative min-h-full duration-500 animate-in fade-in">
            <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-card/95 px-3 py-3 backdrop-blur-xl md:hidden">
              <button
                onClick={handleCloseSaga}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground"
                aria-label="Back to sagas"
              >
                <ArrowLeft size={18} />
              </button>
              <button onClick={() => setMobileView('list')} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-left">
                <p className="truncate text-sm font-bold text-foreground">{selectedSaga}</p>
                <p className="text-xs text-muted-foreground">{currentSagaItems.length} entries</p>
              </button>
            </div>

            <div className="relative h-[24vh] min-h-[180px] w-full overflow-hidden bg-card md:h-[42vh]">
              {selectedMovie.coverImage && (
                <img
                  src={selectedMovie.coverImage}
                  alt={`${selectedMovie.title} backdrop`}
                  className="h-full w-full scale-110 object-cover opacity-35 blur-xl"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            </div>

            <div className="relative mx-auto -mt-16 flex max-w-6xl flex-col gap-5 px-4 pb-8 sm:px-6 md:-mt-32 md:flex-row md:gap-8 md:px-8">
              <div className="mx-auto shrink-0 md:mx-0">
                <div className="aspect-[2/3] w-36 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:w-56">
                  {selectedMovie.coverImage ? (
                    <img src={selectedMovie.coverImage} alt={selectedMovie.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm font-medium text-muted-foreground">No Image</div>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1 pt-2 text-left md:pt-28">
                <div className="mb-4 hidden items-center gap-2 text-sm text-muted-foreground md:flex">
                  <button onClick={handleCloseSaga} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 hover:bg-muted">
                    <ArrowLeft size={15} /> All sagas
                  </button>
                  <span className="truncate">{selectedSaga}</span>
                </div>

                <div className="mb-3 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                    <Calendar size={12} className="mr-1 inline" /> {getYear(selectedMovie.releaseDate)}
                  </span>
                  <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {selectedMovie.type} {selectedMovie.animeType === 'Movie' ? '(Movie)' : ''}
                  </span>
                  {selectedMovie.runtime && (
                    <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      <Clock size={15} /> {formatRuntime(selectedMovie.runtime)}
                    </span>
                  )}
                </div>

                <h1 className="mb-4 break-words text-center text-2xl font-black text-foreground drop-shadow-sm sm:text-3xl md:text-left md:text-5xl">
                  {selectedMovie.title}
                </h1>

                <div className="mb-6 flex flex-wrap justify-center gap-4 md:justify-start">
                  {selectedMovie.status && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          selectedMovie.status === 'Completed' ? 'bg-green-500' : selectedMovie.status === 'Watching' ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}
                      />
                      {selectedMovie.status}
                    </div>
                  )}
                  {selectedMovie.rating > 0 && (
                    <div className="flex items-center gap-1 text-sm font-semibold text-yellow-500">
                      <Star size={15} className="fill-yellow-500" /> {selectedMovie.rating}/10
                    </div>
                  )}
                </div>

                <div className="max-w-3xl space-y-4 text-center text-base leading-relaxed text-muted-foreground md:text-left md:text-lg">
                  {selectedMovie.review ? <p>{selectedMovie.review}</p> : <p className="italic text-muted-foreground/60">No review or overview provided for this entry.</p>}
                </div>
              </div>
            </div>

            <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 md:px-8">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-xl font-black text-foreground">Saga Timeline</h2>
                  <p className="text-sm text-muted-foreground">
                    {currentSagaItems.length} entries {selectedSagaRuntime > 0 ? `- ${formatRuntime(selectedSagaRuntime)} total runtime` : ''}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {currentSagaItems.map((media, index) => {
                  const isActive = selectedMovie.id === media.id;
                  return (
                    <button
                      key={media.id || index}
                      onClick={() => setSelectedMovie(media)}
                      className={`flex min-w-0 gap-3 rounded-2xl border p-3 text-left transition-all ${
                        isActive ? 'border-primary/40 bg-primary/10' : 'border-border bg-card hover:bg-muted/35'
                      }`}
                    >
                      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {media.coverImage ? <img src={media.coverImage} alt={media.title} className="h-full w-full object-cover" /> : null}
                        <span className="absolute left-1 top-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-white">{index + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-foreground">{media.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{getYear(media.releaseDate)}</span>
                          <span className="inline-flex items-center gap-1">
                            <Tv size={12} /> {media.type}
                          </span>
                        </div>
                        {media.runtime ? <p className="mt-2 text-xs font-semibold text-primary">{formatRuntime(media.runtime)}</p> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
