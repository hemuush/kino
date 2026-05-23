"use client";

import Image from "next/image";

interface KinoLogoProps {
  size?: number;
  className?: string;
}

export function KinoLogo({ size = 32, className = "" }: KinoLogoProps) {
  return (
    <div 
      className={`relative rounded-xl overflow-hidden flex-shrink-0 shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <img 
        src="/logo.png" 
        alt="Kino Logo" 
        className="w-full h-full object-cover"
      />
    </div>
  );
}
