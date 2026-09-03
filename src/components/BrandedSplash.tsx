"use client";

import { motion, useReducedMotion } from "framer-motion";

interface BrandedSplashProps {
  text?: string;
}

export function BrandedSplash({ text = "Preparing your cinema…" }: BrandedSplashProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex items-center justify-center"
        style={{ width: 84, height: 84 }}
      >
        <div className="absolute inset-0 bg-primary/25 blur-2xl rounded-full" />
        <svg viewBox="0 0 120 120" width="84" height="84" className="relative z-10">
          <rect x="2" y="2" width="116" height="116" fill="#080808" stroke="#E50000" strokeWidth="3" />
          <circle cx="60" cy="60" r="17" fill="none" stroke="#999999" strokeWidth="3.5" />
          <motion.circle
            cx="60" cy="60" r="32" fill="none" stroke="#FFFFFF" strokeWidth="4.5"
            strokeLinecap="round" strokeDasharray="35 15.2"
            style={{ originX: 0.5, originY: 0.5 }}
            animate={shouldReduceMotion ? undefined : { rotate: 360 }}
            transition={shouldReduceMotion ? undefined : { duration: 6, repeat: Infinity, ease: "linear" }}
          />
          <polygon points="53,48 53,72 73,60" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      </motion.div>

      <motion.span
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="font-display font-black tracking-[0.2em] uppercase text-[15px] text-foreground"
      >
        KINO
      </motion.span>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground"
      >
        {text}
      </motion.p>
    </div>
  );
}
