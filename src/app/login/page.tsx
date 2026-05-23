"use client";

import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { KinoLogo } from "@/components/KinoLogo";

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoggingIn(true);
        await login(tokenResponse.access_token);
      } catch (e) {
        setError("Failed to initialize session.");
        setIsLoggingIn(false);
      }
    },
    onError: () => {
      setError("Google authentication failed. Please try again.");
      setIsLoggingIn(false);
    },
    scope: 'https://www.googleapis.com/auth/drive.appdata'
  });

  const features = [
    { title: 'Track movies, series & anime', delay: 0.35 },
    { title: 'Auto-synced to Google Drive', delay: 0.4 },
    { title: 'Private — only you can see it', delay: 0.45 },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-background">
      
      {/* Ambient background orbs */}
      <div className="absolute top-[10%] left-[20%] w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-primary/10 rounded-full blur-[130px] pointer-events-none animate-float" />
      <div className="absolute bottom-[10%] right-[15%] w-[300px] sm:w-[450px] h-[300px] sm:h-[450px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none animate-float" style={{ animationDelay: '3s' }} />
      
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[380px] sm:max-w-[400px] bg-card/30 backdrop-blur-xl border border-border/70 rounded-[32px] px-6 py-10 sm:p-10 shadow-2xl flex flex-col items-center text-center"
      >
        
        {/* Animated Logo Orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-card border border-border/80 flex items-center justify-center shadow-lg shadow-primary/5">
            <KinoLogo size={42} showText={false} />
          </div>
          {/* Soft glow behind */}
          <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-primary/20 blur-xl -z-10 animate-pulse" />
        </motion.div>

        {/* Typography */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-primary via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Kino
          </h1>
          <p className="text-muted-foreground text-[13px] font-medium tracking-wide uppercase">
            Your personal watchlist
          </p>
        </motion.div>
 
        {/* Feature list — minimal glass items */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full mb-8 space-y-2.5 text-left"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: f.delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 p-3 bg-muted/20 border border-border/30 rounded-xl"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
              <span className="text-[12.5px] text-muted-foreground/90 font-medium">{f.title}</span>
            </motion.div>
          ))}
        </motion.div>
 
        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          onClick={() => googleLogin()}
          disabled={isLoggingIn}
          className="w-full flex items-center justify-center gap-3 bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98] py-3.5 rounded-2xl font-bold text-[14px] transition-all duration-200 cursor-pointer shadow-md shadow-black/10 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isLoggingIn ? (
            <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {isLoggingIn ? 'Connecting...' : 'Continue with Google'}
        </motion.button>
 
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-xs text-red-400 font-semibold"
          >
            {error}
          </motion.p>
        )}
 
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-5 text-[11px] text-muted-foreground/50 leading-relaxed font-medium"
        >
          We only access your private Google Drive app folder.
        </motion.p>
      </motion.div>
    </div>
  );
}
