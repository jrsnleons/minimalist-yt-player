'use client';

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
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
import { cn } from '@/lib/utils';
import { PlaylistCover } from '@/components/ui/PlaylistCover';
import {
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
  const play = usePlayerStore((s) => s.play);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const showToast = usePlayerStore((s) => s.showToast);
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

  const trackTable = (tracks: Track[], label: string) => (
    <table className="w-full text-left border-collapse table-fixed" aria-label={label}>
      <thead className="sticky top-0 z-10 bg-[#0b0b0e]">
        <tr className="border-b border-white/[0.08] text-xs font-medium text-zinc-400">
          <th scope="col" className="w-14 px-2 py-2 text-center">#</th>
          <th scope="col" className="px-2 py-2">Title</th>
          <th scope="col" className="w-36 px-2 py-2 text-right">Duration</th>
        </tr>
      </thead>
      <tbody>
        {tracks.map((track, i) => (
          <TrackRow
            key={`${track.id}-${i}`}
            track={track}
            index={i}
            isActive={currentTrack?.id === track.id}
          />
        ))}
      </tbody>
    </table>
  );

  const primaryBtn =
    'flex items-center gap-2 px-3.5 rounded-lg bg-[#f4f4f6] text-[#0b0b0e] text-sm font-semibold hover:bg-white transition-colors cursor-pointer min-h-[40px]';
  const ghostBtn =
    'flex items-center gap-2 px-3.5 rounded-lg border border-white/[0.12] text-zinc-100 text-sm font-medium hover:bg-white/[0.08] transition-colors cursor-pointer min-h-[40px]';

  // 2. Render Liked Songs Detail
  if (viewingSpecial === 'liked') {
    return (
      <div className="h-full flex flex-col min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setViewingSpecial(null)}
              aria-label="Back to library"
              className="w-10 h-10 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center justify-center shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-[32px] leading-tight font-bold tracking-tight text-white truncate">Liked Songs</h1>
              <p className="text-[13px] text-zinc-400">
                {likedTracks?.length || 0} {(likedTracks?.length || 0) === 1 ? 'song' : 'songs'}
              </p>
            </div>
          </div>

          {likedTracks && likedTracks.length > 0 && (
            <button onClick={() => play(likedTracks[0], likedTracks)} className={primaryBtn}>
              <Play size={14} fill="currentColor" aria-hidden="true" />
              <span>Play All</span>
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {!likedTracks || likedTracks.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <Heart size={28} className="text-zinc-500 mb-3" aria-hidden="true" />
              <p className="text-sm font-semibold text-zinc-200">No liked songs yet</p>
              <p className="text-sm text-zinc-400 mt-1">Use the heart on any song to save it here.</p>
            </div>
          ) : (
            trackTable(likedTracks, 'Liked Songs')
          )}
        </div>
      </div>
    );
  }

  // 3. Render History Detail
  if (viewingSpecial === 'history') {
    return (
      <div className="h-full flex flex-col min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setViewingSpecial(null)}
              aria-label="Back to library"
              className="w-10 h-10 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center justify-center shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-[32px] leading-tight font-bold tracking-tight text-white truncate">Listening History</h1>
              <p className="text-[13px] text-zinc-400">
                {recentlyPlayed.length} {recentlyPlayed.length === 1 ? 'song' : 'songs'}
              </p>
            </div>
          </div>

          {recentlyPlayed.length > 0 && (
            <div className="flex items-center gap-2">
              <button onClick={() => play(recentlyPlayed[0], recentlyPlayed)} className={primaryBtn}>
                <Play size={14} fill="currentColor" aria-hidden="true" />
                <span>Play All</span>
              </button>
              <button
                onClick={() => setShowClearHistoryConfirm(true)}
                className={ghostBtn}
              >
                <Trash2 size={14} aria-hidden="true" />
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {recentlyPlayed.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <Clock size={28} className="text-zinc-500 mb-3" aria-hidden="true" />
              <p className="text-sm font-semibold text-zinc-200">No listening history</p>
              <p className="text-sm text-zinc-400 mt-1">Songs you play are recorded here.</p>
            </div>
          ) : (
            trackTable(recentlyPlayed, 'Listening History')
          )}
        </div>

        <ConfirmModal
          isOpen={showClearHistoryConfirm}
          onClose={() => setShowClearHistoryConfirm(false)}
          onConfirm={handleClearHistory}
          title="Clear History"
          description="This permanently deletes the listening history from this browser."
          confirmText="Clear History"
          cancelText="Cancel"
          isDestructive={true}
        />
      </div>
    );
  }

  // 4. Default: Unified Library Browser
  const collectionCard =
    'group relative flex items-center gap-3 p-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] transition-colors';
  const stretched = "text-left cursor-pointer after:content-[''] after:absolute after:inset-0 after:rounded-lg min-w-0 flex-1";

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 shrink-0">
        <h1 className="text-[32px] leading-tight font-bold tracking-tight text-white">Library</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsImportModalOpen(true)} className={ghostBtn}>
            <Download size={16} aria-hidden="true" />
            <span>Import</span>
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className={primaryBtn}>
            <Plus size={16} aria-hidden="true" />
            <span>New Playlist</span>
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 pb-8 space-y-8">
        <section aria-labelledby="lib-collections">
          <h2 id="lib-collections" className="text-xl font-semibold tracking-tight text-white mb-3.5">
            Collections
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <li className={collectionCard}>
              <span className="w-12 h-12 rounded-md bg-white/[0.08] text-rose-400 flex items-center justify-center shrink-0">
                <Heart size={20} className="fill-current" aria-hidden="true" />
              </span>
              <button onClick={() => setViewingSpecial('liked')} className={stretched}>
                <span className="block truncate text-sm font-medium text-zinc-100">Liked Songs</span>
                <span className="block text-[13px] text-zinc-400">
                  {likedTrackIds.length} {likedTrackIds.length === 1 ? 'song' : 'songs'}
                </span>
              </button>
            </li>
            <li className={collectionCard}>
              <span className="w-12 h-12 rounded-md bg-white/[0.08] text-zinc-300 flex items-center justify-center shrink-0">
                <Clock size={20} aria-hidden="true" />
              </span>
              <button onClick={() => setViewingSpecial('history')} className={stretched}>
                <span className="block truncate text-sm font-medium text-zinc-100">Listening History</span>
                <span className="block text-[13px] text-zinc-400">
                  {recentlyPlayed.length} {recentlyPlayed.length === 1 ? 'play' : 'plays'}
                </span>
              </button>
            </li>
          </ul>
        </section>

        <section aria-labelledby="lib-playlists">
          <h2 id="lib-playlists" className="text-xl font-semibold tracking-tight text-white mb-3.5">
            Playlists
          </h2>

          {!playlists || playlists.length === 0 ? (
            <div className="p-8 rounded-lg border border-dashed border-white/[0.12] text-center">
              <p className="text-sm font-semibold text-zinc-200">No playlists yet</p>
              <p className="text-sm text-zinc-400 mt-1 max-w-sm mx-auto">
                Create a playlist or import one from YouTube or Spotify.
              </p>
              <button onClick={() => setIsCreateModalOpen(true)} className={cn(primaryBtn, 'mt-4 mx-auto')}>
                <Plus size={16} aria-hidden="true" />
                <span>Create Playlist</span>
              </button>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {playlists.map((playlist) => (
                <li key={playlist.id} className={collectionCard}>
                  <PlaylistCover playlist={playlist} className="w-12 h-12 rounded-md shrink-0" />
                  <button onClick={() => setSelectedPlaylist(playlist)} className={stretched}>
                    <span className="block truncate text-sm font-medium text-zinc-100">{playlist.name}</span>
                    <span className="block text-[13px] text-zinc-400">
                      {playlist.trackIds.length} {playlist.trackIds.length === 1 ? 'song' : 'songs'}
                    </span>
                  </button>

                  <div className="relative z-10 flex items-center text-zinc-300 shrink-0">
                    <Tooltip content="Export JSON" side="top">
                      <button
                        onClick={() => handleExportPlaylist(playlist)}
                        className="hover:text-white hover:bg-white/[0.1] rounded-full transition-colors cursor-pointer w-9 h-9 flex items-center justify-center"
                        aria-label={`Export ${playlist.name}`}
                      >
                        <FileDown size={16} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Edit Details" side="top">
                      <button
                        onClick={() => setEditingPlaylist(playlist)}
                        className="hover:text-white hover:bg-white/[0.1] rounded-full transition-colors cursor-pointer w-9 h-9 flex items-center justify-center"
                        aria-label={`Edit ${playlist.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Delete Playlist" side="top">
                      <button
                        onClick={() => setPlaylistToDelete(playlist)}
                        className="hover:text-rose-400 hover:bg-white/[0.1] rounded-full transition-colors cursor-pointer w-9 h-9 flex items-center justify-center"
                        aria-label={`Delete ${playlist.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </Tooltip>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
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
        description="This playlist is removed from the library. The songs stay available."
        confirmText="Delete Playlist"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
