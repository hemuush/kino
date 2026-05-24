"use client";

import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { usePathname } from "next/navigation";
import { KinoLogo } from "@/components/KinoLogo";
import { useTheme } from "next-themes";
import { Sun, Moon, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, accessToken, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          <div className="lg:hidden sticky top-0 z-30 glass border-b border-border h-14 flex items-center justify-between px-4 shrink-0">
            {/* Left side: Logo */}
            <div className="flex items-center">
              <KinoLogo />
            </div>

            {/* Right side: Theme Toggle & Profile Actions */}
            {mounted && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <div className="flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-border/50">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || "User"}
                      className="w-7 h-7 rounded-full border border-border object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <button
                    onClick={() => logout(false)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors active:scale-95"
                    title="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            )}
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