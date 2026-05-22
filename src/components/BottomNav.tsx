"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart2, Settings } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const links = [
    { name: "Home", href: "/", icon: LayoutDashboard },
    { name: "Analytics", href: "/analytics", icon: BarChart2 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-heavy border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-[60px] max-w-md mx-auto">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-6 min-h-[48px] rounded-xl transition-colors active:scale-95 active:bg-muted/30 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} />
              {/* Active dot indicator */}
              <div className={`w-1 h-1 rounded-full transition-all duration-300 ${
                isActive ? 'bg-primary scale-100' : 'bg-transparent scale-0'
              }`} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
