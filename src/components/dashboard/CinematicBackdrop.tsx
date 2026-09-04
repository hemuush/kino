"use client";

import { useLenis } from "lenis/react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { lerpHue } from "@/lib/colors";
import { AmbientGlow } from "@/components/ui/AmbientGlow";

interface CinematicBackdropProps {
  /** Ordered hues (0-359) for each waypoint down the page, top to bottom. */
  hues: number[];
}

// Ambient background whose glow color drifts between the page's section hues as the
// user scrolls — driven directly by Lenis's own `progress` (not a second scroll
// listener), so it can never fall out of sync with the smooth-scroll easing.
// Falls back to a static two-blob glow under prefers-reduced-motion.
export function CinematicBackdrop({ hues }: CinematicBackdropProps) {
  const prefersReducedMotion = useReducedMotion();
  const progress = useMotionValue(0);

  useLenis((lenis) => {
    progress.set(lenis.progress);
  });

  const hueA = useTransform(progress, (p) => {
    if (hues.length === 0) return 260;
    if (hues.length === 1) return hues[0];
    const segment = 1 / (hues.length - 1);
    const idx = Math.min(hues.length - 2, Math.floor(p / segment));
    const localT = (p - idx * segment) / segment;
    return lerpHue(hues[idx], hues[idx + 1], localT);
  });
  const hueB = useTransform(hueA, (h) => (h + 70) % 360);

  const glowA = useMotionTemplate`hsla(${hueA}, 85%, 60%, 0.10)`;
  const glowB = useMotionTemplate`hsla(${hueB}, 85%, 55%, 0.07)`;

  if (prefersReducedMotion) {
    return (
      <AmbientGlow
        fixed
        glows={[
          "top-0 right-0 w-[55%] h-[40%] bg-primary/3 blur-[160px]",
          "bottom-[20%] left-0 w-[45%] h-[35%] bg-purple-500/3 blur-[140px]",
        ]}
      />
    );
  }

  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <motion.div style={{ backgroundColor: glowA }} className="absolute top-0 right-0 w-[55%] h-[40%] rounded-full blur-[160px]" />
      <motion.div style={{ backgroundColor: glowB }} className="absolute bottom-[20%] left-0 w-[45%] h-[35%] rounded-full blur-[140px]" />
    </div>
  );
}
