"use client";

import { Film, Tag, Database, Settings2, Trophy, Palette, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface SettingsSidebarProps {
    activeTab: 'sagas' | 'genres' | 'data' | 'achievements' | 'appearance';
    setActiveTab: (tab: 'sagas' | 'genres' | 'data' | 'achievements' | 'appearance') => void;
}

export function SettingsSidebar({ activeTab, setActiveTab }: SettingsSidebarProps) {
    const navItems = [
        { id: 'data', label: 'Data & Cloud', icon: Database, desc: 'Sync & Backups' },
        { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme & Colors' },
        { id: 'achievements', label: 'Achievements', icon: Trophy, desc: 'Milestones & Badges' },
        { id: 'sagas', label: 'Sagas', icon: Film, desc: 'Franchise Map' },
        { id: 'genres', label: 'Genres Matrix', icon: Tag, desc: 'Categories' },
    ] as const;

    return (
        <aside className="w-full lg:w-[280px] shrink-0 flex flex-col gap-4 lg:gap-6 lg:sticky lg:top-24 z-20">
            {/* Header */}
            <div className="flex items-center gap-4 px-2 lg:mb-2">
                <div className="p-3.5 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 backdrop-blur-xl rounded-2xl text-primary shadow-[0_0_30px_-5px_rgba(var(--primary),0.3)]">
                    <Settings2 size={26} strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black font-display text-foreground tracking-tight">Settings</h2>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em] mt-0.5 font-bold">Preferences</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 hide-scrollbar snap-x w-full px-2 lg:px-0">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`relative flex items-center gap-4 p-3 rounded-2xl transition-all whitespace-nowrap snap-start text-left group shrink-0 lg:w-full outline-none ${
                                isActive
                                    ? 'shadow-sm'
                                    : 'hover:bg-foreground/5'
                            }`}
                        >
                            {isActive && (
                                <motion.div 
                                    layoutId="activeTabIndicator"
                                    className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-2xl z-0"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <div className={`relative z-10 p-2.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary text-primary-foreground shadow-md scale-110' : 'bg-foreground/10 text-muted-foreground group-hover:text-foreground group-hover:scale-110'}`}>
                                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <div className="relative z-10 flex flex-col justify-center">
                                <span className={`font-bold text-[15px] tracking-tight transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                    {item.label}
                                </span>
                                <span className={`text-[11px] font-medium hidden sm:block ${isActive ? 'text-primary/80' : 'text-muted-foreground/70'}`}>
                                    {item.desc}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </nav>
            
            {/* Legal Links */}
            <div className="hidden lg:flex flex-col gap-4 mt-6 pt-6 border-t border-border/40 px-4">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold tracking-[0.15em] uppercase">
                    <Shield size={14} />
                    <span>Legal & Privacy</span>
                </div>
                <div className="flex flex-col gap-3">
                    <Link href="/privacy" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors w-fit flex items-center gap-2 group">
                        <span className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-primary transition-colors" />
                        Privacy Policy
                    </Link>
                    <Link href="/terms" className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors w-fit flex items-center gap-2 group">
                        <span className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-primary transition-colors" />
                        Terms of Service
                    </Link>
                </div>
            </div>
        </aside>
    );
}