# Minimalist YT Player — Build Status & Handoff

## Current Phase: Drag-and-Drop Reordering & Play Next Implemented ✅
## Current Step: Ready for Testing & Daily Use

## ✅ Completed Updates

### 1. Drag-and-Drop Reordering for Queue & Playlists
- **Playback Queue (`CenterStageQueue.tsx`)**:
  - Powered by `@dnd-kit/core` and `@dnd-kit/sortable`.
  - Added dedicated grip handles on every track row (`GripVertical`).
  - Seamless drag-and-drop reordering with live feedback and state synchronization.
- **Playlists Track List (`PlaylistsView.tsx`)**:
  - Drag-and-drop track reordering within any custom playlist.
  - Automatically updates and persists the track order in IndexedDB (`db.playlists.update`).

### 2. "Play Next" (Add to Next in Queue) Feature
- **Guaranteed Queue Placement**:
  - `playNext(track)` inserts the song immediately after the currently active playing track (`queueIndex + 1`).
  - If nothing is playing or queue is empty, it places the track at the very top (index `0`).
- **Available Everywhere with 1-Click Action Buttons & Tooltips**:
  - **TrackRow** (hover action button with `ListStart` icon + tooltip `"Play Next (after active song)"`).
  - **Search View** (`SearchView.tsx`) & **Command Palette** (`CommandPalette.tsx`) with clear `Next` button.
  - **Right-Click Context Menu** (`TrackContextMenu.tsx` -> "Play Next").
  - **Recently Played** & **Vibe Suggestions**.

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
