"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { clearAllMedia, importData } from '@/lib/db';
import { downloadBackupFromDrive } from '@/lib/googleDrive';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  accessToken: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  accessToken: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check local storage for an existing token on mount
    const token = localStorage.getItem('kino_access_token');
    if (token) {
      setAccessToken(token);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Route guard
    if (!isLoading) {
      if (!accessToken && pathname !== '/login') {
        router.push('/login');
      } else if (accessToken && pathname === '/login') {
        router.push('/');
      }
    }
  }, [accessToken, isLoading, pathname, router]);

  const login = async (token: string) => {
    setIsLoading(true);
    setAccessToken(token);
    localStorage.setItem('kino_access_token', token);
    
    // Automatically fetch from drive on login
    try {
      const data = await downloadBackupFromDrive(token);
      if (data) {
        await importData(JSON.stringify(data));
      }
    } catch (e) {
      console.error("Failed to sync on login", e);
    }
    
    setIsLoading(false);
    router.push('/');
  };

  const logout = async () => {
    setIsLoading(true);
    setAccessToken(null);
    localStorage.removeItem('kino_access_token');
    
    // Wipe local DB for privacy
    await clearAllMedia();
    
    setIsLoading(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ accessToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
