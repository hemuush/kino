// Deterministic hue (0-359) derived from a title, used to give each media entry a
// stable, consistent accent color everywhere it's shown (cards, dashboard spotlight, etc).
export function hueFromTitle(title?: string): number {
  const t = (title || 'kino').toLowerCase();
  let hash = 0;
  for (let i = 0; i < t.length; i++) hash = (hash * 31 + t.charCodeAt(i)) >>> 0;
  return hash % 360;
}

// Shortest-path hue interpolation (e.g. 350 -> 10 blends forward through 360/0,
// not backward across the whole wheel) — used to smoothly drift an ambient
// background color between waypoints, e.g. as the page scrolls.
export function lerpHue(a: number, b: number, t: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}

export const APP_COLORS = [
  { id: 'red', name: 'Kino Classic', hex: '#D71921', hover: '#a11319' },
  { id: 'ocean', name: 'Deep Ocean', hex: '#0ea5e9', hover: '#0284c7' },
  { id: 'mint', name: 'Mint Glow', hex: '#14b8a6', hover: '#0f766e' },
  { id: 'violet', name: 'Neon Violet', hex: '#9333ea', hover: '#7e22ce' },
  { id: 'peach', name: 'Sunset Peach', hex: '#f97316', hover: '#c2410c' },
  { id: 'blossom', name: 'Cherry Blossom', hex: '#ec4899', hover: '#be185d' },
  { id: 'cyber', name: 'Cyber Yellow', hex: '#eab308', hover: '#a16207' },
  { id: 'graphite', name: 'Graphite', hex: '#737373', hover: '#404040' },
];
