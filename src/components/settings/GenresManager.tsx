"use client";

import { useState } from 'react';
import { useMedia } from '@/context/MediaContext';
import { Tag as DbTag } from '@/lib/db';
import { Trash2, Edit2, Check, X, Plus } from 'lucide-react';

export function GenresManager() {
    const { genres, setGenres } = useMedia();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [newValue, setNewValue] = useState<string>('');

    const startEdit = (tag: DbTag) => {
        setEditingId(tag.id);
        setEditValue(tag.name);
    };

    const saveGenre = (id: string) => {
        if (!editValue.trim()) return;
        setGenres(genres.map(g => g.id === id ? { ...g, name: editValue.trim() } : g));
        setEditingId(null);
    };

    const addNewGenre = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newValue.trim()) return;
        const newId = `genre-${Date.now()}`;
        setGenres([...genres, { id: newId, name: newValue.trim() }]);
        setNewValue('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-card glass border border-border/60 rounded-3xl p-6 shadow-sm overflow-hidden">
            <header className="mb-6 shrink-0">
                <h3 className="text-lg font-bold font-display text-foreground">Genres Matrix</h3>
                <p className="text-sm text-muted-foreground">Manage your custom list of categories and genres.</p>
            </header>

            <form onSubmit={addNewGenre} className="flex gap-2 mb-6 shrink-0">
                <input
                    type="text"
                    placeholder="Add new genre..."
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="flex-1 bg-background px-4 py-2.5 rounded-xl text-sm border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                <button
                    type="submit"
                    disabled={!newValue.trim()}
                    className="px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Add</span>
                </button>
            </form>

            <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-2 hide-scrollbar">
                {genres.length === 0 && (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-border/50 rounded-xl">
                        <p className="text-sm text-muted-foreground font-medium">No genres mapped yet.</p>
                    </div>
                )}

                {genres.map((g) => (
                    <div key={g.id} className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl border border-border/40 hover:border-primary/20 transition-all group">
                        {editingId === g.id ? (
                            <input autoFocus type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveGenre(g.id)} className="bg-background px-3 py-1.5 rounded-lg text-sm border border-primary/50 outline-none w-full mr-3 focus:ring-2 focus:ring-primary/20" />
                        ) : (
                            <span className="text-[14px] font-semibold text-foreground truncate pr-2">{g.name}</span>
                        )}

                        <div className="flex items-center gap-1.5 shrink-0">
                            {editingId === g.id ? (
                                <>
                                    <button onClick={() => saveGenre(g.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"><Check size={16} /></button>
                                    <button onClick={cancelEdit} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors"><X size={16} /></button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => startEdit(g)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"><Edit2 size={16} /></button>
                                    <button onClick={() => setGenres(genres.filter(x => x.id !== g.id))} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"><Trash2 size={16} /></button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}