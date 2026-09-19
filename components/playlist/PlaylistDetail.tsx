'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from './TrackRow';
import { TrackRowSkeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatTime } from '@/lib/utils';
import type { Playlist, Track } from '@/types';
import { Music, Trash2, Play, ArrowLeft } from 'lucide-react';

interface PlaylistDetailProps {
  playlist: Playlist;
  onClose: () => void;
}

export function PlaylistDetail({ playlist, onClose }: PlaylistDetailProps) {
  const { play, currentTrack, showToast } = usePlayerStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const tracks = useLiveQuery(async () => {
    if (!playlist.trackIds.length) return [];
    const all = await db.tracks.bulkGet(playlist.trackIds);
    return playlist.trackIds
      .map((id, i) => ({ id, track: all[i] }))
      .filter((x): x is { id: string; track: Track } => x.track !== undefined)
      .map((x) => x.track);
  }, [playlist.trackIds]);

  const totalDuration = (tracks ?? []).reduce((acc, t) => acc + (t.duration || 0), 0);

  const handlePlayAll = () => {
    if (!tracks || tracks.length === 0) return;
    play(tracks[0], tracks);
  };

  const handleDeletePlaylist = async () => {
    await db.playlists.delete(playlist.id);
    showToast(`Deleted "${playlist.name}"`);
    onClose();
  };

  return (
    <div className="mx-4 sm:mx-6 mb-6 rounded-2xl border border-white/[0.08] bg-[#0d0d12] overflow-hidden shadow-sm">
      {/* Playlist Header Banner */}
      <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/[0.06] bg-[#121217]">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            aria-label="Back to playlists"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Back to playlists"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
            <Music size={24} className="text-zinc-300" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-400">
                Playlist
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">{playlist.name}</h2>
            {playlist.description && (
              <p className="text-xs text-zinc-400 mt-0.5">{playlist.description}</p>
            )}
            <p className="text-xs font-mono-time text-zinc-400 mt-1">
              {tracks?.length ?? 0} tracks · {formatTime(totalDuration)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(tracks?.length ?? 0) > 0 && (
            <button
              onClick={handlePlayAll}
              aria-label={`Play all tracks in ${playlist.name}`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-sm active:scale-95 cursor-pointer min-h-[36px]"
            >
              <Play size={13} fill="currentColor" />
              <span>Play All</span>
            </button>
          )}

          <Tooltip content="Delete Playlist" side="top">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              aria-label={`Delete playlist ${playlist.name}`}
              className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-white/[0.06] transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <Trash2 size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeletePlaylist}
        title={`Delete "${playlist.name}"?`}
        description="This playlist will be permanently removed from the library. The songs will remain available."
        confirmText="Delete Playlist"
        cancelText="Cancel"
        isDestructive={true}
      />

      {/* Track Table */}
      <div className="overflow-x-auto">
        {!tracks ? (
          <table className="w-full text-left border-collapse table-fixed" role="grid" aria-label={`Loading tracks in ${playlist.name}`}>
            <thead className="sticky top-0 z-10 bg-[#09090d]">
              <tr className="border-b border-white/[0.06] text-[11px] font-medium text-zinc-400">
                <th className="w-10 px-2 py-2 text-center">#</th>
                <th className="px-2 py-2">Track</th>
                <th className="w-28 px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {Array.from({ length: 5 }).map((_, i) => (
                <TrackRowSkeleton key={`pl-detail-skel-${i}`} index={i} />
              ))}
            </tbody>
          </table>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-center">
            <Music size={28} className="mb-2 text-zinc-600" />
            <p className="text-xs font-medium text-zinc-300">This playlist is empty</p>
            <p className="text-[11px] text-zinc-500 mt-1">Use search or the context menu on any song to add tracks</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-fixed" role="grid" aria-label={`Tracks in ${playlist.name}`}>
            <thead className="sticky top-0 z-10 bg-[#09090d]">
              <tr className="border-b border-white/[0.06] text-[11px] font-medium text-zinc-400">
                <th className="w-10 px-2 py-2 text-center">#</th>
                <th className="px-2 py-2">Track</th>
                <th className="w-28 px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
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
