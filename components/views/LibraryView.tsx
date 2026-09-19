'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from '@/components/playlist/TrackRow';
import { PlaylistDetail } from '@/components/playlist/PlaylistDetail';
import { CreatePlaylistModal } from '@/components/playlist/CreatePlaylistModal';
import { EditPlaylistModal } from '@/components/playlist/EditPlaylistModal';
import { ImportPlaylistModal } from '@/components/playlist/ImportPlaylistModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { exportSinglePlaylist } from '@/lib/backup';
import { getTrackPalette } from '@/components/ui/TrackArtwork';
import {
  Music,
  Plus,
  Play,
  Trash2,
  ArrowLeft,
  Download,
  Pencil,
  FileDown,
  Heart,
  Clock,
} from 'lucide-react';
import type { Playlist, Track } from '@/types';

interface LibraryViewProps {
  initialPlaylist?: Playlist | null;
}

export function LibraryView({ initialPlaylist }: LibraryViewProps) {
  const { play, currentTrack, showToast } = usePlayerStore();
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const recentlyPlayed = usePlayerStore((s) => s.recentlyPlayed);

  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(initialPlaylist ?? null);
  const [viewingSpecial, setViewingSpecial] = useState<'liked' | 'history' | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);

  useEffect(() => {
    if (initialPlaylist) {
      setSelectedPlaylist(initialPlaylist);
      setViewingSpecial(null);
    }
  }, [initialPlaylist]);

  // Live queries
  const playlists = useLiveQuery(
    () => db.playlists.filter((p) => p.id !== 'liked-songs').reverse().sortBy('updatedAt'),
    []
  );

  const likedTracks = useLiveQuery(async () => {
    if (!likedTrackIds.length) return [];
    const all = await db.tracks.bulkGet(likedTrackIds);
    return likedTrackIds
      .map((id, i) => ({ id, track: all[i] }))
      .filter((x): x is { id: string; track: Track } => x.track !== undefined)
      .map((x) => x.track);
  }, [likedTrackIds]);

  const handleExportPlaylist = async (playlist: Playlist) => {
    try {
      const backup = await exportSinglePlaylist(playlist.id);
      if (backup) {
        showToast(`Exported "${playlist.name}" (${backup.tracks.length} tracks)`);
      }
    } catch {
      showToast(`Failed to export "${playlist.name}"`);
    }
  };

  const confirmDeletePlaylist = async () => {
    if (!playlistToDelete) return;
    await db.playlists.delete(playlistToDelete.id);
    showToast(`Deleted "${playlistToDelete.name}"`);
    if (selectedPlaylist?.id === playlistToDelete.id) {
      setSelectedPlaylist(null);
    }
    setPlaylistToDelete(null);
  };

  const handleClearHistory = async () => {
    await db.history.clear();
    usePlayerStore.setState({ recentlyPlayed: [] });
    showToast('Listening history cleared');
    setShowClearHistoryConfirm(false);
  };

  // 1. Render Specific Playlist Detail if selected
  if (selectedPlaylist) {
    return (
      <div className="h-full overflow-y-auto">
        <PlaylistDetail
          playlist={selectedPlaylist}
          onClose={() => setSelectedPlaylist(null)}
        />
      </div>
    );
  }

  // 2. Render Liked Songs Detail
  if (viewingSpecial === 'liked') {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d12] overflow-hidden shadow-sm h-full flex flex-col min-h-0">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06] bg-[#141018] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewingSpecial(null)}
              aria-label="Back to library"
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-500 flex items-center justify-center shrink-0">
              <Heart size={20} className="fill-rose-500" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white">Liked Songs</h2>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                {likedTracks?.length || 0} track{(likedTracks?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {likedTracks && likedTracks.length > 0 && (
            <button
              onClick={() => play(likedTracks[0], likedTracks)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-sm cursor-pointer min-h-[34px]"
            >
              <Play size={12} fill="currentColor" />
              <span>Play All</span>
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {!likedTracks || likedTracks.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 text-xs flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-500 mb-3">
                <Heart size={22} />
              </div>
              <p className="font-semibold text-zinc-200">No liked songs yet</p>
              <p className="text-xs text-zinc-400 mt-1">Tap the heart icon on any song to save it here</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse table-fixed" role="grid">
              <thead className="sticky top-0 z-10 bg-[#0d0d12]">
                <tr className="border-b border-white/[0.06] text-[11px] font-medium text-zinc-400">
                  <th className="w-10 px-2 py-2 text-center">#</th>
                  <th className="px-2 py-2">Track</th>
                  <th className="w-28 px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {likedTracks.map((track, i) => (
                  <TrackRow
                    key={`${track.id}-${i}`}
                    track={track}
                    index={i}
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

  // 3. Render History Detail
  if (viewingSpecial === 'history') {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d12] overflow-hidden shadow-sm h-full flex flex-col min-h-0">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.06] bg-[#121217] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewingSpecial(null)}
              aria-label="Back to library"
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.1] text-zinc-300 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white">Listening History</h2>
              <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                {recentlyPlayed.length} track{recentlyPlayed.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {recentlyPlayed.length > 0 && (
              <>
                <button
                  onClick={() => play(recentlyPlayed[0], recentlyPlayed)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-sm cursor-pointer min-h-[34px]"
                >
                  <Play size={12} fill="currentColor" />
                  <span>Play All</span>
                </button>
                <button
                  onClick={() => setShowClearHistoryConfirm(true)}
                  aria-label="Clear listening history"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-rose-400 hover:bg-white/[0.06] transition-all cursor-pointer min-h-[34px]"
                >
                  <Trash2 size={13} />
                  <span>Clear</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {recentlyPlayed.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 text-xs flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-500 mb-3">
                <Clock size={22} />
              </div>
              <p className="font-semibold text-zinc-200">No listening history</p>
              <p className="text-xs text-zinc-400 mt-1">Tracks you play will be recorded here automatically</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse table-fixed" role="grid">
              <thead className="sticky top-0 z-10 bg-[#0d0d12]">
                <tr className="border-b border-white/[0.06] text-[11px] font-medium text-zinc-400">
                  <th className="w-10 px-2 py-2 text-center">#</th>
                  <th className="px-2 py-2">Track</th>
                  <th className="w-28 px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {recentlyPlayed.map((track, i) => (
                  <TrackRow
                    key={`${track.id}-${i}`}
                    track={track}
                    index={i}
                    isActive={currentTrack?.id === track.id}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <ConfirmModal
          isOpen={showClearHistoryConfirm}
          onClose={() => setShowClearHistoryConfirm(false)}
          onConfirm={handleClearHistory}
          title="Clear History"
          description="This will permanently delete your listening history from this browser."
          confirmText="Clear History"
          cancelText="Cancel"
          isDestructive={true}
        />
      </div>
    );
  }

  // 4. Default: Unified Library Browser
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#09090d] overflow-hidden shadow-sm h-full flex flex-col min-h-0">
      {/* Pinned Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/[0.06] bg-[#0f0f14] shrink-0">
        <div className="flex items-center gap-2.5">
          <Music size={16} className="text-white" />
          <h2 className="text-xs font-semibold tracking-tight text-white font-sans">
            Library
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            aria-label="Import Playlist"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer min-h-[36px]"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            aria-label="New Playlist"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-sm cursor-pointer min-h-[36px]"
          >
            <Plus size={13} />
            <span>New Playlist</span>
          </button>
        </div>
      </div>

      {/* Body: Scrollable */}
      <div className="overflow-y-auto flex-1 min-h-0 p-4 sm:p-5 space-y-5">
        {/* Pinned Smart Playlists Section (Liked Songs & History) */}
        <div>
          <span className="text-xs font-semibold text-zinc-300 tracking-tight font-sans block mb-2 px-1">
            Pinned Collections
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Liked Songs */}
            <div
              onClick={() => setViewingSpecial('liked')}
              className="group flex items-center justify-between p-3.5 rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-950/20 via-[#120d14] to-[#09090d] hover:border-rose-500/40 hover:from-rose-950/30 transition-all duration-200 cursor-pointer select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shrink-0 shadow-sm">
                  <Heart size={18} className="fill-rose-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-semibold text-white group-hover:text-rose-200 truncate transition-colors">
                    Liked Songs
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    {likedTrackIds.length} track{likedTrackIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors pr-1">
                View →
              </span>
            </div>

            {/* 2. Listening History */}
            <div
              onClick={() => setViewingSpecial('history')}
              className="group flex items-center justify-between p-3.5 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-[#09090d] hover:border-white/[0.16] hover:bg-white/[0.06] transition-all duration-200 cursor-pointer select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-zinc-300 shrink-0 shadow-sm">
                  <Clock size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-semibold text-white group-hover:text-zinc-200 truncate transition-colors">
                    Listening History
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    {recentlyPlayed.length} play{recentlyPlayed.length !== 1 ? 's' : ''} logged
                  </p>
                </div>
              </div>
              <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors pr-1">
                View →
              </span>
            </div>
          </div>
        </div>

        {/* User Playlists Section */}
        <div>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-xs font-semibold text-zinc-300 tracking-tight font-sans">
              Playlists ({playlists?.length || 0})
            </span>
          </div>

          {!playlists || playlists.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] text-center my-2">
              <p className="text-xs font-semibold text-zinc-200">No custom playlists</p>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Create playlists to organize music or import them directly from YouTube and Spotify.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-sm cursor-pointer min-h-[36px]"
              >
                <Plus size={12} />
                <span>Create Playlist</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {playlists.map((playlist) => {
                const palette = getTrackPalette(playlist.name, playlist.description || '', playlist.id);
                return (
                  <div
                    key={playlist.id}
                    onClick={() => setSelectedPlaylist(playlist)}
                    className="group relative flex items-center justify-between p-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14] transition-all duration-200 cursor-pointer overflow-hidden select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                      <div
                        className="w-10 h-10 rounded-xl border border-white/[0.08] flex items-center justify-center text-zinc-400 group-hover:text-white transition-all shrink-0"
                        style={{ backgroundColor: `${palette.accent}18` }}
                      >
                        <Music size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                          {playlist.name}
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          {playlist.trackIds.length} track{playlist.trackIds.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 text-zinc-400 shrink-0">
                      <Tooltip content="Export JSON" side="top">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportPlaylist(playlist);
                          }}
                          className="p-2 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          aria-label="Export playlist"
                        >
                          <FileDown size={14} />
                        </button>
                      </Tooltip>

                      <Tooltip content="Edit details" side="top">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPlaylist(playlist);
                          }}
                          className="p-2 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          aria-label="Edit playlist"
                        >
                          <Pencil size={14} />
                        </button>
                      </Tooltip>

                      <Tooltip content="Delete playlist" side="top">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlaylistToDelete(playlist);
                          }}
                          className="p-2 hover:text-rose-400 hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          aria-label="Delete playlist"
                        >
                          <Trash2 size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <ImportPlaylistModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {editingPlaylist && (
        <EditPlaylistModal
          playlist={editingPlaylist}
          isOpen={!!editingPlaylist}
          onClose={() => setEditingPlaylist(null)}
        />
      )}

      <ConfirmModal
        isOpen={!!playlistToDelete}
        onClose={() => setPlaylistToDelete(null)}
        onConfirm={confirmDeletePlaylist}
        title={`Delete "${playlistToDelete?.name}"?`}
        description="This playlist will be permanently removed from the library. The songs will remain available."
        confirmText="Delete Playlist"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
