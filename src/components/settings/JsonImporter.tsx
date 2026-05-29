// src/components/settings/JsonImporter.tsx
"use client";
/* eslint-disable react/no-unescaped-entities */

import React, { useState, useRef } from 'react';
import { useMedia } from '@/context/MediaContext';
import { Upload, FileJson, Check, X, AlertCircle, Info, ChevronDown, ChevronUp, Tv, Film, MonitorPlay, ClipboardPaste, FileText } from 'lucide-react';
import { MediaEntry, Tag, normalizeMediaType } from '@/lib/db';

interface ParsedData {
    entries: MediaEntry[];
    genres: Tag[];
    franchises: Tag[];
    stats: {
        movies: number;
        tvShows: number;
        anime: number;
    };
}

export default function JsonImporter() {
    const { importData } = useMedia();
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // Input mode state
    const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
    const [pasteInput, setPasteInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reusable parsing logic for both File and Paste methods
    const processJsonData = (jsonString: string) => {
        setError(null);
        try {
            if (!jsonString.trim()) {
                throw new Error("No JSON data provided. Please paste valid JSON.");
            }

            const json = JSON.parse(jsonString);
            let entries: MediaEntry[] = [];
            let genres: Tag[] = [];
            let franchises: Tag[] = [];

            if (Array.isArray(json)) {
                entries = json;
            } else if (typeof json === 'object' && json !== null) {
                if (json.entries && Array.isArray(json.entries)) {
                    entries = json.entries;
                    if (json.genres) genres = json.genres;
                    if (json.franchises) franchises = json.franchises;
                } else if (json.title && json.type) {
                    entries = [json];
                } else {
                    throw new Error("Invalid JSON structure. Please verify the expected array format.");
                }
            } else {
                throw new Error("Invalid format format.");
            }

            if (entries.length === 0 && genres.length === 0 && franchises.length === 0) {
                throw new Error("No data found to import in this payload.");
            }

            entries = entries.map((entry) => ({ ...entry, type: normalizeMediaType(entry.type) }));

            const stats = {
                movies: entries.filter(ent => ent.type === 'Movie').length,
                tvShows: entries.filter(ent => ent.type === 'TV Show').length,
                anime: entries.filter(ent => ent.type === 'Anime').length,
            };

            setParsedData({ entries, genres, franchises, stats });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to parse JSON. Please check your syntax.");
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => processJsonData(e.target?.result as string);
        reader.onerror = () => setError("Failed to read file.");
        reader.readAsText(file);

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePasteSubmit = () => {
        processJsonData(pasteInput);
    };

    const confirmImport = async () => {
        if (!parsedData) return;
        setIsImporting(true);
        try {
            await importData(parsedData);
            setParsedData(null);
            setPasteInput(''); // Clear paste input on success
            alert("Data successfully merged and imported!");
        } catch {
            setError("An error occurred while importing data.");
        } finally {
            setIsImporting(false);
        }
    };

    const cancelImport = () => {
        setParsedData(null);
        setError(null);
    };

    return (
        <section className="bg-card glass border border-border/60 rounded-3xl p-5 sm:p-8 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><FileJson size={20} /></div>
                    <h2 className="text-xl font-bold font-display">Bulk JSON Import</h2>
                </div>
                {!parsedData && (
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-2 bg-muted/30 rounded-lg"
                    >
                        <Info size={16} />
                        {showHelp ? 'Hide Schema Guide' : 'View Data Schema Guide'}
                        {showHelp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                )}
            </div>

            {!parsedData ? (
                <div className="space-y-5">
                    <p className="text-sm text-muted-foreground">
                        Import your media entries. Existing items will be securely updated by matching the <b>Title</b>. Missing genres and sagas are mapped automatically.
                    </p>

                    {/* Detailed Collapsible Schema & Rules Section */}
                    {showHelp && (
                        <div className="p-4 bg-muted/30 border border-border/40 rounded-xl space-y-5 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <h4 className="text-sm font-bold text-foreground mb-3">Required & Allowed Values (Strict Matching)</h4>
                                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                    <div className="bg-background border border-border/40 p-3 rounded-lg">
                                        <span className="font-bold text-primary mb-1 block">type (Required)</span>
                                        <p className="text-muted-foreground">Must be exactly one of:</p>
                                        <code className="text-emerald-400">"Movie"</code>, <code className="text-emerald-400">"TV Show"</code>, or <code className="text-emerald-400">"Anime"</code>
                                    </div>

                                    <div className="bg-background border border-border/40 p-3 rounded-lg">
                                        <span className="font-bold text-primary mb-1 block">status (Optional)</span>
                                        <p className="text-muted-foreground">Must be exactly one of:</p>
                                        <code className="text-emerald-400">"Completed"</code>, <code className="text-emerald-400">"Watching"</code>, or <code className="text-emerald-400">"Plan to Watch"</code>
                                    </div>

                                    <div className="bg-background border border-border/40 p-3 rounded-lg">
                                        <span className="font-bold text-primary mb-1 block">animeType (Optional, Anime Only)</span>
                                        <p className="text-muted-foreground">Sub-category for Anime:</p>
                                        <code className="text-emerald-400">"Show"</code> or <code className="text-emerald-400">"Movie"</code>
                                    </div>

                                    <div className="bg-background border border-border/40 p-3 rounded-lg">
                                        <span className="font-bold text-primary mb-1 block">genre / franchise (Optional)</span>
                                        <p className="text-muted-foreground">Auto-created if they don't exist.</p>
                                        Genre expects an array: <code className="text-emerald-400">["Action", "Drama"]</code><br />
                                        Franchise expects string: <code className="text-emerald-400">"Marvel Universe"</code>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-border/40 pt-4">
                                <h4 className="text-sm font-bold text-foreground mb-2">JSON Structure Example</h4>
                                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                                    Notice how <b>TV Shows</b> can support a rich <code>episodes</code> array object tracking individual episodes, runtimes, and exact air dates.
                                </p>
                                <pre className="bg-background border border-border/50 p-4 rounded-xl text-xs overflow-x-auto text-emerald-400 hide-scrollbar leading-relaxed">
                                    {`[
  {
    "title": "Dune: Part Two",
    "type": "Movie",
    "status": "Completed",
    "rating": 5,
    "runtime": 166,
    "releaseDate": "2024-03-01",
    "review": "A cinematic masterpiece. Incredible visuals.",
    "favorite": true,
    "franchise": "Dune Collection",
    "genre": ["Sci-Fi", "Adventure", "Drama"]
  },
  {
    "title": "The Sopranos",
    "type": "TV Show",
    "status": "Watching",
    "episodesWatched": 45,
    "episodesTotal": 86,
    "seasonsCount": 6,
    "rating": 4.5,
    "genre": ["Crime", "Drama"],
    "episodes": [
      {
        "name": "Pilot",
        "airDate": "1999-01-10",
        "season": 1,
        "number": 1,
        "runtime": 59
      },
      {
        "name": "46 Long",
        "airDate": "1999-01-17",
        "season": 1,
        "number": 2,
        "runtime": 50
      }
    ]
  },
  {
    "title": "Attack on Titan",
    "type": "Anime",
    "animeType": "Show",
    "status": "Plan to Watch",
    "episodesTotal": 89,
    "favorite": true,
    "genre": ["Action", "Dark Fantasy"]
  }
]`}
                                </pre>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Input Method Switcher */}
                    <div className="bg-muted/20 border border-border/40 p-1.5 rounded-xl flex items-center w-full max-w-sm">
                        <button
                            onClick={() => setInputMode('file')}
                            className={`flex-1 flex justify-center items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${inputMode === 'file' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <FileText size={16} /> File Upload
                        </button>
                        <button
                            onClick={() => setInputMode('paste')}
                            className={`flex-1 flex justify-center items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${inputMode === 'paste' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <ClipboardPaste size={16} /> Paste Text
                        </button>
                    </div>

                    {/* Input Areas */}
                    <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {inputMode === 'file' ? (
                            <div>
                                <input
                                    type="file"
                                    accept=".json,application/json"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2.5 px-6 rounded-xl transition-colors cursor-pointer border border-primary/30 flex items-center gap-2"
                                >
                                    <Upload size={18} />
                                    Select JSON File
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 flex flex-col items-start w-full">
                                <textarea
                                    value={pasteInput}
                                    onChange={(e) => setPasteInput(e.target.value)}
                                    placeholder="Paste your JSON array here..."
                                    className="w-full h-48 bg-background border border-border/40 rounded-xl p-4 text-sm font-mono text-emerald-400 focus:border-primary/50 outline-none resize-y hide-scrollbar"
                                />
                                <button
                                    onClick={handlePasteSubmit}
                                    disabled={!pasteInput.trim()}
                                    className="bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2.5 px-6 rounded-xl transition-colors cursor-pointer border border-primary/30 flex items-center gap-2 disabled:opacity-50"
                                >
                                    <FileJson size={18} />
                                    Analyze JSON Text
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-5 animate-in fade-in zoom-in duration-300">
                    <div className="p-4 bg-muted/40 border border-border/40 rounded-xl">
                        <h3 className="text-sm font-bold text-foreground mb-4">Data Verification Preview:</h3>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-background border border-border/40 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                                <Film size={20} className="text-blue-400 mb-1" />
                                <span className="text-xl font-bold text-foreground">{parsedData.stats.movies}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Movies</span>
                            </div>
                            <div className="bg-background border border-border/40 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                                <Tv size={20} className="text-emerald-400 mb-1" />
                                <span className="text-xl font-bold text-foreground">{parsedData.stats.tvShows}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">TV Shows</span>
                            </div>
                            <div className="bg-background border border-border/40 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                                <MonitorPlay size={20} className="text-purple-400 mb-1" />
                                <span className="text-xl font-bold text-foreground">{parsedData.stats.anime}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Anime</span>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground italic leading-relaxed">
                            * Found <b>{parsedData.entries.length} total entries</b>. Existing data will be securely updated if the <b>Title</b> matches. Unmapped sagas and genres found in the JSON will be auto-created in your system.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={confirmImport}
                            disabled={isImporting}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold py-2.5 px-6 rounded-xl transition-colors cursor-pointer border border-emerald-500/30 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Check size={18} />
                            {isImporting ? 'Processing...' : 'Confirm & Merge Data'}
                        </button>
                        <button
                            onClick={cancelImport}
                            disabled={isImporting}
                            className="bg-muted hover:bg-muted/80 text-foreground font-bold py-2.5 px-6 rounded-xl transition-colors cursor-pointer border border-border/40 flex items-center gap-2 disabled:opacity-50"
                        >
                            <X size={18} />
                            Cancel & Edit
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
