# Minimalist YT Player — Build Status & Handoff

## Current Phase: UI Overhaul & Fixes Completed ✅
## Current Step: Ready for Testing & Daily Use

## ✅ Completed Updates

### UI Polish & Layout Overhaul
- [x] **Surface Levels & Structural Contrast**: Replaced flat zero-border black blobs with defined surface tones (`#09090b` canvas, `#0f0f13` panels, `#141418` cards, `#27272a` borders).
- [x] **Center Stage Redesign**: Transformed the center stage from a sparse card in a void into a **2-part balanced view**:
  - **Top**: Compact, horizontal Now Playing card with large artwork, bold typography, integrated scrubber, transport buttons, and volume.
  - **Bottom**: Full-width Playback Queue / Selected Playlist track table with `#`, `Title`, `Artist`, `Duration`, and double-click / right-click interactions.
- [x] **Range Slider Overhaul (`CustomScrubber` & `VolumeSlider`)**: Implemented high-precision dual-layer filled progress bars with smooth hover expand effects, resolving WebKit/Blink alignment issues.
- [x] **TopNav Enhancements**: Added rotating vinyl disc playback indicator, properly sized search bar with `⌘K` badge, and balanced icon actions.
- [x] **Sidebars Refinement**:
  - **Left Sidebar**: Distinct Recently Played cards with hover play, Playlist list with track count badges, and dedicated bottom IndexedDB storage meter.
  - **Right Sidebar**: Up Next queue with drag handles and clear actions + Based on Vibe suggestions with the Work-Friendly instrumental toggle.
- [x] **Mini-Player Footer**: Clean 3-part layout (Left: Artwork & Info, Center: Play/Pause/Prev/Next + Scrubber, Right: Shuffle/Repeat/Video PiP/Volume).

---

## 🗂️ Complete File Tree

```
minimalist-yt-player/
├── app/
│   ├── api/
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
│   │   ├── MiniPlayer.tsx
│   │   ├── QueueSidebar.tsx
│   │   ├── SidebarPlaylists.tsx
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
│   │   ├── CenterStageQueue.tsx
│   │   ├── CreatePlaylistModal.tsx
│   │   ├── PlaylistDetail.tsx
│   │   └── TrackRow.tsx
│   ├── settings/
│   │   └── SettingsModal.tsx
│   └── ui/
│       ├── Modal.tsx
│       ├── PiPWindow.tsx
│       ├── Toast.tsx
│       └── Tooltip.tsx
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
