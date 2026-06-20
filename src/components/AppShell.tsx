// src/components/AppShell.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { BottomNav } from "./BottomNav";
import { usePathname, useRouter } from "next/navigation";
import { KinoLogo } from "@/components/KinoLogo";
import { useTheme } from "next-themes";
import { Moon, LogOut, LayoutDashboard, Library, Film, Settings, Search, Sun, MonitorPlay, CalendarDays } from "lucide-react";
import { ReactNode, useEffect, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { PageLoader } from "./ui/Loader";
import Link from "next/link";
import { useMedia } from "@/context/MediaContext";
import { AmbientMode } from "./AmbientMode";

interface AppShellProps { children: ReactNode }

export function AppShell({ children }: AppShellProps) {
  const { user, accessToken, isLoading, logout } = useAuth();
  const { syncStatus } = useMedia();
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAmbientMode, setIsAmbientMode] = useState(false);
  const [, startTransition] = useTransition();
  const routeLoadingStartedAt = useRef(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const newQ = sp.get("q") || "";
    Promise.resolve().then(() => {
      setSearch(newQ);
    });
  }, [pathname]);

  useEffect(() => {
    const handleRouteStart = (event: Event) => {
      const detail = (event as CustomEvent<{ url?: string }>).detail;
      const nextUrl = detail?.url;
      if (!nextUrl || typeof window === "undefined") return;

      const nextPathname = new URL(nextUrl, window.location.href).pathname;
      if (nextPathname === window.location.pathname) return;

      routeLoadingStartedAt.current = Date.now();
      setIsRouteLoading(true);
    };

    window.addEventListener("kino:route-transition-start", handleRouteStart);
    return () => {
      window.removeEventListener("kino:route-transition-start", handleRouteStart);
    };
  }, []);

  useEffect(() => {
    if (!isRouteLoading) return;

    const elapsed = Date.now() - routeLoadingStartedAt.current;
    const delay = Math.max(120, 320 - elapsed);
    const timer = setTimeout(() => setIsRouteLoading(false), delay);
    return () => clearTimeout(timer);
  }, [pathname, isRouteLoading]);



  const isLoginPage = pathname === "/login";
  const showTopSearch = pathname !== "/settings";
  const showShell = !isLoading && accessToken && !isLoginPage;
  const shellMainClass = showShell
    ? showTopSearch
      ? "relative h-[calc(100dvh-4rem-53px-80px-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-4rem)] overflow-hidden page-enter"
      : "relative h-[calc(100dvh-4rem-80px-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-4rem)] overflow-hidden page-enter"
    : "relative min-h-screen page-enter";

  if (isLoading) return <PageLoader fullScreen text="Authenticating..." />;

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Collection", href: "/collection", icon: Library },
    { name: "Sagas", href: "/sagas", icon: Film },
    { name: "Wraps", href: "/wraps", icon: CalendarDays },
  ];


  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {showShell && (
        <header className="sticky top-0 z-50 border-b border-border/60 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-[inset_0_-1px_0_rgba(255,255,255,0.02)]">
          <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-2 sm:gap-5 px-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <div className="hidden md:block">
                <KinoLogo />
              </div>
              <div className="md:hidden flex items-center gap-2.5">
                <div className="scale-[0.9] origin-left">
                  <KinoLogo showText={true} />
                </div>
              </div>
              <nav className="hidden lg:flex items-center gap-1 rounded-2xl border-2 border-border bg-muted/30 p-1 backdrop-blur-2xl">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] tracking-wider uppercase font-display font-semibold transition-colors relative z-10 ${
                        isActive
                          ? "text-primary-foreground dark:text-black"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <item.icon size={14} /> <span className="mt-0.5">{item.name}</span>
                      {isActive && (
                        <motion.div
                          layoutId="active-nav-pill"
                          className="absolute inset-0 bg-primary rounded-xl border border-primary -z-10 shadow-sm"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="hidden md:flex flex-1 justify-center max-w-sm">
              {showTopSearch ? (
              <motion.div 
                animate={{ width: isSearchFocused ? "100%" : "85%" }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="w-full relative"
              >
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSearch(next);
                    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                    
                    searchTimeoutRef.current = setTimeout(() => {
                      if (pathname === "/collection" || pathname === "/sagas") {
                        startTransition(() => {
                          const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
                          if (next.trim()) sp.set("q", next.trim());
                          else sp.delete("q");
                          router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
                        });
                      }
                    }, 400);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const base = pathname === "/sagas" ? "/sagas" : "/collection";
                      router.push(`${base}${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
                    }
                  }}
                  placeholder="Search collection..."
                  className="h-9.5 w-full rounded-full border-2 border-border bg-muted/40 dark:bg-neutral-900/40 pl-10 pr-4 text-[12px] font-display uppercase tracking-widest text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-0 backdrop-blur-2xl transition-all"
                />
              </motion.div>
              ) : <div />}
            </div>

            <div className="flex items-center justify-end gap-1 sm:gap-2">
              {/* Sync status indicator */}
              {syncStatus === 'syncing' && (
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20" title="Syncing to Google Drive...">
                  <div className="w-3 h-3 border-[1.5px] border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </div>
              )}
              {syncStatus === 'error' && (
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20" title="Sync failed — data saved locally">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="hidden sm:inline">Error</span>
                </div>
              )}
              {user?.picture ? (
                <Link href="/profile">
                  <img src={user.picture} alt={user.name || "User"} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border object-cover cursor-pointer hover:border-primary transition-all hover:scale-110" referrerPolicy="no-referrer" title="View Public Profile" />
                </Link>
              ) : (
                <Link href="/profile">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20 font-display cursor-pointer hover:bg-primary/20 transition-all hover:scale-110" title="View Public Profile">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                </Link>
              )}
              <button onClick={() => router.push("/settings")} className="hidden md:inline-flex p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/8 text-muted-foreground hover:text-foreground transition" title="Settings">
                <Settings size={16} />
              </button>
              <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="inline-flex p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/8 text-muted-foreground hover:text-foreground transition" title="Theme">
                {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={() => setIsAmbientMode(true)} className="hidden md:inline-flex p-2 sm:p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/8 text-muted-foreground hover:text-foreground transition" title="Ambient Screensaver">
                <MonitorPlay size={16} />
              </button>
              <button onClick={() => logout(false)} className="p-2 sm:p-2.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </div>
          {showTopSearch && <div className="md:hidden px-4 pb-3">
            <div className="w-full relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => {
                  const next = e.target.value;
                  setSearch(next);
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                  
                  searchTimeoutRef.current = setTimeout(() => {
                    if (pathname === "/collection" || pathname === "/sagas") {
                      startTransition(() => {
                        const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
                        if (next.trim()) sp.set("q", next.trim());
                        else sp.delete("q");
                        router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
                      });
                    }
                  }, 400);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const base = pathname === "/sagas" ? "/sagas" : "/collection";
                    router.push(`${base}${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
                  }
                }}
                placeholder="Search collection..."
                className="h-10 w-full rounded-full border-2 border-border bg-white/80 dark:bg-white/5 pl-10 pr-4 text-[12px] font-display uppercase tracking-widest text-foreground placeholder:text-muted-foreground outline-none focus:border-primary backdrop-blur-2xl"
              />
            </div>
          </div>}
        </header>
      )}

      {showShell && isRouteLoading && <PageLoader fullScreen text="Loading page..." />}
      <main className={shellMainClass}>{children}</main>
      {showShell && <BottomNav />}
      
      {/* Ambient Mode Overlay */}
      {isAmbientMode && <AmbientMode onClose={() => setIsAmbientMode(false)} />}
    </div>
  );
}
