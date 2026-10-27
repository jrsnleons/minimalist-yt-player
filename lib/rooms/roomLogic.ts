import type { Track } from '@/types';
import type { FloatingReaction, RoomParticipant, RoomState } from '@/lib/rooms/roomManager';
import { ID_RE, num, sanitizeTrack, str } from '@/lib/remote/validators';
import type { PlaybackSync, RoomAction } from '@/lib/realtime/transport';

/**
 * Pure room logic for the Ably transport. The DJ's browser is authoritative: it applies
 * actions with these functions and publishes the resulting events. Mirrors RoomManager,
 * which stays in place for the in-memory SSE fallback.
 */

export const MAX_PARTICIPANTS = 10;
/** Keeps a full room snapshot well under Ably's 64 KB message limit. */
export const MAX_ROOM_QUEUE = 100;
export const MAX_MESSAGE_BYTES = 60_000;

export type RoomEventName = 'room:sync' | 'queue:sync' | 'host:transfer' | 'playback:sync';
export interface RoomEventOut {
  name: RoomEventName;
  data: unknown;
}

export function cleanName(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  // eslint-disable-next-line no-control-regex
  const clean = raw.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 32);
  return clean || fallback;
}

// ---------- Validation ----------

export function sanitizeRoomTrack(raw: unknown): Track | null {
  const track = sanitizeTrack(raw);
  if (!track) return null;
  const by = (raw as { addedBy?: unknown }).addedBy;
  if (by && typeof by === 'object') {
    const id = (by as { id?: unknown }).id;
    const name = str((by as { name?: unknown }).name, 64);
    if (typeof id === 'string' && ID_RE.test(id) && name !== null) track.addedBy = { id, name };
  }
  return track;
}

export function sanitizeQueue(raw: unknown): Track[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .slice(0, MAX_ROOM_QUEUE)
    .map(sanitizeRoomTrack)
    .filter((t): t is Track => t !== null);
}

export function validateRoomState(raw: unknown): RoomState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const code = typeof r.code === 'string' && /^[A-Z0-9]{6}$/.test(r.code) ? r.code : null;
  const hostId = typeof r.hostId === 'string' && ID_RE.test(r.hostId) ? r.hostId : null;
  const name = str(r.name, 80);
  const progress = num(r.progress, 0, 86400);
  const timestamp = num(r.timestamp, 0, 8.64e15);
  const createdAt = num(r.createdAt, 0, 8.64e15);
  const queue = sanitizeQueue(r.queue);
  const currentTrack = r.currentTrack === null ? null : sanitizeRoomTrack(r.currentTrack);
  if (!code || !hostId || name === null || progress === null || timestamp === null || createdAt === null) return null;
  if (!queue || (r.currentTrack !== null && !currentTrack)) return null;
  return {
    code,
    name,
    hostId,
    allowListenerControls: r.allowListenerControls === true,
    currentTrack,
    isPlaying: r.isPlaying === true,
    progress,
    timestamp,
    queue,
    participants: [],
    reactions: [],
    createdAt,
  };
}

export function validatePlayback(raw: unknown): PlaybackSync | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const currentTrack = r.currentTrack === null ? null : sanitizeRoomTrack(r.currentTrack);
  const progress = num(r.progress, 0, 86400);
  const timestamp = num(r.timestamp, 0, 8.64e15);
  if ((r.currentTrack !== null && !currentTrack) || progress === null || timestamp === null) return null;
  const initiatorId = typeof r.initiatorId === 'string' && ID_RE.test(r.initiatorId) ? r.initiatorId : undefined;
  return { currentTrack, isPlaying: r.isPlaying === true, progress, timestamp, initiatorId };
}

export function validateReaction(raw: unknown, senderId: string, senderName: string): FloatingReaction | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const emoji = typeof r.emoji === 'string' && r.emoji.length > 0 && r.emoji.length <= 16 ? r.emoji : null;
  const id = typeof r.id === 'string' && /^[A-Za-z0-9-]{1,40}$/.test(r.id) ? r.id : null;
  if (!emoji || !id) return null;
  return { id, emoji, userId: senderId, userName: senderName, timestamp: Date.now() };
}

/** Validates a client action. userId always comes from the transport identity, never the payload. */
export function validateRoomAction(raw: unknown): RoomAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  switch (a.action) {
    case 'sync': {
      const currentTrack = a.currentTrack === null ? null : sanitizeRoomTrack(a.currentTrack);
      const progress = num(a.progress, 0, 86400);
      if ((a.currentTrack !== null && !currentTrack) || progress === null) return null;
      return { action: 'sync', currentTrack, isPlaying: a.isPlaying === true, progress };
    }
    case 'transfer-dj':
      return typeof a.targetUserId === 'string' && ID_RE.test(a.targetUserId)
        ? { action: 'transfer-dj', targetUserId: a.targetUserId }
        : null;
    case 'toggle-listener-controls':
      return { action: 'toggle-listener-controls', allowListenerControls: a.allowListenerControls === true };
    case 'queue-add': {
      const track = sanitizeRoomTrack(a.track);
      return track
        ? { action: 'queue-add', track, userName: cleanName(a.userName, 'Listener'), playNext: a.playNext === true }
        : null;
    }
    case 'queue-remove':
      return typeof a.trackId === 'string' && ID_RE.test(a.trackId) ? { action: 'queue-remove', trackId: a.trackId } : null;
    case 'queue-reorder': {
      const queue = sanitizeQueue(a.queue);
      return queue ? { action: 'queue-reorder', queue } : null;
    }
    case 'queue-clear':
      return { action: 'queue-clear' };
    default:
      return null;
  }
}

// ---------- State ----------

export function createRoomState(
  code: string,
  hostId: string,
  hostName: string,
  customName: string | undefined,
  initial?: { currentTrack: Track | null; isPlaying: boolean; progress: number; queue: Track[] }
): RoomState {
  const now = Date.now();
  const name = cleanName(hostName, 'Host');
  const host: RoomParticipant = { id: hostId, name, isHost: true, joinedAt: now, lastSeen: now };
  const currentTrack = initial?.currentTrack ? sanitizeRoomTrack(initial.currentTrack) : null;
  return {
    code,
    name: cleanName(customName, `${name} – Session`),
    hostId,
    allowListenerControls: false,
    currentTrack,
    isPlaying: currentTrack ? initial?.isPlaying ?? false : false,
    progress: currentTrack ? initial?.progress ?? 0 : 0,
    timestamp: now,
    queue: sanitizeQueue(initial?.queue ?? []) ?? [],
    participants: [host],
    reactions: [],
    createdAt: now,
  };
}

/** Trims the queue until the serialized snapshot fits in one message. */
export function fitRoomState(room: RoomState): RoomState {
  const enc = new TextEncoder();
  const snapshot = { ...room, reactions: [] as FloatingReaction[] };
  while (snapshot.queue.length > 0 && enc.encode(JSON.stringify(snapshot)).length > MAX_MESSAGE_BYTES) {
    snapshot.queue = snapshot.queue.slice(0, Math.floor(snapshot.queue.length * 0.8));
  }
  return snapshot;
}

function playbackEvent(room: RoomState, initiatorId: string): RoomEventOut {
  return {
    name: 'playback:sync',
    data: {
      currentTrack: room.currentTrack,
      isPlaying: room.isPlaying,
      progress: room.progress,
      timestamp: room.timestamp,
      initiatorId,
    },
  };
}

/**
 * Applies a validated action from `userId`. Mutates `room` and returns the events to publish.
 * `ok` is false when the action is not allowed.
 */
export function applyRoomAction(
  room: RoomState,
  userId: string,
  a: RoomAction
): { ok: boolean; events: RoomEventOut[] } {
  const sync: RoomEventOut = { name: 'room:sync', data: null };
  const roomSync = (): RoomEventOut => ({ ...sync, data: fitRoomState(room) });
  const isHost = room.hostId === userId;

  switch (a.action) {
    case 'sync': {
      if (!isHost && !room.allowListenerControls) return { ok: false, events: [] };
      room.currentTrack = a.currentTrack;
      room.isPlaying = a.isPlaying;
      room.progress = a.progress;
      room.timestamp = Date.now();
      return { ok: true, events: [playbackEvent(room, userId)] };
    }

    case 'transfer-dj': {
      if (!isHost) return { ok: false, events: [] };
      const target = room.participants.find((p) => p.id === a.targetUserId);
      if (!target) return { ok: false, events: [] };
      room.participants.forEach((p) => (p.isHost = p.id === target.id));
      room.hostId = target.id;
      return {
        ok: true,
        events: [{ name: 'host:transfer', data: { newHostId: target.id, newHostName: target.name } }, roomSync()],
      };
    }

    case 'toggle-listener-controls': {
      if (!isHost) return { ok: false, events: [] };
      room.allowListenerControls = a.allowListenerControls;
      return { ok: true, events: [roomSync()] };
    }

    case 'queue-add': {
      const queuedTrack: Track = { ...a.track, addedBy: { id: userId, name: cleanName(a.userName, 'Listener') } };
      const duplicate = room.queue.some(
        (t) =>
          t.id === queuedTrack.id &&
          t.addedBy?.id === userId &&
          (t.addedAt === a.track.addedAt || (a.track.addedAt && Math.abs(t.addedAt - a.track.addedAt) < 1500))
      );
      if (duplicate) return { ok: true, events: [{ name: 'queue:sync', data: { queue: room.queue } }] };

      const events: RoomEventOut[] = [];
      if (!room.currentTrack) {
        room.currentTrack = queuedTrack;
        room.isPlaying = true;
        room.progress = 0;
        room.timestamp = Date.now();
        room.queue = [queuedTrack];
        events.push(playbackEvent(room, userId));
      } else {
        if (room.queue.length >= MAX_ROOM_QUEUE) return { ok: false, events: [] };
        room.queue = a.playNext ? [queuedTrack, ...room.queue] : [...room.queue, queuedTrack];
      }
      events.push({ name: 'queue:sync', data: { queue: room.queue, addedTrack: queuedTrack } }, roomSync());
      return { ok: true, events };
    }

    case 'queue-remove': {
      const idx = room.queue.findIndex((t) => t.id === a.trackId);
      if (idx < 0) return { ok: false, events: [] };
      if (!isHost && room.queue[idx].addedBy?.id !== userId) return { ok: false, events: [] };
      room.queue.splice(idx, 1);
      return {
        ok: true,
        events: [{ name: 'queue:sync', data: { queue: room.queue, removedTrackId: a.trackId } }, roomSync()],
      };
    }

    case 'queue-reorder': {
      if (!isHost) return { ok: false, events: [] };
      room.queue = a.queue;
      return { ok: true, events: [{ name: 'queue:sync', data: { queue: room.queue } }, roomSync()] };
    }

    case 'queue-clear': {
      if (!isHost) return { ok: false, events: [] };
      room.queue = [];
      return { ok: true, events: [{ name: 'queue:sync', data: { queue: [] } }, roomSync()] };
    }

    default:
      return { ok: false, events: [] };
  }
}

/** Picks the next DJ when the current one is gone: longest-standing participant. */
export function pickSuccessor(participants: RoomParticipant[], leavingId: string): RoomParticipant | null {
  const rest = participants.filter((p) => p.id !== leavingId);
  rest.sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1));
  return rest[0] ?? null;
}
