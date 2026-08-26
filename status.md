# Minimalist YT Player — Build Status & Handoff

## Current Phase: Clean Distraction-Free Search & Unified Songs/Playlists Search Completed ✅
## Current Step: Ready for Testing & Daily Use

## ✅ Completed Updates

### 1. Clean, Distraction-Free Search
- Removed all suggested and trending discovery chips from [SearchView.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/views/SearchView.tsx).
- Added a quick clear (✕) button and instant real-time debounced query input.

### 2. Search Both Songs & YouTube Playlists
- Added segmented search filter pills:
  - **All** (Default): Searches and displays both individual tracks and public YouTube playlists in clean, structured sections.
  - **Songs**: Focuses results exclusively on single tracks with compact 3-column table actions.
  - **Playlists**: Focuses results exclusively on public YouTube playlists.
- **1-Click Playlist Actions**:
  - ▶ **Play Playlist**: Fetches the playlist instantly and begins playback with all tracks loaded into the queue.
  - 📥 **Import to Library**: Saves the playlist and its tracks directly into local IndexedDB in 1 click.

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
