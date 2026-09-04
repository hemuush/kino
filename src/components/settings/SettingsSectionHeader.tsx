"use client";

import { ReactNode } from 'react';

type Tone = 'primary' | 'purple' | 'red';

const TONE_STYLES: Record<Tone, { box: string; glow: string }> = {
    primary: {
        box: 'from-primary/20 to-primary/5 border-primary/20 text-primary',
        glow: 'shadow-[0_0_30px_-5px_rgba(var(--primary),0.3)]',
    },
    purple: {
        box: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-500',
        glow: 'shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]',
    },
    red: {
        box: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-500',
        glow: 'shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]',
    },
};

interface SettingsSectionHeaderProps {
    icon: ReactNode;
    title: string;
    description: string;
    tone?: Tone;
    action?: ReactNode;
    /** Use a smaller box/heading for a sub-section header within a tab that already has a primary header above it. */
    compact?: boolean;
}

/** The one header shape every Settings tab (and sub-section) should use, so all six tabs read as one settings app. */
export function SettingsSectionHeader({ icon, title, description, tone = 'primary', action, compact = false }: SettingsSectionHeaderProps) {
    const t = TONE_STYLES[tone];
    return (
        <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
                <div className={`${compact ? 'p-2.5 rounded-xl' : 'p-3 rounded-2xl'} bg-gradient-to-br ${t.box} border backdrop-blur-xl ${t.glow}`}>
                    {icon}
                </div>
                <div>
                    <h2 className={`${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-display font-black text-foreground tracking-tight`}>
                        {title}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">{description}</p>
                </div>
            </div>
            {action}
        </div>
    );
}
