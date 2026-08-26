'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from './TrackRow';
import { cn } from '@/lib/utils';
import type { Playlist, Track } from '@/types';
import { Music, Trash2 } from 'lucide-react';

interface PlaylistDetailProps {
  playlist: Playlist;
  onClose: () => void;
}

export function PlaylistDetail({ playlist, onClose }: PlaylistDetailProps) {
  const { play, currentTrack, showToast } = usePlayerStore();

  const tracks = useLiveQuery(async () => {
    if (!playlist.trackIds.length) return [];
    const all = await db.tracks.bulkGet(playlist.trackIds);
    return playlist.trackIds
      .map((id, i) => ({ id, track: all[i] }))
      .filter((x): x is { id: string; track: Track } => x.track !== undefined)
      .map((x) => x.track);
  }, [playlist.trackIds]);

  const handlePlayAll = () => {
    if (!tracks || tracks.length === 0) return;
    play(tracks[0], tracks);
  };

  const handleDeletePlaylist = async () => {
    if (!confirm(`Delete "${playlist.name}"? This cannot be undone.`)) return;
    await db.playlists.delete(playlist.id);
    showToast(`Deleted "${playlist.name}"`);
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Playlist header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            <Music size={24} className="text-zinc-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{playlist.name}</h2>
            {playlist.description && (
              <p className="text-sm text-zinc-500 mt-0.5">{playlist.description}</p>
            )}
            <p className="text-xs text-zinc-600 mt-1">
              {tracks?.length ?? 0} track{(tracks?.length ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(tracks?.length ?? 0) > 0 && (
            <button
              onClick={handlePlayAll}
              aria-label={`Play all tracks in ${playlist.name}`}
              className="px-4 py-2 rounded-md bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-opacity"
            >
              Play All
            </button>
          )}
          <button
            onClick={handleDeletePlaylist}
            aria-label={`Delete playlist ${playlist.name}`}
            className="p-2 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Track table */}
      <div className="flex-1 overflow-y-auto">
        {!tracks ? (
          // Skeleton loader
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="skeleton w-9 h-9 rounded" />
                <div className="flex-1 space-y-1">
                  <div className="skeleton h-3 w-48 rounded" />
                  <div className="skeleton h-3 w-32 rounded" />
                </div>
                <div className="skeleton h-3 w-10 rounded" />
              </div>
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-600">
            <Music size={32} className="mb-3" />
            <p className="text-sm">This playlist is empty</p>
            <p className="text-xs mt-1">Add tracks by right-clicking any track</p>
          </div>
        ) : (
          <table className="w-full" role="grid" aria-label={`Tracks in ${playlist.name}`}>
            <thead className="sticky top-0 bg-zinc-900/90 backdrop-blur-sm">
              <tr className="border-b border-zinc-800">
                <th className="w-10 px-3 py-2 text-xs text-zinc-500 text-center font-normal">#</th>
                <th className="px-3 py-2 text-xs text-zinc-500 text-left font-normal">Title</th>
                <th className="px-3 py-2 text-xs text-zinc-500 text-left font-normal">Artist</th>
                <th className="px-3 py-2 text-xs text-zinc-500 text-right font-normal">Duration</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, i) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={i}
                  playlist={playlist}
                  isActive={currentTrack?.id === track.id}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
