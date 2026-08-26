# Minimalist YT Player — Build Status & Handoff

## Current Phase: YouTube Playlist Import & Playback Auto-Skip Completed ✅
## Current Step: Ready for Testing & Daily Use

## ✅ Completed Updates

### 1. YouTube Playlist Import Feature
- **API Handler (`/api/playlist`)**:
  - Automatically parses any public or unlisted YouTube / YouTube Music playlist URL or ID (`https://www.youtube.com/playlist?list=...`).
  - Uses multi-tier extraction: `yt.music.getPlaylist` (fastest & most accurate metadata) ➔ `yt.getPlaylist` ➔ YouTube Data API v3 fallback.
  - Returns playlist title, channel name, track count, durations, and high-res thumbnails.
- **Import Modal (`ImportPlaylistModal.tsx`)**:
  - Live playlist metadata & track snippet preview.
  - Popular example playlist chips ("Pop Hits 2026", "Lofi Focus Beats", "Synthwave / Chillwave").
  - 1-click **"Import to Library"** and **"Import & Play"** actions with instant IndexedDB persistence.
- **Playlists View (`PlaylistsView.tsx`)**:
  - Integrated **"Import YT Playlist"** button in the header and empty states.

### 2. Auto-Skip & Unplayable Video Handling
- **Root Cause of Image Error**:
  - The previous "Quick Start Radio" was referencing a deprecated YouTube live stream ID (`jfKfPfyJRdk`) that YouTube ended/restricted.
- **Fixes Applied**:
  - **Dynamic Quick Start Radio**: Replaced static dead IDs with dynamic `/api/search?q=lofi+chill+beats+focus` which automatically fetches 15+ verified, fresh playable tracks, queues them, and starts playback with a loading spinner.
  - **YouTube Iframe Auto-Skip (`useYouTubePlayer.ts`)**: Whenever YouTube reports an error (e.g., Code 150/101 embed restricted by owner, Code 100 private/deleted video), the player now automatically notifies with `"Embedding restricted by owner — auto-skipping…"` and seamlessly advances to the next track in the queue or pulls fresh radio recommendations without ever hanging!

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
