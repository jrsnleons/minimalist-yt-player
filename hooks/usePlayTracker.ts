'use client';

import { useEffect } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { db } from '@/db/schema';

/** A listen counts once a song has played for 30s, or half its length when that is shorter. */
export const PLAY_THRESHOLD_SECONDS = 30;

interface Session {
  trackId: string;
  startedAt: number;
  ms: number;
  playId: number | null;
  saving: boolean;
  lastFlushMs: number;
}

/**
 * Tracks how long the current song has actually been playing, records a `plays` row once the
 * threshold is reached, keeps its listened time up to date, and maintains the session history
 * (songs played since launch) shown above Up Next.
 */
export function usePlayTracker() {
  useEffect(() => {
    let session: Session | null = null;

    const flush = (s: Session | null) => {
      if (!s || s.playId === null) return;
      db.plays.update(s.playId, { msListened: Math.round(s.ms) }).catch(() => {});
    };

    const startSession = (trackId: string) => {
      session = { trackId, startedAt: Date.now(), ms: 0, playId: null, saving: false, lastFlushMs: 0 };
    };

    const initial = usePlayerStore.getState().currentTrack;
    if (initial) startSession(initial.id);

    const unsubscribe = usePlayerStore.subscribe((state, prev) => {
      const id = state.currentTrack?.id ?? null;
      const prevId = prev.currentTrack?.id ?? null;
      if (id === prevId) return;
      flush(session);
      session = null;
      if (state.playbackError && state.playbackError.trackId !== id) state.clearPlaybackError();
      if (prev.currentTrack) state.pushSessionHistory(prev.currentTrack);
      if (id) startSession(id);
    });

    const TICK = 1000;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(now - last, 2500);
      last = now;
      const state = usePlayerStore.getState();
      if (!session || !state.isPlaying) return;
      if (state.currentTrack?.id !== session.trackId) return;
      if (state.playbackError?.trackId === session.trackId) return;
      session.ms += elapsed;

      const duration = state.duration > 0 ? state.duration : state.currentTrack?.duration ?? 0;
      const threshold = (duration > 0 ? Math.min(PLAY_THRESHOLD_SECONDS, duration / 2) : PLAY_THRESHOLD_SECONDS) * 1000;
      if (session.playId === null && !session.saving && session.ms >= threshold) {
        const s = session;
        s.saving = true;
        db.plays
          .add({ trackId: s.trackId, playedAt: s.startedAt, msListened: Math.round(s.ms) })
          .then((id) => {
            s.playId = id as number;
            s.saving = false;
          })
          .catch(() => {
            s.saving = false;
          });
      } else if (session.playId !== null && session.ms - session.lastFlushMs >= 15000) {
        session.lastFlushMs = session.ms;
        flush(session);
      }
    }, TICK);

    const onHide = () => flush(session);
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);

    return () => {
      clearInterval(timer);
      unsubscribe();
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      flush(session);
    };
  }, []);
}
