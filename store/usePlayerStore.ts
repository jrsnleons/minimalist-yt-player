import { create } from 'zustand';
import type { Track, RepeatMode, PlaybackMode } from '@/types';
import { db } from '@/db/schema';

interface PlayerState {
  // Playback
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // seconds
  duration: number; // seconds
  volume: number; // 0-100
  isMuted: boolean;
  seekTarget: { time: number; id: number } | null;

  // Queue & History
  queue: Track[];
  queueIndex: number;
  recentlyPlayed: Track[]; // last 50

  // Modes
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  playbackMode: PlaybackMode;
  isVideoEnabled: boolean;

  // UI
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  blurredHeroBackground: boolean;
  toastMessage: string | null;

  // Actions — Playback
  play: (track: Track, queue?: Track[]) => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setProgress: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  // Actions — Queue
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;

  // Actions — Modes
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleVideo: () => void;
  setPlaybackMode: (mode: PlaybackMode) => void;

  // Actions — UI
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  toggleCommandPalette: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleSettings: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleBlurredHeroBackground: () => void;
  showToast: (message: string) => void;
  dismissToast: () => void;

  // Actions — History
  addToRecentlyPlayed: (track: Track) => void;
  loadRecentlyPlayed: () => Promise<void>;
  loadSavedPreferences: () => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // Initial state
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 80,
  isMuted: false,
  seekTarget: null,

  queue: [],
  queueIndex: -1,
  recentlyPlayed: [],

  shuffleMode: false,
  repeatMode: 'off',
  playbackMode: 'iframe',
  isVideoEnabled: false,

  leftSidebarOpen: true,
  rightSidebarOpen: true,
  commandPaletteOpen: false,
  settingsOpen: false,
  blurredHeroBackground: true,
  toastMessage: null,

  // --- Playback Actions ---

  play: (track, queue) => {
    const state = get();
    if (queue) {
      const idx = queue.findIndex((t) => t.id === track.id);
      set({ queue, queueIndex: idx >= 0 ? idx : 0, currentTrack: track, isPlaying: true, progress: 0 });
    } else {
      // If track is already in queue, jump to it
      const existingIdx = state.queue.findIndex((t) => t.id === track.id);
      if (existingIdx >= 0) {
        set({ queueIndex: existingIdx, currentTrack: track, isPlaying: true, progress: 0 });
      } else {
        // Add to queue and play
        const newQueue = [...state.queue, track];
        set({ queue: newQueue, queueIndex: newQueue.length - 1, currentTrack: track, isPlaying: true, progress: 0 });
      }
    }
    // Record to history
    get().addToRecentlyPlayed(track);
    db.history.add({ trackId: track.id, playedAt: Date.now(), durationPlayed: 0 }).catch(() => {});
    db.tracks.put(track).catch(() => {});
  },

  pause: () => set({ isPlaying: false }),

  togglePlay: () => {
    const { isPlaying, currentTrack } = get();
    if (!currentTrack) return;
    set({ isPlaying: !isPlaying });
  },

  next: () => {
    const { queue, queueIndex, shuffleMode, repeatMode } = get();
    if (queue.length === 0) return;

    if (repeatMode === 'one') {
      // Replay current
      set({ progress: 0, isPlaying: true, seekTarget: { time: 0, id: Date.now() } });
      return;
    }

    let nextIdx: number;
    if (shuffleMode) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = queueIndex + 1;
    }

    if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0;
      } else {
        set({ isPlaying: false });
        return;
      }
    }

    const nextTrack = queue[nextIdx];
    set({ queueIndex: nextIdx, currentTrack: nextTrack, isPlaying: true, progress: 0 });
    get().addToRecentlyPlayed(nextTrack);
    db.history.add({ trackId: nextTrack.id, playedAt: Date.now(), durationPlayed: 0 }).catch(() => {});
  },

  previous: () => {
    const { queue, queueIndex, progress } = get();
    if (queue.length === 0) return;

    // If more than 3s in, restart current track
    if (progress > 3) {
      set({ progress: 0, seekTarget: { time: 0, id: Date.now() } });
      return;
    }

    const prevIdx = Math.max(0, queueIndex - 1);
    const prevTrack = queue[prevIdx];
    set({ queueIndex: prevIdx, currentTrack: prevTrack, isPlaying: true, progress: 0 });
  },

  seek: (seconds) => {
    set({ progress: seconds, seekTarget: { time: seconds, id: Date.now() } });
  },
  setProgress: (seconds) => set({ progress: seconds }),
  setDuration: (seconds) => set({ duration: seconds }),

  setVolume: (volume) => {
    const vol = Math.max(0, Math.min(100, volume));
    set({ volume: vol, isMuted: false });
    db.preferences.put({ key: 'volume', value: vol }).catch(() => {});
  },

  toggleMute: () => {
    set((s) => ({ isMuted: !s.isMuted }));
  },

  // --- Queue Actions ---

  addToQueue: (track) => {
    set((s) => ({ queue: [...s.queue, track] }));
    db.tracks.put(track).catch(() => {});
  },

  playNext: (track) => {
    const { queue, queueIndex } = get();
    const newQueue = [...queue];
    // If a track is active, insert immediately after it; otherwise insert at start
    const insertIndex = queueIndex >= 0 ? queueIndex + 1 : 0;
    newQueue.splice(insertIndex, 0, track);
    set({ queue: newQueue });
    db.tracks.put(track).catch(() => {});
  },

  removeFromQueue: (index) => {
    const { queue, queueIndex } = get();
    const newQueue = queue.filter((_, i) => i !== index);
    let newIdx = queueIndex;
    if (index < queueIndex) newIdx = queueIndex - 1;
    if (index === queueIndex) newIdx = Math.min(queueIndex, newQueue.length - 1);
    set({ queue: newQueue, queueIndex: newIdx });
  },

  reorderQueue: (fromIndex, toIndex) => {
    const { queue } = get();
    const newQueue = [...queue];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved);
    set({ queue: newQueue });
  },

  clearQueue: () => set({ queue: [], queueIndex: -1, currentTrack: null, isPlaying: false }),

  // --- Mode Actions ---

  toggleShuffle: () => {
    set((s) => ({ shuffleMode: !s.shuffleMode }));
  },

  cycleRepeat: () => {
    const { repeatMode } = get();
    const next: RepeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    set({ repeatMode: next });
    db.preferences.put({ key: 'repeatMode', value: next }).catch(() => {});
  },

  toggleVideo: () => {
    const { playbackMode } = get();
    if (playbackMode === 'direct-audio') {
      get().showToast('Video PiP is not available in direct audio mode');
      return;
    }
    set((s) => ({ isVideoEnabled: !s.isVideoEnabled }));
  },

  setPlaybackMode: (mode) => {
    set({ playbackMode: mode, isVideoEnabled: false });
    db.preferences.put({ key: 'playbackMode', value: mode }).catch(() => {});
  },

  // --- UI Actions ---

  toggleLeftSidebar: () => {
    set((s) => {
      const open = !s.leftSidebarOpen;
      db.preferences.put({ key: 'leftSidebarOpen', value: open }).catch(() => {});
      return { leftSidebarOpen: open };
    });
  },

  toggleRightSidebar: () => {
    set((s) => {
      const open = !s.rightSidebarOpen;
      db.preferences.put({ key: 'rightSidebarOpen', value: open }).catch(() => {});
      return { rightSidebarOpen: open };
    });
  },

  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  toggleBlurredHeroBackground: () => {
    set((s) => {
      const next = !s.blurredHeroBackground;
      db.preferences.put({ key: 'blurredHeroBackground', value: next }).catch(() => {});
      return { blurredHeroBackground: next };
    });
  },

  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => {
      const current = get().toastMessage;
      if (current === message) {
        set({ toastMessage: null });
      }
    }, 3000);
  },

  dismissToast: () => set({ toastMessage: null }),

  // --- History & Persistence Actions ---

  addToRecentlyPlayed: (track) => {
    set((s) => {
      const filtered = s.recentlyPlayed.filter((t) => t.id !== track.id);
      return { recentlyPlayed: [track, ...filtered].slice(0, 50) };
    });
  },

  loadRecentlyPlayed: async () => {
    try {
      const entries = await db.history
        .orderBy('playedAt')
        .reverse()
        .limit(50)
        .toArray();
      const trackIds = [...new Set(entries.map((e) => e.trackId))];
      const tracks = await Promise.all(trackIds.map((id) => db.tracks.get(id)));
      const validTracks = tracks.filter((t): t is Track => t !== undefined);
      set({ recentlyPlayed: validTracks });
    } catch {
      // IndexedDB might not be available or empty
    }
  },

  loadSavedPreferences: async () => {
    try {
      const [volPref, repeatPref, modePref, leftPref, rightPref, blurPref] = await Promise.all([
        db.preferences.get('volume'),
        db.preferences.get('repeatMode'),
        db.preferences.get('playbackMode'),
        db.preferences.get('leftSidebarOpen'),
        db.preferences.get('rightSidebarOpen'),
        db.preferences.get('blurredHeroBackground'),
      ]);

      set((s) => ({
        volume: typeof volPref?.value === 'number' ? volPref.value : s.volume,
        repeatMode: typeof repeatPref?.value === 'string' ? (repeatPref.value as RepeatMode) : s.repeatMode,
        playbackMode: typeof modePref?.value === 'string' ? (modePref.value as PlaybackMode) : s.playbackMode,
        leftSidebarOpen: typeof leftPref?.value === 'boolean' ? leftPref.value : s.leftSidebarOpen,
        rightSidebarOpen: typeof rightPref?.value === 'boolean' ? rightPref.value : s.rightSidebarOpen,
        blurredHeroBackground: typeof blurPref?.value === 'boolean' ? blurPref.value : s.blurredHeroBackground,
      }));
    } catch {
      // Ignore preference load error
    }
  },
}));
