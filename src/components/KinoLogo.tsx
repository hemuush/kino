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
      {/* Sharp industrial logo icon */}
      <div 
        className="relative rounded-none overflow-hidden flex-shrink-0 flex items-center justify-center border-2 border-primary bg-black"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.65}
          height={size * 0.65}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 text-white"
        >
          {/* Outer focus circle */}
          <circle
            cx="12"
            cy="12"
            r="9.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="16 4 4 4"
          />
          {/* Shutter lines */}
          <circle
            cx="12"
            cy="12"
            r="5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeOpacity="0.8"
          />
          {/* Center Play Triangle */}
          <path
            d="M10.75 9.25C10.75 8.78 11.28 8.5 11.66 8.76L14.9 11.01C15.22 11.23 15.22 11.72 14.9 11.94L11.66 14.19C11.28 14.45 10.75 14.17 10.75 13.7V9.25Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
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

