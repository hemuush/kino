interface SkeletonProps {
  className?: string;
}

/** A single shimmering placeholder block. Compose these to match the real layout being loaded. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} />;
}

/** Matches MediaCard's exact shape (poster + title + meta line) so the swap-in causes no layout shift. */
export function MediaCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Skeleton className="w-full aspect-[2/3] rounded-xl border border-border/20" />
      <div className="px-0.5 flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}
