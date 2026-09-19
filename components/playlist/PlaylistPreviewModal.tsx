'use client';

import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { db } from '@/db/schema';
import { formatTime, cn } from '@/lib/utils';
import {
  Music,
  Play,
  Download,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import type { Track, SearchPlaylist } from '@/types';

interface PlaylistPreviewModalProps {
  playlist: SearchPlaylist | null;
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export function PlaylistPreviewModal({
  playlist,
  isOpen,
  onClose,
  onImportSuccess,
}: PlaylistPreviewModalProps) {
  const play = usePlayerStore((s) => s.play);
  const showToast = usePlayerStore((s) => s.showToast);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !playlist?.id) {
      setTracks([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`/api/playlist?id=${encodeURIComponent(playlist.id)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load playlist: ${res.status}`);
        return res.json();
      })
      .then((data: { tracks?: Track[] }) => {
        setTracks(data.tracks || []);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setError('Could not load songs for this playlist.');
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, playlist?.id]);

  if (!isOpen || !playlist) return null;

  const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    play(tracks[0], tracks);
    showToast(`Playing "${playlist.title}" (${tracks.length} tracks)`);
    onClose();
  };

  const handlePlayTrack = (track: Track) => {
    play(track, tracks);
    showToast(`Playing "${track.title}"`);
  };

  const handleImport = async () => {
    if (tracks.length === 0) return;
    setIsImporting(true);
    try {
      await db.tracks.bulkPut(tracks);
      await db.playlists.put({
        id: playlist.id,
        name: playlist.title,
        description: `Imported playlist from ${playlist.author || 'YouTube'}`,
        trackIds: tracks.map((t) => t.id),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      showToast(`Imported "${playlist.title}" with ${tracks.length} songs`);
      onImportSuccess?.();
      onClose();
    } catch {
      showToast('Failed to import playlist');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview songs in ${playlist.title}`}
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/[0.1] bg-[#0c0c12]/95 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[85vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-white/[0.02] shrink-0">
          <div className="min-w-0 flex-1 mr-3">
            <div className="flex items-center gap-2">
              <Music size={16} className="text-zinc-400 shrink-0" />
              <h3 className="text-sm font-semibold text-white truncate font-sans">
                {playlist.title}
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
              {playlist.author || 'YouTube'} · {isLoading ? 'Loading songs…' : `${tracks.length} tracks · ${formatTime(totalDuration)}`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isLoading && tracks.length > 0 && (
              <>
                <button
                  onClick={handlePlayAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-sm cursor-pointer min-h-[32px]"
                >
                  <Play size={12} fill="currentColor" />
                  <span>Play All</span>
                </button>

                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer min-h-[32px] disabled:opacity-50"
                >
                  {isImporting ? (
                    <Loader2 size={12} className="animate-spin text-zinc-400" />
                  ) : (
                    <Download size={12} />
                  )}
                  <span>Import</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body: Clean Numbered Song List */}
        <div className="overflow-y-auto flex-1 min-h-0 p-2">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-500 text-xs">
              <Loader2 size={24} className="animate-spin text-zinc-400 mb-2" />
              <p>Fetching songs…</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-zinc-400 text-xs">
              <p className="font-semibold text-rose-400">{error}</p>
              <button
                onClick={onClose}
                className="mt-3 px-3 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs"
              >
                Close
              </button>
            </div>
          ) : tracks.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 text-xs">
              No songs found in this playlist.
            </div>
          ) : (
            <table className="w-full text-left border-collapse table-fixed text-xs" role="grid">
              <thead className="sticky top-0 bg-[#0c0c12] z-10">
                <tr className="border-b border-white/[0.06] text-[11px] font-mono text-zinc-400">
                  <th className="w-12 px-3 py-2 text-center">#</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="w-36 px-3 py-2 hidden sm:table-cell">Artist</th>
                  <th className="w-20 px-3 py-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {tracks.map((track, i) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <tr
                      key={`${track.id}-${i}`}
                      onClick={() => handlePlayTrack(track)}
                      className={cn(
                        'group hover:bg-white/[0.05] transition-colors cursor-pointer select-none',
                        isCurrent ? 'bg-white/[0.08] text-white font-semibold' : 'text-zinc-300'
                      )}
                    >
                      <td className="w-12 px-3 py-2.5 text-center font-mono text-[11px] text-zinc-500 group-hover:text-zinc-300">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2.5 min-w-0">
                        <div className="truncate font-medium text-white group-hover:text-white">
                          {track.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate sm:hidden mt-0.5">
                          {track.artist}
                        </div>
                      </td>
                      <td className="w-36 px-3 py-2.5 hidden sm:table-cell text-[11px] text-zinc-400 truncate">
                        {track.artist}
                      </td>
                      <td className="w-20 px-3 py-2.5 text-right font-mono text-[11px] text-zinc-400">
                        {formatTime(track.duration || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
