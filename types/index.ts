// Shared TypeScript interfaces for the Minimalist YT Player

export interface Track {
  id: string; // YouTube videoId
  title: string;
  artist: string;
  duration: number; // seconds
  thumbnailUrl: string;
  addedAt: number; // Unix timestamp ms
}

export interface Playlist {
  id: string; // crypto.randomUUID()
  name: string;
  description?: string;
  createdAt: number; // Unix timestamp ms
  updatedAt: number; // Unix timestamp ms
  trackIds: string[]; // Ordered array of Track IDs
}

export interface SearchPlaylist {
  id: string; // YouTube Playlist ID (e.g. PL...)
  title: string;
  author: string;
  thumbnailUrl: string;
}

export interface HistoryEntry {
  id?: number; // Auto-incremented
  trackId: string; // Reference to Track.id
  playedAt: number; // Unix timestamp ms
  durationPlayed: number; // seconds actually listened
}

export interface UserPreferences {
  key: string;
  value: unknown;
}

export type RepeatMode = 'off' | 'one' | 'all';
export type PlaybackMode = 'iframe' | 'direct-audio';

export interface SearchResult {
  results: Track[];
  tracks?: Track[];
  videos?: Track[];
  playlists?: SearchPlaylist[];
}

export interface RadioResult {
  suggestions: Track[];
}

export interface AppAction {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

export type CommandPaletteScope = 'local' | 'youtube' | 'actions';

// Data Safety & Backup Schemas
export interface LibraryBackup {
  version: 1;
  appName: 'minimalist-yt-player';
  exportedAt: number; // Unix timestamp ms
  summary: {
    playlistCount: number;
    trackCount: number;
    historyCount: number;
  };
  data: {
    playlists: Playlist[];
    tracks: Track[];
    history?: HistoryEntry[];
    preferences?: UserPreferences[];
  };
}

export interface SinglePlaylistBackup {
  version: 1;
  type: 'single-playlist';
  exportedAt: number;
  playlist: Playlist;
  tracks: Track[];
}

export type RestoreMode = 'merge' | 'replace';

// Spotify Importer Types
export interface SpotifyTrackItem {
  id: string; // Spotify track ID / URI
  title: string;
  artist: string;
  album?: string;
  durationMs: number;
  thumbnailUrl?: string;
}

export interface SpotifyPlaylistPreview {
  id: string;
  title: string;
  description?: string;
  author?: string;
  thumbnailUrl?: string;
  trackCount: number;
  tracks: SpotifyTrackItem[];
}
