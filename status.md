# Minimalist YT Player — Build Status & Handoff

## Current Phase: Single-Column Layout & Enhanced Actions Completed ✅
## Current Step: Ready for Testing & Daily Use

## ✅ Completed Updates

### 1. Single-Column Layout Architecture
- Migrated from a 3-column split view to a **focused, centered single-column desktop experience** (`max-w-4xl mx-auto`).
- **Now Playing Hero Card**: Sits at the top with large album artwork, title, artist, custom dual-layer scrubber, transport buttons (Play/Pause, Prev, Next, Shuffle, Repeat, Video PiP), and volume slider.
- **Segmented Section Navigator**: Clean tab bar directly beneath the Now Playing card:
  - 📋 **Queue** (`ListMusic`): Up Next drag-and-drop reorderable queue with duration and clear actions.
  - 🔍 **Search & Explore** (`Search`): In-page instant YouTube Music search input with trending chips and action buttons.
  - 📁 **Playlists** (`Music`): All playlists grid + detailed track views + Play All.
  - 🕒 **Recently Played** (`Clock`): Listening history with Play, Queue, and Playlist actions.
  - ✨ **Based on Vibe** (`Sparkles`): Smart radio automix suggestions with the Work-Friendly instrumental toggle.

### 2. Search & Track Actions Overhaul
- **Play Now**: Instant 1-click playback for any search or historical result.
- **Add to Queue**: Dedicated button on every search result row (both in-page Search tab and in the `Cmd+K` Command Palette) with immediate feedback toast.
- **Add to Playlist**: Added inline button on every track in **Search**, **Recently Played**, **Queue**, and **Vibe Suggestions** that opens a dedicated **`AddToPlaylistModal`** allowing 1-click addition to existing playlists or instant `+ Create New Playlist & Add`.

### 3. Direct Audio Mode Fix
- Fixed the issue where selecting Direct Audio mode in Settings was immediately getting reverted to IFrame mode due to aggressive error-handler resets.
- Preserved user mode preference in IndexedDB and Zustand store.

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
