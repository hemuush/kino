"use client";

import { Film, Tag, Database, Settings2 } from 'lucide-react';

interface SettingsSidebarProps {
    activeTab: 'sagas' | 'genres' | 'data';
    setActiveTab: (tab: 'sagas' | 'genres' | 'data') => void;
}

export function SettingsSidebar({ activeTab, setActiveTab }: SettingsSidebarProps) {
    const navItems = [
        { id: 'sagas', label: 'Sagas', icon: Film },
        { id: 'genres', label: 'Genres Matrix', icon: Tag },
        { id: 'data', label: 'Data & Backups', icon: Database },
    ] as const;

    return (
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 mb-4">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <Settings2 size={20} />
                </div>
                <h2 className="text-xl font-bold font-display text-foreground">Settings</h2>
            </div>

            <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap md:whitespace-normal font-medium text-sm border ${isActive
                                    ? 'bg-primary/10 text-primary border-primary/20 shadow-sm'
                                    : 'bg-transparent text-muted-foreground hover:bg-muted/50 border-transparent hover:border-border/50 hover:text-foreground'
                                }`}
                        >
                            <Icon size={18} className={isActive ? 'text-primary' : 'opacity-70'} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}