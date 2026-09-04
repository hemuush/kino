# Data & Sync — deep dive

This is the exhaustive reference for Kino's "no backend" data layer: `src/lib/db.ts` (types + pure logic), `src/lib/googleDrive.ts` (the actual Drive REST sync), `src/context/MediaContext.tsx` (the React state machine that ties them together), and `src/context/AuthContext.tsx` (the OAuth token/session lifecycle everything else depends on). Read [CLAUDE.md](../CLAUDE.md) first for the one-paragraph version; this file is the "each logic" detail behind it.

## `src/lib/db.ts` — types and pure helpers

No I/O happens in this file. Everything is a pure function of its arguments, which is what makes it safe to unit test (`src/lib/db.test.ts`) and safe to call from render.

### Types

- **`MediaType`** = `'Movie' | 'TV Show' | 'Anime'`, **`WatchStatus`** = `'Completed' | 'Watching' | 'Plan to Watch'`, **`AnimeType`** = `'Show' | 'Movie'`.
- **`Tag`** — `{ id, name, coverImage?, color? }`. Used identically for both genres and franchises/sagas (two separate arrays of the same shape, never mixed).
- **`EpisodeInfo`** — `{ name, airDate?, season?, number?, runtime?, watched? }`. `season`/`number` default to `1` wherever they're read (never assume they're set).
- **`MediaEntry`** — the core record. Notable fields:
  - `id?: number | string` — `Date.now()` for new entries (see `MediaContext.addEntry`), but can be a string when imported from external JSON.
  - `genreIds?: string[]` / `franchiseId?: string` — the current, normalized way to reference tags. `genre?: string[]` / `franchise?: string` are the **legacy** shape produced by older exports/imports; `MediaContext.importData` maps these to IDs on the way in and deletes the legacy fields (see below).
  - `episodes?: EpisodeInfo[]` — only present once a user has touched per-episode tracking; before that, progress is tracked purely via `episodesWatched`/`episodesTotal` (see `materializeEpisodes` below for how the two representations are reconciled).
  - `runtime?: number` — for a movie, the total runtime. For anything episodic, this is the **per-episode** runtime (the field is dual-purpose; `MediaForm` labels it "Avg Time / Ep" when episodic).
  - `rewatchCount?: number` / `rewatchDates?: number[]` — logged via the "Log Rewatch" action on `Completed` entries (`MediaDetailModal` and `/media/[id]`), never editable by hand. `rewatchDates` is append-only, oldest first.
- **`JournalEntry`** — `{ id, date, text, createdAt, updatedAt? }`. `date` is a `YYYY-MM-DD` string picked by the user (the day the entry is *about*, not necessarily the day it was written). Lives entirely separate from `MediaEntry.review` — the Journal is freeform/date-stamped notes, not tied to any one title.

### `isEpisodic(entry)`
`true` for a `TV Show`, or an `Anime` whose `animeType === 'Show'`. Every place in the app that branches on "does this have episodes" calls this — never re-derive it from `type`/`animeType` inline.

### Episode helpers
- **`sortEpisodes(episodes)`** — stable sort by `(season ?? 1, number ?? 1)`. Returns a new array.
- **`getSeasonNumbers(episodes)`** — the distinct sorted season numbers present, via a `Set`.
- **`materializeEpisodes(entry)`** — the key reconciliation function. If `entry.episodes` has any items, returns a copy of it. Otherwise, if the entry only has scalar `episodesTotal`/`episodesWatched` (the "legacy"/simple tracking mode), it **synthesizes** a placeholder `EpisodeInfo[]` of length `episodesTotal`, named `Episode 1..N`, marking the first `episodesWatched` as `watched: true`. This is what lets `/media/[id]`, `MediaDetailModal`, and Sagas' timeline all render a per-episode list even for entries that were only ever tracked by two numbers.

### Rewatch tracking
**`incrementRewatch(entry, timestamp)`** — the one pure helper both "Log Rewatch" call sites (`MediaDetailModal`, `/media/[id]`) go through: returns `{ rewatchCount: (entry.rewatchCount ?? 0) + 1, rewatchDates: [...(entry.rewatchDates ?? []), timestamp] }` without mutating its input. The caller supplies `timestamp` (from an event handler, e.g. `Date.now()`) rather than the helper calling it itself, keeping the helper pure and testable — see the `db.test.ts` cases for it, including a property test asserting it never mutates the entry it's given.

### Runtime calculation
Both of these treat "how long is a single episode" the same way: if `entry.episodes` has any items with a known `runtime`, average those known runtimes; otherwise fall back to the scalar `entry.runtime` field.

- **`getWatchedRuntimeMinutes(entry)`** — minutes actually watched so far.
  - Non-episodic: `entry.runtime` if `status === 'Completed'` or `status` is unset, else `0` (an unwatched movie contributes 0).
  - Episodic with an `episodes[]` array: sums `runtime` (or the computed average, for episodes with no explicit runtime) across every episode where `watched` is true or the whole entry `status === 'Completed'`; if the show is `Completed` and `episodesTotal` exceeds the tracked episode count, pads the difference at the average runtime.
  - Episodic without an `episodes[]` array (legacy scalar tracking): `episodesWatched (or episodesTotal if Completed) × runtime`.
  - This is the single function every "watch time" stat in the app calls — Dashboard's Watch Tonight duration filter (via a local `getSessionRuntimeMinutes` helper in `page.tsx` that mirrors this per-episode logic), Profile's stat pills, and `RecapModal`'s Wrapped slides all go through this, so a change here changes watch-time everywhere at once.
- **`getTotalRuntimeMinutes(entry)`** — the same math but for the *entire* runtime (watched or not) — used for Sagas' "total series" duration and `/media/[id]`'s runtime display.
- **`formatRuntime(minutes)`** — `"2h 14m"` / `"45m"` / `"2h"` / `""` for falsy input. Never format runtime by hand — always through this.

### Normalization
- **`normalizeMediaType(type)`** / **`normalizeWatchStatus(status)`** — case-insensitive, whitespace-trimmed string matching with a safe default (`'Movie'` / `'Plan to Watch'`) for anything unrecognized (aliases like `"series"`/`"tv"` → `TV Show`, `"finished"`/`"done"` → `Completed`). Called on every entry coming from Drive, from a JSON import, or from bulk import — this is what makes the app tolerant of hand-written or older-format JSON.
- **`safeDateFormat(dateStr, options?)`** — returns `null` (never throws, never renders "Invalid Date") for empty/`"unknown"`/`"tbd"`/`"n/a"`/`"null"` strings or genuinely unparseable dates. For a strict `YYYY-MM-DD` string it appends `T12:00:00` before parsing specifically to dodge a Safari/WebKit crash on bare-date strings. Use this instead of calling `new Date(x).toLocaleDateString()` directly on any user-entered or imported date string.
- **`DEFAULT_GENRES`** — the seed genre list (`Action`, `Adventure`, …) used to populate a brand-new account's genre list when Drive has no existing backup.

## `src/lib/googleDrive.ts` — the actual sync

There is no server here — every function in this file is a `fetch()` straight to `https://www.googleapis.com/drive/v3/...` using the `appDataFolder` space, authenticated with the OAuth access token `MediaContext`/`AuthContext` hand it. `appDataFolder` is a special, hidden Drive space scoped to this one OAuth client — the user's other Drive files are never touched (the app never even requests that scope).

### File layout
- `kino-index.json` — one file: `{ genres, franchises, journal, timestamp, chunkCount, totalEntries }`. This is the *first* thing downloaded and gives everything downstream (chunk count, tag lists) needed to fetch the rest.
- `kino-chunk-N.json` (`N = 0, 1, 2, …`) — up to 50 `MediaEntry` objects each, **with `coverImage` stripped out**.
- `kino-images-N.json` — a `{ [entryId]: base64DataUri }` map for the same 50 entries as chunk `N`. Kept as a *separate* file so that editing a title's metadata (rating, status, review) never has to re-upload the megabytes of base64 image data for the other 49 entries in that chunk.
- `kino-backup.json` — the **legacy** single-file format from before chunking existed. Only ever read (for one-time migration), never written; deleted once a chunked upload succeeds.

Chunk size is `CHUNK_SIZE = 50`, chosen specifically to stay well under Drive's per-file upload limits once ~50 base64-encoded poster images are included.

### Upload (`uploadBackupToDrive`)

**Empty-state safety guards — do not remove or weaken these.** A real incident showed the failure mode directly: `listAllKinoFiles`'s Drive query can occasionally come back empty on a transient glitch (not an error, just zero results), which `MediaContext`'s initial load then can't distinguish from "genuinely new account." If *any* mutation fires an upload while local state is empty for that reason, the cleanup pass below (step 4) sees `chunks.length === 0` and deletes **every** existing chunk file — permanently, since Drive's `files.delete` bypasses trash entirely. Two things now stand between a transient glitch and that outcome:
- `listAllKinoFiles` retries once (~700ms) before returning an empty result, closing most of the gap at the source.
- `uploadBackupToDrive` takes `{ trustEmptyEntries?, trustEmptyState? }` and, before doing anything else, checks Drive's *own current listing* (fetched fresh in this same call) against what it's about to write: if the incoming `entries` is empty while Drive still shows chunk files, and the caller hasn't set `trustEmptyEntries`, it throws instead of proceeding — same idea, softer, for `genres`/`franchises` against the index file via `trustEmptyState`. `MediaContext` only sets these flags once it has itself observed real (non-empty) data this session (`hasSeenRealEntriesRef` / `hasSeenRealDataRef`, updated inside `updateStateAndRef`) — critically, `hasSeenRealEntriesRef` must only flip on real entries, never on the default-genre seed a fresh load applies regardless, or the guard would trust exactly the scenario it exists to catch. A legitimate "deleted my last entry" still uploads fine, because that session did observe real entries at some point before deleting them.

If you ever see `MediaContext`'s sync-status pill show an error together with a "Sync paused to protect your data" toast, this is that guard doing its job — the fix is to refresh (let the load resolve properly), not to silence the guard.

1. Partition `entries` into chunks of 50, splitting each entry's `coverImage` out into a parallel `imageChunks` map (keyed by entry id) before serializing the rest of the entry as `kino-chunk-N.json`.
2. For each chunk (and its matching image chunk), hash the serialized JSON with `cyrb53` (a fast 53-bit non-cryptographic string hash — see the function in this file) and compare against `chunkHashes[chunkName]`, an in-memory cache. **Unchanged chunks are skipped entirely** — this is the delta-sync mechanism that makes a single rating edit cost a few KB instead of the whole library.
3. Upload (or PATCH, if the file already exists on Drive) any chunk whose hash changed, via `uploadMultipart` — a hand-rolled multipart/related request body (Drive's upload API doesn't accept plain JSON bodies for combined metadata+content in one call without this).
4. Build and upload `kino-index.json` (genres, franchises, journal, timestamp, chunk count) — same hash-skip logic.
5. **Cleanup pass**: delete any `kino-chunk-N.json`/`kino-images-N.json` on Drive whose index `N` is now beyond the current chunk count (the library shrank), and delete the legacy `kino-backup.json` if it's still there.

`chunkHashes` is a **module-level, in-memory** cache — it resets on page reload (so the first upload after a fresh load always re-sends everything once, then goes delta from there) and is explicitly cleared by `clearDriveCache()` on logout/wipe.

### Download (`downloadBackupFromDrive`)
Takes two optional callbacks — `onChunkLoaded(entries, isFirst)` and `onImagesLoaded(images)` — so the caller (`MediaContext`) can render the first chunk of entries the instant it arrives rather than waiting for the whole library, then hydrate cover images in as they stream in afterward. Sequence:
1. List all `kino-*` files in `appDataFolder`.
2. If there's a `kino-backup.json` and **no** `kino-index.json`, this is a pre-chunking account — parse the legacy file directly and return it (one-time migration path; the very next upload will rewrite it into the chunked format).
3. Otherwise read `kino-index.json` to learn `chunkCount`, then loop `i = 0..chunkCount-1`: fetch `kino-chunk-i.json` **sequentially** (so the UI can render chunk 0 immediately without waiting on chunk 5), firing `onChunkLoaded` per chunk; fetch each `kino-images-i.json` **concurrently** (`Promise.all`'d at the end) since images aren't needed to render the list, only to paint posters.
4. Populates `chunkHashes` for every file read, so an *upload* triggered right after a download won't immediately re-upload everything it just downloaded unchanged.

### Other exports
- **`getBackupMetadataFromDrive`** — lists Drive files and their sizes/`modifiedTime` without downloading content; powers Settings → Data & Cloud's "Drive Size & Chunks" panel and the polling used for cross-device sync detection (see below).
- **`deleteBackupFromDrive`** — deletes every `kino-*` file, sequentially (to avoid Drive rate limits), then clears the hash cache. Used by "Wipe All Data".
- **`TokenExpiredError`** — thrown by any Drive call that gets a `401`; every caller in `MediaContext`/`AuthContext` catches this specifically and triggers a silent re-auth or forced logout rather than surfacing a generic error.

## `src/context/MediaContext.tsx` — the state machine

`MediaProvider` holds four pieces of state — `entries`, `genres`, `franchises`, `journal` — plus `isLoading`, `syncStatus` (`'idle' | 'syncing' | 'synced' | 'error'`), and `lastSyncedAt`. None of it touches `localStorage` or IndexedDB; it is pure React state, rehydrated from Drive on every mount.

### The write path — `updateStateAndRef`
Every mutation goes through one function: `updateStateAndRef(newEntries?, newGenres?, newFranchises?, newJournal?)`. Any argument left `undefined` is left untouched. It does two things for each provided argument: calls the matching `setState`, and writes the same value into `latestDataRef.current` — a `useRef` mirror of the state. The ref exists because `triggerUpload` (below) is debounced and needs to read the *latest* data at upload time, not whatever was captured in a stale closure from when the debounce timer was set.

### The upload path — `triggerUpload(silent?)`
Called at the end of every mutating action (`addEntry`, `updateEntry`, `deleteEntry`, `addJournalEntry`, `importData`, `saveGenres`/`saveFranchises` pass `silent = true`). Behavior:
1. Immediately sets `syncStatus = 'syncing'`.
2. Clears any pending upload timer and starts a new 800ms `setTimeout` — so rapid-fire edits (e.g. dragging a rating slider, or toggling several episodes quickly) coalesce into a single upload instead of one per keystroke.
3. When the timer fires, reads `latestDataRef.current` (not React state directly) and calls `uploadBackupToDrive`.
4. On success: `syncStatus = 'synced'`, `lastSyncedAt = Date.now()`. On a `TokenExpiredError`/401: calls `logout(false)` (soft logout — see AuthContext below). On any other error: `syncStatus = 'error'`, logged to console, **not surfaced as a toast** — the header's sync-status pill is the only UI feedback for a background sync failure (data is never lost; it just hasn't reached Drive yet, and the next successful sync will catch it up).

### Initial load
On mount, once `accessToken` is available (and only once — guarded by `hasFetchedFromDriveRef`), `downloadBackupFromDrive` is called with the two streaming callbacks described above, so the Dashboard/Collection grids can paint as soon as the first 50 entries land rather than blocking on the whole library. If Drive has no backup at all (brand-new account), `DEFAULT_GENRES` seeds the genre list instead of leaving it empty.

### Cross-device sync
A `visibilitychange` listener (only attached once `lastSyncedAt` exists) checks, whenever the tab regains focus, whether Drive's `modifiedTime` (via the cheap `getBackupMetadataFromDrive` metadata call, not a full download) is more than 30 seconds newer than this tab's `lastSyncedAt`. If so, it downloads and replaces local state wholesale, with a toast ("Library updated from another device"). The 30-second slop guards against a tab's *own* just-completed upload being misread as a foreign change.

### Mutations
- **`addEntry`/`updateEntry`/`deleteEntry`** — straightforward array replace/filter/map against `latestDataRef.current.entries`, then `triggerUpload()`.
- **`addJournalEntry(date, text)`/`updateJournalEntry(id, updates)`/`deleteJournalEntry(id)`** — same pattern against `latestDataRef.current.journal`. New entries get `id: crypto.randomUUID()`.
- **`saveGenres`/`saveFranchises`** — call `triggerUpload(true)` (silent — no distinct behavior difference today, but reserved for future "don't nag about a tag rename" UX).
- **`batchUpdateEntries(updatedEntries)`** — merges a list of partial-entry replacements into the full array by matching `id`, for bulk operations (e.g. re-syncing a chunk of imported data).
- **`importData({ entries?, genres?, franchises?, journal? })`** — the merge engine behind both the Settings → Data & Cloud "Import Manual Backup" flow (via `JsonImporter`) and the account-migration round-trip:
  - Genres/franchises: for each imported tag, look for an existing one by `id` **or** case-insensitive name match; only push a new one if neither matches.
  - Entries: legacy `genre: string[]`/`franchise: string` fields are resolved to `genreIds`/`franchiseId` (creating new genre/franchise Tags on the fly if the name doesn't exist yet) and then deleted from the entry. Matching an existing entry to update happens first by `id`, then by case-insensitive title. Existing entries are merged (`{...existing, ...imported}`) rather than replaced outright, preserving `createdAt`.
  - Journal: matched purely by `id`; unmatched entries are appended (own IDs preserved or freshly generated).
  - Exactly one `triggerUpload()` (non-silent) fires at the end, plus a summary toast.
- **`wipeAllData`** — calls `deleteBackupFromDrive`, then resets all four state arrays (genres reseeded to `DEFAULT_GENRES`) directly via `setState` (not `updateStateAndRef`, since there's nothing left to debounce-upload).

## `src/context/AuthContext.tsx` — the OAuth lifecycle

Google's access tokens are short-lived (1 hour); this file's whole job is making that invisible to the user across a 30-day "logged in" window.

### Storage keys (all `localStorage`)
- `kino_access_token` / `kino_token_expiry` — the live OAuth token and its absolute expiry timestamp (ms).
- `kino_session_expiry` — a separate, much longer-lived (30-day) timestamp. This is what actually gates "is this user considered logged in," independent of whether the 1-hour token itself is still fresh.
- `kino_user_profile` — a cached `{ name, email, picture }` so the UI can show *something* identity-shaped instantly on reload, before the token is even validated.

### On mount
Reads all four keys. If `sessionExpiry` is still valid, the cached profile is restored to state immediately (so the header/avatar don't flash empty). Then, depending on the *token's* expiry: if it's still fresh, validates it with a real `fetchUserProfile` call and schedules the next proactive refresh; if it's expired (but the session is still valid), immediately kicks off a **silent** refresh via Google's `initTokenClient({ prompt: '' })` — this re-requests a token without showing the user any prompt, because they already consented within the last 30 days. If the *session* itself is expired (>30 days), every key is wiped and the user lands on `/login` for real.

### Proactive refresh — `scheduleTokenRefresh(expiresInMs)`
A single `setTimeout`, always fired `TOKEN_REFRESH_MARGIN_MS` (5 minutes) before the token's actual expiry, that silently requests a new token via the same `prompt: ''` token-client flow and re-schedules itself. This is why a user can leave a tab open for hours without ever seeing a re-auth prompt.

### `PUBLIC_ROUTES`
`['/login', '/privacy', '/terms', '/share']` — the redirect effect only forces an unauthenticated visitor to `/login` if the current path isn't in this list. **Any new route meant to work while signed out must be added here**, or the redirect effect will bounce visitors before they ever see it (this exact bug — `/share` and the legal pages being unreachable while signed out — was a real regression fixed earlier in this project's history; don't reintroduce it).

### `logout(forceWipe = true)`
Two distinct modes, both used deliberately:
- `logout(true)` (the default, and what the header's logout button calls) — clears every auth key **and** the legacy `kino_entries`/`kino_genres`/`kino_franchises`/`kino_timestamp` localStorage keys (pre-Drive-sync leftovers, if any), clears the Drive hash cache, and hard-navigates to `/login` via `window.location.href` (not the router) to guarantee a fully clean reload.
- `logout(false)` — a **soft** logout, called internally whenever a `TokenExpiredError`/401 surfaces from a Drive call mid-session. Clears only the auth keys and routes to `/login` via the Next.js router, leaving in-memory data alone — the assumption is the user will immediately re-auth, not that their session is actually over.
