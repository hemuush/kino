// File: src/components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Film, Library, Plus } from "lucide-react";
import { MediaEntry } from '@/lib/db';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 dark:bg-[#0c0c0d]/90 backdrop-blur-3xl border-t border-border/40 safe-area-bottom pb-3 pt-1">
        <div className="flex items-center justify-between px-2 h-[65px] max-w-md mx-auto relative">

          <Link href="/dashboard" className={`flex flex-col items-center justify-center gap-1 flex-1 ${pathname === '/dashboard' || pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}>
            <LayoutDashboard size={24} strokeWidth={pathname === '/dashboard' || pathname === '/' ? 2.5 : 1.8} />
          </Link>

          <Link href="/collection" className={`flex flex-col items-center justify-center gap-1 flex-1 ${pathname === '/collection' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Library size={24} strokeWidth={pathname === '/collection' ? 2.5 : 1.8} />
          </Link>

          {/* Center Add Button */}
          <div className="flex-1 flex justify-center relative">
            <Link
              href="/add"
              className="absolute -top-6 flex items-center justify-center w-12 h-12 bg-primary text-white rounded-xl shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all border-[3px] border-background"
            >
              <Plus size={24} strokeWidth={2.5} />
            </Link>
          </div>

          <Link href="/sagas" className={`flex flex-col items-center justify-center gap-1 flex-1 ${pathname === '/sagas' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Film size={24} strokeWidth={pathname === '/sagas' ? 2.5 : 1.8} />
          </Link>

          <Link href="/settings" className={`flex flex-col items-center justify-center gap-1 flex-1 ${pathname === '/settings' ? 'text-primary' : 'text-muted-foreground'}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === '/settings' ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </Link>
        </div>
      </nav>
    </>
  );
}
