'use client';

import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useRemoteHostStore } from '@/store/useRemoteHostStore';
import { usePlaybackLock } from '@/hooks/usePlaybackLock';
import { runSse } from '@/lib/remote/sseClient';
import {
  LOCK_EXEMPT_COMMANDS,
  REMOTE_QUEUE_CAP,
  type RemoteCommand,
  type RemotePlaylist,
  type RemoteState,
} from '@/lib/remote/types';
import type { Track } from '@/types';

const MIN_SEND_MS = 250; // at most 4 snapshots per second
const PROGRESS_SEND_MS = 1000; // progress-only changes at most once per second

async function runCommand(cmd: RemoteCommand, locked: boolean) {
  if (locked && !LOCK_EXEMPT_COMMANDS.includes(cmd.type)) return;
  const s = usePlayerStore.getState();
  switch (cmd.type) {
    case 'play':
      if (s.currentTrack && !s.isPlaying) s.togglePlay();
      break;
    case 'pause':
      if (s.isPlaying) s.pause();
      break;
    case 'toggle':
      s.togglePlay();
      break;
    case 'next':
      s.next();
      break;
    case 'previous':
      s.previous();
      break;
    case 'seek':
      if (s.currentTrack) s.seek(s.duration > 0 ? Math.min(cmd.seconds, s.duration) : cmd.seconds);
      break;
    case 'setVolume':
      s.setVolume(cmd.volume);
      break;
    case 'toggleMute':
      s.toggleMute();
      break;
    case 'toggleShuffle':
      s.toggleShuffle();
      break;
    case 'cycleRepeat':
      s.cycleRepeat();
      break;
    case 'toggleLike':
      if (s.currentTrack) await s.toggleLikeTrack(s.currentTrack);
      break;
    case 'playTrack':
      s.play(cmd.track);
      break;
    case 'playNext':
      s.playNext(cmd.track);
      break;
    case 'addToQueue':
      s.addToQueue(cmd.track);
      break;
    case 'removeFromQueue':
      if (cmd.index < s.queue.length) s.removeFromQueue(cmd.index);
      break;
    case 'moveInQueue':
      if (cmd.from < s.queue.length && cmd.to < s.queue.length && cmd.from !== cmd.to) {
        s.reorderQueue(cmd.from, cmd.to);
      }
      break;
    case 'clearQueue':
      s.clearQueue();
      break;
    case 'playPlaylist': {
      const playlist = await db.playlists.get(cmd.playlistId);
      if (!playlist) break;
      const found = await db.tracks.bulkGet(playlist.trackIds);
      const tracks = found.filter((t): t is Track => !!t);
      if (tracks.length > 0) usePlayerStore.getState().play(tracks[0], tracks);
      break;
    }
  }
}

function snapshot(playlists: RemotePlaylist[], locked: boolean): RemoteState {
  const s = usePlayerStore.getState();
  const total = s.queue.length;
  const offset = total > REMOTE_QUEUE_CAP ? Math.max(0, Math.min(s.queueIndex, total - REMOTE_QUEUE_CAP)) : 0;
  return {
    currentTrack: s.currentTrack,
    isPlaying: s.isPlaying,
    progress: s.progress,
    duration: s.duration,
    volume: s.volume,
    isMuted: s.isMuted,
    shuffle: s.shuffleMode,
    repeat: s.repeatMode,
    liked: s.currentTrack ? s.likedTrackIds.includes(s.currentTrack.id) : false,
    locked,
    queue: s.queue.slice(offset, offset + REMOTE_QUEUE_CAP),
    queueOffset: offset,
    queueIndex: s.queueIndex,
    queueTotal: total,
    playlists,
    timestamp: Date.now(),
  };
}

/** Keys whose change warrants a snapshot right away (everything except progress). */
function structuralKey(s: ReturnType<typeof usePlayerStore.getState>): unknown[] {
  return [
    s.currentTrack, s.isPlaying, s.duration, s.volume, s.isMuted, s.shuffleMode,
    s.repeatMode, s.queue, s.queueIndex, s.likedTrackIds, s.seekTarget,
  ];
}

/** Runs a phone remote session on the playing device: executes commands and publishes state. */
export function useRemoteHost() {
  const session = useRemoteHostStore((s) => s.session);
  const locked = usePlaybackLock();
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const playlistRows = useLiveQuery(async () => {
    const rows = await db.playlists.toArray();
    const firstIds = rows.map((p) => p.trackIds[0]).filter(Boolean);
    const firsts = await db.tracks.bulkGet(firstIds);
    const byId = new Map(firsts.filter((t): t is Track => !!t).map((t) => [t.id, t.thumbnailUrl]));
    return rows
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map<RemotePlaylist>((p) => ({
        id: p.id,
        name: p.name,
        count: p.trackIds.length,
        coverUrl: byId.get(p.trackIds[0]) ?? null,
      }));
  }, []);
  const playlistsRef = useRef<RemotePlaylist[]>([]);
  playlistsRef.current = playlistRows ?? [];

  const pushRef = useRef<(force?: boolean) => void>(() => {});

  useEffect(() => {
    useRemoteHostStore.getState().restore();
  }, []);

  // Command stream
  useEffect(() => {
    if (!session) return;
    const ctrl = new AbortController();
    const { code, token } = session;
    runSse({
      url: `/api/remote/${code}/host/events`,
      token,
      signal: ctrl.signal,
      onStatus: (status) => {
        if (status === 'open') pushRef.current(true);
        else useRemoteHostStore.getState().setPhones(0);
      },
      onEvent: (event, data) => {
        if (event === 'presence') {
          const remotes = (data as { remotes?: number }).remotes;
          useRemoteHostStore.getState().setPhones(typeof remotes === 'number' ? remotes : 0);
          if (remotes) pushRef.current(true);
        } else if (event === 'command') {
          runCommand(data as RemoteCommand, lockedRef.current).catch(() => {});
        }
      },
      onFatal: () => useRemoteHostStore.getState().clearSession(),
    });
    return () => ctrl.abort();
  }, [session]);

  // State publisher
  useEffect(() => {
    if (!session) return;
    const { code, token } = session;
    let lastSent = 0;
    let lastProgressSent = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;
    let pending = false;

    const send = async () => {
      timer = null;
      if (inFlight) {
        pending = true;
        return;
      }
      inFlight = true;
      lastSent = Date.now();
      lastProgressSent = lastSent;
      try {
        await fetch(`/api/remote/${code}/host/state`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot(playlistsRef.current, lockedRef.current)),
        });
      } catch {}
      inFlight = false;
      if (pending) {
        pending = false;
        schedule(false);
      }
    };

    const schedule = (progressOnly: boolean) => {
      if (timer) return;
      const now = Date.now();
      const wait = progressOnly
        ? Math.max(0, lastProgressSent + PROGRESS_SEND_MS - now)
        : Math.max(0, lastSent + MIN_SEND_MS - now);
      timer = setTimeout(send, wait);
    };

    pushRef.current = (force) => {
      if (force && timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (force) send();
      else schedule(false);
    };

    let prev = structuralKey(usePlayerStore.getState());
    let prevProgress = usePlayerStore.getState().progress;
    const unsubscribe = usePlayerStore.subscribe((state) => {
      const key = structuralKey(state);
      const changed = key.some((v, i) => v !== prev[i]);
      if (changed) {
        prev = key;
        prevProgress = state.progress;
        schedule(false);
      } else if (Math.abs(state.progress - prevProgress) >= 0.5) {
        // Playback ticks arrive several times per second; limit to one per second.
        prevProgress = state.progress;
        schedule(true);
      }
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
      pushRef.current = () => {};
    };
  }, [session]);

  // Lock and playlist changes
  const playlistsKey = JSON.stringify(playlistRows ?? []);
  useEffect(() => {
    pushRef.current(false);
  }, [locked, playlistsKey]);
}
