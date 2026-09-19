import type { Track } from '@/types';

export interface RoomParticipant {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
  lastSeen: number;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface RoomState {
  code: string;
  name: string;
  hostId: string;
  allowListenerControls: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  timestamp: number;
  queue: Track[];
  participants: RoomParticipant[];
  reactions: FloatingReaction[];
  createdAt: number;
}

interface RoomSubscription {
  userId: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  encoder: TextEncoder;
  lastWriteOk: number;
}

const MAX_PARTICIPANTS = 10;

// Global in-memory singleton preserving room state in Node process
declare global {
  // eslint-disable-next-line no-var
  var __onyx_rooms: Map<string, RoomState> | undefined;
  // eslint-disable-next-line no-var
  var __onyx_subscribers: Map<string, Set<RoomSubscription>> | undefined;
  // eslint-disable-next-line no-var
  var __onyx_sweep_started: boolean | undefined;
}

const rooms: Map<string, RoomState> = globalThis.__onyx_rooms ?? new Map<string, RoomState>();
const subscribers: Map<string, Set<RoomSubscription>> =
  globalThis.__onyx_subscribers ?? new Map<string, Set<RoomSubscription>>();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__onyx_rooms = rooms;
  globalThis.__onyx_subscribers = subscribers;
}

function sanitizeName(raw: string): string {
  return raw.replace(/[\x00-\x1f\x7f]/g, '').trim();
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class RoomManager {
  static createRoom(
    hostId: string,
    hostName: string,
    customName?: string,
    initialPlayback?: {
      currentTrack: Track | null;
      isPlaying: boolean;
      progress: number;
      queue: Track[];
    }
  ): RoomState {
    let code = generateRoomCode();
    while (rooms.has(code)) {
      code = generateRoomCode();
    }

    const cleanHostName = sanitizeName(hostName) || 'Host';
    const host: RoomParticipant = {
      id: hostId,
      name: cleanHostName,
      isHost: true,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };

    const cleanCustomName = customName ? sanitizeName(customName) : undefined;
    const room: RoomState = {
      code,
      name: cleanCustomName || `${host.name} – Session`,
      hostId,
      allowListenerControls: false,
      currentTrack: initialPlayback?.currentTrack ?? null,
      isPlaying: initialPlayback?.isPlaying ?? false,
      progress: initialPlayback?.progress ?? 0,
      timestamp: Date.now(),
      queue: initialPlayback?.queue ? [...initialPlayback.queue] : [],
      participants: [host],
      reactions: [],
      createdAt: Date.now(),
    };

    rooms.set(code, room);
    return room;
  }

  static deduplicateRoomQueue(room: RoomState): boolean {
    const originalLen = room.queue.length;
    const filtered: Track[] = [];
    for (let i = 0; i < room.queue.length; i++) {
      const track = room.queue[i];
      const isDuplicate = filtered.some(
        (prev) =>
          prev.id === track.id &&
          prev.addedBy?.id === track.addedBy?.id &&
          prev.addedAt === track.addedAt
      );
      if (!isDuplicate) {
        filtered.push(track);
      }
    }
    if (filtered.length !== originalLen) {
      room.queue = filtered;
      return true;
    }
    return false;
  }

  static getRoom(code: string): RoomState | null {
    const room = rooms.get(code.toUpperCase().trim()) ?? null;
    if (room && this.deduplicateRoomQueue(room)) {
      this.broadcast(room.code, 'queue:sync', { queue: room.queue });
    }
    return room;
  }

  static joinRoom(
    code: string,
    userId: string,
    userName: string
  ): { room: RoomState } | { error: 'not_found' | 'full' } {
    const room = this.getRoom(code);
    if (!room) return { error: 'not_found' };

    const existingIdx = room.participants.findIndex((p) => p.id === userId);
    if (existingIdx < 0 && room.participants.length >= MAX_PARTICIPANTS) {
      return { error: 'full' };
    }

    const cleanUserName = sanitizeName(userName) || `Listener ${room.participants.length + 1}`;
    const participant: RoomParticipant = {
      id: userId,
      name: cleanUserName,
      isHost: room.hostId === userId,
      joinedAt: existingIdx >= 0 ? room.participants[existingIdx].joinedAt : Date.now(),
      lastSeen: Date.now(),
    };

    if (existingIdx >= 0) {
      room.participants[existingIdx] = participant;
    } else {
      room.participants.push(participant);
    }

    this.broadcast(room.code, 'room:sync', room);
    return { room };
  }

  static leaveRoom(code: string, userId: string): void {
    const room = this.getRoom(code);
    if (!room) return;

    room.participants = room.participants.filter((p) => p.id !== userId);

    // If host leaves, assign next participant as host if any remain
    if (room.hostId === userId && room.participants.length > 0) {
      room.hostId = room.participants[0].id;
      room.participants[0].isHost = true;
      this.broadcast(room.code, 'host:transfer', {
        newHostId: room.participants[0].id,
        newHostName: room.participants[0].name,
      });
    }

    if (room.participants.length === 0) {
      // Keep empty room alive for 15 minutes before collecting
      setTimeout(() => {
        const check = rooms.get(code);
        if (check && check.participants.length === 0) {
          rooms.delete(code);
          subscribers.delete(code);
        }
      }, 15 * 60 * 1000);
    }

    this.broadcast(room.code, 'room:sync', room);
  }

  static transferDj(code: string, currentHostId: string, targetUserId: string): boolean {
    const room = this.getRoom(code);
    if (!room || room.hostId !== currentHostId) return false;

    const target = room.participants.find((p) => p.id === targetUserId);
    if (!target) return false;

    const prevHost = room.participants.find((p) => p.id === currentHostId);
    if (prevHost) {
      prevHost.isHost = false;
    }

    room.hostId = targetUserId;
    target.isHost = true;

    this.broadcast(room.code, 'host:transfer', {
      newHostId: target.id,
      newHostName: target.name,
    });
    this.broadcast(room.code, 'room:sync', room);
    return true;
  }

  static setListenerControls(code: string, hostId: string, allow: boolean): boolean {
    const room = this.getRoom(code);
    if (!room || room.hostId !== hostId) return false;

    room.allowListenerControls = allow;
    this.broadcast(room.code, 'room:sync', room);
    return true;
  }

  static syncPlayback(
    code: string,
    userId: string,
    data: {
      currentTrack: Track | null;
      isPlaying: boolean;
      progress: number;
    }
  ): boolean {
    const room = this.getRoom(code);
    if (!room) return false;
    if (room.hostId !== userId && !room.allowListenerControls) return false;

    room.currentTrack = data.currentTrack;
    room.isPlaying = data.isPlaying;
    room.progress = data.progress;
    room.timestamp = Date.now();

    this.broadcast(room.code, 'playback:sync', {
      currentTrack: room.currentTrack,
      isPlaying: room.isPlaying,
      progress: room.progress,
      timestamp: room.timestamp,
      initiatorId: userId,
    });

    return true;
  }

  static addTrackToQueue(
    code: string,
    track: Track,
    userId: string,
    userName: string,
    playNext?: boolean
  ): boolean {
    const room = this.getRoom(code);
    if (!room) return false;

    const cleanUserName = sanitizeName(userName) || 'Listener';
    const queuedTrack: Track = {
      ...track,
      addedBy: { id: userId, name: cleanUserName },
    };

    // Prevent duplicate addition if identical track was added by the same user with identical addedAt or within 1500ms
    const recentDuplicate = room.queue.some(
      (t) =>
        t.id === queuedTrack.id &&
        t.addedBy?.id === userId &&
        (t.addedAt === track.addedAt || (track.addedAt && Math.abs(t.addedAt - track.addedAt) < 1500))
    );
    if (recentDuplicate) {
      this.broadcast(room.code, 'queue:sync', { queue: room.queue });
      return true;
    }

    if (!room.currentTrack) {
      room.currentTrack = queuedTrack;
      room.isPlaying = true;
      room.progress = 0;
      room.timestamp = Date.now();
      room.queue = [queuedTrack];
      this.broadcast(room.code, 'playback:sync', {
        currentTrack: room.currentTrack,
        isPlaying: room.isPlaying,
        progress: room.progress,
        timestamp: room.timestamp,
        initiatorId: userId,
      });
    } else if (playNext) {
      room.queue = [queuedTrack, ...room.queue];
    } else {
      room.queue = [...room.queue, queuedTrack];
    }

    this.broadcast(room.code, 'queue:sync', {
      queue: room.queue,
      addedTrack: queuedTrack,
    });
    this.broadcast(room.code, 'room:sync', room);
    return true;
  }

  static removeTrackFromQueue(code: string, trackId: string, userId: string): boolean {
    const room = this.getRoom(code);
    if (!room) return false;

    const trackIndex = room.queue.findIndex((t) => t.id === trackId);
    if (trackIndex < 0) return false;

    const track = room.queue[trackIndex];
    // Allowed if user is host OR user who added the track
    if (room.hostId !== userId && track.addedBy?.id !== userId) {
      return false;
    }

    room.queue.splice(trackIndex, 1);

    this.broadcast(room.code, 'queue:sync', {
      queue: room.queue,
      removedTrackId: trackId,
    });
    this.broadcast(room.code, 'room:sync', room);
    return true;
  }

  static reorderQueue(code: string, hostId: string, newQueue: Track[]): boolean {
    const room = this.getRoom(code);
    if (!room || room.hostId !== hostId) return false;

    room.queue = newQueue;

    this.broadcast(room.code, 'queue:sync', {
      queue: room.queue,
    });
    this.broadcast(room.code, 'room:sync', room);
    return true;
  }

  static clearQueue(code: string, hostId: string): boolean {
    const room = this.getRoom(code);
    if (!room || room.hostId !== hostId) return false;

    room.queue = [];

    this.broadcast(room.code, 'queue:sync', {
      queue: [],
    });
    this.broadcast(room.code, 'room:sync', room);
    return true;
  }

  static addReaction(code: string, userId: string, emoji: string): void {
    const room = this.getRoom(code);
    if (!room) return;

    const participant = room.participants.find((p) => p.id === userId);
    const reaction: FloatingReaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      emoji,
      userId,
      userName: participant?.name || 'Listener',
      timestamp: Date.now(),
    };

    room.reactions = [reaction, ...room.reactions].slice(0, 20);
    this.broadcast(room.code, 'reaction:new', reaction);
  }

  static addSubscriber(
    code: string,
    userId: string,
    writer: WritableStreamDefaultWriter<Uint8Array>
  ): void {
    const formattedCode = code.toUpperCase().trim();
    if (!subscribers.has(formattedCode)) {
      subscribers.set(formattedCode, new Set());
    }

    const subSet = subscribers.get(formattedCode)!;
    const sub: RoomSubscription = {
      userId,
      writer,
      encoder: new TextEncoder(),
      lastWriteOk: Date.now(),
    };
    subSet.add(sub);
  }

  static removeSubscriber(
    code: string,
    userId: string,
    writer: WritableStreamDefaultWriter<Uint8Array>
  ): void {
    const formattedCode = code.toUpperCase().trim();
    const subSet = subscribers.get(formattedCode);
    if (!subSet) return;

    for (const sub of subSet) {
      if (sub.writer === writer) {
        subSet.delete(sub);
      }
    }

    if (subSet.size === 0) {
      subscribers.delete(formattedCode);
    }
  }

  static broadcast(code: string, eventType: string, payload: unknown): void {
    const formattedCode = code.toUpperCase().trim();
    const subSet = subscribers.get(formattedCode);
    if (!subSet || subSet.size === 0) return;

    const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const sub of subSet) {
      try {
        const chunk = sub.encoder.encode(message);
        sub.writer.write(chunk).then(
          () => {
            sub.lastWriteOk = Date.now();
          },
          () => {
            subSet.delete(sub);
          }
        );
      } catch {
        subSet.delete(sub);
      }
    }
  }

  static sweepStaleSubscribers(): void {
    const staleThreshold = 45_000;
    const now = Date.now();
    for (const [code, subSet] of subscribers) {
      for (const sub of subSet) {
        if (now - sub.lastWriteOk > staleThreshold) {
          subSet.delete(sub);
          try {
            sub.writer.close();
          } catch {}
        }
      }
      if (subSet.size === 0) {
        subscribers.delete(code);
      }
    }
  }
}

if (!globalThis.__onyx_sweep_started) {
  globalThis.__onyx_sweep_started = true;
  setInterval(() => {
    RoomManager.sweepStaleSubscribers();
  }, 30_000);
}
