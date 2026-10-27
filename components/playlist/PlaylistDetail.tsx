'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from './TrackRow';
import { TrackRowSkeleton } from '@/components/ui/Skeleton';
import { Tooltip } from '@/components/ui/Tooltip';
import { PlaylistCover } from '@/components/ui/PlaylistCover';
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

  const thead = (
    <thead className="sticky top-0 z-10 bg-[#0b0b0e]">
      <tr className="border-b border-white/[0.08] text-xs font-medium text-zinc-400">
        <th scope="col" className="w-14 px-2 py-2 text-center">#</th>
        <th scope="col" className="px-2 py-2">Title</th>
        <th scope="col" className="w-36 px-2 py-2 text-right">Duration</th>
      </tr>
    </thead>
  );

  return (
    <div className="pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onClose}
            aria-label="Back to library"
            className="w-10 h-10 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} />
          </button>

          <PlaylistCover playlist={playlist} className="w-16 h-16 rounded-md shrink-0" iconSize={26} />

          <div className="min-w-0">
            <h1 className="text-[32px] leading-tight font-bold text-white tracking-tight truncate">{playlist.name}</h1>
            {playlist.description && (
              <p className="text-sm text-zinc-300 truncate">{playlist.description}</p>
            )}
            <p className="text-[13px] text-zinc-400">
              {tracks?.length ?? 0} {(tracks?.length ?? 0) === 1 ? 'song' : 'songs'} · {formatTime(totalDuration)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(tracks?.length ?? 0) > 0 && (
            <button
              onClick={handlePlayAll}
              aria-label={`Play all songs in ${playlist.name}`}
              className="flex items-center gap-2 px-3.5 rounded-lg bg-[#f4f4f6] text-[#0b0b0e] text-sm font-semibold hover:bg-white transition-colors cursor-pointer min-h-[40px]"
            >
              <Play size={14} fill="currentColor" aria-hidden="true" />
              <span>Play All</span>
            </button>
          )}

          <Tooltip content="Delete Playlist" side="top">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              aria-label={`Delete ${playlist.name}`}
              className="w-10 h-10 rounded-full text-zinc-300 hover:text-rose-400 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center justify-center"
            >
              <Trash2 size={18} />
            </button>
          </Tooltip>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeletePlaylist}
        title={`Delete "${playlist.name}"?`}
        description="This playlist is removed from the library. The songs stay available."
        confirmText="Delete Playlist"
        cancelText="Cancel"
        isDestructive={true}
      />

      <div className="overflow-x-auto">
        {!tracks ? (
          <table className="w-full text-left border-collapse table-fixed" aria-label={`Loading songs in ${playlist.name}`}>
            {thead}
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TrackRowSkeleton key={`pl-detail-skel-${i}`} index={i} />
              ))}
            </tbody>
          </table>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Music size={28} className="mb-2 text-zinc-500" aria-hidden="true" />
            <p className="text-sm font-semibold text-zinc-200">This playlist is empty</p>
            <p className="text-sm text-zinc-400 mt-1">Use Search or the song menu to add songs.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-fixed" aria-label={`Songs in ${playlist.name}`}>
            {thead}
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
