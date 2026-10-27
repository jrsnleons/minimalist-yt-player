'use client';

import { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { db } from '@/db/schema';
import { formatTime, cn } from '@/lib/utils';
import { Music, Play, Download, X, Loader2, AlertCircle } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { primaryBtn, ghostBtn } from '@/lib/ui';
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
  const [attempt, setAttempt] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, { active: isOpen && !!playlist, onEscape: onClose });

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
        setError('Could not load songs');
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, playlist?.id, attempt]);

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
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="playlist-preview-title"
        className="relative w-full max-w-2xl rounded-[14px] border border-white/[0.08] bg-[#141418] shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[85dvh] text-white"
      >
        <div className="flex items-start justify-between gap-3 pl-6 pr-3 pt-4 pb-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h2 id="playlist-preview-title" className="text-xl font-semibold tracking-tight text-white truncate">
              {playlist.title}
            </h2>
            <p className="text-[13px] text-zinc-400 mt-0.5 truncate">
              {playlist.author || 'YouTube'} ·{' '}
              {isLoading ? 'Loading songs…' : `${tracks.length} ${tracks.length === 1 ? 'song' : 'songs'} · ${formatTime(totalDuration)}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {!isLoading && tracks.length > 0 && (
          <div className="flex items-center gap-2 px-6 pb-3 shrink-0">
            <button type="button" onClick={handlePlayAll} className={primaryBtn}>
              <Play size={14} fill="currentColor" aria-hidden="true" />
              <span>Play All</span>
            </button>
            <button type="button" onClick={handleImport} disabled={isImporting} className={ghostBtn}>
              {isImporting ? (
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              ) : (
                <Download size={14} aria-hidden="true" />
              )}
              <span>Import</span>
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 min-h-0 px-2 pb-3">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-zinc-400 text-sm" role="status">
              <Loader2 size={22} className="animate-spin mb-2" aria-hidden="true" />
              <p>Loading songs…</p>
            </div>
          ) : error ? (
            <EmptyState
              tone="error"
              icon={<AlertCircle size={28} />}
              title={error}
              description="Check the connection and try again."
            >
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className={primaryBtn}>
                Try Again
              </button>
            </EmptyState>
          ) : tracks.length === 0 ? (
            <EmptyState icon={<Music size={28} />} title="No songs found" description="This playlist has no playable songs." />
          ) : (
            <table className="w-full text-left border-collapse table-fixed text-sm" aria-label={`Songs in ${playlist.title}`}>
              <thead className="sticky top-0 bg-[#141418] z-10">
                <tr className="border-b border-white/[0.08] text-xs font-medium text-zinc-400">
                  <th scope="col" className="w-12 px-3 py-2 text-center">#</th>
                  <th scope="col" className="px-3 py-2">Title</th>
                  <th scope="col" className="w-36 px-3 py-2 hidden sm:table-cell">Artist</th>
                  <th scope="col" className="w-20 px-3 py-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((track, i) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <tr
                      key={`${track.id}-${i}`}
                      className={cn(
                        'relative border-b border-white/[0.04] hover:bg-white/[0.05] focus-within:bg-white/[0.05] transition-colors',
                        isCurrent && 'bg-white/[0.06]'
                      )}
                    >
                      <td className="w-12 px-3 py-2 text-center font-mono text-[13px] text-zinc-400 tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => handlePlayTrack(track)}
                          aria-label={`Play ${track.title} by ${track.artist}`}
                          className="block w-full text-left cursor-pointer after:content-[''] after:absolute after:inset-0"
                        >
                          <span className={cn('block truncate font-medium', isCurrent ? 'text-[var(--track-accent,#e9b44c)]' : 'text-zinc-100')}>
                            {track.title}
                          </span>
                          <span className="block text-[13px] text-zinc-400 truncate sm:hidden">{track.artist}</span>
                        </button>
                      </td>
                      <td className="w-36 px-3 py-2 hidden sm:table-cell text-[13px] text-zinc-400 truncate">
                        {track.artist}
                      </td>
                      <td className="w-20 px-3 py-2 text-right font-mono text-[13px] text-zinc-400 tabular-nums">
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
