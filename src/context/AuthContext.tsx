"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

interface AuthContextType {
  accessToken: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: (forceWipe?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  accessToken: null,
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async (forceWipe?: boolean) => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('kino_access_token');
      if (token) {
        setAccessToken(token);
        await fetchUserProfile(token);
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const fetchUserProfile = async (token: string) => {
    try {
      const res = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setUser({
          name: data.name,
          email: data.email,
          picture: data.picture,
        });
      }
    } catch (error) {
      console.error("Failed to fetch user profile", error);
    }
  };

  useEffect(() => {
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
    await fetchUserProfile(token);
    setIsLoading(false);
    router.push('/');
  };

  const logout = async (forceWipe: boolean = true) => {
    setIsLoading(true);
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('kino_access_token');
    
    if (forceWipe) {
      localStorage.removeItem('kino_entries');
      localStorage.removeItem('kino_genres');
      localStorage.removeItem('kino_franchises');
      import('@/lib/googleDrive').then(({ clearDriveCache }) => clearDriveCache());
      window.location.href = '/login';
      return;
    }

    setIsLoading(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ accessToken, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
