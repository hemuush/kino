// src/components/AppShell.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { BottomNav } from "./BottomNav";
import { usePathname, useRouter } from "next/navigation";
import { KinoLogo } from "@/components/KinoLogo";
import { useTheme } from "next-themes";
import { Moon, LogOut, LayoutDashboard, Library, Film, Settings, Search, SlidersHorizontal, Sun } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { PageLoader } from "./ui/Loader";
import Link from "next/link";

interface AppShellProps { children: ReactNode }

export function AppShell({ children }: AppShellProps) {
  const { user, accessToken, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const routeLoadingStartedAt = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setQ(sp.get("q") || "");
    setFiltersOpen(sp.get("filters") !== "0");
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

  useEffect(() => {
    setSearch(q);
  }, [q]);

  const isLoginPage = pathname === "/login";
  const showTopSearch = pathname !== "/settings";
  const showShell = !isLoading && accessToken && !isLoginPage;
  const shellMainClass = showShell
    ? showTopSearch
      ? "relative h-[calc(100dvh-12rem-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-4rem)] overflow-hidden page-enter"
      : "relative h-[calc(100dvh-8.75rem-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-4rem)] overflow-hidden page-enter"
    : "relative min-h-screen page-enter";

  if (isLoading) return <PageLoader fullScreen text="Authenticating..." />;

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Collection", href: "/collection", icon: Library },
    { name: "Sagas", href: "/sagas", icon: Film },
  ];

  const mobileTitle = pathname.startsWith("/collection")
    ? "Collection"
    : pathname.startsWith("/dashboard") || pathname === "/"
      ? "Dashboard"
      : pathname.startsWith("/sagas")
        ? "Sagas"
        : pathname.startsWith("/settings")
          ? "Settings"
          : pathname.startsWith("/add")
            ? "Add Media"
            : "Kino";

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {showShell && (
        <header className="sticky top-0 z-50 border-b border-black/10 dark:border-white/10 bg-transparent backdrop-blur-3xl supports-[backdrop-filter]:bg-white/62 dark:supports-[backdrop-filter]:bg-black/32 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_30px_rgba(0,0,0,0.35)]">
          <div className="mx-auto grid h-16 w-full max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-5 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <div className="hidden md:block">
                <KinoLogo />
              </div>
              <div className="md:hidden flex items-center gap-2.5">
                <div className="scale-[0.9] origin-left">
                  <KinoLogo showText={false} />
                </div>
                <span className="text-xl font-display font-black tracking-tight text-foreground truncate max-w-[42vw]">{mobileTitle}</span>
              </div>
              <nav className="hidden lg:flex items-center gap-1 rounded-full border border-black/10 dark:border-white/12 bg-white/70 dark:bg-white/6 px-2 py-1 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[0_0_0_2px_rgba(255,255,255,0.78)_inset,0_8px_20px_rgba(59,130,246,0.28)]"
                          : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8"
                      }`}
                    >
                      <item.icon size={15} /> {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="hidden md:flex justify-center">
              {showTopSearch ? (
              <div className="w-full max-w-md relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSearch(next);
                    if (pathname === "/collection" || pathname === "/sagas") {
                      const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
                      if (next.trim()) sp.set("q", next.trim());
                      else sp.delete("q");
                      router.replace(`${pathname}?${sp.toString()}`);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const base = pathname === "/sagas" ? "/sagas" : "/collection";
                      router.push(`${base}${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
                    }
                  }}
                  placeholder="Search collection..."
                className="h-10 w-full rounded-full border border-black/10 dark:border-white/15 bg-white/85 dark:bg-white/7 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 backdrop-blur-2xl"
                />
              </div>
              ) : <div />}
            </div>

            <div className="flex items-center justify-end gap-2">
              {user?.picture ? (
                <img src={user.picture} alt={user.name || "User"} className="w-8 h-8 rounded-full border border-border object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <button onClick={() => router.push("/settings")} className="hidden md:inline-flex p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/8 text-muted-foreground hover:text-foreground transition" title="Settings">
                <Settings size={16} />
              </button>
              {pathname === "/collection" && (
                <button
                  onClick={() => {
                    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
                    if (filtersOpen) sp.set("filters", "0");
                    else sp.delete("filters");
                    setFiltersOpen(!filtersOpen);
                    router.replace(`/collection?${sp.toString()}`);
                  }}
                  className={`p-2 rounded-full transition ${filtersOpen ? "bg-primary/15 text-primary" : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"}`}
                  title="Toggle Filters"
                >
                  <SlidersHorizontal size={16} />
                </button>
              )}
              <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="inline-flex p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/8 text-muted-foreground hover:text-foreground transition" title="Theme">
                {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={() => logout(false)} className="p-2.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition" title="Logout">
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
                  if (pathname === "/collection" || pathname === "/sagas") {
                    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
                    if (next.trim()) sp.set("q", next.trim());
                    else sp.delete("q");
                    router.replace(`${pathname}?${sp.toString()}`);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const base = pathname === "/sagas" ? "/sagas" : "/collection";
                    router.push(`${base}${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
                  }
                }}
                placeholder="Search collection..."
                className="h-10 w-full rounded-full border border-black/10 dark:border-white/15 bg-white/80 dark:bg-white/5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/45 backdrop-blur-2xl"
              />
            </div>
          </div>}
        </header>
      )}

      {showShell && isRouteLoading && <PageLoader fullScreen text="Loading page..." />}
      <main className={shellMainClass}>{children}</main>
      {showShell && <BottomNav />}
    </div>
  );
}
