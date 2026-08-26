import Dexie, { type Table } from 'dexie';
import type { Track, Playlist, HistoryEntry, UserPreferences } from '@/types';

export type { Track, Playlist, HistoryEntry, UserPreferences };

export class AppDatabase extends Dexie {
  playlists!: Table<Playlist, string>;
  tracks!: Table<Track, string>;
  history!: Table<HistoryEntry, number>;
  preferences!: Table<UserPreferences, string>;

  constructor() {
    super('MinimalistYTPlayerDB');
    this.version(1).stores({
      playlists: 'id, name, createdAt, updatedAt',
      tracks: 'id, title, artist, addedAt',
      history: '++id, trackId, playedAt',
      preferences: 'key',
    });
  }
}

export const db = new AppDatabase();
