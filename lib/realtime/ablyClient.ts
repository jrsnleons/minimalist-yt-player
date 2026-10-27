import type * as AblyTypes from 'ably';

/**
 * Browser-side Ably connection helper. The Ably library is loaded lazily so it only ships
 * when a session actually uses it. Tokens come from /api/realtime/token; the API key never
 * reaches the browser.
 */

export type RealtimeScope = 'remote' | 'room' | 'transfer';
export type ConnectionState = 'connecting' | 'open' | 'reconnecting';

export interface AblyLink {
  client: AblyTypes.Realtime;
  channel: AblyTypes.RealtimeChannel;
  clientId: string;
  /** Closes the connection. Safe to call more than once. */
  close: () => void;
}

interface OpenOptions {
  scope: RealtimeScope;
  code: string;
  /** Session secret for remote and transfer. */
  secret?: string;
  clientId: string;
  onState?: (state: ConnectionState) => void;
  /** Token route rejected the session; no retries follow. */
  onAuthRejected?: () => void;
}

export function randomId(prefix: string): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return `${prefix}-${s}`;
}

export async function openAblyChannel(opts: OpenOptions): Promise<AblyLink> {
  const Ably = await import('ably');
  let rejected = false;

  const client = new Ably.Realtime({
    clientId: opts.clientId,
    autoConnect: true,
    authCallback: (_params, callback) => {
      fetch('/api/realtime/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: opts.scope,
          code: opts.code,
          secret: opts.secret,
          clientId: opts.clientId,
        }),
        cache: 'no-store',
      })
        .then(async (res) => {
          if (res.status === 401 || res.status === 400) {
            rejected = true;
            opts.onAuthRejected?.();
            callback('Session rejected', null);
            client.close();
            return;
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          callback(null, await res.json());
        })
        .catch((err) => callback(err instanceof Error ? err.message : 'Token request failed', null));
    },
  });

  const channel = client.channels.get(`${opts.scope}:${opts.code}`);

  const report = () => {
    if (rejected) return;
    const conn = client.connection.state;
    if (conn === 'connected' && channel.state === 'attached') opts.onState?.('open');
    else if (conn === 'connecting' || conn === 'initialized') opts.onState?.('connecting');
    else if (conn === 'closed' || conn === 'closing') return;
    else opts.onState?.('reconnecting');
  };
  client.connection.on(report);
  channel.on(report);
  report();

  let closed = false;
  return {
    client,
    channel,
    clientId: opts.clientId,
    close: () => {
      if (closed) return;
      closed = true;
      try {
        client.close();
      } catch {}
    },
  };
}

export type { AblyTypes };
