'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from '@/components/playlist/TrackRow';
import { CreatePlaylistModal } from '@/components/playlist/CreatePlaylistModal';
import { formatTime } from '@/lib/utils';
import { Music, Plus, Play, Trash2, ArrowLeft, FolderPlus } from 'lucide-react';
import type { Playlist, Track } from '@/types';

export function PlaylistsView() {
  const { play, currentTrack, showToast } = usePlayerStore();
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const playlists = useLiveQuery(() => db.playlists.orderBy('updatedAt').reverse().toArray(), []);

  const playlistTracks = useLiveQuery(async () => {
    if (!selectedPlaylist || !selectedPlaylist.trackIds.length) return [];
    const all = await db.tracks.bulkGet(selectedPlaylist.trackIds);
    return selectedPlaylist.trackIds
      .map((id, i) => ({ id, track: all[i] }))
      .filter((x): x is { id: string; track: Track } => x.track !== undefined)
      .map((x) => x.track);
  }, [selectedPlaylist?.trackIds]);

  const handlePlayAll = () => {
    if (!playlistTracks || playlistTracks.length === 0) return;
    play(playlistTracks[0], playlistTracks);
    showToast(`Playing "${selectedPlaylist?.name}"`);
  };

  const handleDeletePlaylist = async (playlist: Playlist) => {
    if (!confirm(`Delete playlist "${playlist.name}"?`)) return;
    await db.playlists.delete(playlist.id);
    showToast(`Deleted "${playlist.name}"`);
    if (selectedPlaylist?.id === playlist.id) {
      setSelectedPlaylist(null);
    }
  };

  // If a playlist is selected, show its detail table
  if (selectedPlaylist) {
    const totalDuration = (playlistTracks ?? []).reduce((acc, t) => acc + (t.duration || 0), 0);

    return (
      <div className="rounded-2xl border border-[#27272a] bg-[#0f0f13] overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-[#222228] bg-[#121217]">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setSelectedPlaylist(null)}
              aria-label="Back to all playlists"
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1e1e24] transition-colors"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="w-12 h-12 rounded-xl bg-[#1e1e24] border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <Music size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{selectedPlaylist.name}</h3>
              {selectedPlaylist.description && (
                <p className="text-xs text-zinc-400">{selectedPlaylist.description}</p>
              )}
              <p className="text-[11px] font-mono-time text-zinc-500 mt-0.5">
                {playlistTracks?.length ?? 0} tracks · {formatTime(totalDuration)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(playlistTracks?.length ?? 0) > 0 && (
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-sm"
              >
                <Play size={12} fill="currentColor" />
                <span>Play All</span>
              </button>
            )}
            <button
              onClick={() => handleDeletePlaylist(selectedPlaylist)}
              className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-[#1e1e24] transition-colors"
              title="Delete Playlist"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {!playlistTracks || playlistTracks.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 text-xs">
              <Music size={28} className="mx-auto text-zinc-700 mb-2" />
              <p className="font-medium text-zinc-400">Playlist is empty</p>
              <p className="text-zinc-600 mt-1">Add tracks from search, queue, or recently played</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse" role="grid">
              <thead>
                <tr className="border-b border-[#222228] text-[11px] font-semibold text-zinc-500 uppercase tracking-wider bg-[#0f0f13]">
                  <th className="w-12 px-4 py-2.5 text-center">#</th>
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-4 py-2.5">Artist</th>
                  <th className="w-32 px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e24]/40">
                {playlistTracks.map((track, i) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={i}
                    playlist={selectedPlaylist}
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

  // Grid view of all playlists
  return (
    <>
      <div className="rounded-2xl border border-[#27272a] bg-[#0f0f13] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#222228]">
          <div className="flex items-center gap-2">
            <Music size={16} className="text-zinc-400" />
            <h3 className="text-sm font-semibold text-white">Your Playlists</h3>
            <span className="text-xs font-mono-time text-zinc-500">({playlists?.length ?? 0})</span>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <Plus size={13} />
            <span>New Playlist</span>
          </button>
        </div>

        {!playlists || playlists.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 border border-dashed border-[#27272f] rounded-xl my-2">
            <FolderPlus size={32} className="mx-auto text-zinc-700 mb-2" />
            <p className="text-xs font-medium text-zinc-300">No playlists yet</p>
            <p className="text-[11px] text-zinc-500 mt-1">Create your first playlist to organize your favorite music</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-3 px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
            >
              + Create Playlist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => setSelectedPlaylist(pl)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#14141a] hover:bg-[#1c1c24] border border-[#27272f] hover:border-zinc-600 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#22222a] flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors shrink-0">
                    <Music size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">{pl.name}</h4>
                    <p className="text-[10px] text-zinc-500 font-mono-time">{pl.trackIds.length} tracks</p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePlaylist(pl);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-[#27272f] transition-all"
                  title="Delete playlist"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreatePlaylistModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </>
  );
}
