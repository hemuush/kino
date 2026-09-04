# Pages — deep dive

Route-by-route logic that isn't already covered by a shared component in [docs/components.md](components.md). See [CLAUDE.md](../CLAUDE.md) for the one-line-per-route summary table.

## `/` and `/dashboard` — `src/app/page.tsx` (`dashboard/page.tsx` just re-exports it)

The authenticated home. `DashboardContent` (wrapped in a `Suspense` because it reads `useSearchParams`) renders, top to bottom: a spotlight hero cycling through a random deck of entries every 5 seconds, a "Daily Reel" horizontal strip, a Release Calendar timeline, a type filter chip row, then three shelves (Continue Watching / Watchlist / Recently Completed), each capped at 24 items and filtered by the shared `shelfFilter` state.

- **`DashboardSkeleton`** — shown while `isLoading`; a hero-block skeleton plus two rows of `MediaCardSkeleton`, shaped to match the real layout so there's no visible pop when data arrives.
- **`SectionHeading`** — a local component consolidating the "eyebrow label + big heading (+ optional trailing action)" pattern repeated across all four shelf headers.
- **Watch Tonight quick-pick** (Watchlist shelf's header action): clicking "Watch Tonight?" opens a small popover (closed by an outside-click listener on `pickerRef`, the same pattern `MediaForm` uses for its genre/franchise dropdowns) with two independent filters:
  - **Duration** (`Quick <45m` / `Medium 45–90m` / `Long 90m+` / `Any`) — evaluated against `getSessionRuntimeMinutes(entry)`, a local helper that estimates "how long is one sitting": the full runtime for a movie, or one episode's length for anything episodic (preferring `entry.runtime` if set, else averaging whatever per-episode runtimes are known). An entry with no determinable duration always passes the filter (treated as "unknown, don't exclude").
  - **Mood** (`Feel-Good` / `Intense` / `Emotional` / `Mind-Bending` / `Any`) — each mood maps to a fixed list of genre-name keywords (`MOOD_GENRE_KEYWORDS`); an entry matches if any of its resolved genre names (via `genreIds` → the `genres` context array) contains one of that mood's keywords. This is a best-effort match — it only works well against the default genre names, since genres are freely user-renamable.
  - "Pick For Me" filters the `Plan to Watch` pool by both filters (further scoped by the existing `shelfFilter` type filter), picks randomly from whatever matches, and falls back to picking from the *unfiltered* watchlist (with a toast explaining why) if nothing matches both filters.
- **Weekly/monthly recap auto-launch**: on load, if it's the first Sunday-load of the week (or first-of-month, checked via `localStorage['kino_last_weekly_recap'/'kino_last_monthly_recap']`), automatically redirects into `/wraps?type=weekly|monthly` once per period.

## `/collection` — `src/app/collection/page.tsx`

The full library browser. `CollectionContent` (also `Suspense`-wrapped for `useSearchParams`) combines:
- **Filtering**: type (`All`/`Movie`/`Series`/`Anime`, synced to `?type=`), status, favorites-only, genre (`genreFilter`, matched against `genreIds`), saga (`sagaFilter`, matched against `franchiseId`), free-text search (`?q=`, matched token-by-token against a haystack built from title/type/status/year/review/resolved-genre-names/resolved-franchise-name — every token in the query must appear somewhere in the haystack, not just the whole phrase). Genre/saga filters only render if the user has at least one genre/saga defined.
- **Sort**: Newest Added / Recently Updated / Release Date / Highest Rated / Alphabetical.
- **View mode**: poster grid or a dense list row (`viewMode`).
- **Infinite scroll**: `visibleCount` starts at 60 and grows by 60 whenever an `IntersectionObserver` (via `loadMoreRef`, `rootMargin: '400px'`) sees the trailing sentinel enter the viewport — there is no "Load More" button anywhere in this app.
- **Cmd+K / Ctrl+K command palette**: a small fixed action list (Add New Media, Jump to Sagas, View Settings, Pick Random Watch) filterable by typing, navigable with arrow keys + Enter. "Pick Random Watch" here is the *simple* fully-random version (no duration/mood filters) — the smarter version lives only on the Dashboard's Watchlist shelf.
- **Floating segmented dock** (bottom of screen, Apple/Nothing-style): type filter, poster/list toggle, an Add shortcut, and a filter-popover toggle for status/sort/favorites — kept separate from the Cmd+K palette since the dock is meant for quick repeated taps, the palette for keyboard-first power use.

## `/media/[id]` — `src/app/media/[id]/page.tsx`

The full-page detail view (as opposed to `MediaDetailModal`, the sheet/modal opened from a card). Built around **per-field quick-edit**: nearly every displayed value (title, release date, runtime, cover image, review, saga, genres, episode total) is independently clickable and opens a small centered modal to edit *just that field*, tracked via a single `editingField` union-typed state rather than one state variable per field. Status and rating each get their own dedicated modal (`editingStatus`/`editingRating`) since they need a fixed choice list / star picker rather than a text input.

- Episode management here (`handleAddSeason`, `handleAddEpisode`, `handleToggleEpisode`, the per-episode edit/delete modal) always goes through `getMaterializedEpisodes()` (a thin wrapper around `db.ts`'s `materializeEpisodes`) first, so an entry that has never had explicit `episodes[]` tracking gets one synthesized before any single-episode edit is applied — the "legacy scalar tracking" mode transparently upgrades to explicit per-episode tracking the moment a user touches an individual episode here.
- `handleIncrementEpisode` specifically looks for the sorted list's first `!watched` episode to mark next (rather than always incrementing episode N+1), so watching out of order (e.g. catching up on a skipped episode later) doesn't produce a wrong "next episode" number.

## `/media/[id]/edit` — `src/app/media/[id]/edit/page.tsx`

A thin page: looks up the entry by `id`, redirects to `/` if it's missing once loading has settled (`!isLoading && id && !entry`), and renders `MediaForm` in edit mode inside the same dot-matrix/`AmbientGlow` background used on `/add`. All the actual editing logic lives in `MediaForm` (see [docs/components.md](components.md)) — this route exists purely to wire it up for editing an existing entry rather than creating one, saving via `updateEntry` and returning to `/media/[id]` on success.

## `/add` — `src/app/add/page.tsx`

Symmetric to the edit page but for creation: `MediaForm` with no `initialData`, saving via `addEntry`, then redirecting to `/collection`.

## `/sagas` — `src/app/sagas/page.tsx`

Two views toggled by `selectedSaga` (`null` = grid, otherwise = timeline for that saga):

- **Grid view**: entries are grouped by resolved franchise name (via `franchiseId` → the `franchises` context array, falling back to the legacy `entry.franchise` string field) into a `Record<string, MediaEntry[]>`, each group sorted by release date. Each saga tile shows its item count, a year range, and total runtime (`getTotalRuntimeMinutes` summed across the group).
- **Timeline view**: `timelineNodes` flattens each saga's entries into individually-orderable nodes — a non-episodic entry becomes one `movie`/`show` node, but an episodic entry with an `episodes[]` array is exploded into **one node per season** (grouped by `season`, sorted by that season's earliest air date, or the entry's `releaseDate` if no episode has an air date) — so a franchise's timeline interleaves movies and individual TV seasons in true chronological order, not grouped by title. The rendered timeline has a "film-strip" visual treatment: a sprocket-perforated center spine (the `.film-spine` CSS class in `globals.css`), a two-beat reveal per node (the dot pops in via a spring transition slightly before the card fades/slides in), and each poster card carries a small rotated "frame edge-code" stamp (`FR·001`, `FR·002`, …) styled after a physical film print's frame numbering.
- The whole page is wrapped in `ReactLenis root={false}` for smooth scroll; the parallax background (`useScroll`/`useTransform` moving three blurred color blobs) is a separate mechanism from Lenis and deliberately left as native scroll-driven motion.

## `/settings` — `src/app/settings/page.tsx` + `src/components/settings/*`

A sidebar-tabbed shell (`SettingsSidebar` + an `AnimatePresence`-wrapped content panel), deliberately **config-only** — Achievements and Journal used to live here but were moved to `/profile` (identity/content, not configuration; see below). Four tabs, each its own manager component:

- **`DataManager` (Data & Cloud)** — sync status banner, Drive size/chunk-count display (via `getBackupMetadataFromDrive`), the **account migration** flow (`handleExport` downloads `{ entries, genres, franchises, journal, exportedAt }` as a JSON file — this is the file a user takes to a different Google account), and the Danger Zone (wipe, behind a hard `window.confirm()` — the one deliberate exception to this app's "no `alert()`/`confirm()`" rule). The raw per-file chunk breakdown and a "Force Restructure Data" button sit behind a collapsed **Advanced** disclosure (`showAdvanced` state) — internal-architecture detail most users never need to see.
- **`JsonImporter`** (rendered inside the Data & Cloud tab) — parses either a raw array of entries or the full `{ entries, genres, franchises, journal }` export shape (both a plain array and `json.title && json.type` single-object shape are accepted for convenience), shows a preview (counts by type) before confirming, then calls `MediaContext.importData` with the merge semantics described in [docs/data-and-sync.md](data-and-sync.md).
- **`AppearanceManager` (Appearance)** — the 8-color accent picker from `APP_COLORS` (`src/lib/colors.ts`); selecting one writes `localStorage['kino_accent_color']` and directly sets the `--primary`/`--primary-hover`/`--accent` CSS custom properties on `document.documentElement` — no context/re-render involved, since it's a pure CSS-variable swap. `Providers.tsx` re-applies the saved color the same way on every fresh page load.
- **`SagasManager` / `GenresManager` (Sagas / Genres Matrix)** — near-identical CRUD lists (add/rename/delete) over `franchises`/`genres` respectively; deleting a tag here does **not** cascade — entries keep a dangling `franchiseId`/`genreId` that simply resolves to nothing (`.find()` returns `undefined`) wherever it's displayed.

All four managers, plus Profile's Achievements/Journal tabs below, share one header component — `src/components/ui/SectionHeader.tsx` (`icon`, `title`, `description`, optional `tone`/`compact`) — so every tabbed panel in the app reads consistently instead of each manager hand-rolling its own header layout.

## `/profile` — `src/app/profile/page.tsx`

A tabbed identity page — **Overview** / **Achievements** / **Journal** — switched via local `activeTab` state and a pill-style tab bar (the same `layoutId`-sliding-pill pattern `AppShell`'s desktop nav uses). Per-field editing still lives on `/media/[id]` and Settings; this page is read-mostly plus the two content surfaces it hosts.

- **Overview** — the original stats view. Its `stats` `useMemo` computes, in one pass over `entries`: per-type counts, total watched minutes (via `getWatchedRuntimeMinutes`, the same canonical function `RecapModal` uses, so Profile and Wrapped never disagree on "hours watched"), a completion-count-tiered badge (`Beginner` → `Explorer` (10+) → `Veteran` (50+) → `Grandmaster` (100+)), and the **personality label** — a permanent "The ___" identity read purely from ratios already computed above (review rate, completion rate, episodic vs. movie share, favorite rate, backlog rate), checked in a fixed priority order (Newcomer first if `total < 3`, then Critic, Finisher, Marathoner, Cinephile, Curator, Collector, defaulting to Voyager). It's recomputed fresh on every render from current data — nothing about "personality" is stored anywhere.
  - **Watch Time Trend** — a separate `monthlyTrend` `useMemo`, anchored to a deferred `nowTs` (set via the `Promise.resolve().then()` pattern, never `Date.now()` during render) rather than `stats` itself. Buckets every entry's `getWatchedRuntimeMinutes` into the calendar month of its `updatedAt`/`createdAt` across the trailing 6 months, rendered as a plain CSS bar chart (no charting library) — hidden entirely if there's no watched time in the window.
  - **Share Persona** — the button next to the personality line encodes `{ p: name, pi: icon, pt: tagline }` (no name/email — deliberately anonymous) the same way `RecapModal.handleShare` does, and copies a `/share?d=<encoded>` link. `/share` branches on `data.p` being present to render a persona-styled card instead of the Wrapped stats-grid card (see below).
- **Achievements** (`src/components/profile/AchievementsManager.tsx`) — a fixed list of badges (`b.push({ id, name, desc, unlocked, icon, color })`), each `unlocked` computed inline from `entries` (counts of completed movies/shows/anime, perfect/high ratings, distinct genres used, favorites, franchise usage, total completions) — purely derived, nothing is persisted about badge state itself. Also hosts the two buttons that launch `/wraps?type=weekly|monthly`.
- **Journal** (`src/components/profile/JournalManager.tsx`) — a composer (date picker defaulting to today + textarea) above a reverse-chronological list of entries (sorted by `date`, then `createdAt` as a tiebreaker for same-day entries), each editable/deletable inline. Talks only to `MediaContext`'s `journal`/`addJournalEntry`/`updateJournalEntry`/`deleteJournalEntry`.

## `/wraps?type=weekly|monthly|yearly` — `src/app/wraps/page.tsx`

A thin wrapper: reads the `type` query param (redirects to `/settings` if it's missing — this route only makes sense arrived-at with a type), and renders `RecapModal` full-screen (`isOpen={true}` always, `onClose` calls `router.back()`). `yearly` is the flagship recap — launched from the top-billed card in Profile → Achievements → Your Wrapped, above the Weekly/Monthly pair — and gets an extra "streak" slide the other two don't. All the actual slide/stat/pause logic lives in `RecapModal` — see [docs/components.md](components.md).

## `/share?d=<base64>` — `src/app/share/page.tsx`

**Public** (listed in `AuthContext`'s `PUBLIC_ROUTES` — must stay reachable while signed out, since the whole point is a link a non-user can open). Decodes the `d` query param (`JSON.parse(decodeURIComponent(atob(d)))`) into a small `ShareData` shape and renders one of two static, non-interactive cards, both ending in a "Build Your Own Tracker" CTA back to `/login`:
- If `data.p` is present, a **persona card** (icon, name, tagline — from Profile's Share button).
- Otherwise, the **Wrapped recap card** (hours, completed count, top genre, top-rated title — from `RecapModal`'s share button).

Malformed/missing `d` renders an explicit "Invalid Share Link" state rather than crashing. Neither payload shape includes the user's name or email — both are deliberately anonymous when shared.

## `/login` — `src/app/login/page.tsx`

Public sign-in page. `useGoogleLogin` (from `@react-oauth/google`) requests the `drive.appdata` scope directly on this page (not a redirect flow); on success calls `AuthContext.login(accessToken, expiresIn)`. The background/card have a mouse-driven parallax effect (`framer-motion`'s `useMotionValue`/`useSpring`/`useTransform` tracking normalized cursor position) purely for visual polish — no functional behavior depends on it.

## `/privacy`, `/terms` — `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`

Public static legal pages (required public specifically for Google OAuth consent-screen verification, since Google's review process checks these links while logged out). Both use a hand-maintained `LAST_UPDATED` string constant rather than `new Date()` — the display text must reflect when the policy text itself last changed, not today's date, and computing it live would additionally violate the React-purity rule against calling `new Date()` during render.
