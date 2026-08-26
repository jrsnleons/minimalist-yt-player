# Minimalist YT Player 🎵

> A distraction-free, local-first music streaming player built with **Next.js 16 (App Router)**, **Tailwind CSS**, and **Dexie.js (IndexedDB)**. Pure dark noir aesthetic, zero algorithmic bloat, zero tracking, and complete data sovereignty.

---

## ✨ Features

### 🛡️ Data Safety & Full Library Ownership
- **1-Click Full Library Backup (.json)**: Export all your playlists, saved tracks, listening history, and preferences to a portable `.json` backup file.
- **Single Playlist JSON Export**: Share or archive individual playlists with all associated track metadata directly from playlist cards or header actions.
- **Smart Dual-Mode Restore**:
  - **Merge Mode (Safe / Non-destructive)**: Combines imported items into your existing library without overwriting or duplicate collisions.
  - **Full Replace Mode**: Cleanly wipes and resets the local database to the backup archive state.

### 🟢 Zero-Login Spotify & YouTube Importer
- **Spotify Playlist & Album Importer**: Paste any public Spotify link (`https://open.spotify.com/playlist/...`, `.../album/...`, `spotify:playlist:...`) without requiring user login or Spotify developer API credentials.
- **Smart YouTube Match Engine**: Batch resolves Spotify track titles and artists to the highest-fidelity playable YouTube audio streams via Innertube.
- **Live Matching Progress**: Real-time progress bar showing track resolution state with 1-click **"Match & Save to Library"** and **"Match & Play"** actions.
- **Public YouTube Playlist Importer**: Fetch and convert any public YouTube playlist with one click.

### 🎨 Dynamic Generative Album Art
- **Procedural Geometric Artwork**: When a track has no artwork or an external thumbnail fails to load (404/network error), the player procedurally generates a unique, minimalist dark noir cover.
- **Deterministic Palettes**: Computes a deterministic hash from `(title + artist + id)` mapped across 10 hand-crafted noir gradient palettes and 5 Bauhaus geometric SVG overlays (Vinyl Grooves, Acoustic Waves, Spectrum Bars, Bauhaus Mesh, and Orbital Nodes).
- **Monospace Monograms**: Clean 2-letter uppercase initials (`TL`, `BE`, `RH`).
- **Dynamic Ambient Hero Glow**: Generates matching procedural ambient lighting behind the main Player Hero banner.

### 🎬 Universal YouTube Search (3-Tier Structure)
- **Songs (YouTube Music)**: Clean singles with strict music duration filtering.
- **Playlists**: Curated public playlists from YouTube & YouTube Music.
- **YouTube Videos (Full Library & Live)**: Search live concerts, full DJ sets, talks, podcasts, unreleased covers, and animations with extended duration support.
- **Filter Selector**: Segmented `All` · `Songs` · `Videos` · `Playlists` selector.

### 🎛️ Dual Playback Engine & Video PiP
- **Direct Audio Stream**: Fast, ad-free direct audio streaming via Innertube audio formats.
- **Iframe Fallback Engine**: Seamless fallback if streams are geo-restricted.
- **Floating Video PiP Window**: Toggle floating video picture-in-picture anytime by pressing <kbd>V</kbd>.
- **Lock-Pitch Playback Rate**: Speed adjustments (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`) with preserved audio pitch.

### ⚡ Command Palette & Keyboard Control
- Press <kbd>⌘</kbd><kbd>K</kbd> (or <kbd>Ctrl</kbd><kbd>K</kbd>) to instantly search local tracks, YouTube catalog, and trigger all player controls.
- Full keyboard hotkey support for power users.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>⌘</kbd> + <kbd>K</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | Open Command Palette |
| <kbd>Space</kbd> | Play / Pause |
| <kbd>J</kbd> / <kbd>←</kbd> | Seek Backward 5s |
| <kbd>L</kbd> / <kbd>→</kbd> | Seek Forward 5s |
| <kbd>K</kbd> | Play / Pause |
| <kbd>Shift</kbd> + <kbd>N</kbd> | Next Track |
| <kbd>Shift</kbd> + <kbd>P</kbd> | Previous Track |
| <kbd>S</kbd> | Toggle Shuffle Mode |
| <kbd>R</kbd> | Cycle Repeat Mode (Off / One / All) |
| <kbd>M</kbd> | Toggle Mute |
| <kbd>V</kbd> | Toggle Floating Video PiP Window |
| <kbd>[</kbd> | Toggle Left Sidebar (Playlists & History) |
| <kbd>]</kbd> | Toggle Right Sidebar (Up Next Queue & Radio) |
| <kbd>?</kbd> | Open Keyboard Shortcuts Help |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer-motion.dev/)
- **Client Storage**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/)
- **YouTube Engine**: [YouTube.js / Innertube](https://github.com/LuanRT/YouTube.js)
- **Spotify Extraction**: [spotify-url-info](https://github.com/microlinkhq/spotify-url-info)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- pnpm (recommended), npm, or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jrsnleons/minimalist-yt-player.git
   cd minimalist-yt-player
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables (Optional):**
   ```bash
   cp .env.local.example .env.local
   ```
   *(The app works 100% out of the box without any API keys!)*

4. **Start the development server:**
   ```bash
   pnpm dev
   ```

5. Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🏗️ Project Architecture

```
minimalist-yt-player/
├── app/
│   ├── api/
│   │   ├── playlist/route.ts       # YouTube playlist resolver
│   │   ├── radio/route.ts          # Radio & vibe suggestions
│   │   ├── search/route.ts         # Multi-tier search (Songs, Videos, Playlists)
│   │   ├── spotify/
│   │   │   ├── resolve/route.ts    # Batch Spotify-to-YouTube resolution
│   │   │   └── route.ts            # Zero-login Spotify metadata extractor
│   │   └── stream/route.ts         # Direct audio stream provider
│   ├── globals.css                 # Noir dark theme styling
│   ├── layout.tsx                  # Root layout & font configurations
│   └── page.tsx                    # Main interface & locked grid tabs
├── components/
│   ├── command-palette/            # ⌘K command bar
│   ├── context-menu/               # Right-click track context menus
│   ├── layout/                     # TopNav, MiniPlayer, Sidebars
│   ├── player/                     # PlayerHero, Scrubber, Transport, PiP
│   ├── playlist/                   # TrackRow, CenterStageQueue, Modals
│   ├── settings/                   # Data safety backup & restore settings
│   ├── ui/                         # TrackArtwork, Modal, Toast, Tooltip
│   └── views/                      # PlaylistsView, SearchView, VibeView, HistoryView
├── db/
│   └── schema.ts                   # Dexie.js IndexedDB schema & migrations
├── hooks/                          # Audio engine, Hotkeys, MediaSession hooks
├── lib/
│   ├── backup.ts                   # JSON backup & restore utilities
│   ├── spotify.ts                  # Spotify parsing & scraping engine
│   ├── utils.ts                    # Time formatting, color hashing, helpers
│   └── youtube.ts                  # Innertube client & search logic
├── store/
│   └── usePlayerStore.ts           # Unified Zustand player & queue state
└── types/
    └── index.ts                    # Complete TypeScript definitions
```

---

## 🔒 Privacy & Local-First Guarantee

- **No Remote User Database**: Your listening history, playlists, and settings remain stored strictly in your browser's IndexedDB.
- **No Analytics or Trackers**: Zero third-party telemetry scripts.
- **Export Anytime**: Your library is stored in standard JSON so you can export, back up, or transfer it at will.

---

## 📄 License

MIT License. Free for personal and educational use.
