# 🎬 Kino — Cinematic Watch Tracker

Kino is a premium, minimalist personal media tracker built to catalog and review your favorite Movies, Series, and Anime. With an elegant dark obsidian and electric blue theme, full Google Drive synchronization, and a custom analytics dashboard, Kino delivers a high-end tracking experience while maintaining 100% data privacy.

---

## ✨ Features

- **📺 Comprehensive Media Cataloging**: Track Movies, Series, and Anime in one unified system.
- **🏷️ Watch Statuses**: Categorize entries as *Watching*, *Plan to Watch*, or *Completed*.
- **⚡ Advanced Watch Progress Tracker**:
  - Detailed episode progress (e.g. `12 / 12` episodes watched) for Series and Anime.
  - Interactive increment (`+`) and decrement (`-`) buttons and a visual progress bar inside the detail view modal.
  - Automatic completion status transition and edit mode redirection when watch progress reaches 100% of episodes.
- **🚀 Dashboard Quick Actions**:
  - One-click `+1` episode increment hover overlay badge on Media Cards for active watch entries.
  - Direct favorite toggle button overlays on Media Cards.
- **📊 Interactive Analytics Dashboard**:
  - **Summary Stats**: Tracks overall watched titles, currently active watchlist items, total episodes watched, and average rating across all media.
  - **Ratings Distribution Chart**: A custom CSS-only vertical bar chart displaying the frequency of scores from 1 to 10 with hover tooltips and entrance stagger animations.
  - **Type Breakdown**: Ratio meters displaying the proportion of Movies, Series, and Anime in your library.
  - **Watchlist Statuses**: Detailed status distribution breakdowns.
  - **Genre Cloud**: Custom tag cloud indicating your most watched genres.
- **💖 Favorites Showcase**: Pin entries to a dedicated showcase shelf with full click callback bindings.
- **🌐 Metadata Suggestion Engine**: Auto-populates cover images, episode counts, and genre tags using the Gemini LLM with Google Search grounding, complete with a multi-model fallback and image validator.
- **☁️ Private Cloud Sync**: Seamlessly syncs your watchlist to your Google Drive (`drive.appdata` folder) using secure OAuth consent. No central database, no tracking, complete privacy.

---

## 🛠️ Technical Stack

- **Core Framework**: [Next.js 15](https://nextjs.org/) (App Router) & [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with a custom cinematic obsidian & cyber-blue theme
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for fluid transitions and micro-interactions
- **Icons**: [Lucide React](https://lucide.dev/)
- **Authentication & Cloud Sync**: Google Sign-In with private application metadata storage permissions

---

## 🚀 Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm, yarn, or pnpm

### Installation

1. Clone the repository and navigate to the directory:
   ```bash
   git clone https://github.com/your-username/kino.git
   cd kino
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your Google OAuth client:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new project.
   - Set up your OAuth consent screen (internal/external).
   - Create Credentials → **OAuth Client ID** (Web Application).
   - Set Authorized JavaScript Origins to: `http://localhost:3000`.
   - Set Authorized Redirect URIs to: `http://localhost:3000`.

4. Create a `.env.local` file in the root directory and add your Client ID:
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Privacy & Data Design

Your data belongs solely to you. Kino connects directly to the Google Drive API on the client side:
- Auth credentials and session tokens are stored securely in memory and local storage.
- All syncing happens directly between your browser and your private Google Drive AppData folder (`drive.appdata`).
- Third-party applications (and the Kino frontend developers) cannot read or write to your broader Google Drive files, only to files created by the application itself.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
