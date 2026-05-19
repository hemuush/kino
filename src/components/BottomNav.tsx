"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const links = [
    { name: "Home", href: "/", icon: LayoutDashboard },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-heavy border-t border-border">
      <div className="flex items-center justify-around h-[72px] max-w-md mx-auto pb-[env(safe-area-inset-bottom)]">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-col items-center justify-center gap-1.5 py-2 px-5 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
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
