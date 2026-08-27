# Onyx Audio — Build Status & Handoff

## Current Phase: Production Build & Multi-Platform Deployment Ready ✅
## Current Step: Ready for Deployment (Vercel, Docker, Netlify, VPS, Railway, Render)

## ✅ Production Readiness Highlights

### 1. Production Build & Output Modes ([next.config.ts](file:///Users/jello/Documents/dev/minimalist-yt-player/next.config.ts))
- **Turbopack Production Compilation**: Tested and verified building in **~1.5 seconds** with 0 errors and 0 warnings.
- **Dual Output Support**:
  - Standard edge/serverless build for **Vercel** and **Netlify** (zero config).
  - Standalone bundled output (`OUTPUT_STANDALONE=true`) for **Docker**, **Kubernetes**, **Coolify**, **Railway**, and **VPS** hosting.
- **Security & Cache Headers**:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `poweredByHeader: false`
  - Cache-Control optimization on static assets & API routes.

### 2. Multi-Stage Production Docker Support ([Dockerfile](file:///Users/jello/Documents/dev/minimalist-yt-player/Dockerfile), [.dockerignore](file:///Users/jello/Documents/dev/minimalist-yt-player/.dockerignore))
- Lightweight Alpine Node 20 base image.
- Non-root `nextjs` user security isolation.
- Minimal standalone distribution footprint (~120MB).

### 3. PWA & Web App Manifest ([app/manifest.ts](file:///Users/jello/Documents/dev/minimalist-yt-player/app/manifest.ts), [app/layout.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/app/layout.tsx))
- Next.js 16 Web App Manifest `/manifest.webmanifest` automatically compiled and linked.
- PWA installability on macOS, Windows, iOS, and Android.
- OpenGraph, Twitter card, canonical URL, and SEO tags configured.

### 4. Configuration & Deployment Guides ([.env.example](file:///Users/jello/Documents/dev/minimalist-yt-player/.env.example), [DEPLOYMENT.md](file:///Users/jello/Documents/dev/minimalist-yt-player/DEPLOYMENT.md), [README.md](file:///Users/jello/Documents/dev/minimalist-yt-player/README.md))
- Complete 1-click guides for Vercel, Netlify, Docker Compose, Railway, Render, Fly.io, and VPS.
- Zero mandatory API keys — 100% operational out of the box.

---

## 🗂️ Complete File Tree

```
onyx/
├── .dockerignore
├── .env.example
├── Dockerfile
├── DEPLOYMENT.md
├── README.md
├── app/
│   ├── api/
│   │   ├── playlist/route.ts
│   │   ├── radio/route.ts
│   │   ├── search/route.ts
│   │   ├── spotify/
│   │   │   ├── resolve/route.ts
│   │   │   └── route.ts
│   │   └── stream/route.ts
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   ├── manifest.ts
│   └── page.tsx
├── components/
│   ├── command-palette/CommandPalette.tsx
│   ├── context-menu/TrackContextMenu.tsx
│   ├── layout/
│   │   ├── MiniPlayer.tsx
│   │   ├── QueueSidebar.tsx
│   │   ├── SidebarPlaylists.tsx
│   │   └── TopNav.tsx
│   ├── player/
│   │   ├── AmbientVisualizer.tsx
│   │   ├── CustomScrubber.tsx
│   │   ├── DirectAudioPlayer.tsx
│   │   ├── PlayerErrorBoundary.tsx
│   │   ├── PlayerHero.tsx
│   │   ├── TransportControls.tsx
│   │   ├── VolumeSlider.tsx
│   │   ├── YouTubeIframe.tsx
│   │   └── ZenPlayerView.tsx
│   ├── playlist/
│   │   ├── AddToPlaylistModal.tsx
│   │   ├── CenterStageQueue.tsx
│   │   ├── CreatePlaylistModal.tsx
│   │   ├── EditPlaylistModal.tsx
│   │   ├── ImportPlaylistModal.tsx
│   │   ├── PlaylistDetail.tsx
│   │   ├── SharePlaylistModal.tsx
│   │   ├── SharedPlaylistImportModal.tsx
│   │   └── TrackRow.tsx
│   ├── settings/SettingsModal.tsx
│   ├── ui/
│   │   ├── MarqueeText.tsx
│   │   ├── Modal.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Toast.tsx
│   │   ├── Tooltip.tsx
│   │   └── TrackArtwork.tsx
│   └── views/
│       ├── HomeView.tsx
│       ├── PlaylistsView.tsx
│       ├── RecentlyPlayedView.tsx
│       ├── SearchView.tsx
│       └── VibeSuggestionsView.tsx
├── db/schema.ts
├── hooks/
│   ├── useAdblockCheck.ts
│   ├── useDirectAudio.ts
│   ├── useDynamicTrackPalette.ts
│   ├── useHotkeys.ts
│   ├── useMediaSession.ts
│   ├── usePlatformShortcut.ts
│   ├── useRadioSuggestions.ts
│   └── useYouTubePlayer.ts
├── lib/
│   ├── backup.ts
│   ├── paletteExtractor.ts
│   ├── share.ts
│   ├── spotify.ts
│   ├── utils.ts
│   └── youtube.ts
├── next.config.ts
├── package.json
├── store/usePlayerStore.ts
├── tsconfig.json
└── types/index.ts
```
