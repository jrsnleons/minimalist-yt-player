import { runSse } from '@/lib/remote/sseClient';
import { validateCommand, validateState } from '@/lib/remote/validators';
import type { FloatingReaction, RoomState } from '@/lib/rooms/roomManager';
import type { Track } from '@/types';
import type {
  Credentials,
  JoinResult,
  PlaybackSync,
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
 * In-memory server relay (app/api/remote, app/api/rooms). Used when ABLY_API_KEY is unset.
 * Works on a single long-lived server process; on serverless hosts use Ably instead.
 */

// ---------- Phone remote ----------

function connectRemoteHost({ code, token }: Credentials, h: RemoteHostHandlers): RemoteHostLink {
  const ctrl = new AbortController();
  runSse({
    url: `/api/remote/${code}/host/events`,
    token,
    signal: ctrl.signal,
    onStatus: h.onStatus,
    onEvent: (event, data) => {
      if (event === 'presence') {
        const remotes = (data as { remotes?: number }).remotes;
        h.onPhones(typeof remotes === 'number' ? remotes : 0);
      } else if (event === 'command') {
        const command = validateCommand(data);
        if (command) h.onCommand(command);
      }
    },
    onFatal: () => h.onFatal(),
  });
  return {
    async publishState(state) {
      await fetch(`/api/remote/${code}/host/state`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
    },
    end() {
      // The server closes the stream when the session is deleted.
    },
    close: () => ctrl.abort(),
  };
}

function connectRemoteClient({ code, token }: Credentials, h: RemoteClientHandlers): RemoteClientLink {
  const ctrl = new AbortController();
  runSse({
    url: `/api/remote/${code}/events`,
    token,
    signal: ctrl.signal,
    onStatus: h.onStatus,
    onEvent: (event, data) => {
      if (event === 'state') {
        const state = validateState(data);
        if (state) h.onState(state);
      } else if (event === 'presence') {
        h.onHostOnline(!!(data as { host?: boolean }).host);
      }
    },
    onFatal: (reason) => h.onFatal(reason),
  });
  return {
    async sendCommand(command): Promise<SendResult> {
      const valid = validateCommand(command);
      if (!valid) return 'error';
      try {
        const res = await fetch(`/api/remote/${code}/command`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(valid),
        });
        if (res.status === 401 || res.status === 404) return 'invalid';
        if (res.status === 409) return 'offline';
        return res.ok ? 'ok' : 'error';
      } catch {
        return 'error';
      }
    },
    close: () => ctrl.abort(),
  };
}

// ---------- Listen Together ----------

async function post(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const rooms: RoomTransport = {
  async create({ userId, userName, roomName, initialPlayback }) {
    try {
      const res = await post('/api/rooms', { action: 'create', userId, userName, roomName, initialPlayback });
      const data = await res.json();
      return (data.room as RoomState) ?? null;
    } catch {
      return null;
    }
  },

  async join({ code, userId, userName }): Promise<JoinResult> {
    try {
      const res = await post('/api/rooms', { action: 'join', code: code.toUpperCase().trim(), userId, userName });
      const data = await res.json();
      if (data.room) return { room: data.room as RoomState };
      return { error: data.error || 'Failed to join session' };
    } catch {
      return { error: 'Network error. Check connection and try again.' };
    }
  },

  async act(code, userId, action: RoomAction) {
    try {
      const res = await post(`/api/rooms/${encodeURIComponent(code)}/action`, { ...action, userId });
      const data = await res.json();
      return !!(data.success ?? res.ok);
    } catch {
      return false;
    }
  },

  async leave(code, userId) {
    const url = `/api/rooms/${encodeURIComponent(code)}/action`;
    const payload = { action: 'leave', userId };
    try {
      const res = await post(url, payload);
      if (!res.ok) throw new Error('leave failed');
    } catch {
      post(url, payload).catch(() => {});
    }
  },

  leaveOnUnload(code, userId) {
    const payload = JSON.stringify({ action: 'leave', userId });
    navigator.sendBeacon(
      `/api/rooms/${encodeURIComponent(code)}/action`,
      new Blob([payload], { type: 'application/json' })
    );
  },

  listen(code, userId, events: RoomEvents) {
    let eventSource: EventSource | null = null;
    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const MAX_RETRY_DELAY = 30_000;

    const parse = <T,>(e: MessageEvent): T | null => {
      try {
        return JSON.parse(e.data) as T;
      } catch {
        return null;
      }
    };

    const connect = () => {
      if (stopped) return;
      events.onStatus('syncing');
      const es = new EventSource(`/api/rooms/${encodeURIComponent(code)}/events?userId=${encodeURIComponent(userId)}`);
      eventSource = es;

      es.onopen = () => {
        events.onStatus('synced');
        retryDelay = 1000;
      };
      es.addEventListener('room:sync', (e) => {
        const d = parse<RoomState>(e as MessageEvent);
        if (d) events.onRoomSync(d);
      });
      es.addEventListener('queue:sync', (e) => {
        const d = parse<{ queue: Track[] }>(e as MessageEvent);
        if (d && Array.isArray(d.queue)) events.onQueueSync(d.queue);
      });
      es.addEventListener('host:transfer', (e) => {
        const d = parse<{ newHostId: string; newHostName: string }>(e as MessageEvent);
        if (d) events.onHostTransfer(d);
      });
      es.addEventListener('playback:sync', (e) => {
        const d = parse<PlaybackSync>(e as MessageEvent);
        if (d) events.onPlaybackSync(d);
      });
      es.addEventListener('reaction:new', (e) => {
        const d = parse<FloatingReaction>(e as MessageEvent);
        if (d) events.onReaction(d);
      });
      es.onerror = () => {
        events.onStatus('offline');
        es.close();
        if (eventSource === es) eventSource = null;
        if (!stopped) {
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
            connect();
          }, retryDelay);
        }
      };
    };

    connect();
    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      eventSource?.close();
      eventSource = null;
      events.onStatus('offline');
    };
  },
};

const transport: RealtimeTransport = { kind: 'sse', connectRemoteHost, connectRemoteClient, rooms };
export default transport;
