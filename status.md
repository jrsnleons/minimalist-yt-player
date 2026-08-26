# Minimalist YT Player — Build Status & Handoff

## Current Phase: Completed & Verified ✅
## Current Step: Ready for Development / Production

## ✅ Completed Steps

### Phase 1: Foundation
- [x] Initialized Next.js 16+ with TypeScript, Tailwind CSS v4, and App Router
- [x] Installed dependencies: `zustand`, `dexie`, `dexie-react-hooks`, `youtubei.js`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `clsx`, `tailwind-merge`, `lucide-react`, `geist`
- [x] Created `types/index.ts` with strict TypeScript definitions (Track, Playlist, HistoryEntry, UserPreferences, etc.)
- [x] Configured `db/schema.ts` with IndexedDB tables (`playlists`, `tracks`, `history`, `preferences`)
- [x] Built `store/usePlayerStore.ts` with complete Zustand audio state, queue operations, seekTarget dispatch, and IndexedDB preference persistence
- [x] Configured `app/globals.css` with monochrome Obsidian `#09090b` / Zinc dark-only palette, custom scrollbars, custom range sliders, and `prefers-reduced-motion` support
- [x] Set up `app/layout.tsx` with Geist Sans and JetBrains Mono fonts

### Phase 2: Hybrid Playback Engine
- [x] `hooks/useYouTubePlayer.ts`: IFrame API headless engine with 100ms rAF polling, continuous queue playback on `ENDED`, error fallback, and mute/volume sync
- [x] `hooks/useDirectAudio.ts`: Experimental HTML5 `<audio>` engine with automatic stream re-fetch on expiration and seamless IFrame fallback
- [x] `hooks/useMediaSession.ts`: Full `navigator.mediaSession` integration with OS media keys (play/pause/prev/next/seekto) and artwork
- [x] `components/player/YouTubeIframe.tsx` & `PiPWindow.tsx`: Continuous iframe element that seamlessly transitions between 1px headless mode and a floating draggable/resizable PiP window
- [x] `components/player/TransportControls.tsx`: Custom play/pause, prev/next, shuffle, 3-state repeat, and video PiP toggles
- [x] `components/player/CustomScrubber.tsx`: High-precision progress bar with JetBrains Mono timecodes
- [x] `components/player/VolumeSlider.tsx`: Volume bar with dynamic mute icon
- [x] `components/player/PlayerErrorBoundary.tsx`: React Error Boundary for resilient playback

### Phase 3: Data Layer & API Proxies
- [x] `lib/youtube.ts`: `youtubei.js` (Innertube) client with robust parsing across songs, search shelves, and up-next automixes
- [x] `app/api/search/route.ts`: Fast search with duration filter (60s–600s) and YouTube Data API v3 fallback
- [x] `app/api/radio/route.ts`: Up-Next / Automix suggestions with queue deduplication and Work-Friendly instrumental filter
- [x] `app/api/stream/route.ts`: Audio stream extractor for experimental direct streaming mode

### Phase 4: UI Shell & Layout
- [x] `app/page.tsx`: 3-column collapsible desktop layout (≥1024px) with persistent mini-player
- [x] `components/layout/TopNav.tsx`: Logo, library sidebar toggle (`[`), Cmd+K command palette trigger, Settings trigger, queue sidebar toggle (`]`)
- [x] `components/layout/SidebarPlaylists.tsx`: Left 260px sidebar with Recently Played list, Playlists, New Playlist button, and storage stats
- [x] `components/layout/QueueSidebar.tsx`: Right 320px sidebar with Up Next queue and Based on Vibe suggestions
- [x] `components/layout/MiniPlayer.tsx`: Sticky footer with track info, scrubber, transport controls, and volume
- [x] `components/player/PlayerHero.tsx`: Center stage Now Playing card

### Phase 5: Playlist & Queue Management
- [x] `components/playlist/PlaylistDetail.tsx`: Track table with Play All, Delete playlist, and skeleton loading
- [x] `components/playlist/TrackRow.tsx`: Track row with index, artwork, title, artist, duration, double-click to play, right-click context menu
- [x] `components/playlist/CreatePlaylistModal.tsx`: Accessible dialog modal for creating playlists
- [x] `components/context-menu/TrackContextMenu.tsx`: Custom monochrome context menu (Play Now, Play Next, Add to Queue, Add to Playlist submenu, Remove)
- [x] Accessible drag-to-reorder queue via `@dnd-kit/core` and `@dnd-kit/sortable`

### Phase 6: Discovery & Polish
- [x] `components/command-palette/CommandPalette.tsx`: Raycast-style Cmd+K palette with Scope tabs (All, YouTube, Library, Actions), auto-scroll, keyboard navigation, debounced search
- [x] `components/settings/SettingsModal.tsx`: Engine toggle (YouTube IFrame vs Direct Audio), experimental caveats, API fallback info, IndexedDB storage management, hotkeys cheat sheet
- [x] `hooks/useHotkeys.ts`: All 14 global keyboard shortcuts with proper text-input exclusion
- [x] `hooks/useAdblockCheck.ts`: Startup probe displaying non-intrusive toast tip if adblock is not detected
- [x] `components/ui/Toast.tsx`, `components/ui/Modal.tsx`, `components/ui/Tooltip.tsx`: Custom accessible UI primitives without external UI libraries

### Phase 7: Verification
- [x] `pnpm build`: Completed successfully with zero errors across all static and dynamic routes
- [x] Live API verification: `/api/search` and `/api/radio` verified with real query results and duration filtering

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
│   ├── command-palette/
│   │   └── CommandPalette.tsx
│   ├── context-menu/
│   │   └── TrackContextMenu.tsx
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
├── db/
│   └── schema.ts
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
├── store/
│   └── usePlayerStore.ts
├── types/
│   └── index.ts
├── .env.local.example
├── ANTIGRAVITY_PROMPT_YTMUSIC_MINIMALIST.md
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── README.md
├── status.md
└── tsconfig.json
```

---

## 🏗️ Core Architecture Decisions
1. **Zero External UI Kits**: All modals, tooltips, dialogs, sliders, and menus built from scratch for pixel-perfect monochrome minimalism.
2. **Persistent IFrame in PiP**: Single headless/PiP DOM node that smoothly transitions size and positioning without audio reloads or interruptions.
3. **Zustand Central Dispatch**: UI and player engine communication decoupled via `seekTarget`, `queue`, and mode state in Zustand.
4. **100% Browser-Local Data**: Dexie.js (IndexedDB) persists tracks, playlists, history plays, and UI preferences.
5. **Client-Rendered App Shell**: Main app shell is `"use client"`; Next.js route handlers handle server-side API proxying and Innertube queries.

---

## ⚠️ How to Run
```bash
# Start development server
pnpm dev

# Open browser at
http://localhost:3000
```
