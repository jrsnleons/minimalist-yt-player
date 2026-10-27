import type { RepeatMode, Track } from '@/types';
import {
  REMOTE_QUEUE_CAP,
  type RemoteCommand,
  type RemotePlaylist,
  type RemoteState,
} from '@/lib/remote/types';

/**
 * Pure validators shared by the server (SSE fallback) and both browser ends (Ably transport).
 * Nothing here touches node APIs, so it is safe to import from client code.
 */

export const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function str(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.length <= max ? v : null;
}

export function num(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

export function int(v: unknown, min: number, max: number): number | null {
  const n = num(v, min, max);
  return n !== null && Number.isInteger(n) ? n : null;
}

export function sanitizeTrack(raw: unknown): Track | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  const id = typeof t.id === 'string' && ID_RE.test(t.id) ? t.id : null;
  const title = str(t.title, 300);
  const artist = str(t.artist, 300);
  const duration = num(t.duration, 0, 86400);
  const thumb = str(t.thumbnailUrl, 600);
  if (!id || title === null || artist === null || duration === null || thumb === null) return null;
  if (thumb !== '' && !/^https?:\/\//i.test(thumb)) return null;
  const addedAt = num(t.addedAt, 0, 8.64e15) ?? Date.now();
  return { id, title, artist, duration, thumbnailUrl: thumb, addedAt };
}

export function validateCommand(raw: unknown): RemoteCommand | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  switch (c.type) {
    case 'play':
    case 'pause':
    case 'toggle':
    case 'next':
    case 'previous':
    case 'toggleMute':
    case 'toggleShuffle':
    case 'cycleRepeat':
    case 'toggleLike':
    case 'clearQueue':
      return { type: c.type };
    case 'seek': {
      const seconds = num(c.seconds, 0, 86400);
      return seconds === null ? null : { type: 'seek', seconds };
    }
    case 'setVolume': {
      const volume = num(c.volume, 0, 100);
      return volume === null ? null : { type: 'setVolume', volume: Math.round(volume) };
    }
    case 'playTrack':
    case 'playNext':
    case 'addToQueue': {
      const track = sanitizeTrack(c.track);
      return track ? { type: c.type, track } : null;
    }
    case 'removeFromQueue': {
      const index = int(c.index, 0, 100000);
      return index === null ? null : { type: 'removeFromQueue', index };
    }
    case 'moveInQueue': {
      const from = int(c.from, 0, 100000);
      const to = int(c.to, 0, 100000);
      return from === null || to === null ? null : { type: 'moveInQueue', from, to };
    }
    case 'playPlaylist': {
      const playlistId = typeof c.playlistId === 'string' && ID_RE.test(c.playlistId) ? c.playlistId : null;
      return playlistId ? { type: 'playPlaylist', playlistId } : null;
    }
    default:
      return null;
  }
}

export function validateState(raw: unknown): RemoteState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const repeat = s.repeat;
  if (repeat !== 'off' && repeat !== 'one' && repeat !== 'all') return null;
  const currentTrack = s.currentTrack === null ? null : sanitizeTrack(s.currentTrack);
  if (s.currentTrack !== null && !currentTrack) return null;
  const progress = num(s.progress, 0, 86400);
  const duration = num(s.duration, 0, 86400);
  const volume = num(s.volume, 0, 100);
  const timestamp = num(s.timestamp, 0, 8.64e15);
  const queueOffset = int(s.queueOffset, 0, 1e7);
  const queueIndex = int(s.queueIndex, -1, 1e7);
  const queueTotal = int(s.queueTotal, 0, 1e7);
  if ([progress, duration, volume, timestamp, queueOffset, queueIndex, queueTotal].some((v) => v === null)) {
    return null;
  }
  if (!Array.isArray(s.queue)) return null;
  const queue = s.queue
    .slice(0, REMOTE_QUEUE_CAP)
    .map(sanitizeTrack)
    .filter((t): t is Track => t !== null);
  const playlists: RemotePlaylist[] = [];
  if (Array.isArray(s.playlists)) {
    for (const p of s.playlists.slice(0, 200)) {
      if (!p || typeof p !== 'object') continue;
      const pl = p as Record<string, unknown>;
      const id = typeof pl.id === 'string' && ID_RE.test(pl.id) ? pl.id : null;
      const name = str(pl.name, 200);
      const n = int(pl.count, 0, 1e6);
      const cover = pl.coverUrl === null ? null : str(pl.coverUrl, 600);
      if (!id || name === null || n === null || (cover !== null && cover !== '' && !/^https?:\/\//i.test(cover))) continue;
      playlists.push({ id, name, count: n, coverUrl: cover || null });
    }
  }
  return {
    currentTrack,
    isPlaying: s.isPlaying === true,
    progress: progress!,
    duration: duration!,
    volume: volume!,
    isMuted: s.isMuted === true,
    shuffle: s.shuffle === true,
    repeat: repeat as RepeatMode,
    liked: s.liked === true,
    locked: s.locked === true,
    queue,
    queueOffset: queueOffset!,
    queueIndex: queueIndex!,
    queueTotal: queueTotal!,
    playlists,
    timestamp: timestamp!,
  };
}

