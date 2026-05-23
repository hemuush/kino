"use client";

import { useState } from 'react';
import { useMedia } from '@/context/MediaContext';
import { Tag } from '@/lib/db';
import { Trash2, Edit2, Check, X, Tag as TagIcon, Film, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsPage() {
  const { genres, setGenres, franchises, setFranchises, isLoading, wipeAllData } = useMedia();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditValue(tag.name);
  };

  const saveGenre = (id: string) => {
    if (!editValue.trim()) return;
    setGenres(genres.map(g => g.id === id ? { ...g, name: editValue.trim() } : g));
    setEditingId(null);
  };

  const saveFranchise = (id: string) => {
    if (!editValue.trim()) return;
    setFranchises(franchises.map(f => f.id === id ? { ...f, name: editValue.trim() } : f));
    setEditingId(null);
  };

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Loading systems...</div>;

  return (
    <div className="absolute inset-0 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 pb-28 space-y-8 sm:space-y-12 max-w-4xl mx-auto text-left">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage global dictionaries and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">

        {/* Franchises Dictionary */}
        <section className="bg-card glass border border-border/60 rounded-3xl p-5 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Film size={20} /></div>
            <h2 className="text-xl font-bold font-display">Sagas</h2>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 hide-scrollbar">
            {franchises.length === 0 && <p className="text-xs text-muted-foreground">No sagas mapped.</p>}
            {franchises.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border/40 hover:border-primary/20 transition-all">
                {editingId === f.id ? (
                  <input autoFocus type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveFranchise(f.id)} className="bg-background px-3 py-1.5 rounded-lg text-sm border border-primary/50 outline-none w-full mr-2" />
                ) : (
                  <span className="text-[14px] font-bold text-foreground">{f.name}</span>
                )}

                <div className="flex items-center gap-1.5">
                  {editingId === f.id ? (
                    <><button onClick={() => saveFranchise(f.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"><Check size={16} /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"><X size={16} /></button></>
                  ) : (
                    <><button onClick={() => startEdit(f)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"><Edit2 size={16} /></button>
                      <button onClick={() => setFranchises(franchises.filter(x => x.id !== f.id))} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"><Trash2 size={16} /></button></>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Genres Dictionary */}
        <section className="bg-card glass border border-border/60 rounded-3xl p-5 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><TagIcon size={20} /></div>
            <h2 className="text-xl font-bold font-display">Genres Matrix</h2>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 hide-scrollbar">
            {genres.map(g => (
              <div key={g.id} className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border/40 hover:border-primary/20 transition-all">
                {editingId === g.id ? (
                  <input autoFocus type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveGenre(g.id)} className="bg-background px-3 py-1.5 rounded-lg text-sm border border-primary/50 outline-none w-full mr-2" />
                ) : (
                  <span className="text-[14px] font-bold text-foreground">{g.name}</span>
                )}

                <div className="flex items-center gap-1.5">
                  {editingId === g.id ? (
                    <><button onClick={() => saveGenre(g.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"><Check size={16} /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"><X size={16} /></button></>
                  ) : (
                    <><button onClick={() => startEdit(g)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"><Edit2 size={16} /></button>
                      <button onClick={() => setGenres(genres.filter(x => x.id !== g.id))} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"><Trash2 size={16} /></button></>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-card glass border border-red-500/30 rounded-3xl p-5 sm:p-8 shadow-sm md:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-red-500/10 rounded-xl text-red-500"><Trash2 size={20} /></div>
            <h2 className="text-xl font-bold font-display text-red-500">Danger Zone</h2>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will permanently delete all your entries, genres, and sagas from this device <b>AND</b> from your Google Drive backup. This action cannot be undone.
            </p>
            <button
              onClick={() => {
                if (window.confirm("Are you absolutely sure you want to delete ALL data? This includes your Google Drive backup and cannot be undone.")) {
                  wipeAllData();
                  alert("All data has been wiped for a fresh start.");
                }
              }}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-2.5 px-6 rounded-xl transition-colors cursor-pointer border border-red-500/30"
            >
              Wipe All Data
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
