"use client";

import { useState, useEffect } from 'react';
import { useMedia } from '@/hooks/useMedia';
import { Download, Upload, AlertCircle, CheckCircle2, Cloud, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { uploadBackupToDrive } from '@/lib/googleDrive';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

export default function Settings() {
  const { entries, refresh } = useMedia();
  const { accessToken, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => setMounted(true), []);

  const showStatus = (type: 'success' | 'error', message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kino-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('success', 'Backup exported successfully!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    setIsImporting(true);
    setStatus(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') {
        try {
          const data = JSON.parse(text);
          const success = await uploadBackupToDrive(accessToken, data);
          if (success) {
            showStatus('success', 'Data restored to cloud successfully!');
            await refresh();
          } else {
            showStatus('error', 'Failed to upload to Google Drive.');
          }
        } catch (err) {
          console.error('Import failed', err);
          showStatus('error', 'Invalid file format.');
        }
      }
      setIsImporting(false);
      const target = document.getElementById('import-file') as HTMLInputElement;
      if (target) target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center px-6 h-14 max-w-2xl mx-auto w-full">
          <h1 className="font-display text-[17px] font-semibold tracking-tight">Settings</h1>
        </div>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-6 max-w-2xl mx-auto w-full space-y-6 animate-fade-up">

        {/* Cloud Status — inline, minimal */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[13px] text-muted-foreground font-medium">
            <span className="text-emerald-500 font-semibold">Synced</span> · {entries.length} titles on Google Drive
          </span>
        </div>

        {/* Appearance */}
        {mounted && (
          <div className="surface-elevated rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5">
              <h2 className="text-[13px] font-semibold text-muted-foreground">Appearance</h2>
            </div>
            <div className="px-3 pb-3">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center">
                    {theme === 'dark' ? <Moon size={16} strokeWidth={1.8} /> : <Sun size={16} strokeWidth={1.8} />}
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-medium">Theme</p>
                    <p className="text-[11px] text-muted-foreground">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</p>
                  </div>
                </div>
                <div className={`w-10 h-[22px] rounded-full relative transition-colors duration-300 ${theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/25'}`}>
                  <div className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${theme === 'dark' ? 'left-[21px]' : 'left-[3px]'}`} />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Data Management */}
        <div className="surface-elevated rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5">
            <h2 className="text-[13px] font-semibold text-muted-foreground">Data</h2>
          </div>
          <div className="px-5 pb-5 space-y-3">
            <p className="text-[12px] text-muted-foreground/70">
              Export a local backup or restore from a JSON file.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-2 border border-border hover:bg-muted/50 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
              >
                <Download size={15} strokeWidth={1.8} /> Export
              </button>
              <label className={`flex-1 flex items-center justify-center gap-2 border border-border hover:bg-muted/50 py-2.5 rounded-xl text-[13px] font-medium transition-colors cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload size={15} strokeWidth={1.8} /> {isImporting ? 'Restoring...' : 'Restore'}
                <input type="file" id="import-file" accept=".json" onChange={handleImport} className="hidden" disabled={isImporting} />
              </label>
            </div>
          </div>
        </div>

        {/* Status Toast */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`flex items-center gap-3 p-4 rounded-xl text-[13px] font-medium ${
                status.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{status.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sign Out — minimal */}
        <div className="pt-4">
          <button
            onClick={logout}
            className="text-[13px] font-medium text-red-400 hover:text-red-500 transition-colors px-1"
          >
            Sign Out
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground/30 px-1 pb-8">
          Kino v1.0
        </p>
      </div>
    </div>
  );
}
