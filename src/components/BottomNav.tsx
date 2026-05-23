"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Film, Tv, Plus } from "lucide-react";
import { MediaEntry } from '@/lib/db';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-heavy border-t border-border safe-area-bottom pb-2">
        <div className="flex items-center justify-between px-4 h-[65px] max-w-md mx-auto relative">
          
          <Link href="/" className={`flex flex-col items-center justify-center gap-1 w-[20%] ${pathname === '/' && !window.location.search ? 'text-primary' : 'text-muted-foreground'}`}>
            <LayoutDashboard size={20} strokeWidth={pathname === '/' && !window.location.search ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold">Home</span>
          </Link>
          
          <Link href="/sagas" className={`flex flex-col items-center justify-center gap-1 w-[20%] ${pathname === '/sagas' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Film size={20} strokeWidth={pathname === '/sagas' ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold">Sagas</span>
          </Link>

          {/* Center Add Button */}
          <div className="w-[20%] flex justify-center -mt-6 relative z-10">
            <Link href="/add" className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 transition-transform active:scale-95 border-4 border-background cursor-pointer">
              <Plus size={24} strokeWidth={2.5} />
            </Link>
          </div>

          <Link href="/analytics" className={`flex flex-col items-center justify-center gap-1 w-[20%] ${pathname === '/analytics' ? 'text-primary' : 'text-muted-foreground'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === '/analytics' ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            <span className="text-[10px] font-semibold">Stats</span>
          </Link>

          <Link href="/settings" className={`flex flex-col items-center justify-center gap-1 w-[20%] ${pathname === '/settings' ? 'text-primary' : 'text-muted-foreground'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === '/settings' ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
            <span className="text-[10px] font-semibold">Settings</span>
          </Link>

        </div>
      </nav>
    </>
  );
}
