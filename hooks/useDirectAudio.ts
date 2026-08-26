'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';

export function useDirectAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastVideoId = useRef<string | null>(null);

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    seekTarget,
    setProgress,
    setDuration,
    next,
    showToast,
    setPlaybackMode,
  } = usePlayerStore();

  /** Create audio element once */
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (typeof audio.currentTime === 'number' && !isNaN(audio.currentTime)) {
        setProgress(audio.currentTime);
      }
    };
    const onDurationChange = () => {
      if (typeof audio.duration === 'number' && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => next();
    const onError = async () => {
      // URL expired — try to re-fetch
      if (!lastVideoId.current) return;
      try {
        showToast('Re-fetching direct audio stream…');
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
        showToast('Stream error — falling back to IFrame mode');
        setPlaybackMode('iframe');
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, [setProgress, setDuration, next, showToast, setPlaybackMode]);

  /** Load track */
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    lastVideoId.current = currentTrack.id;

    const loadAndPlay = async () => {
      try {
        const res = await fetch(`/api/stream?videoId=${currentTrack.id}`);
        const data = (await res.json()) as { url?: string };
        if (!data.url) throw new Error('No stream URL');
        if (audioRef.current) {
          audioRef.current.src = data.url;
          if (isPlaying) {
            audioRef.current.play().catch(() => {});
          }
        }
      } catch {
        showToast('Direct audio failed — falling back to IFrame mode');
        setPlaybackMode('iframe');
      }
    };

    loadAndPlay();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

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
    } catch {}
  }, [seekTarget]);
}
