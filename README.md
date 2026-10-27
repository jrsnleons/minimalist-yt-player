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

## Phone Remote

A phone can control Onyx while it plays on a laptop or TV.

1. On the playing device, open Connect Phone from the sidebar or the command palette.
2. Scan the QR code with the phone camera, or use Copy Link and open it on the phone. The link carries a secret key in the URL fragment, so it is not sent to the server in page requests.
3. The phone shows Connected. Play, pause, seek, volume, queue editing, search and playlists all run on the playing device.
4. Choose End Session in the same dialog to stop remote access. Reloading the playing device keeps the session for that tab.

Add the remote page to the phone home screen to reopen it later. The pairing key is stored on the phone for that code. Entering only the 6-character code works on a phone that already has the key; otherwise use the QR code or link.

Sessions expire after 2 hours without a connected device. While Listen Together locks playback, remote playback commands are ignored; volume and like still work.

**Transport:** with `ABLY_API_KEY` set, the playing device and the phone talk through Ably channels and work on serverless hosts. Without it, sessions live in server memory and only work on a single long-running Node process (`pnpm start`, Docker or local dev), because on Vercel the two devices can be routed to different instances. Listen Together uses the same transport.

### Realtime Setup

1. Create a free app at [ably.com](https://ably.com) and copy its root API key from the API Keys tab.
2. Add `ABLY_API_KEY` to the Vercel project's environment variables (or `.env.local` for local dev).
3. Redeploy.

Optionally set `REMOTE_SECRET` to sign pairing secrets with a separate key. See [DEPLOYMENT.md](DEPLOYMENT.md#realtime-setup-ably) for details.

## Transfer Library

Move playlists, tracks and history to another device without a database or a file. Requires `ABLY_API_KEY`.

1. On the first device, open the command palette and choose Transfer Library, then Send Library.
2. Scan the QR code or open the link on the second device.
3. Approve the request on the first device. The second device shows a summary and offers Merge or Replace. Replace asks for confirmation first.

Without `ABLY_API_KEY`, use the JSON backup in Settings instead.

## Installable App

Onyx ships a web manifest and a service worker (production builds only). It caches the app shell and static assets, and shows an offline page when the network is unavailable. API routes, event streams and media are never cached.

## Testing

End-to-end tests use [Playwright](https://playwright.dev) and live in `e2e/`. They cover navigation, playback controls, keyboard shortcuts, the queue, focus management, Stats, Settings, Search, Phone Remote, artwork, the PWA manifest and an axe accessibility scan. A desktop (1440x900) and a phone (Pixel 7) project run; the phone project runs the tests tagged `@mobile`.

The tests never touch the network. YouTube, image hosts, Ably and Spotify requests are blocked, `i.ytimg.com` artwork is served from a local PNG, and `/api/search`, `/api/stream`, `/api/playlist` and `/api/radio` return the fixtures in `e2e/fixtures/`. Each test starts with an empty browser profile; `e2e/helpers/seed.ts` writes library data into the app's IndexedDB database. Phone Remote runs over the in-memory SSE relay (`ABLY_API_KEY` is cleared for the test server).

```bash
pnpm install
npx playwright install chromium     # once; CI installs it too

pnpm test:e2e                       # production build + start on port 3100, then run everything
PW_DEV=1 pnpm test:e2e              # same tests against `next dev` (no build step)
pnpm test:e2e e2e/queue.spec.ts     # one file
pnpm test:e2e --project=mobile      # one project
pnpm test:e2e --ui                  # Playwright UI mode
```

- **Production vs dev server**: the default run executes `pnpm build && pnpm start -p 3100` (this is what CI uses). `PW_DEV=1` starts `next dev -p 3100` instead, which is faster to start and works where the build cannot reach the network (the Open Graph image route fetches a font during the build). The service worker test only runs against a production build.
- **Existing server**: outside CI a server already listening on the port is reused, so you can keep `pnpm start -p 3100` running between runs. Use `PW_PORT` to change the port.
- **Browser location**: if Chromium is installed somewhere Playwright does not look, set `PW_CHROMIUM_PATH` to its executable. Leave it unset otherwise.
- **Type check**: `pnpm typecheck` covers the app and the tests.
- **Known accessibility issue**: `e2e/a11y.spec.ts` lists one tracked finding (`label-content-name-mismatch` on the stretched row and card buttons). Any other serious or critical axe violation fails the run.

## 🔒 Privacy Guarantee

- **No Remote User Database**: All listening history, playlists, and settings remain stored strictly in your browser's IndexedDB.
- **No Analytics or Trackers**: Zero third-party telemetry scripts.
- **Complete Data Ownership**: Export your full library anytime to standard JSON.

---

## 📄 License

MIT License. Free for personal and open-source use.
