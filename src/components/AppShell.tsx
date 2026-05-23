"use client";

import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { usePathname } from "next/navigation";
import { KinoLogo } from "@/components/KinoLogo";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { accessToken, isLoading } = useAuth();
  const pathname = usePathname();
  
  // Don't show shell on login page
  const isLoginPage = pathname === '/login';
  const showShell = !isLoading && accessToken && !isLoginPage;

  return (
    <div className="flex h-screen lg:min-h-screen overflow-hidden lg:overflow-visible bg-background">
      {showShell && (
        <Sidebar />
      )}
      <main className={`flex-1 ${showShell ? 'h-[100dvh] lg:h-auto lg:min-h-screen overflow-hidden lg:overflow-visible' : 'min-h-screen'} flex flex-col`}>
        {showShell && (
          <div className="lg:hidden sticky top-0 z-30 glass border-b border-border h-14 flex items-center justify-center px-4 shrink-0">
             <KinoLogo />
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
