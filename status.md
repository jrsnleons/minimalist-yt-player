# Minimalist YT Player — Build Status & Handoff

## Current Phase: Dynamic Generative Album Artwork System Completed ✅
## Current Step: Ready for Testing & Daily Use

## ✅ Completed Updates

### 1. Dynamic Generative Album Art System ([TrackArtwork.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/ui/TrackArtwork.tsx))
- **Aesthetic Generative Fallbacks**:
  - Deterministically calculates an artistic palette and abstract geometric overlay from track metadata `(title, artist, id)`.
  - Generates 10 sleek dark noir gradients (Indigo Noir, Crimson Ember, Emerald Shadow, Violet Velvet, Amber Glow, Cyan Abyss, Rose Nebula, etc.).
  - Generates 5 procedural geometric patterns:
    1. Concentric vinyl record grooves & spindle.
    2. Harmonic acoustic soundwaves.
    3. Minimalist equalizer spectrum bars.
    4. Bauhaus diagonal grid with center disk.
    5. Orbital resonance ellipses & acoustic nodes.
  - Generates clean 2-letter uppercase monospace initials monogram (`TL`, `BE`, `RH`).
- **Fail-Safe & 404 Protection**:
  - Automatically activates if `thumbnailUrl` is null/empty OR if the image fails to load (`onError`), preventing broken image icons anywhere in the UI.
- **Dynamic Ambient Hero Glow ([PlayerHero.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/player/PlayerHero.tsx))**:
  - In the Player Hero, if no thumbnail exists, generates an ambient blurred gradient background tailored to the track's color palette.
- **Universal Component Integration**:
  - Integrated across [PlayerHero.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/player/PlayerHero.tsx), [TrackRow.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/playlist/TrackRow.tsx), [CommandPalette.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/command-palette/CommandPalette.tsx), [SearchView.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/views/SearchView.tsx), [AddToPlaylistModal.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/playlist/AddToPlaylistModal.tsx), [MiniPlayer.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/layout/MiniPlayer.tsx), [QueueSidebar.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/layout/QueueSidebar.tsx), and [SidebarPlaylists.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/layout/SidebarPlaylists.tsx).

### 2. YouTube Video Search & 3-Tier Results View
- **Universal Video Search ([lib/youtube.ts](file:///Users/jello/Documents/dev/minimalist-yt-player/lib/youtube.ts) & [app/api/search/route.ts](file:///Users/jello/Documents/dev/minimalist-yt-player/app/api/search/route.ts))**:
  - Added `searchVideos(query)` which queries general YouTube videos (live concerts, full sets, talks, unreleased covers, podcasts, animations).
- **Segmented Search Filters ([SearchView.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/views/SearchView.tsx))**:
  - **All**: Shows Playlists, Music Tracks, and a dedicated **3rd section at the bottom for YouTube Videos** so users can always find whatever they're looking for even if not in YouTube Music.
  - **Songs**: Focuses on pure music track results.
  - **Videos**: Focuses on general YouTube video search results.
  - **Playlists**: Focuses on public playlists.
- **Seamless Playback & PiP**:
  - Any video result can be played, added to queue, added to playlist, or watched in floating PiP mode (`V` key).

### 3. Data Safety & Library Backup / Restore System
- **Full Library Export ([lib/backup.ts](file:///Users/jello/Documents/dev/minimalist-yt-player/lib/backup.ts))**:
  - One-click export of all IndexedDB tables into a timestamped JSON file (`minimalist-yt-backup-YYYY-MM-DD.json`).
- **Single Playlist JSON Export ([PlaylistsView.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/views/PlaylistsView.tsx))**:
  - Export individual playlists along with their track data directly from the playlist detail header or playlist cards.
- **Smart Restore Engine ([SettingsModal.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/settings/SettingsModal.tsx))**:
  - **Merge Mode**: Preserves existing playlists and appends new ones without duplicate collisions.
  - **Full Replace Mode**: Cleans and replaces the database with the backup archive.

### 4. Zero-Login Spotify Playlist & Album Importer
- **Spotify Extraction API ([app/api/spotify/route.ts](file:///Users/jello/Documents/dev/minimalist-yt-player/app/api/spotify/route.ts) & [lib/spotify.ts](file:///Users/jello/Documents/dev/minimalist-yt-player/lib/spotify.ts))**:
  - Accepts any public Spotify playlist, album, or track URL / URI without requiring user login or Spotify developer accounts.
- **Intelligent YouTube Match & Resolve Engine ([app/api/spotify/resolve/route.ts](file:///Users/jello/Documents/dev/minimalist-yt-player/app/api/spotify/resolve/route.ts))**:
  - Batch resolves Spotify track titles and artists to playable YouTube video streams via Innertube.
- **Live Visual Progress UI ([ImportPlaylistModal.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/playlist/ImportPlaylistModal.tsx))**:
  - Displays real-time matching progress bar (`Matching 12/50 tracks...`).
  - 1-click **"Match & Save to Library"** and **"Match & Play"** actions.

---

## 🗂️ Complete File Tree

```
minimalist-yt-player/
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
│   │   ├── MarqueeText.tsx
│   │   ├── Modal.tsx
│   │   ├── PiPWindow.tsx
│   │   ├── Toast.tsx
│   │   ├── Tooltip.tsx
│   │   └── TrackArtwork.tsx
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
│   ├── backup.ts
│   ├── spotify.ts
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
