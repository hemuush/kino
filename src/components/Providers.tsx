"use client";

import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/context/AuthContext';
import { MediaProvider } from '@/context/MediaContext';
import { useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE";

  useEffect(() => {
    const savedColorId = localStorage.getItem('kino_accent_color');
    if (savedColorId) {
      const COLORS = [
        { id: 'red', name: 'Kino Red', hex: '#D71921', hover: '#a11319' },
        { id: 'blue', name: 'Electric Blue', hex: '#3b82f6', hover: '#2563eb' },
        { id: 'emerald', name: 'Emerald', hex: '#10b981', hover: '#059669' },
        { id: 'purple', name: 'Neon Purple', hex: '#8b5cf6', hover: '#7c3aed' },
        { id: 'amber', name: 'Amber', hex: '#f59e0b', hover: '#d97706' },
        { id: 'rose', name: 'Rose', hex: '#f43f5e', hover: '#e11d48' },
      ];
      const color = COLORS.find(c => c.id === savedColorId);
      if (color) {
        document.documentElement.style.setProperty('--primary', color.hex);
        document.documentElement.style.setProperty('--primary-hover', color.hover);
        document.documentElement.style.setProperty('--accent', color.hex);
      }
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <GoogleOAuthProvider clientId={clientId}>
        <AuthProvider>
          <MediaProvider>
            {children}
          </MediaProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}
