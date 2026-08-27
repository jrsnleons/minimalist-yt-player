'use client';

import { useEffect } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';

export function useMediaSession() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        artwork: [
          { src: currentTrack.thumbnailUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    }

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [currentTrack, isPlaying]);

  // Register action handlers once using getState() so none of the actions
  // are stale closures and the effect has no dependencies that change frequently.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const trySetHandler = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null
    ) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some browsers throw for unsupported action names
      }
    };

    trySetHandler('play', () => {
      const s = usePlayerStore.getState();
      if (!s.isPlaying) s.togglePlay();
    });
    trySetHandler('pause', () => usePlayerStore.getState().pause());
    trySetHandler('previoustrack', () => usePlayerStore.getState().previous());
    trySetHandler('nexttrack', () => usePlayerStore.getState().next());
    trySetHandler('seekto', (details) => {
      if (details.seekTime !== undefined) usePlayerStore.getState().seek(details.seekTime);
    });
    trySetHandler('seekbackward', (details) => {
      const { progress, seek } = usePlayerStore.getState();
      seek(Math.max(0, progress - (details.seekOffset ?? 10)));
    });
    trySetHandler('seekforward', (details) => {
      const { progress, seek } = usePlayerStore.getState();
      seek(progress + (details.seekOffset ?? 10));
    });

    return () => {
      trySetHandler('play', null);
      trySetHandler('pause', null);
      trySetHandler('previoustrack', null);
      trySetHandler('nexttrack', null);
      trySetHandler('seekto', null);
      trySetHandler('seekbackward', null);
      trySetHandler('seekforward', null);
    };
  }, []); // Empty deps: all state accessed via getState() at call-time

  // Keep OS lock-screen scrubber in sync with playback position
  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;

    const { progress, duration } = usePlayerStore.getState();
    if (duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1,
          position: Math.min(progress, duration),
        });
      } catch {
        // Not supported on all platforms
      }
    }
  }, [currentTrack]);
}
