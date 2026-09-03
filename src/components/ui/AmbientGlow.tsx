interface AmbientGlowProps {
  /** Each entry is a full utility string for one blob: position + size + color + blur, e.g. "top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px]" */
  glows: string[];
  /** Use `fixed` positioning (viewport-relative, stays put on scroll) instead of `absolute` (scrolls with the page). */
  fixed?: boolean;
  className?: string;
}

export function AmbientGlow({ glows, fixed = false, className = "" }: AmbientGlowProps) {
  return (
    <div aria-hidden="true" className={`${fixed ? "fixed" : "absolute"} inset-0 z-0 overflow-hidden pointer-events-none ${className}`}>
      {glows.map((glow, i) => (
        <div key={i} className={`absolute rounded-full ${glow}`} />
      ))}
    </div>
  );
}
