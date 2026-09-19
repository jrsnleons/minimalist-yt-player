'use client';

import { useEffect, useRef } from 'react';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import type { FloatingReaction, RoomState } from '@/lib/rooms/roomManager';
import type { Track } from '@/types';

export function useListenTogetherSync() {
  const isInRoom = useListenTogetherStore((s) => s.isInRoom);
  const roomCode = useListenTogetherStore((s) => s.roomCode);
  const isHost = useListenTogetherStore((s) => s.isHost);
  const userId = useListenTogetherStore((s) => s.userId);
  const setRoomSync = useListenTogetherStore((s) => s.setRoomSync);
  const addReactionLocally = useListenTogetherStore((s) => s.addReactionLocally);
  const setSyncStatus = useListenTogetherStore((s) => s.setSyncStatus);
  const allowListenerControls = useListenTogetherStore((s) => s.allowListenerControls);

  // Auto-detect ?room=CODE from URL query on initial load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const codeParam = url.searchParams.get('room');
    if (codeParam && !isInRoom) {
      useListenTogetherStore.getState().openModal(codeParam);
      // Clean query parameter from URL without triggering reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isInRoom]);

  // Clean up session on tab close or navigation using sendBeacon
  useEffect(() => {
    if (!isInRoom || !roomCode) return;

    const handleBeforeUnload = () => {
      const payload = JSON.stringify({ action: 'leave', userId });
      navigator.sendBeacon(
        `/api/rooms/${encodeURIComponent(roomCode)}/action`,
        new Blob([payload], { type: 'application/json' })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isInRoom, roomCode, userId]);

  // Broadcast playback state (Host or when DJ allows listener controls)
  const lastBroadcastRef = useRef<number>(0);
  const isApplyingRemoteSyncRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isInRoom || !roomCode) return;
    const canBroadcast = isHost || allowListenerControls;
    if (!canBroadcast) return;

    const broadcast = (track: Track | null, playing: boolean, prog: number) => {
      lastBroadcastRef.current = Date.now();
      fetch(`/api/rooms/${encodeURIComponent(roomCode)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          userId,
          currentTrack: track,
          isPlaying: playing,
          progress: prog,
        }),
      }).catch(() => {});
    };

    // Broadcast on track, isPlaying, or seek change
    const unsub = usePlayerStore.subscribe((state, prevState) => {
      // Guard against echoing back incoming remote state updates
      if (isApplyingRemoteSyncRef.current) return;

      const trackChanged = state.currentTrack?.id !== prevState.currentTrack?.id;
      const playChanged = state.isPlaying !== prevState.isPlaying;
      const seekChanged = state.seekTarget?.id !== prevState.seekTarget?.id;

      if (trackChanged || playChanged || seekChanged) {
        broadcast(state.currentTrack, state.isPlaying, state.progress);
      }
    });

    // Periodic sync interval (only host runs periodic heartbeat to avoid sync fight)
    const periodicTimer = isHost
      ? setInterval(() => {
          const state = usePlayerStore.getState();
          if (state.isPlaying && Date.now() - lastBroadcastRef.current >= 3800) {
            broadcast(state.currentTrack, state.isPlaying, state.progress);
          }
        }, 4000)
      : null;

    return () => {
      unsub();
      if (periodicTimer) clearInterval(periodicTimer);
    };
  }, [isInRoom, roomCode, isHost, allowListenerControls, userId]);

  // Handle SSE Receiver for all participants with auto-reconnect
  useEffect(() => {
    if (!isInRoom || !roomCode) return;

    let eventSource: EventSource | null = null;
    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let intentionallyClosed = false;
    const MAX_RETRY_DELAY = 30_000;

    function connect() {
      if (intentionallyClosed) return;
      setSyncStatus('syncing');
      const url = `/api/rooms/${encodeURIComponent(roomCode!)}/events?userId=${encodeURIComponent(userId)}`;
      const es = new EventSource(url);
      eventSource = es;

      es.onopen = () => {
        setSyncStatus('synced');
        retryDelay = 1000;
      };

      es.addEventListener('room:sync', (e: MessageEvent) => {
        try {
          const room = JSON.parse(e.data) as RoomState;
          setRoomSync(room);

          // Late joiner: if listener has no track (or track mismatch) and room has one, sync state
          const currentHost = useListenTogetherStore.getState().isHost;
          if (!currentHost && room.currentTrack) {
            const player = usePlayerStore.getState();
            if (!player.currentTrack || player.currentTrack.id !== room.currentTrack.id) {
              isApplyingRemoteSyncRef.current = true;
              usePlayerStore.setState({
                currentTrack: room.currentTrack,
                queue: room.queue?.length ? room.queue : [room.currentTrack],
                queueIndex: 0,
                isPlaying: room.isPlaying,
                progress: room.progress,
                seekTarget: { time: room.progress, id: Date.now() },
              });
              setTimeout(() => {
                isApplyingRemoteSyncRef.current = false;
              }, 150);
            }
          }
        } catch {}
      });

      es.addEventListener('queue:sync', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as { queue: Track[] };
          if (data.queue && Array.isArray(data.queue)) {
            const player = usePlayerStore.getState();
            const currentQueueIds = player.queue.map((t) => t.id).join(',');
            const newQueueIds = data.queue.map((t) => t.id).join(',');
            if (currentQueueIds !== newQueueIds) {
              isApplyingRemoteSyncRef.current = true;
              usePlayerStore.setState({ queue: data.queue });
              setTimeout(() => {
                isApplyingRemoteSyncRef.current = false;
              }, 150);
            }
          }
        } catch {}
      });

      es.addEventListener('host:transfer', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as { newHostId: string; newHostName: string };
          if (data.newHostId === userId) {
            usePlayerStore.getState().showToast('You are now the DJ');
          } else {
            usePlayerStore.getState().showToast(`${data.newHostName} is now the DJ`);
          }
        } catch {}
      });

      es.addEventListener('playback:sync', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as {
            currentTrack: Track | null;
            isPlaying: boolean;
            progress: number;
            timestamp: number;
            queue: Track[];
            initiatorId?: string;
          };

          // Skip applying if this client initiated the action
          if (data.initiatorId && data.initiatorId === userId) {
            return;
          }

          const currentHost = useListenTogetherStore.getState().isHost;
          // If host generated the event and no other initiatorId, host skips
          if (currentHost && (!data.initiatorId || data.initiatorId === userId)) {
            return;
          }

          const player = usePlayerStore.getState();

          // 1. Sync active track
          if (data.currentTrack && data.currentTrack.id !== player.currentTrack?.id) {
            isApplyingRemoteSyncRef.current = true;
            const newIndex = player.queue.findIndex((t) => t.id === data.currentTrack?.id);
            usePlayerStore.setState({
              currentTrack: data.currentTrack,
              queueIndex: newIndex >= 0 ? newIndex : 0,
              isPlaying: data.isPlaying,
              progress: data.progress,
              seekTarget: { time: data.progress, id: Date.now() },
            });
            setTimeout(() => {
              isApplyingRemoteSyncRef.current = false;
            }, 150);
            return;
          }

          // 3. Sync play / pause state
          if (data.isPlaying !== player.isPlaying) {
            isApplyingRemoteSyncRef.current = true;
            usePlayerStore.setState({ isPlaying: data.isPlaying });
            setTimeout(() => {
              isApplyingRemoteSyncRef.current = false;
            }, 150);
          }

          // 4. Soft drift correction (> 1.5s threshold)
          if (data.isPlaying) {
            const elapsedSinceBroadcast = (Date.now() - data.timestamp) / 1000;
            const expectedProgress = data.progress + elapsedSinceBroadcast;
            const drift = Math.abs(player.progress - expectedProgress);

            if (drift > 1.5) {
              isApplyingRemoteSyncRef.current = true;
              player.seek(expectedProgress);
              setTimeout(() => {
                isApplyingRemoteSyncRef.current = false;
              }, 150);
            }
          } else {
            // Paused: align exactly if drifted
            if (Math.abs(player.progress - data.progress) > 1.0) {
              isApplyingRemoteSyncRef.current = true;
              player.seek(data.progress);
              setTimeout(() => {
                isApplyingRemoteSyncRef.current = false;
              }, 150);
            }
          }
        } catch {}
      });

      es.addEventListener('reaction:new', (e: MessageEvent) => {
        try {
          const reaction = JSON.parse(e.data) as FloatingReaction;
          if (reaction.userId !== userId) {
            addReactionLocally(reaction);
          }
        } catch {}
      });

      es.onerror = () => {
        setSyncStatus('offline');
        es.close();
        if (eventSource === es) {
          eventSource = null;
        }

        if (!intentionallyClosed) {
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
            connect();
          }, retryDelay);
        }
      };
    }

    connect();

    return () => {
      intentionallyClosed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      setSyncStatus('offline');
    };
  }, [isInRoom, roomCode, userId, setRoomSync, addReactionLocally, setSyncStatus]);
}
