"use client";

import { useState } from 'react';
import { useMedia } from '@/hooks/useMedia';
import { Download, Upload, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { importData } from '@/lib/db';
import { Button } from '@/components/ui/Button';
import styles from './settings.module.css';

export default function Settings() {
  const { entries, refresh } = useMedia();
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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
    showStatus('success', 'Data exported successfully!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setStatus(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        const success = await importData(text);
        if (success) {
          showStatus('success', 'Data imported successfully!');
          await refresh();
        } else {
          showStatus('error', 'Failed to import data. Invalid format.');
        }
      }
      setIsImporting(false);
      const target = document.getElementById('import-file') as HTMLInputElement;
      if (target) target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className={`animate-in ${styles.container}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your application data.</p>
      </div>

      <div className={`glass-card ${styles.card}`}>
        
        {/* Status Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <ShieldCheck size={24} color="#10b981" />
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#10b981' }}>Live Cloud Sync Active</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Your data is securely backing up to Google Drive in the background.</p>
          </div>
        </div>

        <div className={styles.divider} />

        <div>
          <h2 className={styles.cardTitle}>Local File Backup</h2>
          <p className={styles.cardText}>
            Export your database to a JSON file to store locally on your hard drive, or manually import a previous backup file.
          </p>
        </div>

        <div className={styles.actionsRow}>
          <Button variant="secondary" onClick={handleExport} style={{ flex: 1 }}>
            <Download size={18} /> Export JSON
          </Button>

          <label className={`${styles.uploadLabel} ${isImporting ? styles.loading : ''}`}>
            <Upload size={18} /> {isImporting ? 'Importing...' : 'Import JSON'}
            <input type="file" id="import-file" accept=".json" onChange={handleImport} style={{ display: 'none' }} disabled={isImporting} />
          </label>
        </div>

        {status && (
          <div className={`${styles.statusMessage} ${styles[status.type]}`}>
            {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className={styles.statusText}>{status.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
