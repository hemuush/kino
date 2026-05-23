"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export type CardShape = 'rectangle' | 'square' | 'circle';

interface UIContextType {
  cardShape: CardShape;
  setCardShape: (shape: CardShape) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [cardShape, setCardShape] = useState<CardShape>('rectangle');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('kino_ui_cardShape') as CardShape;
    if (stored && ['rectangle', 'square', 'circle'].includes(stored)) {
      setCardShape(stored);
    }
  }, []);

  const handleSetCardShape = (shape: CardShape) => {
    setCardShape(shape);
    localStorage.setItem('kino_ui_cardShape', shape);
  };

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <UIContext.Provider value={{ cardShape, setCardShape: handleSetCardShape }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
