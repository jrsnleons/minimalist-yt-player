'use client';

import { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { uuid, formatTime, cn } from '@/lib/utils';
import { validateBackup, restoreFullLibrary, importSinglePlaylistBackup, type ValidationResult } from '@/lib/backup';
import {
  Download,
  Loader2,
  Music,
  Check,
  Play,
  Upload,
  FileJson,
  AlertCircle,
  Sparkles,
  Layers,
  RefreshCw,
} from 'lucide-react';
import type { Track, Playlist, SpotifyPlaylistPreview, RestoreMode } from '@/types';

type ImportTab = 'youtube' | 'spotify' | 'file';

interface ImportPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: (playlist: Playlist) => void;
  initialTab?: ImportTab;
}

const EXAMPLE_YT_PLAYLISTS = [
  { name: 'Pop Hits 2026', url: 'https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj' },
  { name: 'Lofi Focus Beats', url: 'https://www.youtube.com/playlist?list=PLofht4PTcKYnaH8w5gkDC265msKJxGtVC' },
  { name: 'Synthwave / Chillwave', url: 'https://www.youtube.com/playlist?list=PL44Uytz04v7w_V8v6W8a4qA_8U9jQe9QY' },
];

const EXAMPLE_SPOTIFY_PLAYLISTS = [
  { name: "Today's Top Hits", url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' },
  { name: 'Chill Hits', url: 'https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6' },
  { name: 'All New Indie', url: 'https://open.spotify.com/playlist/37i9dQZF1DXdbXrPNafg9d' },
];

export function ImportPlaylistModal({ isOpen, onClose, onImported, initialTab = 'youtube' }: ImportPlaylistModalProps) {
  const play = usePlayerStore((s) => s.play);
  const showToast = usePlayerStore((s) => s.showToast);
  const loadRecentlyPlayed = usePlayerStore((s) => s.loadRecentlyPlayed);
  const [activeTab, setActiveTab] = useState<ImportTab>(initialTab);

  // YouTube State
  const [ytUrl, setYtUrl] = useState('');
  const [isYtLoading, setIsYtLoading] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [ytPreview, setYtPreview] = useState<{
    title: string;
    description?: string;
    author?: string;
    trackCount: number;
    tracks: Track[];
  } | null>(null);

  // Spotify State
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [isSpotifyLoading, setIsSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyPreview, setSpotifyPreview] = useState<SpotifyPlaylistPreview | null>(null);
  const [spotifyMatchingProgress, setSpotifyMatchingProgress] = useState<{
    current: number;
    total: number;
    currentTrackName: string;
  } | null>(null);

  // Backup File State
  const [fileValidation, setFileValidation] = useState<ValidationResult | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge');
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. YouTube Fetch & Import ---
  const handleFetchYtPreview = async (inputUrl: string) => {
    if (!inputUrl.trim()) return;
    setIsYtLoading(true);
    setYtError(null);
    setYtPreview(null);

    try {
      const res = await fetch(`/api/playlist?url=${encodeURIComponent(inputUrl.trim())}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch YouTube playlist');
      }
      setYtPreview(data);
    } catch (err: any) {
      setYtError(err.message || 'Could not fetch playlist. Ensure it is public or unlisted.');
    } finally {
      setIsYtLoading(false);
    }
  };

  const handleImportYt = async (autoPlay = false) => {
    if (!ytPreview || ytPreview.tracks.length === 0) return;
    setIsYtLoading(true);

    try {
      const newPlaylistId = uuid();
      const trackIds = ytPreview.tracks.map((t) => t.id);

      await db.tracks.bulkPut(ytPreview.tracks);

      const newPlaylist: Playlist = {
        id: newPlaylistId,
        name: ytPreview.title || 'Imported YouTube Playlist',
        description: ytPreview.description || (ytPreview.author ? `Imported from ${ytPreview.author}` : 'Imported from YouTube'),
        trackIds,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.playlists.add(newPlaylist);
      showToast(`Imported "${newPlaylist.name}" with ${trackIds.length} tracks!`);

      if (autoPlay && ytPreview.tracks.length > 0) {
        play(ytPreview.tracks[0], ytPreview.tracks);
      }

      onImported?.(newPlaylist);
      handleClose();
    } catch (err) {
      console.error('YT Import error:', err);
      setYtError('Failed to save imported playlist into local database');
    } finally {
      setIsYtLoading(false);
    }
  };

  // --- 2. Spotify Fetch & Matching Import ---
  const handleFetchSpotifyPreview = async (inputUrl: string) => {
    if (!inputUrl.trim()) return;
    setIsSpotifyLoading(true);
    setSpotifyError(null);
    setSpotifyPreview(null);
    setSpotifyMatchingProgress(null);

    try {
      const res = await fetch(`/api/spotify?url=${encodeURIComponent(inputUrl.trim())}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch Spotify playlist metadata');
      }
      setSpotifyPreview(data);
    } catch (err: any) {
      setSpotifyError(err.message || 'Could not fetch Spotify playlist. Ensure it is public.');
    } finally {
      setIsSpotifyLoading(false);
    }
  };

  const handleImportSpotify = async (autoPlay = false) => {
    if (!spotifyPreview || spotifyPreview.tracks.length === 0) return;
    setIsSpotifyLoading(true);
    setSpotifyError(null);

    const total = spotifyPreview.tracks.length;
    const resolvedTracks: Track[] = [];
    const BATCH_SIZE = 5;

    try {
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = spotifyPreview.tracks.slice(i, i + BATCH_SIZE);
        setSpotifyMatchingProgress({
          current: i + 1,
          total,
          currentTrackName: `${chunk[0].title} - ${chunk[0].artist}`,
        });

        const res = await fetch('/api/spotify/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queries: chunk.map((t) => ({
              title: t.title,
              artist: t.artist,
              durationMs: t.durationMs,
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const matches: (Track | null)[] = data.matches || [];
          matches.forEach((m) => {
            if (m) resolvedTracks.push(m);
          });
        }
      }

      setSpotifyMatchingProgress({
        current: total,
        total,
        currentTrackName: 'Finalizing playlist...',
      });

      if (resolvedTracks.length === 0) {
        throw new Error('Could not match any tracks from this Spotify playlist on YouTube.');
      }

      // Save tracks to IndexedDB
      await db.tracks.bulkPut(resolvedTracks);

      // Create new playlist
      const newPlaylistId = uuid();
      const newPlaylist: Playlist = {
        id: newPlaylistId,
        name: spotifyPreview.title || 'Imported Spotify Playlist',
        description: spotifyPreview.description || (spotifyPreview.author ? `Imported from Spotify by ${spotifyPreview.author}` : 'Imported from Spotify'),
        trackIds: resolvedTracks.map((t) => t.id),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.playlists.add(newPlaylist);
      showToast(`Imported "${newPlaylist.name}" (${resolvedTracks.length}/${total} tracks matched)!`);

      if (autoPlay && resolvedTracks.length > 0) {
        play(resolvedTracks[0], resolvedTracks);
      }

      onImported?.(newPlaylist);
      handleClose();
    } catch (err: any) {
      console.error('Spotify import error:', err);
      setSpotifyError(err.message || 'Failed to match and import Spotify playlist.');
    } finally {
      setIsSpotifyLoading(false);
      setSpotifyMatchingProgress(null);
    }
  };

  // --- 3. Backup JSON File Upload & Restore ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setFileValidation(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const validation = validateBackup(parsed);
        if (!validation.isValid) {
          setFileError(validation.error || 'Invalid backup file structure');
        } else {
          setFileValidation(validation);
        }
      } catch {
        setFileError('Invalid JSON file. Please select a valid .json backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!fileValidation || !fileValidation.isValid || !fileValidation.parsedData) return;
    setIsFileLoading(true);
    setFileError(null);

    try {
      if (fileValidation.type === 'single-playlist') {
        const pl = await importSinglePlaylistBackup(fileValidation.parsedData as any);
        showToast(`Imported playlist "${pl.name}" (${pl.trackIds.length} tracks)`);
        onImported?.(pl);
      } else {
        const res = await restoreFullLibrary(fileValidation.parsedData as any, restoreMode);
        await loadRecentlyPlayed();
        showToast(`Restored ${res.restoredPlaylists} playlists & ${res.restoredTracks} tracks (${restoreMode} mode)`);
      }
      handleClose();
    } catch (err: any) {
      console.error('Restore error:', err);
      setFileError(err.message || 'Failed to restore backup.');
    } finally {
      setIsFileLoading(false);
    }
  };

  const handleClose = () => {
    setYtUrl('');
    setYtError(null);
    setYtPreview(null);
    setIsYtLoading(false);

    setSpotifyUrl('');
    setSpotifyError(null);
    setSpotifyPreview(null);
    setIsSpotifyLoading(false);
    setSpotifyMatchingProgress(null);

    setFileValidation(null);
    setFileError(null);
    setIsFileLoading(false);

    onClose();
  };

  const ytTotalDuration = (ytPreview?.tracks ?? []).reduce((acc, t) => acc + (t.duration || 0), 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Music & Playlists" className="max-w-xl">
      <div className="flex flex-col gap-4">
        {/* Source Navigation Tabs (Onyx Segmented Pill) */}
        <div className="flex items-center p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('youtube');
              setYtError(null);
            }}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
              activeTab === 'youtube'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <Music size={13} />
            <span>YouTube</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('spotify');
              setSpotifyError(null);
            }}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
              activeTab === 'spotify'
                ? 'bg-emerald-400 text-black shadow-sm'
                : 'text-zinc-400 hover:text-emerald-400'
            )}
          >
            <Sparkles size={13} />
            <span>Spotify</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('file');
              setFileError(null);
            }}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer',
              activeTab === 'file'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <FileJson size={13} />
            <span>JSON Backup</span>
          </button>
        </div>

        {/* TAB 1: YOUTUBE PLAYLIST IMPORT */}
        {activeTab === 'youtube' && (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="yt-url" className="block text-xs font-semibold text-zinc-300 mb-1.5 font-sans tracking-tight">
                YouTube or YouTube Music Playlist URL
              </label>
              <div className="flex gap-2">
                <input
                  id="yt-url"
                  type="text"
                  value={ytUrl}
                  onChange={(e) => {
                    setYtUrl(e.target.value);
                    setYtError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFetchYtPreview(ytUrl);
                    }
                  }}
                  placeholder="https://www.youtube.com/playlist?list=PL..."
                  autoFocus
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-white/30 focus:ring-1 focus:ring-white/20 text-xs text-white placeholder-zinc-600 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleFetchYtPreview(ytUrl)}
                  disabled={!ytUrl.trim() || isYtLoading}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 disabled:opacity-40 transition-all shrink-0 shadow-sm cursor-pointer"
                >
                  {isYtLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  <span>Fetch</span>
                </button>
              </div>
            </div>

            {!ytPreview && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-zinc-400">Popular playlists:</span>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_YT_PLAYLISTS.map((ex) => (
                    <button
                      key={ex.name}
                      type="button"
                      onClick={() => {
                        setYtUrl(ex.url);
                        handleFetchYtPreview(ex.url);
                      }}
                      className="px-3 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] text-zinc-300 hover:text-white text-xs transition-all cursor-pointer"
                    >
                      {ex.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {ytError && (
              <div className="p-3 rounded-2xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-red-400" />
                <span>{ytError}</span>
              </div>
            )}

            {ytPreview && (
              <div className="p-4 rounded-2xl bg-[#0c0c10] border border-white/[0.08] space-y-3 shadow-inner">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                      <Check size={12} />
                      <span>YouTube Playlist Verified</span>
                    </div>
                    <h4 className="text-sm font-bold text-white truncate mt-0.5">{ytPreview.title}</h4>
                    {ytPreview.author && <p className="text-[11px] text-zinc-400">By {ytPreview.author}</p>}
                    <p className="text-[11px] font-mono text-zinc-400 mt-1">
                      {ytPreview.trackCount} tracks · ~{formatTime(ytTotalDuration)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] pt-2 max-h-32 overflow-y-auto divide-y divide-white/[0.04] pr-1">
                  {ytPreview.tracks.slice(0, 5).map((t, i) => (
                    <div key={t.id} className="py-1.5 flex items-center justify-between text-xs text-zinc-300">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[11px] text-zinc-500 w-4">{i + 1}</span>
                        <span className="truncate text-[11px]">{t.title}</span>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-400 shrink-0 ml-2">
                        {formatTime(t.duration)}
                      </span>
                    </div>
                  ))}
                  {ytPreview.trackCount > 5 && (
                    <p className="text-[11px] text-zinc-400 text-center py-1 font-mono">
                      + {ytPreview.trackCount - 5} more tracks
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => handleImportYt(false)}
                    disabled={isYtLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold transition-all border border-white/[0.08] cursor-pointer"
                  >
                    Import to Library
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImportYt(true)}
                    disabled={isYtLoading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-md cursor-pointer"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Import & Play</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SPOTIFY PLAYLIST IMPORTER */}
        {activeTab === 'spotify' && (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="spotify-url" className="block text-xs font-semibold text-zinc-300 mb-1.5 font-sans tracking-tight">
                Spotify Playlist or Album Link (No Login Required)
              </label>
              <div className="flex gap-2">
                <input
                  id="spotify-url"
                  type="text"
                  value={spotifyUrl}
                  onChange={(e) => {
                    setSpotifyUrl(e.target.value);
                    setSpotifyError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFetchSpotifyPreview(spotifyUrl);
                    }
                  }}
                  placeholder="https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
                  autoFocus
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 text-xs text-white placeholder-zinc-600 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => handleFetchSpotifyPreview(spotifyUrl)}
                  disabled={!spotifyUrl.trim() || isSpotifyLoading}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-400 text-black text-xs font-semibold hover:bg-emerald-300 disabled:opacity-40 transition-all shrink-0 shadow-sm cursor-pointer"
                >
                  {isSpotifyLoading && !spotifyMatchingProgress ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  <span>Fetch</span>
                </button>
              </div>
            </div>

            {!spotifyPreview && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-zinc-400">Popular Spotify playlists:</span>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_SPOTIFY_PLAYLISTS.map((ex) => (
                    <button
                      key={ex.name}
                      type="button"
                      onClick={() => {
                        setSpotifyUrl(ex.url);
                        handleFetchSpotifyPreview(ex.url);
                      }}
                      className="px-3 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-emerald-500/30 text-zinc-300 hover:text-emerald-300 text-xs transition-all cursor-pointer"
                    >
                      {ex.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {spotifyError && (
              <div className="p-3 rounded-2xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-red-400" />
                <span>{spotifyError}</span>
              </div>
            )}

            {/* Live Progress Bar during Matching */}
            {spotifyMatchingProgress && (
              <div className="p-4 rounded-2xl bg-[#0c0c10] border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-emerald-400">
                    <Loader2 size={13} className="animate-spin" />
                    <span>Matching Spotify Tracks with YouTube...</span>
                  </div>
                  <span className="font-mono text-zinc-400 text-[11px]">
                    {spotifyMatchingProgress.current} / {spotifyMatchingProgress.total}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-200"
                    style={{
                      width: `${(spotifyMatchingProgress.current / spotifyMatchingProgress.total) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  Now matching: {spotifyMatchingProgress.currentTrackName}
                </p>
              </div>
            )}

            {spotifyPreview && !spotifyMatchingProgress && (
              <div className="p-4 rounded-2xl bg-[#0c0c10] border border-white/[0.08] space-y-3 shadow-inner">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                      <Check size={12} />
                      <span>Spotify Playlist Found</span>
                    </div>
                    <h4 className="text-sm font-bold text-white truncate mt-0.5">{spotifyPreview.title}</h4>
                    {spotifyPreview.author && (
                      <p className="text-[11px] text-zinc-400">By {spotifyPreview.author}</p>
                    )}
                    <p className="text-[11px] font-mono text-zinc-400 mt-1">
                      {spotifyPreview.trackCount} tracks extracted
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] pt-2 max-h-32 overflow-y-auto divide-y divide-white/[0.04] pr-1">
                  {spotifyPreview.tracks.slice(0, 5).map((t, i) => (
                    <div key={t.id} className="py-1.5 flex items-center justify-between text-xs text-zinc-300">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[11px] text-zinc-500 w-4">{i + 1}</span>
                        <span className="truncate text-[11px]">
                          {t.title} <span className="text-zinc-500">— {t.artist}</span>
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-400 shrink-0 ml-2">
                        {formatTime(Math.round(t.durationMs / 1000))}
                      </span>
                    </div>
                  ))}
                  {spotifyPreview.trackCount > 5 && (
                    <p className="text-[11px] text-zinc-400 text-center py-1 font-mono">
                      + {spotifyPreview.trackCount - 5} more tracks
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => handleImportSpotify(false)}
                    disabled={isSpotifyLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold transition-all border border-white/[0.08] cursor-pointer"
                  >
                    Match & Save to Library
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImportSpotify(true)}
                    disabled={isSpotifyLoading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-400 text-black text-xs font-bold hover:bg-emerald-300 transition-all shadow-md cursor-pointer"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Match & Play</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BACKUP FILE RESTORE (.JSON) */}
        {activeTab === 'file' && (
          <div className="flex flex-col gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />

            {!fileValidation ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/[0.12] hover:border-white/30 rounded-3xl p-8 text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.05] flex flex-col items-center justify-center gap-2.5"
              >
                <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-300 shadow-sm">
                  <Upload size={18} />
                </div>
                <h4 className="text-xs font-semibold text-zinc-200 tracking-tight">Select or Drop JSON Backup File</h4>
                <p className="text-[11px] text-zinc-400 max-w-xs">
                  Restore previously exported full libraries or single playlists.
                </p>
                <button
                  type="button"
                  className="mt-2 px-3.5 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 text-xs font-medium rounded-xl border border-white/[0.1] transition-all"
                >
                  Browse Files
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#0c0c10] border border-white/[0.08] space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                      <Check size={12} />
                      <span>Valid Backup File</span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-0.5">
                      {fileValidation.type === 'single-playlist'
                        ? `Playlist: "${fileValidation.summary?.name}"`
                        : 'Full Library Backup'}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileValidation(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Change File
                  </button>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center py-1">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="block text-sm font-mono font-bold text-white">
                      {fileValidation.summary?.playlistCount}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">Playlists</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="block text-sm font-mono font-bold text-white">
                      {fileValidation.summary?.trackCount}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">Tracks</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <span className="block text-sm font-mono font-bold text-white">
                      {fileValidation.summary?.historyCount || 0}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">History</span>
                  </div>
                </div>

                {/* Restore Mode Selector (Only for Full Library) */}
                {fileValidation.type === 'full-library' && (
                  <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                    <span className="text-xs font-semibold text-zinc-300">Restore Strategy:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRestoreMode('merge')}
                        className={cn(
                          'p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer',
                          restoreMode === 'merge'
                            ? 'border-white/40 bg-white/[0.08] text-white'
                            : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.12]'
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Layers size={13} />
                          <span>Merge Mode</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">Keep existing data & add new</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode('replace')}
                        className={cn(
                          'p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer',
                          restoreMode === 'replace'
                            ? 'border-red-500/60 bg-red-950/40 text-white'
                            : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.12]'
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-red-400">
                          <RefreshCw size={13} />
                          <span>Full Replace</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">Wipe & replace entirely</p>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isFileLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-md cursor-pointer disabled:opacity-40"
                  >
                    {isFileLoading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    <span>
                      {fileValidation.type === 'single-playlist'
                        ? 'Import Playlist'
                        : `Restore Library (${restoreMode.toUpperCase()})`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {fileError && (
              <div className="p-3 rounded-2xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-red-400" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
