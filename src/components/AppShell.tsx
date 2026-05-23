"use client";

import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { accessToken, isLoading } = useAuth();
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Don't show shell on login page
  const isLoginPage = pathname === '/login';
  const showShell = !isLoading && accessToken && !isLoginPage;

  return (
    <div className="flex min-h-screen bg-background">
      {showShell && (
        <Sidebar 
          isMobileOpen={isMobileSidebarOpen} 
          onMobileClose={() => setIsMobileSidebarOpen(false)} 
        />
      )}
      <main className={`flex-1 min-h-screen ${showShell ? 'lg:pl-[240px]' : ''} ${showShell ? 'pb-24 lg:pb-0' : ''} flex flex-col`}>
        {showShell && (
          <div className="lg:hidden sticky top-0 z-30 glass border-b border-border h-14 flex items-center px-4 shrink-0">
             <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 -ml-2 text-foreground hover:bg-muted/50 rounded-xl">
               <Menu size={22} />
             </button>
             {/* If we need search on mobile top, we can add it here too */}
          </div>
        )}
        <div className="flex-1 w-full relative">
          {children}
        </div>
      </main>
      {showShell && <BottomNav />}
    </div>
  );
}
