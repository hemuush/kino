"use client";

import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';

const COLORS = [
  { id: 'red', name: 'Kino Red', hex: '#D71921', hover: '#a11319' },
  { id: 'blue', name: 'Electric Blue', hex: '#3b82f6', hover: '#2563eb' },
  { id: 'emerald', name: 'Emerald', hex: '#10b981', hover: '#059669' },
  { id: 'purple', name: 'Neon Purple', hex: '#8b5cf6', hover: '#7c3aed' },
  { id: 'amber', name: 'Amber', hex: '#f59e0b', hover: '#d97706' },
  { id: 'rose', name: 'Rose', hex: '#f43f5e', hover: '#e11d48' },
];

export function AppearanceManager() {
  const [activeColor, setActiveColor] = useState('red');

  useEffect(() => {
    const saved = localStorage.getItem('kino_accent_color');
    if (saved) {
      setActiveColor(saved);
    }
  }, []);

  const handleSelect = (colorId: string) => {
    setActiveColor(colorId);
    const color = COLORS.find(c => c.id === colorId);
    if (color) {
      localStorage.setItem('kino_accent_color', colorId);
      document.documentElement.style.setProperty('--primary', color.hex);
      document.documentElement.style.setProperty('--primary-hover', color.hover);
      document.documentElement.style.setProperty('--accent', color.hex);
    }
  };

  return (
    <section className="space-y-10">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-card border border-border backdrop-blur-xl rounded-2xl text-primary shadow-sm">
          <Palette size={24} />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Appearance</h2>
          <p className="text-sm text-muted-foreground mt-1">Customize your Kino experience.</p>
        </div>
      </div>

      <div className="pt-6 border-t border-border/40">
        <h3 className="text-lg font-bold font-display uppercase tracking-widest text-foreground mb-4">Accent Color</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {COLORS.map((color) => (
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
