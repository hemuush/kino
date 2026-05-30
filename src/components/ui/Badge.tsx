import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'accent' | 'muted' | 'movie' | 'tv' | 'anime';
  className?: string;
}

export function Badge({ children, variant = 'muted', className = '' }: BadgeProps) {
  const variantStyles = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    accent: 'bg-accent/10 text-accent border-accent/25',
    muted: 'bg-muted border-border/40 text-muted-foreground',
    movie: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    tv: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    anime: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-display font-semibold tracking-wider uppercase border select-none ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
