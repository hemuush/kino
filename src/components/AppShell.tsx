"use client";

import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { accessToken, isLoading } = useAuth();
  const pathname = usePathname();
  
  // Don't show shell on login page
  const isLoginPage = pathname === '/login';
  const showShell = !isLoading && accessToken && !isLoginPage;

  return (
    <div className="flex min-h-screen bg-background">
      {showShell && <Sidebar />}
      <main className={`flex-1 min-h-screen ${showShell ? 'lg:pl-[240px]' : ''} ${showShell ? 'pb-24 lg:pb-0' : ''}`}>
        {children}
      </main>
      {showShell && <BottomNav />}
    </div>
  );
}
