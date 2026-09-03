# Kino Developer Guide

Kino is a premium, single-user media tracker (movies/TV/anime) built as a **serverless PWA**. There is no backend server and no database of any kind (no IndexedDB, no SQL, no ORM) — the signed-in user's Google Drive `appDataFolder` *is* the database. Everything else is client-side React state. Keep this in mind before assuming a "backend" or "db layer" exists to modify.

## Commands
* Dev server: `npm run dev` (Turbopack)
* Build: `npm run build`
* Production server: `npm run start`
* Lint: `npm run lint`
* Tests: `npx vitest run` (Vitest + fast-check property tests; see `src/lib/db.test.ts`)

Always run `npm run build` and `npm run lint` before considering a task done — `next build` type-checks and statically renders every route, which catches issues `dev` mode's lazy compilation won't surface until you actually click into that page.

## Tech Stack
* **Framework**: Next.js 16.2 (App Router, Turbopack)
* **Runtime**: React 19
* **Styling**: Tailwind CSS v4 via `@theme` in `src/app/globals.css` (no `tailwind.config.js` — v4 is CSS-first). Fonts are `next/font/google` (Inter + Space Mono), exposed as CSS vars consumed by the `@theme` block.
* **Animations**: Framer Motion v12
* **Icons**: Lucide React
* **Auth**: Google Identity Services OAuth2 (`@react-oauth/google`), scoped to `drive.appdata` only — the app can never see the rest of a user's Drive
* **Notifications**: `sonner` (toast) — never use `alert()`/`confirm()` for anything except the one deliberate hard-confirm on "wipe all data"

## Architecture

**No backend, no database.** Data flow:
1. `src/context/AuthContext.tsx` — Google OAuth2 token lifecycle. Access token lives 1h; a separate 30-day "session" flag in `localStorage` (`kino_session_expiry`, `kino_user_profile`) lets a returning user stay logged in across tab closes while the token itself refreshes silently in the background 5 minutes before expiry. `PUBLIC_ROUTES` in this file lists routes reachable while signed out (`/login`, `/privacy`, `/terms`, `/share`) — keep this in sync if you add another route that must work for signed-out visitors (e.g. anything meant to be shared publicly).
2. `src/context/MediaContext.tsx` — the single source of truth for `entries`/`genres`/`franchises`, held in React state (never persisted to `localStorage` or IndexedDB). On login it downloads a backup from Drive and hydrates state; every mutation updates state immediately then debounces (800ms) a re-upload via `triggerUpload`. All the exposed action functions (`addEntry`, `updateEntry`, `saveGenres`, etc.) are wrapped in `useCallback` so the context value's `useMemo` is actually effective — if you add a new action here, wrap it too, or the memo silently stops helping.
3. `src/lib/googleDrive.ts` — the Drive REST calls. Library data is split into **chunks of 50 entries** (`kino-chunk-N.json`), with cover images stored in **separate** chunk files (`kino-images-N.json`) so editing metadata doesn't re-upload megabytes of base64 images. Each chunk is hashed (`cyrb53`) before upload so unchanged chunks are skipped. A `kino-index.json` holds genres/franchises/timestamp/chunk count. There's a one-time migration path from an older single-file (`kino-backup.json`) format.
4. `src/lib/db.ts` — pure functions and types only, no I/O: `MediaEntry`/`Tag`/`EpisodeInfo` types, runtime-calculation helpers (`getWatchedRuntimeMinutes`, `getTotalRuntimeMinutes`), episode helpers (`sortEpisodes`, `materializeEpisodes`, `getSeasonNumbers` — use these instead of re-deriving episode order/synthesis inline), and normalization helpers used on every import/sync path.
5. `src/lib/colors.ts` — the accent-color palette (`APP_COLORS`, user-selectable in Settings → Appearance) and `hueFromTitle()`, the single hashing function used to give any title a deterministic accent color everywhere it appears (dashboard spotlight, media cards). Don't reimplement title-hashing locally — call this.

## Project structure (routes)

| Route | Purpose |
|---|---|
| `/login` | Public. Google sign-in. |
| `/` and `/dashboard` | **Same component** (`dashboard/page.tsx` re-exports `../page`) — the authenticated home: spotlight hero, "Daily Reel", release calendar, continue-watching/watchlist/completed shelves. |
| `/collection` | Full library grid/list, filters, Cmd+K command palette. |
| `/media/[id]` | Full-page detail view with per-field quick-edit modals (tap title/date/runtime/etc. to edit just that field) and episode/season management. |
| `/media/[id]/edit` | Full structured edit form (`MediaForm` in edit mode) — all fields at once, including type/status/rating/bulk episode generation. Complementary to the quick-edit modals above, not a replacement. |
| `/add` | `MediaForm` in create mode. |
| `/sagas` | Franchise/saga chronological timelines. |
| `/settings` | Tabbed: Data & Cloud (sync status, export/import, account migration, wipe), Appearance (accent color), Achievements (badges + Wrapped recap launchers), Sagas, Genres. |
| `/profile` | Public-style stats page (watch time, badge tier, library mix, favorites). |
| `/wraps?type=weekly\|monthly` | Full-screen animated recap slideshow, ends with a shareable link. |
| `/share?d=<base64>` | **Public** — the shareable recap card decoded from the URL param. Must stay reachable while signed out. |
| `/privacy`, `/terms` | **Public** legal pages (required public for Google OAuth consent-screen verification). |

`AppShell.tsx` renders the header/search/bottom-nav chrome only when authenticated; `{children}` always renders, so public routes render without shell chrome when signed out.

## Code Style & Conventions
* **React 19 Purity**: keep components/hooks idempotent. Never call `Date.now()`, `Math.random()`, or `new Date()` directly during render or as a `useState` initializer — wrap in a helper, or defer via `useEffect` + `Promise.resolve().then(() => setState(...))` (the pattern used throughout this codebase for anything that must run once after mount).
* **No state-in-effect**: avoid synchronous `setState` directly inside a `useEffect` body; prefer render-phase derivation or the microtask-deferred pattern above.
* **Imports**: always import `isEpisodic` and episode/runtime helpers from `@/lib/db` rather than reimplementing them. Remove unused imports — this repo has been swept clean of them; keep it that way (`npm run lint` will catch new ones).
* **No dead code**: no unused vars/imports, no no-op props, no state that's written but never read. If you add a `useMemo`/`useEffect`, make sure something actually consumes its output.
* **Aesthetics**: luxury dark-mode design system — deep dark background tones (`#03050c`), glassmorphic panels (`backdrop-blur`, translucent borders), glowing radial ambient backdrops. Match the existing component patterns rather than introducing a new visual language.
* **`<img>` over `next/image`**: intentional. Every image in this app is a user-uploaded base64 `data:` URI (compressed client-side to webp via canvas before storage), not an optimizable remote asset — `next/image` doesn't meaningfully help here and forcing it across ~15 call sites risks layout regressions for no real gain. `npm run lint` will still flag these; that's expected and fine.
* **Toasts, not `alert()`**: use `sonner`'s `toast.success`/`toast.error` for all user feedback. `window.confirm()` is acceptable only for the single irreversible "wipe all data" action.

## Testing
`src/lib/db.test.ts` covers the pure normalization helpers with both example and property-based (fast-check) tests. Add tests there for any new logic in `lib/db.ts`; there's no test setup for components/pages currently.
