'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';

export function useDirectAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastVideoId = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const fetchControllerRef = useRef<AbortController | null>(null);

  // Use atomic selectors to prevent subscribing to progress or unrelated state
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const seekTarget = usePlayerStore((s) => s.seekTarget);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const next = usePlayerStore((s) => s.next);
  const showToast = usePlayerStore((s) => s.showToast);

  /** Create audio element once */
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    // Apply initial volume immediately to avoid flash of full-volume audio
    audio.volume = (usePlayerStore.getState().isMuted ? 0 : usePlayerStore.getState().volume) / 100;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (typeof audio.currentTime === 'number' && Number.isFinite(audio.currentTime)) {
        setProgress(audio.currentTime);

        // Auto crossfade volume curve
        const state = usePlayerStore.getState();
        const crossfadeSec = state.crossfadeDuration;
        const baseVolume = state.isMuted ? 0 : state.volume / 100;
        const total = audio.duration;

        if (crossfadeSec > 0 && !state.isMuted && total > crossfadeSec * 2) {
          const current = audio.currentTime;
          const timeLeft = total - current;
          if (current < crossfadeSec) {
            audio.volume = Math.max(0, Math.min(1, baseVolume * (current / crossfadeSec)));
          } else if (timeLeft < crossfadeSec) {
            audio.volume = Math.max(0, Math.min(1, baseVolume * (timeLeft / crossfadeSec)));
          } else {
            audio.volume = baseVolume;
          }
        }
      }
    };
    const onDurationChange = () => {
      if (typeof audio.duration === 'number' && Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => next();
    const onError = async () => {
      if (!lastVideoId.current) return;
      // Limit retries to 1 to prevent an infinite error loop (each src= assignment
      // can trigger another error event if the new URL also fails)
      if (retryCountRef.current >= 1) {
        showToast('Direct stream unavailable for this track');
        retryCountRef.current = 0;
        return;
      }
      retryCountRef.current += 1;
      try {
        const lastTime = audio.currentTime || 0;
        const res = await fetch(`/api/stream?videoId=${lastVideoId.current}`);
        const data = (await res.json()) as { url?: string };
        if (data.url && audioRef.current) {
          audioRef.current.src = data.url;
          audioRef.current.currentTime = lastTime;
          audioRef.current.play().catch(() => {});
        } else {
          throw new Error('No URL');
        }
      } catch {
        showToast('Direct stream unavailable for this track');
        retryCountRef.current = 0;
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      // Clear src to release media buffers and stop network streams (important in WebKit)
      audio.src = '';
      audio.load();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, [setProgress, setDuration, next, showToast]);

  /** Load track — abort previous fetch to avoid race conditions on rapid skipping */
  useEffect(() => {
    if (!audioRef.current || !currentTrackId) return;
    lastVideoId.current = currentTrackId;
    retryCountRef.current = 0; // Reset retry counter on each new track

    // Cancel any in-flight fetch from a previous track
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    const loadAndPlay = async () => {
      try {
        const res = await fetch(`/api/stream?videoId=${currentTrackId}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { url?: string };
        if (!data.url) throw new Error('No stream URL');
        // Only update if the controller hasn't been aborted by a newer track
        if (!controller.signal.aborted && audioRef.current) {
          audioRef.current.src = data.url;
          if (usePlayerStore.getState().isPlaying) {
            audioRef.current.play().catch(() => {});
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return; // Expected — newer track loaded
        showToast('Direct audio extraction in experimental mode — fallback active');
      }
    };

    loadAndPlay();
  }, [currentTrackId, showToast]);

  /** Play/Pause sync */
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  /** Volume/mute sync */
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume / 100;
    audioRef.current.muted = isMuted;
  }, [volume, isMuted]);

  /** Seek reaction */
  useEffect(() => {
    if (!seekTarget || !audioRef.current) return;
    try {
      audioRef.current.currentTime = seekTarget.time;
      if (usePlayerStore.getState().isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    } catch {}
  }, [seekTarget]);
}
