import { db } from '@/db/schema';
import { uuid } from '@/lib/utils';
import type { LibraryBackup, SinglePlaylistBackup, RestoreMode, Playlist, Track, HistoryEntry, UserPreferences } from '@/types';

/** Trigger a browser download of a JSON object */
export function downloadJsonFile(filename: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Reads the whole local library into a backup object without downloading anything. */
export async function buildLibraryBackup(): Promise<LibraryBackup> {
  const [playlists, tracks, history, preferences] = await Promise.all([
    db.playlists.toArray(),
    db.tracks.toArray(),
    db.history.toArray(),
    db.preferences.toArray(),
  ]);

  return {
    version: 1,
    appName: 'onyx',
    exportedAt: Date.now(),
    summary: {
      playlistCount: playlists.length,
      trackCount: tracks.length,
      historyCount: history.length,
    },
    data: {
      playlists,
      tracks,
      history,
      preferences,
    },
  };
}

/** Export entire local library into a JSON backup file */
export async function exportFullLibrary(): Promise<LibraryBackup> {
  const backup = await buildLibraryBackup();
  const dateStr = new Date().toISOString().split('T')[0];
  downloadJsonFile(`onyx-backup-${dateStr}.json`, backup);
  return backup;
}

/** Export a single playlist and its tracks into a JSON file */
export async function exportSinglePlaylist(playlistId: string): Promise<SinglePlaylistBackup | null> {
  const playlist = await db.playlists.get(playlistId);
  if (!playlist) return null;

  const tracks = await db.tracks.bulkGet(playlist.trackIds);
  const validTracks = tracks.filter((t): t is Track => t !== undefined);

  const backup: SinglePlaylistBackup = {
    version: 1,
    type: 'single-playlist',
    exportedAt: Date.now(),
    playlist,
    tracks: validTracks,
  };

  const safeName = playlist.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  downloadJsonFile(`onyx-playlist-${safeName}.json`, backup);
  return backup;
}

export interface ValidationResult {
  isValid: boolean;
  type: 'full-library' | 'single-playlist' | 'invalid';
  error?: string;
  summary?: {
    playlistCount: number;
    trackCount: number;
    historyCount: number;
    exportedAt?: number;
    name?: string;
  };
  parsedData?: LibraryBackup | SinglePlaylistBackup;
}

/** Validate JSON file content as a valid backup */
export function validateBackup(jsonContent: unknown): ValidationResult {
  if (!jsonContent || typeof jsonContent !== 'object') {
    return { isValid: false, type: 'invalid', error: 'Invalid JSON data' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = jsonContent as any;

  // 1. Check for single playlist backup
  if (obj.type === 'single-playlist' && obj.playlist && Array.isArray(obj.tracks)) {
    if (!obj.playlist.name || !Array.isArray(obj.playlist.trackIds)) {
      return { isValid: false, type: 'invalid', error: 'Malformed playlist structure in file' };
    }
    return {
      isValid: true,
      type: 'single-playlist',
      summary: {
        playlistCount: 1,
        trackCount: obj.tracks.length,
        historyCount: 0,
        exportedAt: obj.exportedAt,
        name: obj.playlist.name,
      },
      parsedData: obj as SinglePlaylistBackup,
    };
  }

  // 2. Check for full library backup
  if (obj.data && Array.isArray(obj.data.playlists) && Array.isArray(obj.data.tracks)) {
    return {
      isValid: true,
      type: 'full-library',
      summary: {
        playlistCount: obj.data.playlists.length,
        trackCount: obj.data.tracks.length,
        historyCount: Array.isArray(obj.data.history) ? obj.data.history.length : 0,
        exportedAt: obj.exportedAt,
      },
      parsedData: obj as LibraryBackup,
    };
  }

  // 3. Fallback: simple playlists/tracks array at top level
  if (Array.isArray(obj.playlists) && Array.isArray(obj.tracks)) {
    const formatted: LibraryBackup = {
      version: 1,
      appName: 'onyx',
      exportedAt: Date.now(),
      summary: {
        playlistCount: obj.playlists.length,
        trackCount: obj.tracks.length,
        historyCount: Array.isArray(obj.history) ? obj.history.length : 0,
      },
      data: {
        playlists: obj.playlists,
        tracks: obj.tracks,
        history: obj.history || [],
        preferences: obj.preferences || [],
      },
    };
    return {
      isValid: true,
      type: 'full-library',
      summary: formatted.summary,
      parsedData: formatted,
    };
  }

  return { isValid: false, type: 'invalid', error: 'Unrecognized backup file format' };
}

/** Restore full library into IndexedDB */
export async function restoreFullLibrary(
  backup: LibraryBackup,
  mode: RestoreMode = 'merge'
): Promise<{ restoredPlaylists: number; restoredTracks: number; restoredHistory: number }> {
  const { playlists = [], tracks = [], history = [], preferences = [] } = backup.data;

  if (mode === 'replace') {
    // Clear all existing data
    await Promise.all([
      db.playlists.clear(),
      db.tracks.clear(),
      db.history.clear(),
      db.preferences.clear(),
    ]);

    // Bulk put new items
    if (tracks.length > 0) await db.tracks.bulkPut(tracks);
    if (playlists.length > 0) await db.playlists.bulkPut(playlists);
    if (history.length > 0) {
      const cleanHistory = history.map(({ id: _id, ...rest }) => rest);
      await db.history.bulkAdd(cleanHistory as HistoryEntry[]);
    }
    if (preferences.length > 0) await db.preferences.bulkPut(preferences);

    return {
      restoredPlaylists: playlists.length,
      restoredTracks: tracks.length,
      restoredHistory: history.length,
    };
  }

  // Merge Mode: non-destructive
  if (tracks.length > 0) {
    await db.tracks.bulkPut(tracks);
  }

  // Merge Playlists: preserve IDs or create new ones if collision
  const existingPlaylists = await db.playlists.toArray();
  const existingMap = new Map(existingPlaylists.map((p) => [p.id, p]));

  for (const pl of playlists) {
    if (existingMap.has(pl.id)) {
      // Merge unique track IDs into existing playlist
      const current = existingMap.get(pl.id)!;
      const combinedTrackIds = Array.from(new Set([...current.trackIds, ...pl.trackIds]));
      await db.playlists.update(pl.id, {
        trackIds: combinedTrackIds,
        updatedAt: Date.now(),
      });
    } else {
      await db.playlists.put(pl);
    }
  }

  // Merge History: add new entries
  if (history.length > 0) {
    const existingHistory = await db.history.toArray();
    const existingKeySet = new Set(existingHistory.map((h) => `${h.trackId}-${h.playedAt}`));
    const newEntries = history
      .filter((h) => !existingKeySet.has(`${h.trackId}-${h.playedAt}`))
      .map(({ id: _id, ...rest }) => rest);
    if (newEntries.length > 0) {
      await db.history.bulkAdd(newEntries as HistoryEntry[]);
    }
  }

  if (preferences.length > 0) {
    await db.preferences.bulkPut(preferences);
  }

  return {
    restoredPlaylists: playlists.length,
    restoredTracks: tracks.length,
    restoredHistory: history.length,
  };
}

/** Import a single playlist JSON backup */
export async function importSinglePlaylistBackup(backup: SinglePlaylistBackup): Promise<Playlist> {
  const { playlist, tracks } = backup;

  // 1. Put tracks
  if (tracks.length > 0) {
    await db.tracks.bulkPut(tracks);
  }

  // 2. Check if playlist ID already exists
  const existing = await db.playlists.get(playlist.id);
  const newId = existing ? uuid() : playlist.id;

  const newPlaylist: Playlist = {
    ...playlist,
    id: newId,
    name: existing ? `${playlist.name} (Imported)` : playlist.name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.playlists.put(newPlaylist);
  return newPlaylist;
}
