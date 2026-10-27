import Dexie, { type Table } from 'dexie';
import type { Track, Playlist, HistoryEntry, PlayRecord, UserPreferences } from '@/types';

export type { Track, Playlist, HistoryEntry, PlayRecord, UserPreferences };

export class AppDatabase extends Dexie {
  playlists!: Table<Playlist, string>;
  tracks!: Table<Track, string>;
  history!: Table<HistoryEntry, number>;
  preferences!: Table<UserPreferences, string>;
  plays!: Table<PlayRecord, number>;

  constructor() {
    super('MinimalistYTPlayerDB');
    this.version(1).stores({
      playlists: 'id, name, createdAt, updatedAt',
      tracks: 'id, title, artist, addedAt',
      history: '++id, trackId, playedAt',
      preferences: 'key',
    });
    // v2: per-play records for the Stats view.
    this.version(2).stores({
      plays: '++id, trackId, playedAt',
    });
  }
}

export const db = new AppDatabase();
