import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { RepeatMode, Track } from '@/types';
import {
  REMOTE_CODE_LENGTH,
  REMOTE_QUEUE_CAP,
  type RemoteCommand,
  type RemotePlaylist,
  type RemoteState,
} from '@/lib/remote/types';

/**
 * In-memory phone remote sessions. Same constraints as Listen Together: state lives in
 * one server process, so serverless hosts may route host and phone to different instances.
 */

type Role = 'host' | 'remote';

interface Subscriber {
  role: Role;
  writer: WritableStreamDefaultWriter<Uint8Array>;
}

interface Session {
  code: string;
  token: string;
  createdAt: number;
  lastActivity: number;
  state: RemoteState | null;
  subscribers: Set<Subscriber>;
}

const IDLE_TTL_MS = 2 * 60 * 60 * 1000;
const SWEEP_MS = 60 * 1000;
const PING_MS = 15 * 1000;
const MAX_SESSIONS = 500;
export const MAX_COMMAND_BYTES = 16 * 1024;
export const MAX_STATE_BYTES = 256 * 1024;

declare global {
  // eslint-disable-next-line no-var
  var __onyx_remote_sessions: Map<string, Session> | undefined;
  // eslint-disable-next-line no-var
  var __onyx_remote_sweeper: ReturnType<typeof setInterval> | undefined;
}

const sessions: Map<string, Session> = (globalThis.__onyx_remote_sessions ??= new Map());
const encoder = new TextEncoder();

function frame(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = new Uint8Array(REMOTE_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += chars[b % chars.length];
  return code;
}

function count(session: Session, role: Role): number {
  let n = 0;
  for (const s of session.subscribers) if (s.role === role) n++;
  return n;
}

function broadcast(session: Session, role: Role, event: string, data: unknown) {
  const payload = frame(event, data);
  for (const sub of session.subscribers) {
    if (sub.role !== role) continue;
    sub.writer.write(payload).catch(() => drop(session, sub));
  }
}

function presence(session: Session) {
  broadcast(session, 'host', 'presence', { remotes: count(session, 'remote') });
  broadcast(session, 'remote', 'presence', { host: count(session, 'host') > 0 });
}

function drop(session: Session, sub: Subscriber) {
  if (!session.subscribers.delete(sub)) return;
  sub.writer.close().catch(() => {});
  presence(session);
}

function destroy(code: string, reason: string) {
  const session = sessions.get(code);
  if (!session) return;
  sessions.delete(code);
  const payload = frame('end', { reason });
  for (const sub of session.subscribers) {
    sub.writer.write(payload).catch(() => {});
    sub.writer.close().catch(() => {});
  }
  session.subscribers.clear();
}

function sweep() {
  const now = Date.now();
  for (const session of [...sessions.values()]) {
    const ping = encoder.encode(': ping\n\n');
    for (const sub of [...session.subscribers]) {
      sub.writer.write(ping).catch(() => drop(session, sub));
    }
    // Open connections count as activity; idle means nobody is attached.
    if (session.subscribers.size > 0) session.lastActivity = now;
    else if (now - session.lastActivity > IDLE_TTL_MS) destroy(session.code, 'expired');
  }
}

if (!globalThis.__onyx_remote_sweeper) {
  const timer = setInterval(sweep, Math.min(SWEEP_MS, PING_MS));
  timer.unref?.();
  globalThis.__onyx_remote_sweeper = timer;
}

// ---------- Validation ----------

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function str(v: unknown, max: number): string | null {
  return typeof v === 'string' && v.length <= max ? v : null;
}

function num(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

function int(v: unknown, min: number, max: number): number | null {
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

// ---------- Public API ----------

export const RemoteManager = {
  create(): { code: string; token: string } | null {
    if (sessions.size >= MAX_SESSIONS) return null;
    let code = generateCode();
    while (sessions.has(code)) code = generateCode();
    const token = randomUUID();
    const now = Date.now();
    sessions.set(code, { code, token, createdAt: now, lastActivity: now, state: null, subscribers: new Set() });
    return { code, token };
  },

  /** Returns the session only when the token matches. Counts as activity. */
  authorize(code: string, token: string | null): Session | null {
    if (!token) return null;
    const session = sessions.get(code.toUpperCase());
    if (!session || !safeEqual(session.token, token)) return null;
    session.lastActivity = Date.now();
    return session;
  },

  exists(code: string): boolean {
    return sessions.has(code.toUpperCase());
  },

  end(session: Session) {
    destroy(session.code, 'ended');
  },

  setState(session: Session, state: RemoteState) {
    session.state = state;
    broadcast(session, 'remote', 'state', state);
  },

  /** Forwards a command to the host. Returns false when no host is attached. */
  sendCommand(session: Session, command: RemoteCommand): boolean {
    if (count(session, 'host') === 0) return false;
    broadcast(session, 'host', 'command', command);
    return true;
  },

  /** Opens an SSE response for a role. The initial event is sent before any other data. */
  openStream(req: Request, session: Session, role: Role): Response {
    const stream = new TransformStream<Uint8Array, Uint8Array>();
    const writer = stream.writable.getWriter();
    const sub: Subscriber = { role, writer };
    session.subscribers.add(sub);

    if (role === 'remote') {
      writer.write(frame('presence', { host: count(session, 'host') > 0 })).catch(() => {});
      if (session.state) writer.write(frame('state', session.state)).catch(() => {});
    } else {
      writer.write(frame('presence', { remotes: count(session, 'remote') })).catch(() => {});
    }
    presence(session);

    req.signal.addEventListener('abort', () => drop(session, sub));

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  },
};

export function bearerToken(req: Request): string | null {
  const h = req.headers.get('authorization');
  if (!h) return null;
  const m = /^Bearer\s+(\S{1,128})$/i.exec(h);
  return m ? m[1] : null;
}

/** Reads a JSON body with a hard byte cap. */
export async function readJson(req: Request, maxBytes: number): Promise<unknown | undefined> {
  const text = await req.text();
  if (text.length > maxBytes) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
