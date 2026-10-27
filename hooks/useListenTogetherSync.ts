'use client';

import { useEffect, useRef } from 'react';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { getTransport, peekTransport } from '@/lib/realtime/transport';
import type { PlaybackSync } from '@/lib/realtime/transport';
import type { RoomState } from '@/lib/rooms/roomManager';
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
      peekTransport()?.rooms.leaveOnUnload(roomCode, userId);
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
      getTransport()
        .then((t) =>
          t.rooms.act(roomCode, userId, { action: 'sync', currentTrack: track, isPlaying: playing, progress: prog })
        )
        .catch(() => {});
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

  // Receive room events from the active transport (Ably channel or SSE stream)
  useEffect(() => {
    if (!isInRoom || !roomCode) return;

    let stopped = false;
    let stop: (() => void) | null = null;

    const applyBriefly = (apply: () => void) => {
      isApplyingRemoteSyncRef.current = true;
      apply();
      setTimeout(() => {
        isApplyingRemoteSyncRef.current = false;
      }, 150);
    };

    const onRoomSync = (room: RoomState) => {
      setRoomSync(room);

      // Late joiner: if listener has no track (or track mismatch) and room has one, sync state
      const currentHost = useListenTogetherStore.getState().isHost;
      if (!currentHost && room.currentTrack) {
        const player = usePlayerStore.getState();
        if (!player.currentTrack || player.currentTrack.id !== room.currentTrack.id) {
          applyBriefly(() =>
            usePlayerStore.setState({
              currentTrack: room.currentTrack,
              queue: room.queue?.length ? room.queue : [room.currentTrack as Track],
              queueIndex: 0,
              isPlaying: room.isPlaying,
              progress: room.progress,
              seekTarget: { time: room.progress, id: Date.now() },
            })
          );
        }
      }
    };

    const onQueueSync = (queue: Track[]) => {
      const player = usePlayerStore.getState();
      const currentQueueIds = player.queue.map((t) => t.id).join(',');
      const newQueueIds = queue.map((t) => t.id).join(',');
      if (currentQueueIds !== newQueueIds) {
        applyBriefly(() => usePlayerStore.setState({ queue }));
      }
    };

    const onHostTransfer = (data: { newHostId: string; newHostName: string }) => {
      if (data.newHostId === userId) {
        usePlayerStore.getState().showToast('You are now the DJ');
      } else {
        usePlayerStore.getState().showToast(`${data.newHostName} is now the DJ`);
      }
    };

    const onPlaybackSync = (data: PlaybackSync) => {
      // Skip applying if this client initiated the action
      if (data.initiatorId && data.initiatorId === userId) return;

      const currentHost = useListenTogetherStore.getState().isHost;
      // If host generated the event and no other initiatorId, host skips
      if (currentHost && (!data.initiatorId || data.initiatorId === userId)) return;

      const player = usePlayerStore.getState();

      // 1. Sync active track
      if (data.currentTrack && data.currentTrack.id !== player.currentTrack?.id) {
        const track = data.currentTrack;
        applyBriefly(() => {
          const newIndex = player.queue.findIndex((t) => t.id === track.id);
          usePlayerStore.setState({
            currentTrack: track,
            queueIndex: newIndex >= 0 ? newIndex : 0,
            isPlaying: data.isPlaying,
            progress: data.progress,
            seekTarget: { time: data.progress, id: Date.now() },
          });
        });
        return;
      }

      // 3. Sync play / pause state
      if (data.isPlaying !== player.isPlaying) {
        applyBriefly(() => usePlayerStore.setState({ isPlaying: data.isPlaying }));
      }

      // 4. Soft drift correction (> 1.5s threshold)
      if (data.isPlaying) {
        const elapsedSinceBroadcast = (Date.now() - data.timestamp) / 1000;
        const expectedProgress = data.progress + elapsedSinceBroadcast;
        if (Math.abs(player.progress - expectedProgress) > 1.5) {
          applyBriefly(() => player.seek(expectedProgress));
        }
      } else if (Math.abs(player.progress - data.progress) > 1.0) {
        // Paused: align exactly if drifted
        applyBriefly(() => player.seek(data.progress));
      }
    };

    getTransport()
      .then((transport) => {
        if (stopped) return;
        stop = transport.rooms.listen(roomCode, userId, {
          onRoomSync,
          onQueueSync,
          onHostTransfer,
          onPlaybackSync,
          onReaction: (reaction) => {
            if (reaction.userId !== userId) addReactionLocally(reaction);
          },
          onStatus: setSyncStatus,
        });
      })
      .catch(() => setSyncStatus('offline'));

    return () => {
      stopped = true;
      stop?.();
      setSyncStatus('offline');
    };
  }, [isInRoom, roomCode, userId, setRoomSync, addReactionLocally, setSyncStatus]);
}
