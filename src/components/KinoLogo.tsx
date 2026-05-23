"use client";

import { Film } from "lucide-react";

interface KinoLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function KinoLogo({ size = 32, className = "", showText = true }: KinoLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        className="relative rounded-[10px] overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20"
        style={{ width: size, height: size }}
      >
        <Film size={size * 0.55} className="text-white drop-shadow-md" />
      </div>
      {showText && (
        <span className="font-display font-extrabold tracking-tight text-[22px] text-foreground">
          Kino
        </span>
      )}
    </div>
  );
}
