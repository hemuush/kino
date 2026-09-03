# 🎬 Kino — Cinematic Watch Tracker

**Live:** [https://xkinox.vercel.app](https://xkinox.vercel.app)

Kino is a premium, minimalist personal media tracker for cataloging and reviewing your Movies, TV Shows, and Anime. It's a serverless PWA with a luxury dark-mode interface — there's no backend and no company database; your library lives entirely in your own Google Drive.

---

## ✨ Features

- **📺 Unified cataloging** for Movies, TV Shows, and Anime, with per-episode progress tracking (season/episode grid, air dates, individual runtimes) for anything episodic.
- **☁️ Google Drive-backed sync, not a company database.** Your library, genres, and sagas sync directly to a private `appDataFolder` in *your* Google Drive via OAuth (`drive.appdata` scope) — Kino's developers cannot read it, and it isn't visible in your regular Drive file list.
- **⚡ Chunked delta sync.** The library is split into 50-item chunks (with cover images stored separately from metadata), each hashed before upload — so a single rating change re-uploads a few KB, not your whole collection.
- **📱 Installable PWA** with offline shell caching, standalone full-screen mode, and mobile-optimized touch navigation.
- **🔀 Cmd+K command palette** in the Collection view, plus infinite-scroll (no "Load More" buttons).
- **🌌 Sagas** — group related titles (a franchise, a shared universe) into a chronological visual timeline, seasons and movies interleaved by release/air date.
- **🏆 Achievements** — unlockable badges based on your watch history, and a **Wrapped**-style animated weekly/monthly recap you can share via a public link.
- **🎨 8 accent color themes**, light/dark mode.
- **📤 Export & account migration** — download your full library (including images) as a single JSON file to move it to a different Google account, or as a manual backup.
- **🔒 Private by design.** OAuth is scoped to the app's own Drive folder only; no analytics, no tracking, no server-side copy of your data.

---

## 🛠️ Technical Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (CSS-first `@theme` config), `next/font/google`
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Auth**: Google Identity Services OAuth2 (`@react-oauth/google`)
- **Storage**: No database — chunked JSON sync directly to Google Drive `appDataFolder` (see `CLAUDE.md` for the architecture)
- **PWA**: Web App Manifest + a network-first Service Worker

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Setup

1. Clone and install:
   ```bash
   git clone https://github.com/hemuush/kino.git
   cd kino
   npm install
   ```

2. Create a Google OAuth client:
   - [Google Cloud Console](https://console.cloud.google.com/) → new project → OAuth consent screen → Credentials → **OAuth Client ID** (Web application)
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000`

3. Create `.env.local` in the project root:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

4. Run it:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

### Other commands
```bash
npm run build   # production build (also type-checks every route)
npm run start   # run a production build locally
npm run lint    # eslint
npx vitest run  # unit + property tests for src/lib/db.ts
```

---

## 🔒 Privacy & Data Design

- Your library, genres, and sagas are stored **only** in your Google Drive's `appDataFolder` — a sandboxed folder that only this app can see, invisible in your normal Drive file browser.
- Kino requests the narrowest possible OAuth scope (`drive.appdata`) — it cannot read or write any other file in your Drive.
- Your session (profile info, a 30-day login) is kept in your browser's `localStorage` so you don't have to sign in every visit; your media library itself is **not** cached to disk — it lives in memory and is re-fetched from Drive on load.
- There is no company server or database in this project's architecture — nothing to breach, because there's nothing centrally stored.

---

## 📄 License

No license file is currently published for this repository — all rights reserved by default. Contact the repository owner if you want to use this code.
