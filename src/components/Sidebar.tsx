"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Sidebar() {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[240px] h-screen fixed left-0 top-0 z-50 bg-surface/50">
      
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-6">
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-400 rounded-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
        </div>
        <span className="font-display text-[17px] font-bold tracking-tight">Kino</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {/* Active indicator pill */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-primary rounded-r-full" />
              )}
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="px-3 py-4 space-y-1">
        {mounted && (
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
          >
            {theme === 'dark' ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}
            <span className="flex-1 text-left">{theme === 'dark' ? "Light Mode" : "Dark Mode"}</span>
            {/* Toggle indicator */}
            <div className={`w-8 h-[18px] rounded-full relative transition-colors duration-300 ${theme === 'dark' ? 'bg-primary/30' : 'bg-muted-foreground/20'}`}>
              <div className={`absolute top-[2px] w-[14px] h-[14px] bg-foreground rounded-full shadow-sm transition-all duration-300 ${theme === 'dark' ? 'left-[15px]' : 'left-[2px]'}`} />
            </div>
          </button>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
        >
          <LogOut size={17} strokeWidth={1.8} />
          <span className="flex-1 text-left">Log Out</span>
        </button>
      </div>
    </aside>
  );
}
