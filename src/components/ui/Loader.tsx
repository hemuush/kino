import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoaderProps {
    text?: string;
    fullScreen?: boolean;
}

export function PageLoader({ text = "Loading Kino...", fullScreen = false }: LoaderProps) {
    const content = (
        <div className="flex flex-col items-center justify-center gap-4 p-8 w-full h-full min-h-[50vh]">
            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <Loader2 className="w-12 h-12 animate-spin text-primary relative z-10" />
            </div>
            <p className="text-muted-foreground animate-pulse text-sm font-medium tracking-wide">
                {text}
            </p>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center">
                {content}
            </div>
        );
    }

    return content;
}