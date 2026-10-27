import { randomUUID, timingSafeEqual } from 'node:crypto';
import {
  REMOTE_CODE_LENGTH,
  type RemoteCommand,
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

export { sanitizeTrack, validateCommand, validateState } from '@/lib/remote/validators';

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
