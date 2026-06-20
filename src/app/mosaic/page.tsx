"use client";

import { useMedia } from '@/context/MediaContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useMemo } from 'react';
import { ArrowLeft, Download, Sparkles, Loader2, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
type RGB = [number, number, number];
interface ImageColor {
  src: string;
  color: RGB;
  img: HTMLImageElement;
}

// Config
const COLS = 60;
const ROWS = 90;
const CELL_W = 20;
const CELL_H = 30;

function getAverageColor(img: HTMLImageElement): RGB {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  c.width = 10;
  c.height = 15;
  ctx.drawImage(img, 0, 0, 10, 15);
  const data = ctx.getImageData(0, 0, 10, 15).data;
  let r = 0, g = 0, b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

function colorDistance(c1: RGB, c2: RGB) {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

export default function MosaicPage() {
  const { entries } = useMedia();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loadingStep, setLoadingStep] = useState<string>("Initializing Generation...");
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Pick target image: highest rated or most recent
  const targetEntry = useMemo(() => {
    const rated = [...entries].filter(e => e.coverImage).sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return rated.length > 0 ? rated[0] : null;
  }, [entries]);

  useEffect(() => {
    if (!targetEntry) {
      setError("Not enough media with cover images to generate a mosaic.");
      return;
    }

    let isCancelled = false;

    const generate = async () => {
      try {
        setLoadingStep("Extracting library posters...");
        setProgress(10);
        
        // Collect all unique images
        const uniqueUrls = Array.from(new Set(entries.filter(e => e.coverImage).map(e => e.coverImage!)));
        
        if (uniqueUrls.length < 1) throw new Error("No images found.");

        const loadImg = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load ${url}`));
          // To bypass some cors if possible on data URIs, or TMDB
          img.src = url;
        });

        // Load all source images
        const sourceImages: ImageColor[] = [];
        for (let i = 0; i < uniqueUrls.length; i++) {
          if (isCancelled) return;
          try {
            const img = await loadImg(uniqueUrls[i]);
            sourceImages.push({ src: uniqueUrls[i], color: getAverageColor(img), img });
          } catch (e) {
            // Ignore cors failures for individual images
          }
          if (i % 5 === 0) setProgress(10 + Math.floor((i / uniqueUrls.length) * 40));
        }

        if (sourceImages.length === 0) throw new Error("Failed to load images due to CORS or network issues.");

        setLoadingStep("Analyzing target image...");
        setProgress(50);

        const targetImg = await loadImg(targetEntry.coverImage!);
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // Set final high-res canvas size
        canvas.width = COLS * CELL_W;
        canvas.height = ROWS * CELL_H;

        // Draw target image very small to get average color per cell
        const analysisCanvas = document.createElement('canvas');
        analysisCanvas.width = COLS;
        analysisCanvas.height = ROWS;
        const aCtx = analysisCanvas.getContext('2d')!;
        aCtx.drawImage(targetImg, 0, 0, COLS, ROWS);
        const targetData = aCtx.getImageData(0, 0, COLS, ROWS).data;

        setLoadingStep("Assembling mosaic tiles...");
        setProgress(70);

        // Build mosaic
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            if (isCancelled) return;
            const idx = (y * COLS + x) * 4;
            const tr = targetData[idx];
            const tg = targetData[idx+1];
            const tb = targetData[idx+2];
            const targetColor: RGB = [tr, tg, tb];

            // Find closest source
            let bestMatch = sourceImages[0];
            let bestDist = Infinity;
            for (const src of sourceImages) {
              const d = colorDistance(targetColor, src.color);
              if (d < bestDist) {
                bestDist = d;
                bestMatch = src;
              }
            }

            ctx.drawImage(bestMatch.img, x * CELL_W, y * CELL_H, CELL_W, CELL_H);
          }
          if (y % 10 === 0) setProgress(70 + Math.floor((y / ROWS) * 20));
        }

        setLoadingStep("Applying cinematic finishing touches...");
        setProgress(95);

        // Blend original image over it at 40% opacity so it looks perfect
        ctx.globalAlpha = 0.4;
        ctx.drawImage(targetImg, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;

        setProgress(100);
        setIsDone(true);
      } catch (err: any) {
        setError(err.message || "An unknown error occurred.");
      }
    };

    // Small delay to allow UI to render first
    setTimeout(generate, 500);

    return () => { isCancelled = true; };
  }, [entries, targetEntry]);

  const handleDownload = () => {
    if (!canvasRef.current || !targetEntry) return;
    const link = document.createElement('a');
    link.download = `kino-mosaic-${targetEntry.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] mix-blend-screen" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[120px] mix-blend-screen" />
      </div>

      {/* Header */}
      <header className="relative z-50 flex items-center justify-between p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-background to-transparent">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-3 bg-card/80 backdrop-blur-xl border border-border/50 hover:bg-card hover:border-primary/50 text-foreground transition-all rounded-2xl shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="text-primary" size={24} />
              The Pixel Mosaic
            </h1>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-widest mt-0.5">Generative Art Engine</p>
          </div>
        </div>

        <AnimatePresence>
          {isDone && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleDownload}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all flex items-center gap-2 text-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download</span>
            </motion.button>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center relative z-10 p-4 sm:p-8 lg:p-12" ref={containerRef}>
        
        {/* Loading State */}
        <AnimatePresence>
          {!isDone && !error && (
            <motion.div 
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6"
            >
              <div className="w-full max-w-md bg-card/80 backdrop-blur-2xl border border-border/50 rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col items-center text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                  <Loader2 size={48} className="animate-spin text-primary relative z-10" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-display mt-8 mb-2">Generating Art...</h3>
                <p className="text-sm font-medium text-muted-foreground mb-8">{loadingStep}</p>
                
                <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear" }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && (
          <div className="text-center max-w-md p-8 bg-destructive/10 border border-destructive/20 rounded-3xl">
            <h3 className="text-destructive font-black text-xl mb-2">Generation Failed</h3>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        )}

        {/* Canvas Display */}
        <div 
          className={`relative transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isDone ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-20 scale-95'}`}
        >
          <div 
            className={`relative overflow-hidden bg-black shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] border border-border/50 transition-all duration-500 cursor-zoom-in ${isZoomed ? 'fixed inset-0 z-[100] cursor-zoom-out' : 'rounded-2xl sm:rounded-[32px]'}`}
            onClick={() => setIsZoomed(!isZoomed)}
          >
            <canvas 
              ref={canvasRef} 
              className={`transition-all duration-500 ${isZoomed ? 'w-full h-full object-contain' : 'w-[280px] h-[420px] sm:w-[360px] sm:h-[540px] lg:w-[420px] lg:h-[630px] object-cover'}`}
            />
            
            {!isZoomed && isDone && (
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white/80 text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 border border-white/10 pointer-events-none">
                <Maximize size={12} />
                Click to Expand
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
