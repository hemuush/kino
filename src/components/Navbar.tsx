"use client";

import Link from "next/link";
import { Film, LogOut, Sun, Moon, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Navbar() {
  const { accessToken, logout, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (isLoading) return null;

  const ThemeToggle = () => {
    if (!mounted) return <div style={{ width: 32, height: 32 }} />;
    return (
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: '0.5rem',
          background: 'var(--primary-soft)', color: 'var(--primary)',
          transition: 'all 0.2s'
        }}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    );
  };

  if (!accessToken) {
    return (
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50, width: '100%',
        padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', background: 'var(--nav-bg)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.25rem' }}>
          <Film color="var(--primary)" size={22} />
          <span>Kino</span>
        </div>
        <ThemeToggle />
      </nav>
    );
  }

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50, width: '100%',
      padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', background: 'var(--nav-bg)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)'
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.25rem' }}>
        <Film color="var(--primary)" size={22} />
        <span>Kino</span>
      </Link>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Link href="/" className="nav-link">Dashboard</Link>
        <Link href="/settings" className="nav-link">
          <Settings size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          <span className="hide-on-mobile">Settings</span>
        </Link>
        <ThemeToggle />
        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: '0.5rem',
          background: 'var(--danger-soft)', color: 'var(--danger)',
          transition: 'all 0.2s'
        }}>
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
