import type { RepeatMode, Track } from '@/types';

export const REMOTE_CODE_LENGTH = 6;
export const REMOTE_QUEUE_CAP = 100;

export interface RemotePlaylist {
  id: string;
  name: string;
  count: number;
  coverUrl: string | null;
}

/** Snapshot the host publishes; the phone renders it and interpolates progress locally. */
export interface RemoteState {
  currentTrack: Track | null;
  isPlaying: boolean;
  /** Seconds at `timestamp`. */
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  liked: boolean;
  /** Listen Together lock: playback commands are ignored while true. */
  locked: boolean;
  /** Window of the host queue, at most REMOTE_QUEUE_CAP tracks. */
  queue: Track[];
  /** Absolute index of the first item in `queue`. */
  queueOffset: number;
  /** Absolute index of the playing track, -1 when none. */
  queueIndex: number;
  queueTotal: number;
  playlists: RemotePlaylist[];
  /** Host clock, ms. */
  timestamp: number;
}

export type RemoteCommand =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'seek'; seconds: number }
  | { type: 'setVolume'; volume: number }
  | { type: 'toggleMute' }
  | { type: 'toggleShuffle' }
  | { type: 'cycleRepeat' }
  | { type: 'toggleLike' }
  | { type: 'playTrack'; track: Track }
  | { type: 'playNext'; track: Track }
  | { type: 'addToQueue'; track: Track }
  | { type: 'removeFromQueue'; index: number }
  | { type: 'moveInQueue'; from: number; to: number }
  | { type: 'clearQueue' }
  | { type: 'playPlaylist'; playlistId: string };

export type RemoteCommandType = RemoteCommand['type'];

/** Commands that stay available while Listen Together locks playback. */
export const LOCK_EXEMPT_COMMANDS: RemoteCommandType[] = ['setVolume', 'toggleMute', 'toggleLike'];

export interface SessionCredentials {
  code: string;
  token: string;
}
