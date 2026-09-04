# Components — deep dive

Every shared/reusable component under `src/components/` (and its subfolders), what it renders, and — where it isn't purely presentational — how its internal logic actually works. Page-only logic (things that live in `src/app/**/page.tsx` and aren't reused elsewhere) is covered in [docs/pages.md](pages.md) instead.

## `AppShell.tsx`
The chrome wrapper rendered around every route from `layout.tsx`. Renders the header (logo, desktop nav pills, search bar, sync-status pill, avatar → `/profile` link, settings/theme/logout buttons) and `<BottomNav />` **only when** `!isLoading && accessToken && pathname !== '/login'` — `{children}` itself always renders regardless, which is what lets public routes (`/privacy`, `/share`, etc.) render with no shell chrome while signed out.

- **Route-transition loading bar**: listens for a custom `kino:route-transition-start` window event (dispatched elsewhere on navigation start) and shows a brief `PageLoader` overlay for at least 120ms (so it never flashes for an instant navigation) up to ~320ms.
- **Search bar** (`SearchBar`, a local, non-exported component with `desktop`/`mobile` variants) — debounces input by 400ms before pushing `?q=` onto the URL, but only when the current route is `/collection` or `/sagas` (those are the only two pages that read the query param); Enter submits immediately via `router.push`.
- Auth loading state renders `<BrandedSplash text="Authenticating…" />` instead of a generic spinner.

## `BottomNav.tsx`
Mobile-only (`lg:hidden`) fixed bottom nav: Dashboard, Collection, a raised center **Add** button, Sagas, Settings. Five fixed slots — there is no room for a sixth item without a redesign, which is why newer features (Journal, Watch Tonight) live inside existing pages/tabs rather than getting their own nav icon.

## `KinoLogo.tsx`
The app's mark: a hand-drawn SVG (black square, red border, grey inner ring, a broken white outer ring, a white play-triangle) plus optional "KINO" wordmark text. Pure presentational, `size`/`showText` props. `BrandedSplash.tsx` re-implements the same SVG shape (not by importing this component) because it additionally needs to animate the outer ring's rotation with `framer-motion`'s `motion.circle`.

## `BrandedSplash.tsx`
Full-screen branded loading state (replaces a generic spinner for "Authenticating…" and similar first-load waits). The outer ring rotates continuously via a `motion.circle` with `originX/originY: 0.5` and a 6s linear infinite loop, **disabled entirely** when `useReducedMotion()` is true (respects `prefers-reduced-motion`).

## `MediaCard.tsx`
The poster-grid card used on Dashboard shelves and the Collection grid. `React.memo`'d with a custom comparator (`prevProps.entry === nextProps.entry && prevProps.index === nextProps.index`) — this means **entry objects must be replaced, not mutated**, for a card to re-render; every mutation path in the app already does this (spread + reassign), so don't start mutating `MediaEntry` objects in place.

- Hover reveals a status-dependent quick-action pill at the bottom: `Watching` + episodic → "+1 episode" (fires `fireConfetti()`); `Watching` + non-episodic (a movie) → "Complete" (fires `fireEpicConfetti()`, calls `onStatusChange('Completed')`); `Plan to Watch` → "Start" (`onStatusChange('Watching')`).
- The ambient hover-glow blur behind the card, and the placeholder shown when there's no cover image, both derive their color from `hueFromTitle(entry.title)` (`src/lib/colors.ts`) — the same hash function used on the Dashboard spotlight, so a given title's accent color is consistent everywhere it appears.
- `imgError` local state swaps in a text placeholder if the base64 `coverImage` fails to decode (rare, but a corrupt/huge data URI can trip this).

## `MediaForm.tsx`
The full structured create/edit form, used by both `/add` (no `initialData`) and `/media/[id]/edit` (`initialData` set → `isEditMode`). Three tabs: General (title/type/cover/saga/status/genres), Details (release date, runtime for non-episodic, favorite, rating when Completed, review), Episodes (only shown when `isEpisodic({ type, animeType })`, and hidden if the caller passes `hideEpisodesTab`).

- **`calculatedStats`** (`useMemo`) computes `avgRuntime`/`totalTime`/`watchedTime` live as the user edits — for episodic entries with no explicit per-episode runtimes, it averages whatever `episode.runtime` values *are* set and uses that average to estimate the rest; this mirrors the exact algorithm in `getWatchedRuntimeMinutes`/`getTotalRuntimeMinutes` in `db.ts` (kept in sync manually — if you change one, check the other).
- An effect keeps `status` and `episodesWatched`/`episodesTotal` derived from the `episodes[]` array whenever it's non-empty: 0 watched → `Plan to Watch`, all watched → `Completed`, otherwise → `Watching`. This effect intentionally omits `episodesTotal` from its dependency array (documented inline with an `eslint-disable-next-line`) — including it would create a set→re-run→set cycle, since the effect itself can update `episodesTotal`.
- **Duplicate detection** on create (not edit): title + type + release year must all match an existing entry for it to be flagged, specifically so a same-titled remake with a different year can coexist.
- **Cover image upload**: reads the file, draws it to an off-screen `<canvas>` capped at 800px wide (preserving aspect ratio), and re-exports as `image/webp` at quality 0.8 — this is why every stored cover is a compressed webp `data:` URI rather than the original upload, keeping Drive chunk sizes down.
- Episode editing here is bulk-oriented: season tabs, "Add 1 Episode" / "Generate N episodes" for a season, a dense editable table (name/runtime/air-date/watched-toggle) per episode. Contrast with `MediaDetailModal`'s Episodes tab, which is oriented around toggling watched-state one at a time during actual viewing.

## `MediaDetailModal.tsx`
The centered/bottom-sheet modal used by Dashboard and Collection when clicking a card that isn't opened as a full page (the full-page equivalent is `/media/[id]/page.tsx` — this modal and that page duplicate a fair amount of the same read/edit affordances by design, so either surface works depending on where the user clicked from).

- **Theater Mode**: after 5 seconds of no `mousemove`/`touchstart`/`keydown`/`click`/`scroll`, the header/footer/controls fade out and the cover art blooms to fill the backdrop (an Apple-TV-style "ambient" look). The mousemove listener specifically ignores *synthetic* mousemove events fired by the browser when an element vanishes out from under the cursor (checked by comparing `clientX`/`clientY` against the last real move) — without this check, the UI's own disappearance would immediately re-trigger a "user moved the mouse" reset, and Theater Mode could never actually engage.
- Episode +/- controls (`handleIncrementEpisode`/`handleDecrementEpisode`) walk the sorted episode list to find the next unwatched (incrementing) or last-watched (decrementing) episode and flip its `watched` flag, keeping `episodesWatched`/`status` in sync; completing the last episode fires `fireEpicConfetti()` plus a toast, each individual increment fires the lighter `fireConfetti()`.
- Uses `materializeEpisodes`/`getSeasonNumbers`/`sortEpisodes` from `db.ts` for its Episodes tab — same synthesis logic as everywhere else, so a show tracked only via `episodesTotal`/`episodesWatched` still gets a browsable per-episode list here.

## `AppShell`'s siblings under `src/components/ui/`

- **`AmbientGlow.tsx`** — `{ glows: string[], fixed?, className? }`. Each string in `glows` is one full Tailwind utility chain for one blurred blob (position + size + color + blur, e.g. `"top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px]"`). `fixed` toggles viewport-relative vs. scroll-with-page positioning. Replaces what used to be ~20 hand-copied glow-blob `<div>`s across 8 pages.
- **`Skeleton.tsx`** — `Skeleton` (one shimmering block) and `MediaCardSkeleton` (composed to exactly match `MediaCard`'s poster+title+meta layout, so the swap from skeleton to real content causes zero layout shift). The shimmer itself is a CSS-only sweep (`.skeleton-shimmer` / `@keyframes kino-shimmer-sweep` in `globals.css`), disabled under `prefers-reduced-motion`.
- **`Loader.tsx`** — `PageLoader({ text, fullScreen })`, a spinner + label, optionally as a fixed full-screen overlay. Used for route-level loading states that aren't worth a bespoke skeleton.
- **`Badge.tsx`** — small pill label with a fixed set of semantic variants (`primary`/`secondary`/`success`/`warning`/`accent`/`muted`/`movie`/`tv`/`anime`), each a pre-set color/border/background combo. Used in `MediaDetailModal`'s header for type/status/favorite indicators.

## `src/components/dashboard/RecapModal.tsx`
The full-screen "Wrapped"-style animated slideshow, rendered by `/wraps?type=weekly|monthly|yearly` (see [docs/pages.md](pages.md)). Four slides for weekly/monthly (`intro` → `time` → `genre` → `top`); yearly gets a fifth, `streak`, inserted between `genre` and `top`. All slide content and the ambient gradient/orb colors are keyed by slide **id**, not array position — so the yearly-only slide can be spliced in without shifting any other slide's visuals.

- **Auto-advance + pause**: a single `requestAnimationFrame` loop per slide-mount accumulates elapsed time into a `progress` (0–100) state that drives the header progress bar's width directly (no `framer-motion` tween to fight with); hitting 100 calls `nextSlide()`. Holding a touch zone for ~180ms sets `isPausedRef.current = true`, which the running loop checks every frame — pausing/resuming never tears down or restarts the loop (which would otherwise race on stale `progress`), it just stops/resumes the accumulator in place. A quick tap (released before the 180ms hold threshold) never sets `isPausedRef`, so its `onClick` fires normally and navigates; a genuine hold sets `suppressNextClickRef` on release so the tap-navigation `onClick` that follows is swallowed instead of also firing.
- **Yearly-only stats**: `streak` (longest run of consecutive calendar days with any activity in the window, computed from a sorted, deduped list of active dates) and `topMonth` (the calendar month with the most `getWatchedRuntimeMinutes` inside the window) — both computed unconditionally in the `stats` `useMemo` (cheap either way) but only surfaced by the `streak` slide, which only exists when `type === 'yearly'`.
- All slides rely on the same `stats` `useMemo`, which filters `entries` to those `updatedAt`/`createdAt` within the last 7/30/365 days, sums `getWatchedRuntimeMinutes` across them, tallies type/genre counts, and picks the highest-rated recent entry as the "highlight."

- **Sharing**: `handleShare` builds a deliberately minimal payload (`{ t, h, c, g, mw, sw, tp, tm, tr }` — short keys to keep the URL small), base64-encodes it (`btoa(encodeURIComponent(JSON.stringify(...)))`), and copies a `/share?d=<encoded>` link to the clipboard. `/share` (a public route) decodes the reverse of this — see `docs/pages.md`.
- `AnimatedNumber` uses a `framer-motion` spring (`useSpring` over a `useMotionValue`) to count up to the target value rather than snapping, and `StaggeredText` staggers a heading's words in word-by-word on entry.

## `src/lib/confetti.ts`
Two exports, both thin wrappers around `canvas-confetti`: `fireConfetti()` (a single modest burst, used for "+1 episode") and `fireEpicConfetti()` (a ~2.5s dual-cannon burst from both bottom corners via `requestAnimationFrame`, used for "series/movie completed"). Always call these — never import `canvas-confetti` directly elsewhere, so the visual language of "small win" vs. "big win" stays consistent.
