"use client";

import { useState } from 'react';
import { useMedia } from '@/hooks/useMedia';
import { MediaCard } from '@/components/MediaCard';
import { MediaDetailModal } from '@/components/MediaDetailModal';
import { MediaEntry } from '@/lib/db';
import { Film, Edit2, Save, X, Plus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SagasPage() {
  const { entries, franchises, updateEntry, deleteEntry, setFranchises } = useMedia();
  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null);
  const [editingFranchiseId, setEditingFranchiseId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [expandedFranchiseId, setExpandedFranchiseId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedFranchiseId(prev => prev === id ? null : id);
  };

  const handleStartEdit = (franchise: any) => {
    setEditingFranchiseId(franchise.id);
    setEditName(franchise.name);
    setEditCoverImage(franchise.coverImage || '');
  };

  const handleSaveEdit = () => {
    if (!editName.trim() || !editingFranchiseId) return;
    const newFranchises = franchises.map(f => f.id === editingFranchiseId ? { ...f, name: editName.trim(), coverImage: editCoverImage } : f);
    setFranchises(newFranchises);
    setEditingFranchiseId(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-8 pt-8 px-4 sm:px-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/20 text-primary rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)] glass">
          <Film size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Sagas</h1>
          <p className="text-muted-foreground text-sm font-semibold">Your cinematic universes and collections.</p>
        </div>
      </div>

      <div className="space-y-6">
        {franchises.length === 0 ? (
          <div className="text-center py-20 bg-card glass border border-border/40 rounded-3xl">
            <Film size={48} className="mx-auto mb-4 text-muted-foreground/30" strokeWidth={1} />
            <h3 className="text-xl font-bold font-display mb-2">No Sagas Yet</h3>
            <p className="text-muted-foreground text-sm">Add a saga while adding media to see your collections here.</p>
          </div>
        ) : (
          franchises.map(franchise => {
            const sagaEntries = entries.filter(e => e.franchiseId === franchise.id);
            const sortedSagaEntries = [...sagaEntries].sort((a, b) => {
              const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
              const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
              return dateA - dateB;
            });

            return (
              <motion.div key={franchise.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="group relative bg-card/40 glass border border-border/60 rounded-[28px] shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                
                {/* Saga Header Backdrop */}
                <div className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none group-hover:opacity-10 transition-opacity duration-500">
                  {franchise.coverImage ? (
                    <img src={franchise.coverImage} alt={franchise.name} className="w-full h-full object-cover blur-3xl scale-110" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/40 to-transparent" />
                  )}
                </div>

                {/* Header Content */}
                <div className="relative z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/20 bg-card/60 backdrop-blur-md">
                  {editingFranchiseId === franchise.id ? (
                    <div className="flex flex-col gap-3 w-full max-w-md bg-background/80 p-4 m-4 rounded-xl border border-border/40 backdrop-blur-md shadow-lg">
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)} 
                          autoFocus
                          placeholder="Saga Name"
                          className="flex-1 bg-muted/40 focus:bg-background border border-border/80 px-3 py-2 rounded-xl outline-none text-sm font-bold"
                        />
                        <button onClick={handleSaveEdit} className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 shadow-sm"><Save size={16} /></button>
                        <button onClick={() => setEditingFranchiseId(null)} className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted-hover"><X size={16} /></button>
                      </div>
                      <input 
                        type="text" 
                        value={editCoverImage} 
                        onChange={(e) => setEditCoverImage(e.target.value)} 
                        placeholder="Cover Image URL (Optional)"
                        className="w-full bg-muted/40 focus:bg-background border border-border/80 px-3 py-2 rounded-xl outline-none text-xs"
                      />
                    </div>
                  ) : (
                    <div 
                      onClick={() => sagaEntries.length > 0 && toggleExpand(franchise.id)}
                      className={`flex w-full items-center justify-between p-4 sm:p-5 transition-colors ${sagaEntries.length > 0 ? 'cursor-pointer hover:bg-muted/10' : ''}`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {franchise.coverImage ? (
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[14px] overflow-hidden border border-border/40 shadow-sm shrink-0 transition-transform duration-500 group-hover:scale-105 group-hover:shadow-primary/20">
                            <img src={franchise.coverImage} alt={franchise.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[14px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/20 shadow-sm shrink-0 relative overflow-hidden">
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                            <Film size={20} className="text-primary relative z-10 drop-shadow-sm sm:w-6 sm:h-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg sm:text-2xl font-black font-display text-foreground tracking-tight mb-1 truncate bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">{franchise.name}</h2>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] sm:text-[10px] font-black tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase border border-primary/20 backdrop-blur-md shadow-sm">
                              {sagaEntries.length} {sagaEntries.length === 1 ? 'Entry' : 'Entries'}
                            </span>
                            {sagaEntries.length > 0 && (
                              <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/40 uppercase tracking-wider">
                                Timeline
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 pl-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(franchise); }} 
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-background/50 border border-border/40 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center shadow-sm backdrop-blur-sm shrink-0"
                        >
                          <Edit2 size={13} className="sm:w-3.5 sm:h-3.5" />
                        </button>
                        {sagaEntries.length > 0 && (
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground transition-transform duration-300 ${expandedFranchiseId === franchise.id ? 'rotate-180 bg-primary/10 text-primary' : ''}`}>
                            <ChevronDown size={16} className="sm:w-[18px] sm:h-[18px]" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline Grid */}
                <AnimatePresence initial={false}>
                  {expandedFranchiseId === franchise.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="relative z-10 px-6 sm:px-8 py-8 overflow-x-auto hide-scrollbar border-t border-border/30 bg-muted/5">
                        {/* The continuous horizontal timeline line */}
                        <div className="absolute top-[49px] left-12 right-12 h-0.5 bg-gradient-to-r from-primary/5 via-primary/30 to-primary/5 z-0 rounded-full"></div>

                        <div className="flex gap-6 sm:gap-8 w-max pb-4 relative z-10">
                          {sortedSagaEntries.map((entry, idx) => (
                            <div key={entry.id} className="flex flex-col gap-5 w-[130px] sm:w-[150px] shrink-0 group">
                              {/* Timeline Node */}
                              <div className="flex flex-col items-center relative">
                                <div className="text-[11px] font-black text-muted-foreground/60 group-hover:text-primary transition-colors tracking-widest mb-2.5">
                                  {entry.releaseDate ? entry.releaseDate.split('-')[0] : 'TBA'}
                                </div>
                                {/* Dot */}
                                <div className="w-3.5 h-3.5 rounded-full bg-background border-[2.5px] border-primary/40 group-hover:border-primary group-hover:bg-primary group-hover:scale-125 transition-all duration-300 shadow-[0_0_10px_rgba(var(--primary),0.2)] group-hover:shadow-[0_0_15px_rgba(var(--primary),0.6)] z-10"></div>
                              </div>
                              
                              {/* Card Container with connecting line */}
                              <div className="relative pt-2">
                                {/* Vertical connecting line */}
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-[2px] h-7 bg-gradient-to-b from-primary/30 to-transparent group-hover:from-primary/60 transition-colors duration-300"></div>
                                <MediaCard entry={entry} onClick={() => setSelectedEntry(entry)} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {selectedEntry && (
        <MediaDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSave={async (updatedEntry) => {
            updateEntry(updatedEntry);
            setSelectedEntry(updatedEntry);
          }}
          onDelete={async (id) => { deleteEntry(id); setSelectedEntry(null); }}
        />
      )}
    </div>
  );
}
