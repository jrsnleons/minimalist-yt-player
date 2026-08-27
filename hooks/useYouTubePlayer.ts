'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

declare namespace YT {
  class Player {
    constructor(elementId: string, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    setVolume(volume: number): void;
    getVolume(): number;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    getCurrentTime(): number;
    getDuration(): number;
    loadVideoById(options: { videoId: string; startSeconds?: number }): void;
    destroy(): void;
  }

  interface PlayerOptions {
    height?: string | number;
    width?: string | number;
    videoId?: string;
    playerVars?: PlayerVars;
    events?: PlayerEvents;
  }

  interface PlayerVars {
    controls?: 0 | 1;
    disablekb?: 0 | 1;
    modestbranding?: 0 | 1;
    rel?: 0 | 1;
    iv_load_policy?: 1 | 3;
    autoplay?: 0 | 1;
    playsinline?: 0 | 1;
  }

  interface PlayerEvents {
    onReady?: (event: PlayerEvent) => void;
    onStateChange?: (event: OnStateChangeEvent) => void;
    onError?: (event: OnErrorEvent) => void;
  }

  interface PlayerEvent {
    target: Player;
  }

  interface OnStateChangeEvent extends PlayerEvent {
    data: number;
  }

  interface OnErrorEvent extends PlayerEvent {
    data: number;
  }

  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }
}

export function useYouTubePlayer() {
  const playerRef = useRef<YT.Player | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);
  const lastPollRef = useRef<number>(0);
  const isAPIReady = useRef(false);
  const pendingVideoId = useRef<string | null>(null);
  const isSkippingRef = useRef(false);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use atomic selectors to prevent subscribing to progress or other unrelated state changes
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const seekTarget = usePlayerStore((s) => s.seekTarget);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const showToast = usePlayerStore((s) => s.showToast);

  /** Progress polling throttled to ~250ms to avoid 60fps React state re-render cascades */
  const startPolling = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const poll = (time: number) => {
      if (playerRef.current && isAPIReady.current) {
        if (time - lastPollRef.current >= 250) {
          lastPollRef.current = time;
          try {
            const current = playerRef.current.getCurrentTime();
            const total = playerRef.current.getDuration();
            if (typeof current === 'number' && Number.isFinite(current)) setProgress(current);
            if (typeof total === 'number' && Number.isFinite(total) && total > 0) {
              setDuration(total);

              // Auto crossfade fade-out and fade-in calculation
              const state = usePlayerStore.getState();
              const crossfadeSec = state.crossfadeDuration;
              if (crossfadeSec > 0 && !state.isMuted && total > crossfadeSec * 2) {
                const timeLeft = total - current;
                let targetVol = state.volume;
                if (current < crossfadeSec) {
                  // Fade in
                  const factor = Math.max(0, Math.min(1, current / crossfadeSec));
                  targetVol = Math.round(state.volume * factor);
                  playerRef.current.setVolume(targetVol);
                } else if (timeLeft < crossfadeSec) {
                  // Fade out
                  const factor = Math.max(0, Math.min(1, timeLeft / crossfadeSec));
                  targetVol = Math.round(state.volume * factor);
                  playerRef.current.setVolume(targetVol);
                }
              }
            }
          } catch {
            // Player may not be ready yet
          }
        }
      }
      rafRef.current = requestAnimationFrame(poll);
    };
    rafRef.current = requestAnimationFrame(poll);
  }, [setProgress, setDuration]);

  const stopPolling = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  /** Auto skip when playback fails */
  const handleAutoSkip = useCallback(
    (reason: string) => {
      if (isSkippingRef.current) return;
      isSkippingRef.current = true;
      showToast(`${reason} — auto-skipping…`);
      stopPolling();

      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
      skipTimerRef.current = setTimeout(async () => {
        const state = usePlayerStore.getState();
        const hasNextInQueue =
          state.queue.length > 0 && state.queueIndex < state.queue.length - 1;

        if (hasNextInQueue) {
          state.next();
        } else {
          // If queue ended or empty, auto-fetch suggestions so playback continues seamlessly
          try {
            const res = await fetch('/api/search?q=lofi+focus+beats');
            const data = await res.json();
            if (data.results?.length > 0) {
              state.play(data.results[0], data.results);
            } else {
              state.next();
            }
          } catch {
            state.next();
          }
        }
        isSkippingRef.current = false;
        skipTimerRef.current = null;
      }, 600);
    },
    [showToast, stopPolling]
  );

  /** Initialize YT IFrame API */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted || !document.getElementById('yt-player-container')) return;
      try {
        const player = new window.YT.Player('yt-player-container', {
          height: '100%',
          width: '100%',
          playerVars: {
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            autoplay: 1,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              if (!isMounted) return;
              isAPIReady.current = true;
              const storeState = usePlayerStore.getState();
              if (storeState.isMuted) {
                player.mute();
              } else {
                player.unMute();
                player.setVolume(storeState.volume);
              }
              if (pendingVideoId.current) {
                player.loadVideoById({ videoId: pendingVideoId.current });
                pendingVideoId.current = null;
              }
            },
            onStateChange: (event) => {
              if (!isMounted) return;
              const state = usePlayerStore.getState();
              if (event.data === 0) {
                // ENDED
                stopPolling();
                state.next();
              } else if (event.data === 1) {
                // PLAYING
                if (!state.isPlaying) {
                  usePlayerStore.setState({ isPlaying: true });
                }
                startPolling();
              } else if (event.data === 2) {
                // PAUSED
                if (state.isPlaying) {
                  usePlayerStore.setState({ isPlaying: false });
                }
                stopPolling();
              }
            },
            onError: (event) => {
              if (!isMounted) return;
              const code = event.data;
              let reason = 'Playback error';
              if (code === 101 || code === 150) {
                reason = 'Embedding restricted by owner';
              } else if (code === 100) {
                reason = 'Video deleted or private';
              } else if (code === 2) {
                reason = 'Invalid video ID';
              }
              handleAutoSkip(reason);
            },
          },
        });
        playerRef.current = player;
      } catch (err) {
        console.error('[YouTubePlayer] Init error:', err);
      }
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }

    return () => {
      isMounted = false;
      stopPolling();
      if (skipTimerRef.current) {
        clearTimeout(skipTimerRef.current);
        skipTimerRef.current = null;
      }
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
      isAPIReady.current = false;
    };
  }, [startPolling, stopPolling, handleAutoSkip]);

  /** Load video when currentTrack changes */
  useEffect(() => {
    const videoId = currentTrackId;
    if (!videoId) return;

    if (isAPIReady.current && playerRef.current) {
      try {
        playerRef.current.loadVideoById({ videoId });
      } catch {
        pendingVideoId.current = videoId;
      }
    } else {
      pendingVideoId.current = videoId;
    }
  }, [currentTrackId]);

  /** Sync play/pause */
  useEffect(() => {
    if (!playerRef.current || !isAPIReady.current) return;
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch {}
  }, [isPlaying]);

  /** Sync volume */
  useEffect(() => {
    if (!playerRef.current || !isAPIReady.current) return;
    try {
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume);
      }
    } catch {}
  }, [volume, isMuted]);

  /** Seek reaction */
  useEffect(() => {
    if (!seekTarget || !playerRef.current || !isAPIReady.current) return;
    try {
      playerRef.current.seekTo(seekTarget.time, true);
      if (usePlayerStore.getState().isPlaying) {
        playerRef.current.playVideo();
      }
    } catch {}
  }, [seekTarget]);

  return { containerRef };
}
