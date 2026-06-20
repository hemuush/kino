// src/context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Google OAuth access tokens expire in 3600 seconds (1 hour).
// We refresh proactively 5 minutes before expiry.
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes

interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

interface AuthContextType {
  accessToken: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string, expiresIn?: number) => Promise<void>;
  logout: (forceWipe?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  accessToken: null,
  user: null,
  isLoading: true,
  login: async () => { },
  logout: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Ref to track refresh timeout so we can clear it on logout
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref for the google token client (populated lazily)
  const tokenClientRef = useRef<{ requestAccessToken: (overrideConfig?: object) => void } | null>(null);

  const fetchUserProfile = useCallback(async (token: string): Promise<boolean> => {
    try {
      const res = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setUser({
          name: data.name,
          email: data.email,
          picture: data.picture,
        });
        return true;
      } else if (res.status === 401) {
        console.warn("Token expired during profile fetch");
        return false;
      }
    } catch (error) {
      console.error("Failed to fetch user profile", error);
    }
    return false;
  }, []);

  // Schedule a proactive token refresh before it expires
  function scheduleTokenRefresh(expiresInMs: number) {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    const refreshIn = Math.max(0, expiresInMs - TOKEN_REFRESH_MARGIN_MS);
    console.log(`[Auth] Token refresh scheduled in ${Math.round(refreshIn / 1000 / 60)} minutes`);

    refreshTimeoutRef.current = setTimeout(() => {
      console.log('[Auth] Proactively refreshing Google OAuth token...');
      // Initialize Google token client for silent re-auth
      if (typeof window !== 'undefined' && (window as unknown as { google?: { accounts?: { oauth2?: { initTokenClient: (cfg: object) => { requestAccessToken: (cfg?: object) => void } } } } }).google?.accounts?.oauth2) {
        const google = (window as unknown as { google: { accounts: { oauth2: { initTokenClient: (cfg: object) => { requestAccessToken: (cfg?: object) => void } } } } }).google;
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) return;

        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.appdata',
          callback: (response: { access_token?: string; expires_in?: number; error?: string }) => {
            if (response.access_token) {
              const expiresIn = (response.expires_in || 3600) * 1000;
              try {
                localStorage.setItem('kino_access_token', response.access_token);
                localStorage.setItem('kino_token_expiry', String(Date.now() + expiresIn));
              } catch {}
              setAccessToken(response.access_token);
              scheduleTokenRefresh(expiresIn);
              console.log('[Auth] Token refreshed silently ✓');
            } else {
              console.warn('[Auth] Silent token refresh failed, user may need to re-login');
            }
          },
          prompt: '',
        });
        tokenClientRef.current = tokenClient;
        tokenClient.requestAccessToken({ prompt: '' });
      }
    }, refreshIn);
  }

  // On mount: restore token from localStorage + validate
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('kino_access_token');
      const expiryStr = localStorage.getItem('kino_token_expiry');
      const sessionExpiryStr = localStorage.getItem('kino_session_expiry');
      const storedUserStr = localStorage.getItem('kino_user_profile');
      
      const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
      const sessionExpiry = sessionExpiryStr ? parseInt(sessionExpiryStr, 10) : 0;
      const now = Date.now();

      // If we have a valid 30-day session, restore the user immediately so they don't get kicked out
      if (sessionExpiry > now && storedUserStr) {
        try {
          setUser(JSON.parse(storedUserStr));
        } catch (_e) {}
      }

      if (token && sessionExpiry > now) {
        if (expiry > 0 && expiry <= now) {
          // Token is expired but session is valid — trigger silent refresh
          console.warn('[Auth] Stored token has expired, triggering silent refresh');
          scheduleTokenRefresh(0); // Trigger immediately
        } else {
          // Token appears valid — validate by fetching profile
          const isValid = await fetchUserProfile(token);
          if (isValid) {
            setAccessToken(token);
            if (expiry > 0) {
              const remainingMs = expiry - Date.now();
              if (remainingMs > TOKEN_REFRESH_MARGIN_MS) {
                scheduleTokenRefresh(remainingMs);
              } else {
                scheduleTokenRefresh(0);
              }
            } else {
              scheduleTokenRefresh(60 * 60 * 1000);
            }
          } else {
            // Token validation failed, try silent refresh
            scheduleTokenRefresh(0);
          }
        }
      } else if (sessionExpiry <= now) {
         // Session completely expired (past 30 days)
         localStorage.removeItem('kino_access_token');
         localStorage.removeItem('kino_token_expiry');
         localStorage.removeItem('kino_session_expiry');
         localStorage.removeItem('kino_user_profile');
      }
      setIsLoading(false);
    };
    initAuth();

    // Cleanup refresh timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect logic based on auth state
  useEffect(() => {
    if (!isLoading) {
      if (!accessToken && pathname !== '/login') {
        router.push('/login');
      } else if (accessToken && pathname === '/login') {
        router.push('/');
      }
    }
  }, [accessToken, isLoading, pathname, router]);

  const login = async (token: string, expiresIn = 3600) => {
    setIsLoading(true);
    const now = Date.now();
    const expiryTimestamp = now + expiresIn * 1000;
    const sessionExpiryTimestamp = now + 30 * 24 * 60 * 60 * 1000; // 30 days session
    
    try {
      localStorage.setItem('kino_access_token', token);
      localStorage.setItem('kino_token_expiry', String(expiryTimestamp));
      localStorage.setItem('kino_session_expiry', String(sessionExpiryTimestamp));
    } catch {}
    
    setAccessToken(token);
    await fetchUserProfile(token);
    
    // Store user profile in local storage for the 30-day session persistence
    setUser((currentUser) => {
      if (currentUser) {
         localStorage.setItem('kino_user_profile', JSON.stringify(currentUser));
      }
      return currentUser;
    });

    // Schedule proactive refresh
    scheduleTokenRefresh(expiresIn * 1000);
    setIsLoading(false);
    router.push('/');
  };

  const logout = async (forceWipe: boolean = true) => {
    // Cancel any pending refresh
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);

    setIsLoading(true);
    setAccessToken(null);
    setUser(null);
    try {
      localStorage.removeItem('kino_access_token');
      localStorage.removeItem('kino_token_expiry');
      localStorage.removeItem('kino_session_expiry');
      localStorage.removeItem('kino_user_profile');
    } catch {}

    if (forceWipe) {
      try {
        localStorage.removeItem('kino_entries');
        localStorage.removeItem('kino_genres');
        localStorage.removeItem('kino_franchises');
        localStorage.removeItem('kino_timestamp');
      } catch {}
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
