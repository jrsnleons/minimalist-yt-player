# Minimalist YT Player — Build Status & Handoff

## Current Phase: Static Pinned Viewport, Noir Gradient & Noise, and Playlist Metadata Editing Completed ✅
## Current Step: Ready for Testing & Daily Use

## ✅ Completed Updates

### 1. Static Unscrollable Page with Internal Scrollable Tables
- **Fixed/Pinned Elements**:
  - **Top Navigation** (`TopNav.tsx`): Pinned permanently at the top.
  - **Now Playing Hero** (`PlayerHero.tsx`): Pinned directly under the header.
  - **Tab Navigator** (Queue, Search, Playlists, Recently Played, Vibe): Pinned with sliding spring pill indicator.
- **Scrollable Content**:
  - Only the track rows, search results, and playlist cards scroll inside their respective container (`flex-1 min-h-0 overflow-y-auto`) with custom sleek scrollbars and sticky table headers (`sticky top-0`).

### 2. Dark Noir Gradient & Analog Film Grain Texture
- **Canvas Base**: Deep noir radial gradient (`radial-gradient(ellipse 90% 70% at 50% 0%, #15151c, #0a0a0d, #050507)`).
- **Procedural Film Grain Noise Layer** (`.noir-noise-bg`): High-frequency SVG fractal turbulence noise overlay blended onto the canvas.
- **Grungy Vignette Effect** (`.noir-vignette`): Inset edge shadow creating an immersive, analog studio listening ambiance.

### 3. Playlist Metadata Editing
- Added [EditPlaylistModal.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/playlist/EditPlaylistModal.tsx).
- Allows editing playlist **Name** and **Description** with live character counters.
- Dedicated **Pencil (Edit)** button in both the playlist detail header and playlist grid cards.
- Instant IndexedDB persistence via `db.playlists.update`.

---

## 🗂️ Complete File Tree

```
minimalist-yt-player/
├── app/
│   ├── api/
│   │   ├── playlist/route.ts
│   │   ├── radio/route.ts
│   │   ├── search/route.ts
│   │   └── stream/route.ts
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── command-palette/CommandPalette.tsx
│   ├── context-menu/TrackContextMenu.tsx
│   ├── layout/
│   │   └── TopNav.tsx
│   ├── player/
│   │   ├── CustomScrubber.tsx
│   │   ├── DirectAudioPlayer.tsx
│   │   ├── PlayerErrorBoundary.tsx
│   │   ├── PlayerHero.tsx
│   │   ├── TransportControls.tsx
│   │   ├── VolumeSlider.tsx
│   │   └── YouTubeIframe.tsx
│   ├── playlist/
│   │   ├── AddToPlaylistModal.tsx
│   │   ├── CenterStageQueue.tsx
│   │   ├── CreatePlaylistModal.tsx
│   │   ├── EditPlaylistModal.tsx
│   │   ├── ImportPlaylistModal.tsx
│   │   ├── PlaylistDetail.tsx
│   │   └── TrackRow.tsx
│   ├── settings/
│   │   └── SettingsModal.tsx
│   ├── ui/
│   │   ├── Modal.tsx
│   │   ├── PiPWindow.tsx
│   │   ├── Toast.tsx
│   │   └── Tooltip.tsx
│   └── views/
│       ├── PlaylistsView.tsx
│       ├── RecentlyPlayedView.tsx
│       ├── SearchView.tsx
│       └── VibeSuggestionsView.tsx
├── db/schema.ts
├── hooks/
│   ├── useAdblockCheck.ts
│   ├── useDirectAudio.ts
│   ├── useHotkeys.ts
│   ├── useMediaSession.ts
│   ├── useRadioSuggestions.ts
│   └── useYouTubePlayer.ts
├── lib/
│   ├── utils.ts
│   └── youtube.ts
├── store/usePlayerStore.ts
├── types/index.ts
├── .env.local.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 🚀 How to Run
```bash
pnpm dev
```
Open **http://localhost:3000** in your browser.
