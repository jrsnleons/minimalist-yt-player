import type { FloatingReaction, RoomState } from '@/lib/rooms/roomManager';
import type { RemoteCommand, RemoteState } from '@/lib/remote/types';
import type { Track } from '@/types';

/**
 * One small interface in front of the two realtime backends. `ably` relays through Ably
 * channels with no server state; `sse` is the in-memory server relay used when ABLY_API_KEY
 * is not set (local dev, self-hosting). Hooks and stores only talk to this file.
 */

export type LinkStatus = 'connecting' | 'open' | 'reconnecting';
export type SendResult = 'ok' | 'offline' | 'invalid' | 'error';
export type TransportKind = 'ably' | 'sse';

export interface Credentials {
  code: string;
  token: string;
}

// ---------- Phone remote ----------

export interface RemoteHostHandlers {
  onStatus(status: LinkStatus): void;
  /** Number of phones attached. Also called when a phone asks for fresh state. */
  onPhones(count: number): void;
  /** Already validated. */
  onCommand(command: RemoteCommand): void;
  /** Session is invalid or gone; no further retries. */
  onFatal(): void;
}

export interface RemoteHostLink {
  publishState(state: RemoteState): Promise<void>;
  /** Tells phones the session is over. */
  end(): void;
  close(): void;
}

export interface RemoteClientHandlers {
  onStatus(status: LinkStatus): void;
  onHostOnline(online: boolean): void;
  /** Already validated. */
  onState(state: RemoteState): void;
  onFatal(reason: 'invalid' | 'ended'): void;
}

export interface RemoteClientLink {
  sendCommand(command: RemoteCommand): Promise<SendResult>;
  close(): void;
}

// ---------- Listen Together ----------

export type RoomAction =
  | { action: 'sync'; currentTrack: Track | null; isPlaying: boolean; progress: number }
  | { action: 'reaction'; emoji: string }
  | { action: 'transfer-dj'; targetUserId: string }
  | { action: 'toggle-listener-controls'; allowListenerControls: boolean }
  | { action: 'queue-add'; track: Track; userName: string; playNext: boolean }
  | { action: 'queue-remove'; trackId: string }
  | { action: 'queue-reorder'; queue: Track[] }
  | { action: 'queue-clear' };

export interface PlaybackSync {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  timestamp: number;
  initiatorId?: string;
}

export interface RoomEvents {
  onRoomSync(room: RoomState): void;
  onQueueSync(queue: Track[]): void;
  onHostTransfer(data: { newHostId: string; newHostName: string }): void;
  onPlaybackSync(data: PlaybackSync): void;
  onReaction(reaction: FloatingReaction): void;
  onStatus(status: 'synced' | 'syncing' | 'offline'): void;
}

export type JoinResult = { room: RoomState } | { error: string };

export interface RoomTransport {
  create(p: {
    userId: string;
    userName: string;
    roomName?: string;
    initialPlayback?: { currentTrack: Track | null; isPlaying: boolean; progress: number; queue: Track[] };
  }): Promise<RoomState | null>;
  join(p: { code: string; userId: string; userName: string }): Promise<JoinResult>;
  act(code: string, userId: string, action: RoomAction): Promise<boolean>;
  leave(code: string, userId: string): Promise<void>;
  /** Starts delivering events for the active room. Returns a stop function. */
  listen(code: string, userId: string, events: RoomEvents): () => void;
  /** Best effort leave while the tab is closing. */
  leaveOnUnload(code: string, userId: string): void;
}

export interface RealtimeTransport {
  kind: TransportKind;
  connectRemoteHost(creds: Credentials, handlers: RemoteHostHandlers): RemoteHostLink;
  connectRemoteClient(creds: Credentials, handlers: RemoteClientHandlers): RemoteClientLink;
  rooms: RoomTransport;
}

// ---------- Selection ----------

let kindPromise: Promise<TransportKind> | null = null;
let transportPromise: Promise<RealtimeTransport> | null = null;
let resolved: RealtimeTransport | null = null;

/** Asks the server which transport is configured. Rejects when the check itself fails. */
export function getTransportKind(): Promise<TransportKind> {
  if (!kindPromise) {
    kindPromise = fetch('/api/realtime/config', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data): TransportKind => (data?.transport === 'ably' ? 'ably' : 'sse'));
    // A failed check is retried on the next call instead of being cached.
    kindPromise.catch(() => (kindPromise = null));
  }
  return kindPromise;
}

export function getTransport(): Promise<RealtimeTransport> {
  if (!transportPromise) {
    transportPromise = getTransportKind()
      .then((kind) => (kind === 'ably' ? import('@/lib/realtime/ablyTransport') : import('@/lib/realtime/sseTransport')))
      .then((mod) => {
        resolved = mod.default;
        return mod.default;
      });
    transportPromise.then(
      () => {},
      () => (transportPromise = null)
    );
  }
  return transportPromise;
}

/** The transport if it has already loaded, otherwise null. For unload handlers that cannot await. */
export function peekTransport(): RealtimeTransport | null {
  return resolved;
}

export async function isAblyEnabled(): Promise<boolean> {
  try {
    return (await getTransportKind()) === 'ably';
  } catch {
    return false;
  }
}
