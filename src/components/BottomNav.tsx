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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-heavy border-t border-border safe-area-bottom pb-2">
        <div className="flex items-center justify-between px-2 h-[65px] max-w-md mx-auto relative">

          <Link href="/dashboard" className={`flex flex-col items-center justify-center gap-1 flex-1 ${pathname === '/dashboard' || pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}>
            <LayoutDashboard size={20} strokeWidth={pathname === '/dashboard' || pathname === '/' ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold">Home</span>
          </Link>

          <Link href="/collection" className={`flex flex-col items-center justify-center gap-1 flex-1 ${pathname === '/collection' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Library size={20} strokeWidth={pathname === '/collection' ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold">Collection</span>
          </Link>

          {/* Center Add Button */}
          <div className="flex-1 flex justify-center relative">
            <Link
              href="/add"
              className="absolute -top-7 flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all border-4 border-background"
            >
              <Plus size={24} strokeWidth={2.5} />
            </Link>
          </div>

          <Link href="/sagas" className={`flex flex-col items-center justify-center gap-1 flex-1 ${pathname === '/sagas' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Film size={20} strokeWidth={pathname === '/sagas' ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold">Sagas</span>
          </Link>

          <Link href="/settings" className={`flex flex-col items-center justify-center gap-1 flex-1 ${pathname === '/settings' ? 'text-primary' : 'text-muted-foreground'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === '/settings' ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            <span className="text-[10px] font-semibold">Settings</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
