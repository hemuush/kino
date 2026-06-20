// File: src/components/KinoLogo.tsx
"use client";

interface KinoLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function KinoLogo({ size = 32, className = "", showText = true }: KinoLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* App logo */}
      <div 
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%">
          {/* Black background with red border */}
          <rect x="2" y="2" width="116" height="116" fill="#080808" stroke="#E50000" strokeWidth="3"/>

          {/* Inner continuous grey ring */}
          <circle cx="60" cy="60" r="17" fill="none" stroke="#999999" strokeWidth="3.5"/>

          {/* Outer broken white ring */}
          <circle cx="60" cy="60" r="32" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="35 15.2" transform="rotate(45 60 60)" />

          {/* Center Play Button (White Triangle with slightly rounded corners) */}
          <polygon points="53,48 53,72 73,60" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="3" strokeLinejoin="round"/>
        </svg>
      </div>
      {showText && (
        <span className="font-display font-black tracking-[0.2em] uppercase text-[22px] text-foreground">
          KINO
        </span>
      )}
    </div>
  );
}

