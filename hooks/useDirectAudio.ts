'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { AudioEngine, type StreamResult } from '@/lib/audioEngine';

async function resolveStream(trackId: string, signal: AbortSignal): Promise<StreamResult> {
  const res = await fetch(`/api/stream?videoId=${trackId}`, { signal });
  const data = (await res.json()) as { url?: string; loudnessDb?: number | null };
  if (!data.url) throw new Error('No stream URL');
  return { url: data.url, loudnessDb: data.loudnessDb ?? null };
}

/**
 * Direct audio mode. Playback, gapless hand-off, crossfade and loudness
 * normalization live in AudioEngine (lib/audioEngine.ts); this hook wires it
 * to the player store.
 */
export function useDirectAudio() {
  const engineRef = useRef<AudioEngine | null>(null);

  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const crossfadeDuration = usePlayerStore((s) => s.crossfadeDuration);
  const normalizeVolume = usePlayerStore((s) => s.normalizeVolume);
  const seekTarget = usePlayerStore((s) => s.seekTarget);

  /** Create the engine once; tear everything down on unmount */
  useEffect(() => {
    const engine = new AudioEngine({
      resolve: resolveStream,
      peekNext: () => usePlayerStore.getState().peekNextTrack()?.id ?? null,
      advance: () => usePlayerStore.getState().next(),
      getCurrentTrackId: () => usePlayerStore.getState().currentTrack?.id ?? null,
      getSettings: () => {
        const s = usePlayerStore.getState();
        return {
          volume: s.volume,
          muted: s.isMuted,
          crossfade: s.crossfadeDuration,
          normalize: s.normalizeVolume,
          playing: s.isPlaying,
        };
      },
      onProgress: (t) => usePlayerStore.getState().setProgress(t),
      onDuration: (d) => usePlayerStore.getState().setDuration(d),
      onError: (msg) => usePlayerStore.getState().showToast(msg),
    });
    engineRef.current = engine;

    // Re-validate the preloaded track when the queue or play order changes.
    const unsubscribe = usePlayerStore.subscribe((state, prev) => {
      if (
        state.queue !== prev.queue ||
        state.queueIndex !== prev.queueIndex ||
        state.radioQueue !== prev.radioQueue ||
        state.repeatMode !== prev.repeatMode ||
        state.shuffleMode !== prev.shuffleMode
      ) {
        engine.onQueueChanged();
      }
    });

    // Pick up state that was set before the engine existed (e.g. restored session).
    const initial = usePlayerStore.getState();
    if (initial.currentTrack?.id) engine.setTrack(initial.currentTrack.id);

    return () => {
      unsubscribe();
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  /** Load track (engine skips if it already handed off to this track itself) */
  useEffect(() => {
    if (currentTrackId) engineRef.current?.setTrack(currentTrackId);
  }, [currentTrackId]);

  /** Play/Pause sync */
  useEffect(() => {
    engineRef.current?.setPlaying(isPlaying);
  }, [isPlaying, currentTrackId]);

  /** Volume / mute / crossfade / normalization sync */
  useEffect(() => {
    engineRef.current?.applySettings();
  }, [volume, isMuted, crossfadeDuration, normalizeVolume]);

  /** Seek reaction */
  useEffect(() => {
    if (!seekTarget) return;
    engineRef.current?.seek(seekTarget.time);
  }, [seekTarget]);
}
