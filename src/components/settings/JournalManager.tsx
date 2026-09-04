"use client";

import { useEffect, useMemo, useState } from 'react';
import { useMedia } from '@/context/MediaContext';
import { JournalEntry } from '@/lib/db';
import { NotebookPen, Trash2, Edit2, Check, X, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { SettingsSectionHeader } from './SettingsSectionHeader';

function toISODate(d: Date): string {
    return d.toISOString().split('T')[0];
}

function formatEntryDate(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

export function JournalManager() {
    const { journal, addJournalEntry, updateJournalEntry, deleteJournalEntry } = useMedia();

    // Deferred: avoid computing "today" during render/initial state (React 19 purity).
    const [today, setToday] = useState<string>('');
    useEffect(() => {
        Promise.resolve().then(() => setToday(toISODate(new Date())));
    }, []);

    const [date, setDate] = useState<string>('');
    const [text, setText] = useState<string>('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState<string>('');
    const [editText, setEditText] = useState<string>('');

    const sortedJournal = useMemo(
        () => [...journal].sort((a, b) => (b.date === a.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date))),
        [journal]
    );

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        addJournalEntry(date || today, text.trim());
        setText('');
        setDate('');
        toast.success('Entry saved.');
    };

    const startEdit = (entry: JournalEntry) => {
        setEditingId(entry.id);
        setEditDate(entry.date);
        setEditText(entry.text);
    };

    const cancelEdit = () => setEditingId(null);

    const saveEdit = (id: string) => {
        if (!editText.trim()) return;
        updateJournalEntry(id, { date: editDate, text: editText.trim() });
        setEditingId(null);
    };

    const handleDelete = (id: string) => {
        deleteJournalEntry(id);
        toast.success('Entry deleted.');
    };

    return (
        <div className="flex flex-col h-full">
            <header className="mb-8">
                <SettingsSectionHeader
                    icon={<NotebookPen size={26} strokeWidth={2.5} />}
                    title="Journal"
                    description="Freeform, date-stamped notes — private to you, synced to your Drive, never shown on your public profile."
                />
            </header>

            <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays size={16} className="shrink-0" />
                    <input
                        type="date"
                        value={date || today}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-background/50 backdrop-blur-md px-4 py-2.5 rounded-xl text-sm border border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground font-medium"
                    />
                </div>
                <textarea
                    placeholder="What's on your mind about what you're watching?"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    className="w-full bg-background/50 backdrop-blur-md px-5 py-3.5 rounded-2xl text-sm border border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/70 text-foreground font-medium resize-none"
                />
                <button
                    type="submit"
                    disabled={!text.trim()}
                    className="self-end px-6 py-3 rounded-full bg-foreground text-background hover:bg-foreground/90 transition text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <NotebookPen size={16} />
                    Save Entry
                </button>
            </form>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 hide-scrollbar pb-4 min-h-[300px]">
                <AnimatePresence>
                    {sortedJournal.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-40 flex items-center justify-center border-2 border-dashed border-border/50 rounded-2xl bg-background/30"
                        >
                            <p className="text-sm text-muted-foreground font-medium">No entries yet — write your first note above.</p>
                        </motion.div>
                    )}

                    {sortedJournal.map((entry) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            key={entry.id}
                            className="p-4 bg-background/40 backdrop-blur-md rounded-2xl border border-border/40 hover:border-primary/30 transition-all group shadow-sm"
                        >
                            {editingId === entry.id ? (
                                <div className="flex flex-col gap-3">
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        className="bg-background/80 px-4 py-2 rounded-xl text-sm border border-primary/50 outline-none w-fit focus:ring-2 focus:ring-primary/20 font-medium"
                                    />
                                    <textarea
                                        autoFocus
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        rows={3}
                                        className="bg-background/80 px-4 py-3 rounded-xl text-sm border border-primary/50 outline-none w-full focus:ring-2 focus:ring-primary/20 font-medium resize-none"
                                    />
                                    <div className="flex items-center gap-2 self-end">
                                        <button onClick={() => saveEdit(entry.id)} className="p-2 text-green-500 hover:bg-green-500/10 rounded-xl transition-colors"><Check size={18} /></button>
                                        <button onClick={cancelEdit} className="p-2 text-muted-foreground hover:bg-muted/80 rounded-xl transition-colors"><X size={18} /></button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-primary">{formatEntryDate(entry.date)}</span>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => startEdit(entry)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><Edit2 size={15} /></button>
                                            <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={15} /></button>
                                        </div>
                                    </div>
                                    <p className="text-[15px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{entry.text}</p>
                                </>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
