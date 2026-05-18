"use client";

import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Cloud, Film } from 'lucide-react';
import { useState } from 'react';
import styles from './login.module.css';

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        await login(tokenResponse.access_token);
      } catch (e) {
        setError("Failed to initialize session.");
      }
    },
    onError: () => {
      setError("Google authentication failed. Please try again.");
    },
    scope: 'https://www.googleapis.com/auth/drive.appdata'
  });

  return (
    <div className={`animate-in ${styles.container}`}>
      <div className={`glass-card ${styles.card}`}>
        <Film size={48} color="var(--primary)" />
        <div>
          <h1 className={styles.title}>Welcome to Kino</h1>
          <p className={styles.subtitle}>
            Your premium, cloud-synced media tracker.
          </p>
        </div>
        
        <p className={styles.subtitle} style={{ fontSize: '0.85rem' }}>
          Sign in to instantly sync your media library to your personal Google Drive. 
          Your data remains 100% private.
        </p>

        <Button onClick={() => googleLogin()} style={{ width: '100%', marginTop: '1rem' }}>
          <Cloud size={18} /> Sign in with Google
        </Button>

        {error && (
          <div className={styles.error}>{error}</div>
        )}
      </div>
    </div>
  );
}
