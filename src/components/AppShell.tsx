// src/components/AppShell.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { BottomNav } from "./BottomNav";
import { usePathname } from "next/navigation";
import { KinoLogo } from "@/components/KinoLogo";
import { useTheme } from "next-themes";
import { Sun, Moon, LogOut, LayoutDashboard, Library, Film, Settings } from "lucide-react";
import { ReactNode } from "react";
import { PageLoader } from "./ui/Loader";
import Link from "next/link";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, accessToken, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  const isLoginPage = pathname === "/login";
  const showShell = !isLoading && accessToken && !isLoginPage;

  if (isLoading) return <PageLoader fullScreen text="Authenticating..." />;

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Collection", href: "/collection", icon: Library },
    { name: "Sagas", href: "/sagas", icon: Film },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      {showShell && (
        <header className="sticky top-0 z-40 border-b border-black/5 dark:border-white/10 bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-8 lg:px-10">
            <KinoLogo />

            <nav className="hidden items-center gap-1 lg:flex">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon size={15} /> {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Toggle theme"
              >
                {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name || "User"}
                  className="w-8 h-8 rounded-full border border-border/60 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}

              <button
                onClick={() => logout(false)}
                className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>
      )}

      <main className={`flex-1 ${showShell ? "h-[calc(100dvh-4rem)] overflow-hidden" : "min-h-screen"} relative`}>
        <div className="h-full w-full relative">{children}</div>
      </main>

      {showShell && <BottomNav />}
    </div>
  );
}
