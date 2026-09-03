# Agent Guide

This project's full technical guide — architecture, route map, data flow, and coding conventions — lives in **[CLAUDE.md](CLAUDE.md)**. Read that first; it is the single source of truth and is kept up to date. This file exists only for tools that look for `AGENTS.md` by convention and restates the handful of rules that matter most.

## Non-negotiable rules

1. **No backend, no database.** This is a client-only Next.js app. The signed-in user's Google Drive `appDataFolder` is the only persistent store (via `src/lib/googleDrive.ts`); there is no IndexedDB, no SQL, no server API routes. Don't introduce one, and don't assume one exists.
2. **React 19 purity.** No `Date.now()`, `Math.random()`, or `new Date()` during render or in a `useState` initializer. No synchronous `setState` inside a `useEffect` body. See `CLAUDE.md` for the deferred-update pattern this codebase uses everywhere.
3. **No broken builds.** Always run `npm run build` and `npm run lint` before calling a task done. `next build` catches issues across every route, including ones you didn't click through manually.
4. **No dead code.** No unused imports/vars, no no-op props/styles, no state that's set but never read. Reuse the shared helpers in `src/lib/db.ts` (episode logic) and `src/lib/colors.ts` (accent/hash colors) instead of reimplementing them inline — this codebase has been swept clean of duplicated logic; keep it that way.
5. **Match the existing aesthetic.** Luxury dark-mode, glassmorphic, deep-dark-tone design system. Don't introduce a different visual language without being asked.

For anything else — route map, data architecture, testing, styling conventions — see `CLAUDE.md`.
