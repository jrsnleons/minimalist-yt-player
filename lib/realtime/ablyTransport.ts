import { openAblyChannel, randomId, type AblyLink, type AblyTypes } from '@/lib/realtime/ablyClient';
import { validateCommand, validateState } from '@/lib/remote/validators';
import type { RemoteState } from '@/lib/remote/types';
import type { RoomParticipant, RoomState } from '@/lib/rooms/roomManager';
import {
  MAX_MESSAGE_BYTES,
  MAX_PARTICIPANTS,
  applyRoomAction,
  cleanName,
  createRoomState,
  fitRoomState,
  pickSuccessor,
  sanitizeQueue,
  validatePlayback,
  validateReaction,
  validateRoomAction,
  validateRoomState,
  type RoomEventOut,
} from '@/lib/rooms/roomLogic';
import type {
  Credentials,
  JoinResult,
  LinkStatus,
  RealtimeTransport,
  RemoteClientHandlers,
  RemoteClientLink,
  RemoteHostHandlers,
  RemoteHostLink,
  RoomAction,
  RoomEvents,
  RoomTransport,
  SendResult,
} from '@/lib/realtime/transport';

/**
 * Ably transport. No server state: the host browser is authoritative and every message is
 * validated by the receiving side, because nothing sits in the middle any more.
 */

const PRESENCE_TIMEOUT_MS = 8000;

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

/** Shrinks a remote snapshot until it fits in one message (Ably's free limit is 64 KB). */
function fitRemoteState(state: RemoteState): RemoteState {
  let next = state;
  if (byteLength(next) <= MAX_MESSAGE_BYTES) return next;
  next = { ...next, playlists: next.playlists.slice(0, 40) };
  while (next.queue.length > 0 && byteLength(next) > MAX_MESSAGE_BYTES) {
    next = { ...next, queue: next.queue.slice(0, Math.floor(next.queue.length * 0.8)) };
  }
  if (byteLength(next) > MAX_MESSAGE_BYTES) next = { ...next, playlists: [] };
  return next;
}

async function currentMembers(channel: AblyTypes.RealtimeChannel): Promise<AblyTypes.PresenceMessage[]> {
  try {
    return await channel.presence.get();
  } catch {
    return [];
  }
}

function roleOf(m: AblyTypes.PresenceMessage): string | undefined {
  return (m.data as { role?: string } | null)?.role;
}

// ---------- Phone remote ----------

function connectRemoteHost(creds: Credentials, h: RemoteHostHandlers): RemoteHostLink {
  let link: AblyLink | null = null;
  let closed = false;
  let ended = false;
  const clientId = randomId('host');

  const countPhones = async () => {
    if (!link) return;
    const members = await currentMembers(link.channel);
    h.onPhones(members.filter((m) => roleOf(m) === 'phone').length);
  };

  openAblyChannel({
    scope: 'remote',
    code: creds.code,
    secret: creds.token,
    clientId,
    onState: (s) => h.onStatus(s),
    onAuthRejected: () => h.onFatal(),
  })
    .then(async (l) => {
      if (closed) return l.close();
      link = l;
      const ch = l.channel;
      await ch.subscribe((msg) => {
        if (!msg.clientId || msg.clientId === clientId) return;
        if (msg.name === 'command') {
          const command = validateCommand(msg.data);
          if (command) h.onCommand(command);
        } else if (msg.name === 'request-state') {
          countPhones();
        }
      });
      await ch.presence.subscribe(() => void countPhones());
      await ch.presence.enter({ role: 'host' });
      countPhones();
    })
    .catch(() => {
      if (!closed) h.onStatus('reconnecting');
    });

  return {
    async publishState(state) {
      if (!link) return;
      await link.channel.publish('state', fitRemoteState(state));
    },
    end() {
      ended = true;
      link?.channel.publish('end', {}).catch(() => {});
    },
    close() {
      closed = true;
      // Give the end message a moment to leave the socket before closing.
      if (ended && link) setTimeout(() => link?.close(), 500);
      else link?.close();
    },
  };
}

function connectRemoteClient(creds: Credentials, h: RemoteClientHandlers): RemoteClientLink {
  let link: AblyLink | null = null;
  let closed = false;
  let hostOnline = false;
  const clientId = randomId('phone');

  const requestState = () => link?.channel.publish('request-state', {}).catch(() => {});

  const refresh = async () => {
    if (!link) return;
    const members = await currentMembers(link.channel);
    const online = members.some((m) => roleOf(m) === 'host');
    if (online && !hostOnline) requestState();
    hostOnline = online;
    h.onHostOnline(online);
  };

  openAblyChannel({
    scope: 'remote',
    code: creds.code,
    secret: creds.token,
    clientId,
    onState: (s: LinkStatus) => {
      h.onStatus(s);
      if (s === 'open') refresh();
    },
    onAuthRejected: () => h.onFatal('invalid'),
  })
    .then(async (l) => {
      if (closed) return l.close();
      link = l;
      const ch = l.channel;
      await ch.subscribe((msg) => {
        if (!msg.clientId?.startsWith('host-')) return;
        if (msg.name === 'state') {
          const state = validateState(msg.data);
          if (state) h.onState(state);
        } else if (msg.name === 'end') {
          h.onFatal('ended');
        }
      });
      await ch.presence.subscribe(() => void refresh());
      await ch.presence.enter({ role: 'phone' });
      await refresh();
      requestState();
    })
    .catch(() => {
      if (!closed) h.onStatus('reconnecting');
    });

  return {
    async sendCommand(command): Promise<SendResult> {
      const valid = validateCommand(command);
      if (!valid) return 'error';
      if (!link) return 'error';
      if (!hostOnline) return 'offline';
      try {
        await link.channel.publish('command', valid);
        return 'ok';
      } catch {
        return 'error';
      }
    },
    close() {
      closed = true;
      link?.close();
    },
  };
}

// ---------- Listen Together ----------

interface RoomSession {
  link: AblyLink;
  code: string;
  userId: string;
  /** Null until a joiner receives the first snapshot. */
  room: RoomState | null;
  members: RoomParticipant[];
  events: RoomEvents | null;
  status: 'synced' | 'syncing' | 'offline';
  /** Joiners wait on this for the DJ's first snapshot. */
  onFirstRoom: (() => void) | null;
}

let active: RoomSession | null = null;

function toParticipants(members: AblyTypes.PresenceMessage[], hostId: string | undefined): RoomParticipant[] {
  const seen = new Map<string, RoomParticipant>();
  for (const m of members) {
    if (!m.clientId || seen.has(m.clientId)) continue;
    const d = (m.data ?? {}) as { name?: unknown; joinedAt?: unknown };
    seen.set(m.clientId, {
      id: m.clientId,
      name: cleanName(d.name, 'Listener'),
      isHost: m.clientId === hostId,
      joinedAt: typeof d.joinedAt === 'number' ? d.joinedAt : m.timestamp ?? Date.now(),
      lastSeen: Date.now(),
    });
  }
  return [...seen.values()].sort((a, b) => a.joinedAt - b.joinedAt);
}

function isHostOf(s: RoomSession): boolean {
  return !!s.room && s.room.hostId === s.userId;
}

function snapshot(s: RoomSession): RoomState | null {
  if (!s.room) return null;
  s.room.participants = s.members.map((p) => ({ ...p, isHost: p.id === s.room!.hostId }));
  return { ...s.room };
}

function emitRoom(s: RoomSession) {
  const snap = snapshot(s);
  if (snap) s.events?.onRoomSync(snap);
}

/** Host only: publishes a message and delivers the same event to the local UI. */
function hostEmit(s: RoomSession, out: RoomEventOut[]) {
  for (const ev of out) {
    s.link.channel.publish(ev.name, ev.data).catch(() => {});
    switch (ev.name) {
      case 'room:sync':
        emitRoom(s);
        break;
      case 'queue:sync':
        s.events?.onQueueSync((ev.data as { queue: RoomState['queue'] }).queue);
        break;
      case 'host:transfer':
        s.events?.onHostTransfer(ev.data as { newHostId: string; newHostName: string });
        break;
      case 'playback:sync': {
        const pb = validatePlayback(ev.data);
        if (pb) s.events?.onPlaybackSync(pb);
        break;
      }
    }
  }
}

function publishRoomState(s: RoomSession) {
  if (!isHostOf(s) || !s.room) return;
  const snap = snapshot(s)!;
  s.link.channel.publish('room:sync', fitRoomState(snap)).catch(() => {});
}

async function refreshMembers(s: RoomSession): Promise<void> {
  const members = await currentMembers(s.link.channel);
  s.members = toParticipants(members, s.room?.hostId);
}

/** Presence changed: update participants, answer newcomers (host), and take over if the DJ left. */
async function onPresence(s: RoomSession, ev: AblyTypes.PresenceMessage) {
  await refreshMembers(s);
  if (active !== s) return;

  if (ev.action === 'leave' && s.room && ev.clientId === s.room.hostId && ev.clientId !== s.userId) {
    // The DJ is gone. Every client picks the same successor from the same member list.
    const successor = pickSuccessor(s.members, ev.clientId ?? '');
    if (successor) {
      s.room.hostId = successor.id;
      s.members = s.members.map((p) => ({ ...p, isHost: p.id === successor.id }));
      s.events?.onHostTransfer({ newHostId: successor.id, newHostName: successor.name });
      if (successor.id === s.userId) publishRoomState(s);
    }
  } else if (ev.action === 'enter' && isHostOf(s) && ev.clientId !== s.userId) {
    publishRoomState(s);
  }
  emitRoom(s);
}

function attachRoomHandlers(s: RoomSession) {
  const ch = s.link.channel;

  ch.subscribe((msg) => {
    const from = msg.clientId;
    if (!from || from === s.userId) return; // own events are delivered locally
    const senderName = s.members.find((m) => m.id === from)?.name ?? 'Listener';

    switch (msg.name) {
      case 'room:sync': {
        const incoming = validateRoomState(msg.data);
        if (!incoming || incoming.hostId !== from) return;
        const hostPresent = s.room ? s.members.some((m) => m.id === s.room!.hostId) : false;
        const authorized =
          !s.room ||
          from === s.room.hostId ||
          (!hostPresent && from === pickSuccessor(s.members, s.room.hostId)?.id);
        if (!authorized) return;
        s.room = { ...incoming, reactions: s.room?.reactions ?? [] };
        refreshMembers(s).then(() => {
          if (active !== s) return;
          emitRoom(s);
          s.onFirstRoom?.();
        });
        return;
      }
      case 'playback:sync': {
        if (!s.room || from !== s.room.hostId) return;
        const pb = validatePlayback(msg.data);
        if (!pb) return;
        s.room.currentTrack = pb.currentTrack;
        s.room.isPlaying = pb.isPlaying;
        s.room.progress = pb.progress;
        s.room.timestamp = pb.timestamp;
        s.events?.onPlaybackSync(pb);
        return;
      }
      case 'queue:sync': {
        if (!s.room || from !== s.room.hostId) return;
        const queue = sanitizeQueue((msg.data as { queue?: unknown } | null)?.queue);
        if (!queue) return;
        s.room.queue = queue;
        s.events?.onQueueSync(queue);
        return;
      }
      case 'host:transfer': {
        if (!s.room || from !== s.room.hostId) return;
        const d = msg.data as { newHostId?: unknown; newHostName?: unknown } | null;
        if (typeof d?.newHostId !== 'string') return;
        s.events?.onHostTransfer({ newHostId: d.newHostId, newHostName: cleanName(d.newHostName, 'Listener') });
        return;
      }
      case 'reaction:new': {
        const reaction = validateReaction(msg.data, from, senderName);
        if (reaction) s.events?.onReaction(reaction);
        return;
      }
      case 'request-state':
        if (isHostOf(s)) publishRoomState(s);
        return;
      case 'action': {
        if (!isHostOf(s) || !s.room) return;
        const action = validateRoomAction(msg.data);
        if (!action) return;
        s.room.participants = s.members;
        const result = applyRoomAction(s.room, from, action);
        if (result.ok) hostEmit(s, result.events);
        return;
      }
    }
  });

  ch.presence.subscribe((ev) => void onPresence(s, ev));
}

async function openRoom(code: string, userId: string): Promise<RoomSession> {
  const holder: { s: RoomSession | null } = { s: null };
  const link = await openAblyChannel({
    scope: 'room',
    code,
    clientId: userId,
    onState: (state) => {
      const status = state === 'open' ? 'synced' : state === 'connecting' ? 'syncing' : 'offline';
      const s = holder.s;
      if (!s) return;
      const wasOffline = s.status === 'offline';
      s.status = status;
      s.events?.onStatus(status);
      if (status === 'synced' && wasOffline) {
        if (isHostOf(s)) publishRoomState(s);
        else s.link.channel.publish('request-state', {}).catch(() => {});
      }
    },
  });
  const s: RoomSession = { link, code, userId, room: null, members: [], events: null, status: 'syncing', onFirstRoom: null };
  holder.s = s;
  return s;
}

function waitFor<T>(register: (resolve: (v: T) => void) => void, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    register((v) => {
      clearTimeout(t);
      resolve(v);
    });
  });
}

const rooms: RoomTransport = {
  async create({ userId, userName, roomName, initialPlayback }) {
    if (active) rooms_closeActive();
    try {
      const res = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'room' }),
      });
      if (!res.ok) return null;
      const { code } = (await res.json()) as { code?: string };
      if (typeof code !== 'string') return null;

      const s = await openRoom(code, userId);
      active = s;
      s.room = createRoomState(code, userId, userName, roomName, initialPlayback);
      attachRoomHandlers(s);
      await s.link.channel.attach();
      await s.link.channel.presence.enter({ name: cleanName(userName, 'Host'), joinedAt: s.room.createdAt });
      await refreshMembers(s);
      publishRoomState(s);
      return snapshot(s);
    } catch {
      rooms_closeActive();
      return null;
    }
  },

  async join({ code, userId, userName }): Promise<JoinResult> {
    if (active) rooms_closeActive();
    const clean = code.toUpperCase().trim();
    if (!/^[A-Z0-9]{6}$/.test(clean)) return { error: 'Room not found. Check the room code and try again.' };
    try {
      const s = await openRoom(clean, userId);
      active = s;
      attachRoomHandlers(s);
      await s.link.channel.attach();

      const existing = await currentMembers(s.link.channel);
      const others = existing.filter((m) => m.clientId !== userId);
      if (others.length === 0) {
        rooms_closeActive();
        return { error: 'Room not found. Check the room code and try again.' };
      }
      if (others.length >= MAX_PARTICIPANTS) {
        rooms_closeActive();
        return { error: 'This session is full (max 10 listeners).' };
      }

      // Wait for the DJ's snapshot, then announce ourselves.
      const first = waitFor<boolean>((resolve) => {
        s.onFirstRoom = () => resolve(true);
      }, PRESENCE_TIMEOUT_MS, false);

      await s.link.channel.presence.enter({ name: cleanName(userName, 'Listener'), joinedAt: Date.now() });
      await refreshMembers(s);
      await s.link.channel.publish('request-state', {});
      const got = await first;
      s.onFirstRoom = null;
      const room = got ? snapshot(s) : null;
      if (!room) {
        rooms_closeActive();
        return { error: 'Room not found. Check the room code and try again.' };
      }
      return { room };
    } catch {
      rooms_closeActive();
      return { error: 'Network error. Check connection and try again.' };
    }
  },

  async act(code, userId, action: RoomAction) {
    const s = active;
    if (!s || s.code !== code) return false;
    if (action.action === 'reaction') {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        await s.link.channel.publish('reaction:new', { id, emoji: action.emoji });
        return true;
      } catch {
        return false;
      }
    }
    if (isHostOf(s) && s.room) {
      s.room.participants = s.members;
      const result = applyRoomAction(s.room, userId, action);
      if (result.ok) hostEmit(s, result.events);
      return result.ok;
    }
    try {
      await s.link.channel.publish('action', action);
      return true;
    } catch {
      return false;
    }
  },

  async leave(code) {
    const s = active;
    if (!s || s.code !== code) return;
    try {
      await s.link.channel.presence.leave();
    } catch {}
    rooms_closeActive();
  },

  leaveOnUnload(code) {
    if (active && active.code === code) active.link.close();
  },

  listen(code, userId, events) {
    const s = active;
    if (!s || s.code !== code || s.userId !== userId) {
      events.onStatus('offline');
      return () => {};
    }
    s.events = events;
    events.onStatus(s.status);
    emitRoom(s);
    return () => {
      if (s.events === events) s.events = null;
    };
  },
};

function rooms_closeActive() {
  const s = active;
  active = null;
  s?.link.close();
}

const transport: RealtimeTransport = { kind: 'ably', connectRemoteHost, connectRemoteClient, rooms };
export default transport;
