import { create } from 'zustand';
import type { Track, RepeatMode, PlaybackMode } from '@/types';
import { db } from '@/db/schema';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';

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
  zenMode: boolean;
  ambientVisualizerEnabled: boolean;
  sessionRestoreEnabled: boolean;

  // UI & Drawer
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  queueDrawerOpen: boolean;
  sidebarPlayerMode: 'docked' | 'pill';
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  blurredHeroBackground: boolean;
  toastMessage: string | null;
  shortcutsModalOpen: boolean;

  // Radio Auto-Continuation
  radioQueue: Track[];
  radioSeedTrackIds: string[];
  songsPlayedSinceRadioRefresh: number;

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

  crossfadeDuration: number; // seconds (0 = off, 1-12)
  likedTrackIds: string[];

  // Actions — Modes
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleVideo: () => void;
  setPlaybackMode: (mode: PlaybackMode) => void;
  setCrossfadeDuration: (seconds: number) => void;
  toggleZenMode: (enabled?: boolean) => void;
  toggleAmbientVisualizer: () => void;
  toggleSessionRestore: () => void;

  // Actions — Liked Tracks
  toggleLikeTrack: (track: Track) => Promise<void>;
  isLiked: (trackId: string) => boolean;
  loadLikedTracks: () => Promise<void>;

  // Actions — UI & Drawer
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  toggleQueueDrawer: (open?: boolean) => void;
  setSidebarPlayerMode: (mode: 'docked' | 'pill') => void;
  toggleSidebarPlayerMode: () => void;
  toggleCommandPalette: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleSettings: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleShortcutsModal: (open?: boolean) => void;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
  toggleBlurredHeroBackground: () => void;
  showToast: (message: string) => void;
  dismissToast: () => void;

  // Actions — Radio Auto-Continuation
  refreshRadioQueue: () => Promise<void>;
  removeFromRadioQueue: (index: number) => void;
  addRadioTrackToManualQueue: (track: Track) => void;

  // Actions — History & Session
  addToRecentlyPlayed: (track: Track) => void;
  loadRecentlyPlayed: () => Promise<void>;
  loadSavedPreferences: () => Promise<void>;
  restorePreviousSession: () => Promise<boolean>;
}

// Kept outside of Zustand state so timer management doesn't cause extra re-renders
let _toastTimer: ReturnType<typeof setTimeout> | null = null;
let _sessionSaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSaveSession(state: {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  progress: number;
  sessionRestoreEnabled: boolean;
}) {
  if (!state.sessionRestoreEnabled) return;
  if (_sessionSaveTimer !== null) {
    clearTimeout(_sessionSaveTimer);
  }
  _sessionSaveTimer = setTimeout(() => {
    _sessionSaveTimer = null;
    if (!state.currentTrack && state.queue.length === 0) return;
    db.preferences
      .put({
        key: 'last_session',
        value: {
          currentTrack: state.currentTrack,
          queue: state.queue,
          queueIndex: state.queueIndex,
          progress: state.progress,
          savedAt: Date.now(),
        },
      })
      .catch(() => {});
  }, 1000);
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
  zenMode: false,
  ambientVisualizerEnabled: true,
  sessionRestoreEnabled: true,
  crossfadeDuration: 3,
  likedTrackIds: [],

  leftSidebarOpen: true,
  rightSidebarOpen: true,
  queueDrawerOpen: false,
  sidebarPlayerMode: 'docked',
  commandPaletteOpen: false,
  settingsOpen: false,
  blurredHeroBackground: true,
  toastMessage: null,
  shortcutsModalOpen: false,

  radioQueue: [],
  radioSeedTrackIds: [],
  songsPlayedSinceRadioRefresh: 0,

  // --- Playback Actions ---

  play: (track, queue) => {
    const state = get();
    const updatedSeeds = [track.id, ...state.radioSeedTrackIds.filter((id) => id !== track.id)].slice(0, 5);
    const newPlayedCount = state.songsPlayedSinceRadioRefresh + 1;

    if (queue) {
      const idx = queue.findIndex((t) => t.id === track.id);
      set({
        queue,
        queueIndex: idx >= 0 ? idx : 0,
        currentTrack: track,
        isPlaying: true,
        progress: 0,
        radioSeedTrackIds: updatedSeeds,
        songsPlayedSinceRadioRefresh: newPlayedCount,
      });
    } else {
      // If track is already in queue, jump to it
      const existingIdx = state.queue.findIndex((t) => t.id === track.id);
      if (existingIdx >= 0) {
        set({
          queueIndex: existingIdx,
          currentTrack: track,
          isPlaying: true,
          progress: 0,
          radioSeedTrackIds: updatedSeeds,
          songsPlayedSinceRadioRefresh: newPlayedCount,
        });
      } else {
        // Add to queue and play
        const newQueue = [...state.queue, track];
        set({
          queue: newQueue,
          queueIndex: newQueue.length - 1,
          currentTrack: track,
          isPlaying: true,
          progress: 0,
          radioSeedTrackIds: updatedSeeds,
          songsPlayedSinceRadioRefresh: newPlayedCount,
        });
      }
    }

    if (newPlayedCount >= 5 || state.radioQueue.length === 0) {
      get().refreshRadioQueue();
    }

    // Record to history
    get().addToRecentlyPlayed(track);
    db.history.add({ trackId: track.id, playedAt: Date.now(), durationPlayed: 0 }).catch(() => {});
    db.tracks.put(track).catch(() => {});
    scheduleSaveSession(get());
  },

  pause: () => {
    set({ isPlaying: false });
    scheduleSaveSession(get());
  },

  togglePlay: () => {
    const { isPlaying, currentTrack } = get();
    if (!currentTrack) return;
    set({ isPlaying: !isPlaying });
    scheduleSaveSession(get());
  },

  next: () => {
    const { queue, queueIndex, shuffleMode, repeatMode } = get();
    if (queue.length === 0) {
      // If queue is empty, check radioQueue
      const { radioQueue, radioSeedTrackIds } = get();
      if (radioQueue.length > 0) {
        const [nextRadioTrack, ...remainingRadio] = radioQueue;
        const updatedSeeds = [nextRadioTrack.id, ...radioSeedTrackIds.filter((id) => id !== nextRadioTrack.id)].slice(0, 5);
        set({
          queue: [nextRadioTrack],
          queueIndex: 0,
          currentTrack: nextRadioTrack,
          radioQueue: remainingRadio,
          isPlaying: true,
          progress: 0,
          radioSeedTrackIds: updatedSeeds,
          songsPlayedSinceRadioRefresh: get().songsPlayedSinceRadioRefresh + 1,
        });
        if (remainingRadio.length <= 2) {
          get().refreshRadioQueue();
        }
        get().addToRecentlyPlayed(nextRadioTrack);
        db.history.add({ trackId: nextRadioTrack.id, playedAt: Date.now(), durationPlayed: 0 }).catch(() => {});
        db.tracks.put(nextRadioTrack).catch(() => {});
        scheduleSaveSession(get());
      }
      return;
    }

    if (repeatMode === 'one') {
      // Replay current — seekTarget triggers the player to restart
      set({ progress: 0, isPlaying: true, seekTarget: { time: 0, id: Date.now() } });
      scheduleSaveSession(get());
      return;
    }

    let nextIdx: number;
    if (shuffleMode && queue.length > 1) {
      // Exclude current index so shuffle never plays the same track twice in a row
      do {
        nextIdx = Math.floor(Math.random() * queue.length);
      } while (nextIdx === queueIndex);
    } else {
      nextIdx = queueIndex + 1;
    }

    if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0;
      } else {
        // Auto-continuation from radio queue if available
        const { radioQueue, radioSeedTrackIds } = get();
        if (radioQueue.length > 0) {
          const [nextRadioTrack, ...remainingRadio] = radioQueue;
          const updatedSeeds = [nextRadioTrack.id, ...radioSeedTrackIds.filter((id) => id !== nextRadioTrack.id)].slice(0, 5);
          const newQueue = [...queue, nextRadioTrack];
          set({
            queue: newQueue,
            queueIndex: newQueue.length - 1,
            currentTrack: nextRadioTrack,
            radioQueue: remainingRadio,
            isPlaying: true,
            progress: 0,
            radioSeedTrackIds: updatedSeeds,
            songsPlayedSinceRadioRefresh: get().songsPlayedSinceRadioRefresh + 1,
          });
          if (remainingRadio.length <= 2) {
            get().refreshRadioQueue();
          }
          get().addToRecentlyPlayed(nextRadioTrack);
          db.history.add({ trackId: nextRadioTrack.id, playedAt: Date.now(), durationPlayed: 0 }).catch(() => {});
          db.tracks.put(nextRadioTrack).catch(() => {});
          scheduleSaveSession(get());
          return;
        }
        set({ isPlaying: false });
        scheduleSaveSession(get());
        return;
      }
    }

    const nextTrack = queue[nextIdx];
    set({ queueIndex: nextIdx, currentTrack: nextTrack, isPlaying: true, progress: 0 });
    get().addToRecentlyPlayed(nextTrack);
    db.history.add({ trackId: nextTrack.id, playedAt: Date.now(), durationPlayed: 0 }).catch(() => {});
    scheduleSaveSession(get());
  },

  previous: () => {
    const { queue, queueIndex, progress } = get();
    if (queue.length === 0) return;

    // If more than 3s in or at the first track of queue, restart current track
    if (progress > 3 || queueIndex <= 0) {
      set({ progress: 0, isPlaying: true, seekTarget: { time: 0, id: Date.now() } });
      scheduleSaveSession(get());
      return;
    }

    const prevIdx = queueIndex - 1;
    const prevTrack = queue[prevIdx];
    set({ queueIndex: prevIdx, currentTrack: prevTrack, isPlaying: true, progress: 0 });
    get().addToRecentlyPlayed(prevTrack);
    db.history.add({ trackId: prevTrack.id, playedAt: Date.now(), durationPlayed: 0 }).catch(() => {});
    scheduleSaveSession(get());
  },

  seek: (seconds) => {
    set({ progress: seconds, seekTarget: { time: seconds, id: Date.now() } });
    scheduleSaveSession(get());
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
    const lt = useListenTogetherStore.getState();
    if (lt.isInRoom) {
      const stamped: Track = {
        ...track,
        addedBy: { id: lt.userId, name: lt.userName },
      };
      const currentQueue = get().queue;
      const last = currentQueue[currentQueue.length - 1];
      if (last && last.id === stamped.id && last.addedBy?.id === lt.userId && Date.now() - (last.addedAt || 0) < 1200) {
        return;
      }
      set((s) => ({ queue: [...s.queue, stamped] }));
      lt.addTrackToSharedQueue(stamped);
      get().showToast('Added to shared queue');
      return;
    }
    set((s) => ({ queue: [...s.queue, track] }));
    db.tracks.put(track).catch(() => {});
    scheduleSaveSession(get());
  },

  playNext: (track) => {
    const lt = useListenTogetherStore.getState();
    if (lt.isInRoom) {
      const stamped: Track = {
        ...track,
        addedBy: { id: lt.userId, name: lt.userName },
      };
      const { queue, queueIndex } = get();
      const newQueue = [...queue];
      const insertIndex = queueIndex >= 0 ? queueIndex + 1 : 0;
      newQueue.splice(insertIndex, 0, stamped);
      set({ queue: newQueue });
      lt.addTrackToSharedQueue(stamped, { playNext: true });
      get().showToast('Added to shared queue');
      return;
    }
    const { queue, queueIndex } = get();
    const newQueue = [...queue];
    // Insert immediately after the active track; at front if queue is empty
    const insertIndex = queueIndex >= 0 ? queueIndex + 1 : 0;
    newQueue.splice(insertIndex, 0, track);
    set({ queue: newQueue });
    db.tracks.put(track).catch(() => {});
    scheduleSaveSession(get());
  },

  removeFromQueue: (index) => {
    const { queue, queueIndex } = get();
    const trackToRemove = queue[index];
    const lt = useListenTogetherStore.getState();
    if (lt.isInRoom && trackToRemove) {
      lt.removeTrackFromSharedQueue(trackToRemove.id);
      return;
    }
    const newQueue = queue.filter((_, i) => i !== index);
    let newIdx = queueIndex;
    if (index < queueIndex) newIdx = queueIndex - 1;
    if (index === queueIndex) newIdx = Math.min(queueIndex, newQueue.length - 1);
    set({ queue: newQueue, queueIndex: newIdx });
    scheduleSaveSession(get());
  },

  reorderQueue: (fromIndex, toIndex) => {
    const { queue, currentTrack } = get();
    const newQueue = [...queue];
    const [moved] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, moved);
    // Recompute queueIndex so the currently-playing track stays correct after reorder
    const newIdx = currentTrack ? newQueue.findIndex((t) => t.id === currentTrack.id) : -1;
    set({ queue: newQueue, queueIndex: newIdx });
    scheduleSaveSession(get());

    const lt = useListenTogetherStore.getState();
    if (lt.isInRoom && lt.isHost) {
      lt.reorderSharedQueue(newQueue);
    }
  },

  clearQueue: () => {
    const lt = useListenTogetherStore.getState();
    if (lt.isInRoom && lt.isHost) {
      lt.clearSharedQueue();
    }
    set({ queue: [], queueIndex: -1, currentTrack: null, isPlaying: false });
    db.preferences.delete('last_session').catch(() => {});
  },

  // --- Mode Actions ---

  toggleShuffle: () => {
    set((s) => ({ shuffleMode: !s.shuffleMode }));
  },

  cycleRepeat: () => {
    const { repeatMode } = get();
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    set({ repeatMode: nextMode });
    db.preferences.put({ key: 'repeatMode', value: nextMode }).catch(() => {});
  },

  toggleVideo: () => {
    set((s) => ({ isVideoEnabled: !s.isVideoEnabled }));
    const { isVideoEnabled, showToast } = get();
    showToast(isVideoEnabled ? 'Video mode active (on album cover)' : 'Album cover active');
  },

  setPlaybackMode: (mode) => {
    set({ playbackMode: mode });
    db.preferences.put({ key: 'playbackMode', value: mode }).catch(() => {});
  },

  toggleZenMode: (enabled) => {
    set((s) => ({ zenMode: typeof enabled === 'boolean' ? enabled : !s.zenMode }));
  },

  toggleAmbientVisualizer: () => {
    set((s) => {
      const next = !s.ambientVisualizerEnabled;
      db.preferences.put({ key: 'ambientVisualizerEnabled', value: next }).catch(() => {});
      return { ambientVisualizerEnabled: next };
    });
  },

  toggleSessionRestore: () => {
    set((s) => {
      const next = !s.sessionRestoreEnabled;
      db.preferences.put({ key: 'sessionRestoreEnabled', value: next }).catch(() => {});
      if (!next) {
        db.preferences.delete('last_session').catch(() => {});
      }
      return { sessionRestoreEnabled: next };
    });
  },

  setCrossfadeDuration: (seconds) => {
    const val = Math.max(0, Math.min(12, seconds));
    set({ crossfadeDuration: val });
    db.preferences.put({ key: 'crossfadeDuration', value: val }).catch(() => {});
  },

  // --- Liked Tracks Actions ---

  isLiked: (trackId) => {
    return get().likedTrackIds.includes(trackId);
  },

  toggleLikeTrack: async (track) => {
    const { likedTrackIds, showToast } = get();
    const isCurrentlyLiked = likedTrackIds.includes(track.id);

    if (isCurrentlyLiked) {
      const nextLiked = likedTrackIds.filter((id) => id !== track.id);
      set({ likedTrackIds: nextLiked });
      try {
        const likedPl = await db.playlists.get('liked-songs');
        if (likedPl) {
          await db.playlists.update('liked-songs', {
            trackIds: likedPl.trackIds.filter((id) => id !== track.id),
            updatedAt: Date.now(),
          });
        }
      } catch {}
      showToast(`Removed "${track.title}" from Liked Songs`);
    } else {
      const nextLiked = [track.id, ...likedTrackIds];
      set({ likedTrackIds: nextLiked });
      try {
        await db.tracks.put(track);
        const likedPl = await db.playlists.get('liked-songs');
        if (likedPl) {
          await db.playlists.update('liked-songs', {
            trackIds: [track.id, ...likedPl.trackIds.filter((id) => id !== track.id)],
            updatedAt: Date.now(),
          });
        } else {
          await db.playlists.add({
            id: 'liked-songs',
            name: 'Liked Songs',
            description: 'Your favorite tracks in one collection ❤️',
            trackIds: [track.id],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      } catch {}
      showToast(`Added "${track.title}" to Liked Songs ❤️`);
    }
  },

  loadLikedTracks: async () => {
    try {
      const likedPl = await db.playlists.get('liked-songs');
      if (likedPl && Array.isArray(likedPl.trackIds)) {
        set({ likedTrackIds: likedPl.trackIds });
      }
    } catch {}
  },

  // --- UI Actions ---

  toggleLeftSidebar: () => {
    set((s) => {
      const next = !s.leftSidebarOpen;
      db.preferences.put({ key: 'leftSidebarOpen', value: next }).catch(() => {});
      return { leftSidebarOpen: next };
    });
  },

  toggleRightSidebar: () => {
    set((s) => {
      const next = !s.rightSidebarOpen;
      db.preferences.put({ key: 'rightSidebarOpen', value: next }).catch(() => {});
      return { rightSidebarOpen: next };
    });
  },

  toggleCommandPalette: () => {
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen }));
  },

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  toggleSettings: () => {
    set((s) => ({ settingsOpen: !s.settingsOpen }));
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  toggleShortcutsModal: (open) => {
    set((s) => ({ shortcutsModalOpen: open !== undefined ? open : !s.shortcutsModalOpen }));
  },
  openShortcutsModal: () => set({ shortcutsModalOpen: true }),
  closeShortcutsModal: () => set({ shortcutsModalOpen: false }),

  toggleBlurredHeroBackground: () => {
    set((s) => {
      const next = !s.blurredHeroBackground;
      db.preferences.put({ key: 'blurredHeroBackground', value: next }).catch(() => {});
      return { blurredHeroBackground: next };
    });
  },

  showToast: (message) => {
    // Cancel any pending dismiss timer before showing a new toast.
    if (_toastTimer !== null) {
      clearTimeout(_toastTimer);
    }
    set({ toastMessage: message });
    _toastTimer = setTimeout(() => {
      _toastTimer = null;
      set({ toastMessage: null });
    }, 3000);
  },

  dismissToast: () => {
    if (_toastTimer !== null) {
      clearTimeout(_toastTimer);
      _toastTimer = null;
    }
    set({ toastMessage: null });
  },

  toggleQueueDrawer: (open) => {
    set((s) => ({ queueDrawerOpen: open !== undefined ? open : !s.queueDrawerOpen }));
  },

  setSidebarPlayerMode: (mode) => {
    set({ sidebarPlayerMode: mode });
    db.preferences.put({ key: 'sidebarPlayerMode', value: mode }).catch(() => {});
  },

  toggleSidebarPlayerMode: () => {
    set((s) => {
      const next = s.sidebarPlayerMode === 'docked' ? 'pill' : 'docked';
      db.preferences.put({ key: 'sidebarPlayerMode', value: next }).catch(() => {});
      return { sidebarPlayerMode: next };
    });
  },

  refreshRadioQueue: async () => {
    const { currentTrack, queue, radioSeedTrackIds, radioQueue } = get();
    const seedId = currentTrack?.id || radioSeedTrackIds[0];
    if (!seedId) return;

    try {
      const excludeIds = [
        ...queue.map((t) => t.id),
        ...radioQueue.map((t) => t.id),
        ...(currentTrack ? [currentTrack.id] : []),
      ];
      const params = new URLSearchParams({
        videoId: seedId,
        exclude: excludeIds.slice(-40).join(','),
      });
      const res = await fetch(`/api/radio?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        const currentQueueIds = new Set(get().queue.map((t) => t.id));
        const newSuggestions = data.suggestions.filter((t: Track) => !currentQueueIds.has(t.id));
        set({
          radioQueue: newSuggestions,
          songsPlayedSinceRadioRefresh: 0,
        });
      }
    } catch {
      // Radio refresh silently failed in background
    }
  },

  removeFromRadioQueue: (index) => {
    set((s) => ({
      radioQueue: s.radioQueue.filter((_, i) => i !== index),
    }));
  },

  addRadioTrackToManualQueue: (track) => {
    set((s) => ({
      queue: [...s.queue, track],
      radioQueue: s.radioQueue.filter((t) => t.id !== track.id),
    }));
    db.tracks.put(track).catch(() => {});
    scheduleSaveSession(get());
  },

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
      const [
        volPref,
        repeatPref,
        modePref,
        leftPref,
        rightPref,
        blurPref,
        vizPref,
        restorePref,
        crossfadePref,
        sidebarModePref,
      ] = await Promise.all([
        db.preferences.get('volume'),
        db.preferences.get('repeatMode'),
        db.preferences.get('playbackMode'),
        db.preferences.get('leftSidebarOpen'),
        db.preferences.get('rightSidebarOpen'),
        db.preferences.get('blurredHeroBackground'),
        db.preferences.get('ambientVisualizerEnabled'),
        db.preferences.get('sessionRestoreEnabled'),
        db.preferences.get('crossfadeDuration'),
        db.preferences.get('sidebarPlayerMode'),
      ]);

      set((s) => ({
        volume: typeof volPref?.value === 'number' ? volPref.value : s.volume,
        repeatMode: typeof repeatPref?.value === 'string' ? (repeatPref.value as RepeatMode) : s.repeatMode,
        playbackMode: typeof modePref?.value === 'string' ? (modePref.value as PlaybackMode) : s.playbackMode,
        leftSidebarOpen: typeof leftPref?.value === 'boolean' ? leftPref.value : s.leftSidebarOpen,
        rightSidebarOpen: typeof rightPref?.value === 'boolean' ? rightPref.value : s.rightSidebarOpen,
        blurredHeroBackground: typeof blurPref?.value === 'boolean' ? blurPref.value : s.blurredHeroBackground,
        ambientVisualizerEnabled: typeof vizPref?.value === 'boolean' ? vizPref.value : s.ambientVisualizerEnabled,
        sessionRestoreEnabled: typeof restorePref?.value === 'boolean' ? restorePref.value : s.sessionRestoreEnabled,
        crossfadeDuration: typeof crossfadePref?.value === 'number' ? crossfadePref.value : s.crossfadeDuration,
        sidebarPlayerMode: (sidebarModePref?.value === 'pill' || sidebarModePref?.value === 'docked') ? sidebarModePref.value : s.sidebarPlayerMode,
      }));

      await get().loadLikedTracks();
    } catch {
      // Ignore preference load error
    }
  },

  restorePreviousSession: async () => {
    try {
      const restorePref = await db.preferences.get('sessionRestoreEnabled');
      if (restorePref?.value === false) return false;

      const pref = await db.preferences.get('last_session');
      if (!pref?.value || typeof pref.value !== 'object') return false;

      const session = pref.value as {
        currentTrack: Track | null;
        queue: Track[];
        queueIndex: number;
        progress: number;
      };

      if (!session.currentTrack && (!session.queue || session.queue.length === 0)) {
        return false;
      }

      if (session.queue && session.queue.length > 0) {
        await db.tracks.bulkPut(session.queue).catch(() => {});
      }
      if (session.currentTrack) {
        await db.tracks.put(session.currentTrack).catch(() => {});
      }

      const queue = Array.isArray(session.queue) ? session.queue : [];
      const queueIndex = typeof session.queueIndex === 'number' ? session.queueIndex : 0;
      const progress = typeof session.progress === 'number' && Number.isFinite(session.progress) ? session.progress : 0;

      set({
        queue,
        queueIndex: queue.length > 0 ? Math.min(queueIndex, queue.length - 1) : -1,
        currentTrack: session.currentTrack || (queue.length > 0 ? queue[queueIndex] : null),
        isPlaying: false, // Intentionally paused on load
        progress,
        seekTarget: progress > 0 ? { time: progress, id: Date.now() } : null,
      });

      return true;
    } catch {
      return false;
    }
  },
}));
