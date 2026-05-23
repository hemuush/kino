"use client";

import React from "react";

export default function MediaCardSkeleton() {
    return (
        <div className="flex flex-col gap-3 animate-pulse" aria-hidden="true">
            {/* 
        Standardized Rectangle shape (aspect ratio 2/3) 
        Replacing dynamic shape context logic 
      */}
            <div className="w-full aspect-[2/3] bg-gray-800 rounded-xl shadow-lg border border-gray-800/50"></div>

            <div className="flex flex-col gap-2 px-1">
                <div className="h-4 bg-gray-800 rounded-md w-11/12"></div>
                <div className="h-3 bg-gray-800/80 rounded-md w-1/3"></div>
            </div>
        </div>
    );
}