"use client";

import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { usePathname } from "next/navigation";
import { KinoLogo } from "@/components/KinoLogo";
import { useTheme } from "next-themes";
import { Sun, Moon, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { PageLoader } from "./ui/Loader";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, accessToken, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoginPage = pathname === '/login';
  const showShell = !isLoading && accessToken && !isLoginPage;

  // Global Auth Loader Shield
  if (isLoading) {
    return <PageLoader fullScreen text="Authenticating..." />;
  }

  return (
    <div className="flex h-screen lg:min-h-screen overflow-hidden lg:overflow-visible bg-background text-foreground transition-colors duration-300">
      {showShell && (
        <Sidebar />
      )}
      <main className={`flex-1 ${showShell ? 'h-[100dvh] lg:h-auto lg:min-h-screen overflow-hidden lg:overflow-visible' : 'min-h-screen'} flex flex-col relative`}>
        {showShell && (
          <div className="lg:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border h-14 flex items-center justify-between px-4 shrink-0 shadow-sm">
            <div className="flex items-center">
              <KinoLogo />
            </div>

            {mounted && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <div className="flex items-center gap-2 pl-2 border-l border-border/50 ml-1">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || "User"}
                      className="w-8 h-8 rounded-full border-2 border-border/50 object-cover shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <button
                    onClick={() => logout(false)}
                    className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors active:scale-95"
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