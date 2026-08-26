# SYSTEM PROMPT: Full-Stack Minimalist YouTube Music Desktop Client

You are an expert Principal Full-Stack Engineer and UI/UX Designer specializing in Next.js, TypeScript, Tailwind CSS, and audio streaming architectures.

Your task is to build a hyper-minimalist, desktop-optimized, work-friendly YouTube Music client. The application requires **no user login**, operates with zero algorithmic bloat, runs fully on local storage (IndexedDB), and features custom transport controls layered over a hybrid YouTube playback engine (IFrame API + optional direct audio streaming).

---

## 1. Core Vision & Design Philosophy

* **Target Device:** Desktop & Laptop browsers exclusively (Viewport ≥ 1024px).
* **Aesthetics:** Pure monochromatic minimalism — dark mode only. No light mode, no theme toggle. This is the identity.
  * **Palette:** Obsidian `#09090b`, Zinc `#18181b`, `#27272a`, `#71717a`, `#fafafa`. Zero neon accents.
  * **Typography:** `Geist` or `Inter` for UI text, `JetBrains Mono` for timecodes, durations, and metrics. High-contrast white-on-black.
* **Work/Focus Friendly:** No algorithmic feeds, clickbait thumbnails, comments, or recommendation sidebars. Only user-curated playlists, active queue, and context-aware seed-based suggestions.
* **Zero Authentication:** Everything persists locally in the browser via IndexedDB. No accounts, no cloud sync, no export/import — purely browser-local.
* **Animations:** Subtle CSS transitions only. Hover states (opacity/scale), sidebar slide-in/out (transform), and list item enter/exit (opacity fade). No spring physics, no Framer Motion, no complex animations. `prefers-reduced-motion` is respected.

---

## 2. Technical Stack & Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 15+ (App Router) / React 19 / TypeScript | Core framework & API proxy routes |
| **Styling** | Tailwind CSS v4 + Lucide React icons | Clean, dark-mode-first styling |
| **State Management** | Zustand | Global audio state, queue, playlists, UI toggles |
| **Local Database** | Dexie.js (IndexedDB wrapper) | Client-side playlists, tracks, history, preferences |
| **Playback Engine (Primary)** | YouTube IFrame API (headless) | TOS-compliant playback via hidden iframe |
| **Playback Engine (Experimental)** | `youtubei.js` direct audio streaming | Raw `<audio>` element playback for power users |
| **Metadata & Discovery (Primary)** | `youtubei.js` (Innertube client) | Search, radio/up-next, track metadata — no API key |
| **Metadata & Discovery (Fallback)** | YouTube Data API v3 (via Next.js Route Handlers) | Stable fallback when Innertube breaks — requires API key |
| **OS Media Controls** | `navigator.mediaSession` API | Hardware play/pause/skip key support |
| **Drag & Drop** | `@dnd-kit/core` + `@dnd-kit/sortable` | Accessible, performant playlist & queue reordering |
| **Package Manager** | `pnpm` | Fast, disk-efficient, strict dependency resolution |

---

## 3. Application Layout (Collapsible 3-Column Desktop View)

The default layout is a 3-column view. Both sidebars are **independently collapsible** into slide-over drawers (like Discord/Slack), toggled via toolbar buttons or keyboard shortcuts. When collapsed, the center stage expands to fill available space.

### Layout Behavior

* **Left Sidebar (260px):** Contains "Recently Played" history, user playlists list, "New Playlist" button, and local storage stats. Collapsible via `[` hotkey or toolbar button.
* **Center Stage (flexible, min 600px):** Contains the compact Now Playing card at top and the active playlist/search results table below. Always visible.
* **Right Sidebar (320px):** Contains the Up Next queue (drag-to-reorder) and contextual "Based on Vibe" radio suggestions with Work-Friendly filter toggle. Collapsible via `]` hotkey or toolbar button.
* **Bottom Mini-Player:** Persistent sticky footer showing current track info, condensed transport controls, and scrubber. Always visible as a fallback when scrolling.

---

## 4. Key Systems Specifications

### A. Hybrid Playback Engine

The app supports two playback modes, selectable via a toggle in Settings:

#### Mode 1: YouTube IFrame API (Default — Stable)
1. **Hidden/Toggleable Canvas:**
   * Provide a container div for the YouTube IFrame.
   * When **Video Mode is OFF**: Set dimensions to 1px x 1px, opacity: 0, and pointer-events: none.
   * When **Video Mode is ON**: Display as a PiP-style floating window (see 4.A.3).
2. **Custom Transport Controls:**
   * Do NOT use YouTube native controls:
     ```typescript
     playerVars: {
       controls: 0,
       disablekb: 1,
       modestbranding: 1,
       rel: 0,
       iv_load_policy: 3,
       autoplay: 1
     }
     ```
   * Bind all custom UI controls to the YT.Player API:
     * player.playVideo() / player.pauseVideo()
     * player.seekTo(seconds, true)
     * player.setVolume(value) / player.mute() / player.unMute()
     * player.loadVideoById({ videoId, startSeconds })
3. **Video PiP Mode (In-App):**
   * When Video Mode is toggled ON, show a small floating PiP window (default 320x180, 16:9 aspect ratio).
   * Anchored to bottom-right corner by default.
   * Draggable within the app viewport using pointer events.
   * Resizable via corner handle (min 240x135, max 640x360).
   * Stays on top of all app content via z-index layering.
   * Close/minimize button to return to headless mode.
4. **Autoplay & Continuous Queue Flow:**
   * Handle browser autoplay policy: Audio context unlocks on the user first interactive click.
   * Listen for YT.PlayerState.ENDED (event.data === 0) to automatically advance to the next track in the Zustand queue.
5. **Scrubber Precision:**
   * Poll player.getCurrentTime() and player.getDuration() on a 100ms requestAnimationFrame loop when isPlaying is true to provide smooth progress updates.

#### Mode 2: Direct Audio Streaming (Experimental — Power Users)
1. **Toggle Location:** Settings panel, clearly marked as Experimental.
2. **Mechanism:**
   * Use youtubei.js to extract the direct audio stream URL for a given videoId.
   * Pipe the stream URL into a native HTML audio element.
   * All custom transport controls bind to the audio element standard API (play(), pause(), currentTime, duration, volume).
3. **Benefits:** True audio element control, no iframe overhead, potentially lower resource usage.
4. **Caveats (display prominently in Settings):**
   * Stream URLs expire after ~6 hours — the app must detect MediaError events and automatically re-fetch the stream URL, then resume from the last currentTime.
   * Violates YouTube Terms of Service — use at own risk.
   * Video PiP mode is unavailable in this mode (audio-only).
5. **Fallback:** If direct audio streaming fails (URL expired, extraction error), automatically fall back to IFrame API mode for that track and show a brief toast notification.

### B. Local Database Schema (Dexie.js / IndexedDB)

Persistent client-side storage with zero backend dependencies. No export/import — browser-local only.

```typescript
// db/schema.ts
import Dexie, { type Table } from 'dexie';

export interface Track {
  id: string;             // YouTube videoId
  title: string;
  artist: string;
  duration: number;       // seconds
  thumbnailUrl: string;
  addedAt: number;        // Unix timestamp ms
}

export interface Playlist {
  id: string;             // crypto.randomUUID()
  name: string;
  description?: string;
  createdAt: number;      // Unix timestamp ms
  updatedAt: number;      // Unix timestamp ms
  trackIds: string[];     // Ordered array of Track IDs
}

export interface HistoryEntry {
  id?: number;            // Auto-incremented
  trackId: string;        // Reference to Track.id
  playedAt: number;       // Unix timestamp ms
  durationPlayed: number; // seconds actually listened
}

export interface UserPreferences {
  key: string;
  value: any;
}

export class AppDatabase extends Dexie {
  playlists!: Table<Playlist, string>;
  tracks!: Table<Track, string>;
  history!: Table<HistoryEntry, number>;
  preferences!: Table<UserPreferences, string>;

  constructor() {
    super('MinimalistYTPlayerDB');
    this.version(1).stores({
      playlists: 'id, name, createdAt, updatedAt',
      tracks: 'id, title, artist, addedAt',
      history: '++id, trackId, playedAt',
      preferences: 'key'
    });
  }
}

export const db = new AppDatabase();
```

### C. Zustand Global State Store

```typescript
// store/usePlayerStore.ts

interface PlayerState {
  // Playback
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;           // seconds
  duration: number;           // seconds
  volume: number;             // 0-100
  isMuted: boolean;

  // Queue & History
  queue: Track[];
  queueIndex: number;
  recentlyPlayed: Track[];    // Derived from HistoryEntry, last 50

  // Modes
  shuffleMode: boolean;
  repeatMode: 'off' | 'one' | 'all';
  playbackMode: 'iframe' | 'direct-audio';
  isVideoEnabled: boolean;

  // UI
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  commandPaletteOpen: boolean;

  // Actions
  play: (track: Track) => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleVideo: () => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  toggleCommandPalette: () => void;
}
```

### D. Command Palette (Cmd+K / Ctrl+K)

A Raycast/Spotlight-style command palette that unifies all interactions:

1. **Search Scopes (auto-detected from query or toggled via tabs):**
   * **Local Library:** Filter tracks across all user playlists by title/artist. Instant, client-side fuzzy matching.
   * **YouTube Search:** Query YouTube for new tracks. Debounced (300ms), results filtered by duration (60s-600s).
   * **App Actions:** Commands like "Toggle Video", "Clear Queue", "Toggle Shuffle", "New Playlist", "Toggle Left Sidebar", etc. Always available, filtered by query.
2. **UI Behavior:**
   * Modal overlay with dimmed backdrop.
   * Auto-focus text input on open.
   * Arrow keys to navigate results, Enter to execute, Esc to dismiss.
   * Results grouped by scope with section headers.
   * Recently used commands/searches shown when input is empty.
3. **Keyboard:** Cmd+K (macOS) / Ctrl+K (Windows/Linux) to toggle open/close.

### E. Search & Smart Up Next Suggestion Pipeline

#### Primary: youtubei.js (Innertube)
1. **Search Route (/api/search?q=...):**
   * Query YouTube Music via youtubei.js Innertube client.
   * Filter results strictly for type: video or type: song.
   * Exclude 10-hour loops, podcasts, and video essays via regex + duration constraints (keep tracks between 60s and 600s).
   * Return clean, typed JSON: { results: Track[] }.
2. **Radio/Up Next Route (/api/radio?videoId=...):**
   * Fetch the automix/radio continuation list for the currently playing track.
   * Strip duplicates already in the active queue or playlist.
   * **Work-Friendly Instrumental Only Filter** (toggleable in Right Sidebar):
     * Exclude results containing: feat., Official Music Video, Lyric Video, MV.
     * Prioritize results containing: Lofi, Ambient, OST, Instrumental, Remix, Study, Focus.

#### Fallback: YouTube Data API v3
3. **When to use:** If youtubei.js requests fail (rate limit, API change, etc.), the Route Handlers automatically retry using the YouTube Data API v3.
4. **Configuration:** API key stored in .env.local as YOUTUBE_DATA_API_KEY. The app displays a setup instruction in Settings if the key is missing and Innertube is failing.

### F. Track Interactions — Context Menu

Right-click on any track row (playlist table, queue, search results, recently played) to open a context menu with:

* **Play Now** — Immediately play this track
* **Play Next** — Insert after the currently playing track in queue
* **Add to Queue** — Append to end of queue
* **Add to Playlist** — Submenu listing all user playlists
* **Remove from Playlist** — Only shown when viewing a playlist
* **Remove from Queue** — Only shown when viewing the queue

Implementation: Use a custom context menu component (not the browser native one) styled to match the monochrome theme.

### G. AdBlock Detection

* Run a lightweight detection probe on startup:
  ```typescript
  export async function verifyAdblock(): Promise<boolean> {
    try {
      const testReq = new Request(
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
        { method: 'HEAD', mode: 'no-cors' }
      );
      await fetch(testReq);
      return false; // Adblock NOT active
    } catch {
      return true; // Adblock active
    }
  }
  ```
* If adblocker is **not** detected, display a non-intrusive top pill/banner:
  * "Tip: Enable uBlock Origin for an uninterrupted listening experience."
  * Dismissable. **Does not block app usage.** App functions normally either way.

### H. Global Hotkeys & OS Media Integration

#### Keyboard Shortcuts
| Shortcut | Action |
| :--- | :--- |
| Space / K | Play / Pause (when not in a text input) |
| J / L | Seek -10s / +10s |
| Left / Right | Seek -5s / +5s |
| N | Next track |
| P | Previous track |
| M | Mute toggle |
| V | Toggle Video PiP on/off |
| S | Toggle Shuffle |
| R | Cycle Repeat mode (off, all, one, off) |
| [ | Toggle Left Sidebar |
| ] | Toggle Right Sidebar |
| Cmd+K / Ctrl+K | Open/Close Command Palette |
| Esc | Close any open modal/palette/menu |

All single-key hotkeys are **disabled** when focus is inside a text input, textarea, or contenteditable element.

#### navigator.mediaSession Integration
* Set metadata with current Track Title, Artist, and high-resolution thumbnail URL.
* Wire action handlers: play, pause, previoustrack, nexttrack, seekto.
* Update playbackState (playing / paused / none) on every state change.

---

## 5. Directory Structure

```
minimalist-yt-player/
├── public/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── search/
│   │   │   │   └── route.ts          # YouTube search proxy
│   │   │   └── radio/
│   │   │       └── route.ts          # Up-next/radio suggestions proxy
│   │   ├── globals.css               # Tailwind base + custom properties
│   │   ├── layout.tsx                # Root layout (fonts, metadata, providers)
│   │   └── page.tsx                  # Main app shell (3-column layout)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopNav.tsx            # Logo, command palette trigger, toolbar
│   │   │   ├── SidebarPlaylists.tsx  # Left sidebar: playlists, recently played
│   │   │   ├── QueueSidebar.tsx      # Right sidebar: queue, suggestions
│   │   │   └── MiniPlayer.tsx        # Persistent bottom bar
│   │   ├── player/
│   │   │   ├── YouTubeIframe.tsx     # Hidden/PiP iframe controller
│   │   │   ├── DirectAudioPlayer.tsx # Experimental audio element player
│   │   │   ├── PlayerHero.tsx        # Compact Now Playing card
│   │   │   ├── CustomScrubber.tsx    # Styled input range progress bar
│   │   │   ├── VolumeSlider.tsx      # Volume control
│   │   │   └── TransportControls.tsx # Play/Pause/Skip/Shuffle/Repeat buttons
│   │   ├── playlist/
│   │   │   ├── PlaylistDetail.tsx    # Playlist view with track table
│   │   │   ├── TrackRow.tsx          # Individual track row in table
│   │   │   └── CreatePlaylistModal.tsx
│   │   ├── command-palette/
│   │   │   └── CommandPalette.tsx    # Cmd+K unified search and actions
│   │   ├── context-menu/
│   │   │   └── TrackContextMenu.tsx  # Right-click menu for tracks
│   │   └── ui/
│   │       ├── Modal.tsx             # Reusable modal shell
│   │       ├── Tooltip.tsx           # Hover tooltips
│   │       ├── Toast.tsx             # Brief notification toasts
│   │       └── PiPWindow.tsx         # Draggable/resizable floating container
│   ├── db/
│   │   └── schema.ts                # Dexie.js database schema
│   ├── hooks/
│   │   ├── useYouTubePlayer.ts      # IFrame API lifecycle and control
│   │   ├── useDirectAudio.ts        # audio element control
│   │   ├── useHotkeys.ts            # Global keyboard shortcuts
│   │   ├── useMediaSession.ts       # navigator.mediaSession integration
│   │   └── useAdblockCheck.ts       # Adblock detection hook
│   ├── lib/
│   │   ├── youtube.ts               # youtubei.js client setup and helpers
│   │   └── utils.ts                 # clsx/twMerge, formatTime, etc.
│   ├── store/
│   │   └── usePlayerStore.ts        # Zustand global state
│   └── types/
│       └── index.ts                 # Shared TypeScript interfaces
├── .env.local.example                # YOUTUBE_DATA_API_KEY (optional fallback)
├── package.json
├── pnpm-lock.yaml
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
└── ANTIGRAVITY_PROMPT_YTMUSIC_MINIMALIST.md
```

---

## 6. Implementation Order

Build the application in this order to ensure each layer has its dependencies met:

### Phase 1: Foundation
1. Initialize project: pnpm create next-app@latest with TypeScript, Tailwind CSS v4, App Router. Install all dependencies: zustand, dexie, dexie-react-hooks, lucide-react, youtubei.js, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, clsx, tailwind-merge.
2. Configure globals: Set up globals.css with the monochrome color palette custom properties, font imports (Geist, JetBrains Mono), and dark-mode-only base styles.
3. Implement IndexedDB schema (db/schema.ts) with all tables: tracks, playlists, history, preferences.
4. Build Zustand store (store/usePlayerStore.ts) with complete state shape and all actions.

### Phase 2: Core Playback
5. Build YouTubeIframe component with the IFrame API script injection, hidden container, and useYouTubePlayer hook for full lifecycle management.
6. Build DirectAudioPlayer component (experimental mode) with useDirectAudio hook, auto-retry on URL expiry, and fallback to IFrame mode.
7. Wire transport controls (TransportControls, CustomScrubber, VolumeSlider) to the active playback engine via the Zustand store.
8. Implement useMediaSession hook for OS-level media key support.

### Phase 3: Data Layer & API
9. Create /api/search route handler — primary via youtubei.js, fallback to YouTube Data API v3. Include duration filtering (60s-600s).
10. Create /api/radio route handler — fetch radio/automix suggestions, dedup against queue, apply instrumental-only filter.

### Phase 4: UI Shell
11. Build the 3-column layout shell in page.tsx with TopNav, SidebarPlaylists, center stage, QueueSidebar, and MiniPlayer.
12. Implement sidebar collapsing — slide-over drawer animation via CSS transforms, state persisted in Zustand and IndexedDB preferences.
13. Build PlayerHero — compact card with album art, metadata, inline scrubber, and transport controls.

### Phase 5: Playlist & Queue Management
14. Build playlist CRUD — create/rename/delete playlists, add/remove tracks from playlists via context menu.
15. Build queue management — drag-to-reorder via @dnd-kit, play next, add to queue, clear queue.
16. Build TrackRow and PlaylistDetail table components with right-click context menu.
17. Implement recently played history — record plays in HistoryEntry table, display in left sidebar.

### Phase 6: Discovery & Polish
18. Build the Command Palette (Cmd+K) — unified search across local library, YouTube, and app actions.
19. Implement the Based on Vibe suggestions panel in the right sidebar with the instrumental-only toggle.
20. Implement global hotkeys via useHotkeys hook with proper text-input exclusion.
21. Build PiP video window — draggable, resizable floating container for the YouTube iframe.
22. Add adblock detection and non-intrusive banner.

### Phase 7: Verification
23. Test the complete flow: Command Palette search, Play track, Suggestions auto-populate, Auto-play next on end, Save to playlist, History recorded, Queue reorder, Sidebar toggle, Video PiP toggle.
24. Test experimental direct audio mode: Toggle in settings, Playback works, URL expiry auto-retry, Fallback to IFrame mode.
25. Verify keyboard shortcuts all function correctly and are disabled in text inputs.
26. Verify navigator.mediaSession shows correct metadata and controls work from OS media keys.

---

## 7. Critical Constraints & Non-Goals

### Constraints
* **No external UI component libraries** (no shadcn/ui, no Radix, no Headless UI) — build all UI primitives from scratch to maintain the exact monochrome aesthetic.
* **Fully typed.** Zero any types except in the UserPreferences.value field. All API responses, component props, store actions, and hook returns must be typed.
* **No SSR for the main app shell.** The app is entirely client-rendered (use client at the page level). Only the API route handlers run server-side.
* **No build-time code quality tooling** (ESLint, Prettier, Husky). Clean code is enforced by convention, not tooling. May be added later.

### Non-Goals (Explicitly Out of Scope)
* Mobile/tablet responsive design
* User authentication or accounts
* Cloud sync or data export/import
* Light mode or theme customization
* Social features (sharing, comments, likes)
* Offline playback or track caching
* Lyrics display
* Equalizer or audio effects
* Multiple simultaneous playback instances

---

## 8. AI Implementation Guidelines

* **Build the entire codebase cleanly, fully-typed, and modularly.** Each component in its own file, each hook in its own file, no god-files.
* **Follow the implementation order in section 6 strictly.** Each phase builds on the previous.
* **Use semantic HTML** — button for buttons, nav for navigation, main for center stage, aside for sidebars, footer for mini-player.
* **All interactive elements must have proper aria-label attributes** for accessibility.
* **Error boundaries:** Wrap the player components in React error boundaries. If the YouTube IFrame fails to load, show a clear error state with retry button — never a blank screen.
* **Loading states:** Show skeleton loaders for search results and suggestions. Never show raw Loading text.
* **Debounce all search inputs** (300ms) to avoid excessive API calls.
* **Format all durations** as m:ss (e.g., 3:42, 12:05). Use JetBrains Mono font for these.
