"use client";

import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoggingIn(true);
        setError(null);
        await login(tokenResponse.access_token, tokenResponse.expires_in || 3600);
      } catch {
        setError("Failed to initialize session. Please try again.");
        setIsLoggingIn(false);
      }
    },
    onError: () => {
      setError("Google authentication failed. Please try again.");
      setIsLoggingIn(false);
    },
    scope: 'https://www.googleapis.com/auth/drive.appdata'
  });

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#050508]">
      {/* Cinematic background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(41, 151, 255, 0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 100% 100%, rgba(139, 92, 246, 0.12) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 0% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)',
          }}
        />
        {/* Film grain overlay */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '256px',
        }} />
      </div>

      {/* Floating orbs */}
      <motion.div
        animate={{ y: [0, -20, 0], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[15%] left-[10%] w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(41,151,255,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />
      <motion.div
        animate={{ y: [0, 20, 0], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute bottom-[10%] right-[8%] w-[350px] h-[350px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)', filter: 'blur(50px)' }}
      />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px] mx-4"
      >
        {/* Glass card */}
        <div
          className="relative rounded-[32px] overflow-hidden border"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(40px) saturate(1.5)',
            borderColor: 'rgba(255,255,255,0.1)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.1) inset',
          }}
        >
          <div className="px-8 pt-10 pb-8">
            {/* Logo section */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="flex flex-col items-center text-center mb-8"
            >
              {/* Cinema reel icon */}
              <div className="relative mb-5">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(41,151,255,0.25), rgba(139,92,246,0.2))',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 8px 32px rgba(41,151,255,0.2), 0 0 0 1px rgba(255,255,255,0.05) inset',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5"/>
                    <circle cx="16" cy="16" r="4" fill="rgba(255,255,255,0.9)"/>
                    <circle cx="16" cy="6" r="2" fill="rgba(255,255,255,0.6)"/>
                    <circle cx="16" cy="26" r="2" fill="rgba(255,255,255,0.6)"/>
                    <circle cx="6" cy="16" r="2" fill="rgba(255,255,255,0.6)"/>
                    <circle cx="26" cy="16" r="2" fill="rgba(255,255,255,0.6)"/>
                    <circle cx="9.1" cy="9.1" r="2" fill="rgba(255,255,255,0.4)"/>
                    <circle cx="22.9" cy="22.9" r="2" fill="rgba(255,255,255,0.4)"/>
                    <circle cx="22.9" cy="9.1" r="2" fill="rgba(255,255,255,0.4)"/>
                    <circle cx="9.1" cy="22.9" r="2" fill="rgba(255,255,255,0.4)"/>
                  </svg>
                </div>
                {/* Glow pulse */}
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: 'radial-gradient(circle, rgba(41,151,255,0.3) 0%, transparent 70%)', filter: 'blur(8px)' }}
                />
              </div>

              <h1
                className="text-4xl font-black tracking-tight mb-1.5"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.03em',
                }}
              >
                Kino
              </h1>
              <p className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Your Personal Cinema
              </p>
            </motion.div>

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="grid grid-cols-1 gap-2 mb-8"
            >
              {[
                { icon: '🎬', text: 'Track movies, series & anime' },
                { icon: '☁️', text: 'Synced to Google Drive privately' },
                { icon: '⭐', text: 'Ratings, reviews & saga timelines' },
              ].map((item, i) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.06, duration: 0.4 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <span className="text-lg leading-none">{item.icon}</span>
                  <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>{item.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Sign in button */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <button
                onClick={() => googleLogin()}
                disabled={isLoggingIn}
                className="w-full relative flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-[15px] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer overflow-hidden group"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(240,245,255,0.96) 100%)',
                  color: '#0f172a',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.5) inset',
                }}
              >
                {/* Hover shimmer */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, rgba(41,151,255,0.08) 0%, rgba(139,92,246,0.06) 100%)' }}
                />
                {isLoggingIn ? (
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                <span className="relative">{isLoggingIn ? 'Connecting...' : 'Continue with Google'}</span>
              </button>
            </motion.div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 px-4 py-3 rounded-xl text-center text-sm font-medium"
                  style={{
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#f87171',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Privacy note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="mt-6 text-center text-[11px] leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              We only access your private Google Drive app folder.<br />
              Your data is never shared with anyone.
            </motion.p>
          </div>
        </div>

        {/* Version badge */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center mt-4 text-[11px]"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          Kino v1.0 · Personal Cinema Tracker
        </motion.p>
      </motion.div>
    </div>
  );
}
