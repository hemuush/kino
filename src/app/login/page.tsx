"use client";

import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Film, Cloud, Star, Shield, ArrowRight } from 'lucide-react';
import { KinoLogo } from '@/components/KinoLogo';
import Link from 'next/link';

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Mouse interaction for background and card parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 100, mass: 1 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const bgGradientX = useTransform(smoothX, [-0.5, 0.5], ['30%', '70%']);
  const bgGradientY = useTransform(smoothY, [-0.5, 0.5], ['30%', '70%']);
  
  const cardRotateX = useTransform(smoothY, [-0.5, 0.5], [4, -4]);
  const cardRotateY = useTransform(smoothX, [-0.5, 0.5], [-4, 4]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth) - 0.5;
      const y = (e.clientY / innerHeight) - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

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

  const features = [
    { icon: <Film size={20} />, title: "Personal Cinema", desc: "Track every movie, TV show, and anime." },
    { icon: <Cloud size={20} />, title: "Private Sync", desc: "Stored securely in your Google Drive." },
    { icon: <Star size={20} />, title: "Rich Insights", desc: "Build timelines, reviews, and sagas." },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background text-foreground perspective-[1000px] transition-colors duration-500">
      
      {/* Interactive Cinematic Background tailored to app theme (primary color based) */}
      <motion.div 
        className="absolute inset-0 z-0 opacity-10 dark:opacity-[0.15] blur-[80px] transition-colors duration-500"
        style={{
          background: useTransform(
            [bgGradientX, bgGradientY], 
            ([x, y]) => `radial-gradient(circle at ${x} ${y}, var(--primary) 0%, transparent 60%)`
          )
        }}
      />
      <div className="absolute inset-0 z-0 bg-[url('/noise.png')] opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay pointer-events-none" />

      {/* Grid Lines */}
      <div className="absolute inset-0 z-0 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--foreground),0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--foreground),0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 z-10 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-12 lg:gap-24 relative">
        
        {/* Left Content / Branding */}
        <div className="flex-1 text-center lg:text-left flex flex-col items-center lg:items-start pt-12 lg:pt-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative mb-8"
          >
            {/* Standard App Logo */}
            <KinoLogo size={80} showText={false} />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-6xl sm:text-7xl lg:text-8xl font-display font-black tracking-tighter mb-4 text-foreground drop-shadow-sm"
          >
            Kino.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg sm:text-xl text-muted-foreground font-medium max-w-md"
          >
            A premium sanctuary for your media. Beautifully designed, completely private.
          </motion.p>
        </div>

        {/* Right Content / Interactive Card */}
        <div className="flex-1 w-full max-w-md perspective-[1200px]">
          <motion.div
            style={{ rotateX: cardRotateX, rotateY: cardRotateY }}
            initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full rounded-[32px] border border-border/50 bg-card/60 dark:bg-card/40 backdrop-blur-3xl shadow-[0_24px_54px_rgba(0,0,0,0.1)] dark:shadow-[0_24px_54px_rgba(0,0,0,0.3)] p-8 sm:p-10"
          >
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-[32px] shadow-[inset_0_0_30px_rgba(var(--primary),0.03)] pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
              
              <div className="space-y-3">
                {features.map((feature) => (
                  <motion.div
                    key={feature.title}
                    className="group relative p-4 rounded-2xl flex items-center gap-4 transition-colors duration-300 hover:bg-muted/50 cursor-default overflow-hidden border border-transparent hover:border-border/40"
                  >
                    <div className="w-12 h-12 rounded-xl bg-background border border-border/40 flex items-center justify-center text-primary group-hover:scale-110 transition-all duration-300 shadow-sm relative z-10">
                      {feature.icon}
                    </div>
                    
                    <div className="flex-1 relative z-10">
                      <h3 className="font-bold text-foreground mb-0.5">{feature.title}</h3>
                      <p className="text-xs font-medium text-muted-foreground transition-colors">
                        {feature.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="pt-6 border-t border-border/50">
                <button
                  onClick={() => googleLogin()}
                  disabled={isLoggingIn}
                  className="relative w-full group overflow-hidden rounded-2xl bg-foreground text-background font-bold text-[15px] h-14 flex items-center justify-center gap-3 transition-transform duration-200 active:scale-[0.98] disabled:opacity-70 shadow-md"
                >
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-overlay" />
                  
                  <div className="relative z-10 flex items-center gap-3">
                    {isLoggingIn ? (
                      <div className="w-5 h-5 border-2 border-background/20 border-t-background rounded-full animate-spin" />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    <span>{isLoggingIn ? 'Authenticating...' : 'Continue with Google'}</span>
                    {!isLoggingIn && (
                      <ArrowRight size={16} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center">
                        {error}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-8 flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground font-medium tracking-wide">
                    <Shield size={12} />
                    <span>SECURE & PRIVATE BY DEFAULT</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-[11px] font-medium">
                    <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border/50">
                      Privacy Policy
                    </Link>
                    <span className="text-border/50">•</span>
                    <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border/50">
                      Terms of Service
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </div>
      
    </div>
  );
}
