# Kino Developer Guide

## Commands
* Run dev server: `npm run dev`
* Build application: `npm run build`
* Run production server: `npm run start`
* Lint check: `npm run lint`

## Tech Stack
* **Framework**: Next.js 16.2.6 (App Router, Turbopack)
* **Runtime**: React 19.2.4
* **Styling**: Tailwind CSS v4, PostCSS, Custom globals.css
* **Animations**: Framer Motion v12
* **Icons**: Lucide React v1.16
* **Authentication**: Google Identity Services (OAuth2) with React-OAuth-Google v0.13

## Code Style & Conventions
* **React 19 Purity**: Keep components and hooks idempotent. Avoid using global impure methods like `Date.now()`, `Math.random()`, or `new Date()` directly during component render or callback initializers inside components. Wrap them in external helper functions.
* **No State-in-Effect**: Avoid calling state setters (`setState`) synchronously inside `useEffect` bodies to prevent cascading renders. Prefer render-phase derivation, route parameter synchronization, or microtasks (`Promise.resolve().then()`) if async timing is required.
* **Imports**: Always import `isEpisodic` and runtime helpers from `@/lib/db`. Remove unused imports immediately to keep the codebase clean.
* **Aesthetics**: Follow luxury dark-mode design systems using deep dark background tones (`#03050c`), glassmorphic panels, and glowing radial ambient backdrops.
