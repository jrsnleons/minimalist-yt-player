'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from './TrackRow';
import { TrackRowSkeleton } from '@/components/ui/Skeleton';
import { SharePlaylistModal } from './SharePlaylistModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatTime } from '@/lib/utils';
import type { Playlist, Track } from '@/types';
import { Music, Trash2, Play, ArrowLeft, QrCode } from 'lucide-react';

interface PlaylistDetailProps {
  playlist: Playlist;
  onClose: () => void;
}

export function PlaylistDetail({ playlist, onClose }: PlaylistDetailProps) {
  const { play, currentTrack, showToast } = usePlayerStore();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
    if (!confirm(`Delete "${playlist.name}"? This cannot be undone.`)) return;
    await db.playlists.delete(playlist.id);
    showToast(`Deleted "${playlist.name}"`);
    onClose();
  };

  return (
    <>
      <div className="mx-6 mb-6 rounded-2xl border border-[#27272a] bg-[#0f0f13] overflow-hidden shadow-sm">
        {/* Playlist Header Banner */}
        <div className="flex items-center justify-between p-6 border-b border-[#222228] bg-[#121217]">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              aria-label="Back to queue"
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1e1e24] transition-colors"
              title="Back to queue"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="w-14 h-14 rounded-xl bg-[#1e1e24] border border-zinc-700/60 flex items-center justify-center shrink-0 shadow-inner">
              <Music size={26} className="text-zinc-300" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Custom Playlist
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{playlist.name}</h2>
              {playlist.description && (
                <p className="text-xs text-zinc-400 mt-0.5">{playlist.description}</p>
              )}
              <p className="text-[11px] font-mono-time text-zinc-500 mt-1">
                {tracks?.length ?? 0} tracks · {formatTime(totalDuration)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(tracks?.length ?? 0) > 0 && (
              <button
                onClick={handlePlayAll}
                aria-label={`Play all tracks in ${playlist.name}`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-sm active:scale-95"
              >
                <Play size={13} fill="currentColor" />
                <span>Play All</span>
              </button>
            )}

            <Tooltip content="Share Playlist & QR Code" side="top">
              <button
                onClick={() => setIsShareModalOpen(true)}
                aria-label={`Share ${playlist.name}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium transition-all active:scale-95 cursor-pointer"
              >
                <QrCode size={14} className="text-white" />
                <span className="text-[11px]">Share</span>
              </button>
            </Tooltip>

            <Tooltip content="Delete Playlist" side="top">
              <button
                onClick={handleDeletePlaylist}
                aria-label={`Delete playlist ${playlist.name}`}
                className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-[#1e1e24] transition-all cursor-pointer active:scale-95"
              >
                <Trash2 size={16} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Track Table */}
        <div className="overflow-x-auto">
          {!tracks ? (
            <table className="w-full text-left border-collapse" role="grid" aria-label={`Loading tracks in ${playlist.name}`}>
              <thead>
                <tr className="border-b border-[#222228] text-[11px] font-semibold text-zinc-500 uppercase tracking-wider bg-[#0f0f13]">
                  <th className="w-12 px-4 py-2.5 text-center">#</th>
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-4 py-2.5">Artist</th>
                  <th className="w-24 px-4 py-2.5 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e24]/40">
                {Array.from({ length: 5 }).map((_, i) => (
                  <TrackRowSkeleton key={`pl-detail-skel-${i}`} index={i} />
                ))}
              </tbody>
            </table>
          ) : tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-center">
              <Music size={28} className="mb-2 text-zinc-700" />
              <p className="text-xs font-medium text-zinc-400">This playlist is currently empty</p>
              <p className="text-[11px] text-zinc-600 mt-1">Right-click any track in search or queue to add it here</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse" role="grid" aria-label={`Tracks in ${playlist.name}`}>
              <thead>
                <tr className="border-b border-[#222228] text-[11px] font-semibold text-zinc-500 uppercase tracking-wider bg-[#0f0f13]">
                  <th className="w-12 px-4 py-2.5 text-center">#</th>
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-4 py-2.5">Artist</th>
                  <th className="w-24 px-4 py-2.5 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e24]/40">
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

      {isShareModalOpen && (
        <SharePlaylistModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          playlist={playlist}
          tracks={tracks || []}
        />
      )}
    </>
  );
}
