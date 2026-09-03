"use client";

import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/context/AuthContext';
import { MediaProvider } from '@/context/MediaContext';
import { useEffect } from 'react';
import { APP_COLORS } from '@/lib/colors';

export function Providers({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE";

  useEffect(() => {
    const savedColorId = localStorage.getItem('kino_accent_color');
    if (savedColorId) {
      const color = APP_COLORS.find(c => c.id === savedColorId) || APP_COLORS[0];
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
