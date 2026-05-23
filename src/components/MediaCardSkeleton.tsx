"use client";

import React from 'react';
import { useUI } from '@/context/UIContext';

export default function MediaCardSkeleton() {
    const { cardShape } = useUI();

    // Determine the shape classes based on the user's UI preferences
    const shapeClass =
        cardShape === 'rectangle' ? 'aspect-[2/3] rounded-2xl' :
            cardShape === 'square' ? 'aspect-square rounded-2xl' :
                'aspect-square rounded-full';

    return (
        <div className="flex flex-col gap-3 w-full animate-pulse">
            {/* Image Skeleton */}
            <div className={`w-full bg-muted/40 border border-border/20 shadow-sm ${shapeClass}`} />

            {/* Text Skeleton */}
            <div className={`space-y-2 px-1 ${cardShape === 'circle' ? 'flex flex-col items-center' : ''}`}>
                <div className="h-4 bg-muted/40 rounded-md w-4/5" />
                <div className={`h-3 bg-muted/40 rounded-md ${cardShape === 'circle' ? 'w-1/3' : 'w-1/2'}`} />
            </div>
        </div>
    );
}