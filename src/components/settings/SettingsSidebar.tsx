"use client";

import { Film, Tag, Database, Settings2, Shield, Trophy, Palette } from 'lucide-react';
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
        <aside className="w-full lg:w-[280px] shrink-0 flex flex-col gap-6 sticky top-12 z-20">
            <div className="hidden lg:flex items-center gap-4 px-2">
                <div className="p-3 bg-card/65 dark:bg-[#0c0c0d]/80 border border-border/80 backdrop-blur-xl rounded-2xl text-primary shadow-sm">
                    <Settings2 size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold font-display text-foreground tracking-tight">Configure</h2>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em] mt-1 font-bold">Application</p>
                </div>
            </div>

            <nav className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 hide-scrollbar snap-x w-full">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-[20px] transition-all whitespace-nowrap snap-start text-left border overflow-hidden group shrink-0 lg:w-full ${
                                isActive
                                    ? 'bg-card/80 dark:bg-[#0c0c0d]/90 border-primary/30 shadow-sm'
                                    : 'bg-card/40 dark:bg-[#0c0c0d]/40 border-border/50 hover:bg-card/60 hover:border-border/80'
                            } backdrop-blur-xl`}
                        >
                            {isActive && (
                                <motion.div 
                                    layoutId="activeTabIndicator"
                                    className="absolute inset-0 bg-primary/5 z-0"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <div className={`relative z-10 p-2 sm:p-3 rounded-xl transition-colors ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground group-hover:text-foreground'}`}>
                                <Icon size={18} />
                            </div>
                            <div className="relative z-10">
                                <div className={`font-bold text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground transition-colors'}`}>
                                    {item.label}
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {item.desc}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </nav>
            
            {/* Legal Links */}
            <div className="hidden lg:flex flex-col gap-3 mt-4 pt-6 border-t border-border/40 px-2">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                    <Shield size={12} />
                    <span>Legal & Privacy</span>
                </div>
                <div className="flex flex-col gap-2">
                    <Link href="/privacy" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors w-fit">
                        Privacy Policy
                    </Link>
                    <Link href="/terms" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors w-fit">
                        Terms of Service
                    </Link>
                </div>
            </div>
        </aside>
    );
}