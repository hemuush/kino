"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, Settings, LogOut, Sun, Moon, Film, Library, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { KinoLogo } from "@/components/KinoLogo";

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const { user, login, logout, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "My Collection", href: "/collection", icon: Library },
    { name: "Sagas", href: "/sagas", icon: Film },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col w-full h-full lg:w-[260px] lg:h-screen bg-neutral-100/60 dark:bg-[#161617]/70 backdrop-blur-xl border-r border-black/5 dark:border-white/10 overflow-hidden shrink-0">
      
      {/* Brand Section */}
      <div className="p-6 pb-4 shrink-0 flex items-center justify-between">
        <div className="transition-transform hover:scale-[1.02] active:scale-[0.98] origin-left">
          <KinoLogo />
        </div>
        {isMobileOpen && (
          <button onClick={onMobileClose} className="lg:hidden p-2 -mr-2 text-muted-foreground hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 rounded-xl transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto hide-scrollbar mt-4">
        <div className="px-3 mb-2 text-[10px] font-bold text-muted-foreground/60 tracking-[0.12em] uppercase">
          Menu
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => isMobileOpen && onMobileClose?.()}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/10' 
                  : 'text-muted-foreground hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40 hover:text-foreground'
              }`}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={`transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-105'}`} />
              <span className="text-[13.5px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom User Area */}
      <div className="p-4 mt-auto border-t border-black/5 dark:border-white/5 bg-neutral-200/10 dark:bg-neutral-900/10">
        
        {/* User Profile */}
        <div className="mb-2.5 px-3 py-2 flex items-center gap-3 bg-neutral-200/20 dark:bg-neutral-800/20 rounded-xl border border-black/5 dark:border-white/5 shadow-none">
          {user ? (
            <>
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-background shadow-sm" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-background shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-semibold text-foreground truncate leading-tight">{user.name}</span>
                <span className="text-[9.5px] text-muted-foreground truncate leading-tight">{user.email}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 text-center py-1">
              <span className="text-[11px] font-medium text-muted-foreground">Guest Mode</span>
            </div>
          )}
        </div>

        {mounted && (
          <div className="flex items-center justify-between px-3 py-2 bg-neutral-200/20 dark:bg-neutral-800/20 rounded-xl border border-black/5 dark:border-white/5 shadow-none mb-2">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-2">
              {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <button
              onClick={toggleTheme}
              className={`w-9 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer ${theme === 'dark' ? 'bg-primary' : 'bg-neutral-300 dark:bg-neutral-700'}`}
            >
              <div 
                className={`w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-300 ${theme === 'dark' ? 'translate-x-3.5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        )}

        {user ? (
          <button
            onClick={() => logout()}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
          >
            <LogOut size={14} /> Log Out
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] font-semibold text-primary-foreground bg-primary hover:bg-primary/95 rounded-xl transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            Login with Google
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] h-screen sticky top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onMobileClose} />
          <div className="relative w-[260px] max-w-[80vw] h-full shadow-xl animate-fade-in-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}