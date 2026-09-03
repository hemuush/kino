"use client";

import { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { APP_COLORS } from '@/lib/colors';

export function AppearanceManager() {
  const [activeColor, setActiveColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kino_accent_color') || 'red';
    }
    return 'red';
  });

  const handleSelect = (colorId: string) => {
    setActiveColor(colorId);
    const color = APP_COLORS.find(c => c.id === colorId);
    if (color) {
      localStorage.setItem('kino_accent_color', colorId);
      document.documentElement.style.setProperty('--primary', color.hex);
      document.documentElement.style.setProperty('--primary-hover', color.hover);
      document.documentElement.style.setProperty('--accent', color.hex);
    }
  };

  return (
    <section className="space-y-10">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 backdrop-blur-xl rounded-2xl text-primary shadow-[0_0_30px_-5px_rgba(var(--primary),0.3)]">
          <Palette size={26} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-foreground tracking-tight">Appearance</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Customize your Kino experience.</p>
        </div>
      </div>

      <div className="pt-6 border-t border-border/40">
        <h3 className="text-lg font-bold font-display uppercase tracking-widest text-foreground mb-4">Accent Color</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {APP_COLORS.map((color) => (
            <button
              key={color.id}
              onClick={() => handleSelect(color.id)}
              className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                activeColor === color.id 
                  ? 'border-primary bg-card/80 shadow-md scale-105' 
                  : 'border-border/50 bg-card/40 hover:border-border hover:bg-card/60'
              }`}
            >
              <div 
                className="w-10 h-10 rounded-full shadow-inner flex items-center justify-center"
                style={{ backgroundColor: color.hex }}
              >
                {activeColor === color.id && <Check size={20} className="text-white drop-shadow-md" />}
              </div>
              <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{color.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
