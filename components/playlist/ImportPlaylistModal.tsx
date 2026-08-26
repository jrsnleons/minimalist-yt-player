'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { uuid, formatTime } from '@/lib/utils';
import { Download, Loader2, Music, Sparkles, Check, Play, ExternalLink } from 'lucide-react';
import type { Track, Playlist } from '@/types';

interface ImportPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: (playlist: Playlist) => void;
}

const EXAMPLE_PLAYLISTS = [
  { name: 'Pop Hits 2026', url: 'https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj' },
  { name: 'Lofi Focus Beats', url: 'https://www.youtube.com/playlist?list=PLofht4PTcKYnaH8w5gkDC265msKJxGtVC' },
  { name: 'Synthwave / Chillwave', url: 'https://www.youtube.com/playlist?list=PL44Uytz04v7w_V8v6W8a4qA_8U9jQe9QY' },
];

export function ImportPlaylistModal({ isOpen, onClose, onImported }: ImportPlaylistModalProps) {
  const { play, showToast } = usePlayerStore();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    title: string;
    description?: string;
    author?: string;
    trackCount: number;
    tracks: Track[];
  } | null>(null);

  const handleFetchPreview = async (inputUrl: string) => {
    if (!inputUrl.trim()) return;
    setIsLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const res = await fetch(`/api/playlist?url=${encodeURIComponent(inputUrl.trim())}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch playlist');
      }

      setPreviewData(data);
    } catch (err: any) {
      setError(err.message || 'Could not fetch playlist. Ensure it is public or unlisted.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (autoPlay: boolean = false) => {
    if (!previewData || previewData.tracks.length === 0) return;
    setIsLoading(true);

    try {
      const newPlaylistId = uuid();
      const trackIds = previewData.tracks.map((t) => t.id);

      // Save tracks to IndexedDB
      await db.tracks.bulkPut(previewData.tracks);

      // Create new playlist
      const newPlaylist: Playlist = {
        id: newPlaylistId,
        name: previewData.title || 'Imported YouTube Playlist',
        description: previewData.description || (previewData.author ? `Imported from ${previewData.author}` : 'Imported from YouTube'),
        trackIds,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.playlists.add(newPlaylist);
      showToast(`Imported "${newPlaylist.name}" with ${trackIds.length} tracks!`);

      if (autoPlay && previewData.tracks.length > 0) {
        play(previewData.tracks[0], previewData.tracks);
      }

      onImported?.(newPlaylist);
      handleClose();
    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to save imported playlist into local storage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setError(null);
    setPreviewData(null);
    setIsLoading(false);
    onClose();
  };

  const totalDuration = (previewData?.tracks ?? []).reduce((acc, t) => acc + (t.duration || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import YouTube Playlist" className="max-w-lg">
      <div className="flex flex-col gap-4">
        {/* URL Input Form */}
        <div>
          <label htmlFor="yt-playlist-url" className="block text-xs font-semibold text-zinc-400 mb-1.5">
            YouTube or YouTube Music Playlist URL / ID
          </label>
          <div className="flex gap-2">
            <input
              id="yt-playlist-url"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleFetchPreview(url);
                }
              }}
              placeholder="https://www.youtube.com/playlist?list=PL..."
              autoFocus
              className="flex-1 px-3 py-2 rounded-xl bg-[#14141a] border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
            />
            <button
              type="button"
              onClick={() => handleFetchPreview(url)}
              disabled={!url.trim() || isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 disabled:opacity-40 transition-colors shrink-0 shadow-sm"
            >
              {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>Fetch</span>
            </button>
          </div>
        </div>

        {/* Quick Example Chips */}
        {!previewData && (
          <div className="space-y-1.5">
            <span className="text-[11px] text-zinc-500 font-medium">Try popular playlists:</span>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_PLAYLISTS.map((ex) => (
                <button
                  key={ex.name}
                  type="button"
                  onClick={() => {
                    setUrl(ex.url);
                    handleFetchPreview(ex.url);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#181820] hover:bg-[#22222a] border border-[#2e2e38] text-zinc-300 hover:text-white text-[11px] transition-colors"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Live Playlist Preview Card */}
        {previewData && (
          <div className="p-4 rounded-xl bg-[#14141a] border border-[#27272f] space-y-3 shadow-inner">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-400">
                  <Check size={12} />
                  <span>Playlist Verified</span>
                </div>
                <h4 className="text-sm font-bold text-white truncate mt-0.5">{previewData.title}</h4>
                {previewData.author && (
                  <p className="text-[11px] text-zinc-400">By {previewData.author}</p>
                )}
                <p className="text-[11px] font-mono-time text-zinc-500 mt-1">
                  {previewData.trackCount} tracks · ~{formatTime(totalDuration)}
                </p>
              </div>

              {/* Stacked Thumbnails */}
              <div className="flex -space-x-3 overflow-hidden shrink-0">
                {previewData.tracks.slice(0, 3).map((t, idx) => (
                  <div
                    key={idx}
                    className="w-10 h-10 rounded-lg bg-zinc-800 border-2 border-[#14141a] overflow-hidden relative shadow-sm"
                  >
                    {t.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Music size={12} className="m-auto text-zinc-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Snippet track list */}
            <div className="border-t border-[#222228] pt-2 max-h-36 overflow-y-auto divide-y divide-[#1e1e24]/40 pr-1">
              {previewData.tracks.slice(0, 5).map((t, i) => (
                <div key={t.id} className="py-1.5 flex items-center justify-between text-xs text-zinc-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono-time text-[10px] text-zinc-600 w-4">{i + 1}</span>
                    <span className="truncate text-[11px]">{t.title}</span>
                  </div>
                  <span className="font-mono-time text-[10px] text-zinc-500 shrink-0 ml-2">
                    {formatTime(t.duration)}
                  </span>
                </div>
              ))}
              {previewData.trackCount > 5 && (
                <p className="text-[10px] text-zinc-500 text-center py-1">
                  + {previewData.trackCount - 5} more tracks
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222228]">
              <button
                type="button"
                onClick={() => handleImport(false)}
                disabled={isLoading}
                className="px-3.5 py-1.5 rounded-lg bg-[#27272f] hover:bg-zinc-700 text-white text-xs font-semibold transition-colors border border-zinc-600"
              >
                Import to Library
              </button>

              <button
                type="button"
                onClick={() => handleImport(true)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors shadow-md"
              >
                <Play size={12} fill="currentColor" />
                <span>Import & Play</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
