"use client";

import { useState } from 'react';
import { useMedia } from '@/context/MediaContext';
import { Tag as DbTag } from '@/lib/db';
import { Trash2, Edit2, Check, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        <div className="flex flex-col h-full">
            <header className="mb-8">
                <h3 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-foreground">Genres Matrix</h3>
                <p className="text-sm text-muted-foreground mt-2 font-medium">Manage your custom list of categories, themes, and genres.</p>
            </header>

            <form onSubmit={addNewGenre} className="flex flex-col sm:flex-row gap-3 mb-8">
                <input
                    type="text"
                    placeholder="Enter new genre..."
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="flex-1 bg-background/50 backdrop-blur-md px-5 py-3.5 rounded-2xl text-sm border border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/70 text-foreground font-medium"
                />
                <button
                    type="submit"
                    disabled={!newValue.trim()}
                    className="px-6 py-3.5 rounded-full bg-foreground text-background hover:bg-foreground/90 transition text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                    <Plus size={18} />
                    Add Genre
                </button>
            </form>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 hide-scrollbar pb-4 min-h-[300px]">
                <AnimatePresence>
                    {genres.length === 0 && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-40 flex items-center justify-center border-2 border-dashed border-border/50 rounded-2xl bg-background/30"
                        >
                            <p className="text-sm text-muted-foreground font-medium">No genres mapped yet.</p>
                        </motion.div>
                    )}

                    {genres.map((g) => (
                        <motion.div 
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            key={g.id} 
                            className="flex items-center justify-between p-4 bg-background/40 backdrop-blur-md rounded-2xl border border-border/40 hover:border-primary/30 transition-all group shadow-sm"
                        >
                            {editingId === g.id ? (
                                <input 
                                    autoFocus 
                                    type="text" 
                                    value={editValue} 
                                    onChange={(e) => setEditValue(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && saveGenre(g.id)} 
                                    className="bg-background/80 px-4 py-2 rounded-xl text-sm border border-primary/50 outline-none w-full mr-4 focus:ring-2 focus:ring-primary/20 font-medium" 
                                />
                            ) : (
                                <span className="text-[15px] font-semibold text-foreground truncate pr-4">{g.name}</span>
                            )}

                            <div className="flex items-center gap-2 shrink-0">
                                {editingId === g.id ? (
                                    <>
                                        <button onClick={() => saveGenre(g.id)} className="p-2 text-green-500 hover:bg-green-500/10 rounded-xl transition-colors"><Check size={18} /></button>
                                        <button onClick={cancelEdit} className="p-2 text-muted-foreground hover:bg-muted/80 rounded-xl transition-colors"><X size={18} /></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => startEdit(g)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-xl transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><Edit2 size={18} /></button>
                                        <button onClick={() => setGenres(genres.filter(x => x.id !== g.id))} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={18} /></button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}