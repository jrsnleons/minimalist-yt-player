# Minimalist YT Player — Build Status & Handoff

## Current Phase: Dynamic Blurred Hero Ambient Glow & Settings Toggle Completed ✅
## Current Step: Ready for Testing & Daily Use

## ✅ Completed Updates

### 1. Dynamic Blurred Artwork / Video Ambient Glow
- **Ambient Backdrop Layer ([PlayerHero.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/player/PlayerHero.tsx))**:
  - Dynamically projects an ultra-blurred (`blur-3xl`), scaled (`scale-150`), color-matched ambient glow extracted from the active track artwork / video.
  - Smooth 600ms crossfade transitions with `framer-motion` `AnimatePresence` whenever tracks change.
  - Overlaid with a dark noir gradient mask to maintain high contrast and legibility for all transport controls, scrubbers, and titles.

### 2. Optional Settings Toggle ([SettingsModal.tsx](file:///Users/jello/Documents/dev/minimalist-yt-player/components/settings/SettingsModal.tsx))
- Added a dedicated switch in **Settings ➔ Visual & Player Ambiance**:
  - **Dynamic Blurred Artwork Glow** (Enabled by default, user-configurable).
  - Preference is persisted locally in IndexedDB (`db.preferences`).

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
