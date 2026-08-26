# Minimalist YT Player — Build Status & Handoff

## Current Phase: Tooltip Isolation, Global Pointer Cursors & Smooth Transitions Completed ✅
## Current Step: Ready for Testing & Daily Use

## ✅ Completed Updates

### 1. Tooltip Hover Isolation Fix
- **Root Cause**: The previous CSS-only tooltip used `.group:hover`, which matched the parent track row's `.group` class, causing all action tooltips on a row to trigger simultaneously when hovering over the row.
- **Fix**: Re-architected [Tooltip.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/ui/Tooltip.tsx) with discrete local hover listeners, `150ms` debounced display timer, and `framer-motion` `AnimatePresence`. Now, only the specific button being hovered displays its tooltip one by one.

### 2. Universal Pointer Cursors
- Added a global interactive rule in [globals.css](file:///Users/jello/Documents/dev/minimalist-yt-player/app/globals.css) ensuring all `button`, `[role="button"]`, `input[type="range"]`, tabs, and action items always render `cursor: pointer`.

### 3. Smooth Transitions (`framer-motion`)
- **Fluid Sliding Tab Pill Indicator**: When switching between tabs (Queue, Search, Playlists, Recently Played, Vibe Suggestions), a spring-animated background pill slides smoothly to the active tab.
- **View Enter/Exit Animations**: Tab content transitions with a subtle `opacity + translateY` easeOut animation.
- **Playlist Grid & Detail Transitions**: Smooth horizontal slide transitions when navigating into a playlist and back to the playlist grid.

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
