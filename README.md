# Onyx

> A distraction-free, local-first music streaming player built with **Next.js 16 (App Router, Turbopack, React 19)**, **Tailwind CSS**, and **Dexie.js (IndexedDB)**. Dark theme, artwork-based accent colors, auto crossfade, and no tracking. Data stays in the browser.

---

## ✨ Features

### 🎛️ Intelligent Audio Engine & Seamless Crossfade
- **Smooth Auto Crossfade**: Dynamic equal-power Web Audio (`GainNode`) crossfading between songs (0s to 12s configurable).
- **Dual Playback Engine**: Ultra-fast direct streaming via Innertube audio formats with automatic YouTube iframe fallback.
- **In-Place 1:1 to 16:9 Video Morphing**: Press <kbd>V</kbd> to seamlessly transition album art directly into the live 16:9 widescreen YouTube video with butter-smooth crossfade and 60fps tracking.
- **Lock-Pitch Playback Rate**: Speed adjustments (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`) with preserved audio pitch.

### 🎨 Real-Time Dynamic Artwork Color Theming
- **Canvas Dominant Color Extraction**: Client-side background palette extraction directly from album art and video thumbnails.
- **Ambient Internal Color Wash**: Cards and song rows subtly illuminate from the inside with dominant colors without fuzzy outer drop-shadows.
- **Generative Bauhaus Monograms**: Procedurally generates deterministic geometric art when thumbnails are absent or fail to load.

### ❤️ Liked Songs & Curated Library
- **1-Click Heart Favoriting**: Favorite any track instantly from song rows, Player Hero, or Zen Mode.
- **Dedicated Pinned Collection**: Liked Songs are organized as a prioritized playlist with custom rose styling and instant search.

### 🟢 Zero-Login Spotify & YouTube Importer
- **Spotify Playlist & Album Importer**: Paste any public Spotify link (`https://open.spotify.com/playlist/...`, `.../album/...`) to automatically resolve and stream tracks on YouTube.
- **YouTube Playlist Importer**: Fetch and convert any public YouTube playlist in 1 click.

### 🛡️ Data Safety & Full Library Ownership
- **1-Click Full Library Backup (.json)**: Export all playlists, saved tracks, listening history, and preferences to a portable `.json` file.
- **Dual-Mode Restore**: Merge non-destructively or perform a full replace.

### ⚡ Power User Experience & Zen Focus Mode
- **1-Click Direct Play**: Single-clicking any row immediately starts audio playback.
- **Command Palette (<kbd>⌘</kbd><kbd>K</kbd>)**: Quick search and keyboard control across all views.
- **Onyx Zen Mode (<kbd>Z</kbd>)**: Fullscreen distraction-free player with ambient visualizer waves.
- **PWA Ready**: Installable as a standalone app on macOS, Windows, iOS, and Android.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>⌘</kbd> + <kbd>K</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | Open Command Palette |
| <kbd>Space</kbd> / <kbd>K</kbd> | Play / Pause |
| <kbd>J</kbd> / <kbd>L</kbd> | Seek Back / Forward 10s |
| <kbd>←</kbd> / <kbd>→</kbd> | Seek Back / Forward 5s |
| <kbd>N</kbd> | Next Track |
| <kbd>P</kbd> | Previous Track |
| <kbd>S</kbd> | Toggle Shuffle |
| <kbd>R</kbd> | Cycle Repeat (Off / All / One) |
| <kbd>M</kbd> | Toggle Mute |
| <kbd>V</kbd> | Toggle Video on Artwork |
| <kbd>Z</kbd> / <kbd>F</kbd> | Toggle Focus Mode |
| <kbd>Q</kbd> | Toggle Now Playing Panel |
| <kbd>?</kbd> | Open Keyboard Shortcuts |
| <kbd>Esc</kbd> | Close Overlay or Exit Focus Mode |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer-motion.dev/)
- **Client Storage**: [Dexie.js](https://dexie.org/) (IndexedDB)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/)
- **YouTube Engine**: [YouTube.js / Innertube](https://github.com/LuanRT/YouTube.js)
- **Spotify Extraction**: [spotify-url-info](https://github.com/microlinkhq/spotify-url-info)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Clone repository
git clone https://github.com/jrsnleons/minimalist-yt-player.git
cd minimalist-yt-player

# 2. Install dependencies
pnpm install

# 3. Start development server
pnpm dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🚢 Production Deployment

Onyx is **production build-ready** with zero required API keys.

### 1. Vercel (1-Click)
Deploy directly on [Vercel](https://vercel.com/new). Next.js App Router and serverless API endpoints will be configured automatically.

### 2. Docker / Self-Hosted
```bash
# Build and run Docker container
docker build -t onyx-audio .
docker run -d -p 3000:3000 --name onyx onyx-audio
```

For complete deployment details (Docker Compose, Netlify, Railway, Render, Fly.io, and VPS), see the [**Deployment Guide (DEPLOYMENT.md)**](file:///Users/jello/Documents/dev/minimalist-yt-player/DEPLOYMENT.md).

---

## 🔒 Privacy Guarantee

- **No Remote User Database**: All listening history, playlists, and settings remain stored strictly in your browser's IndexedDB.
- **No Analytics or Trackers**: Zero third-party telemetry scripts.
- **Complete Data Ownership**: Export your full library anytime to standard JSON.

---

## 📄 License

MIT License. Free for personal and open-source use.
