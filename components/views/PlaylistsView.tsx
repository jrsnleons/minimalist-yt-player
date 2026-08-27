'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from '@/components/playlist/TrackRow';
import { TrackRowSkeleton, PlaylistCardSkeleton } from '@/components/ui/Skeleton';
import { getTrackPalette } from '@/components/ui/TrackArtwork';
import { CreatePlaylistModal } from '@/components/playlist/CreatePlaylistModal';
import { EditPlaylistModal } from '@/components/playlist/EditPlaylistModal';
import { ImportPlaylistModal } from '@/components/playlist/ImportPlaylistModal';
import { SharePlaylistModal } from '@/components/playlist/SharePlaylistModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatTime, cn } from '@/lib/utils';
import { exportSinglePlaylist } from '@/lib/backup';
import {
  Music,
  Plus,
  Play,
  Trash2,
  ArrowLeft,
  FolderPlus,
  Download,
  Pencil,
  FileDown,
  Heart,
  QrCode,
  Share2,
} from 'lucide-react';
import type { Playlist, Track } from '@/types';

function PlaylistGridCard({
  playlist,
  onSelect,
  onShare,
  onExport,
  onEdit,
  onDelete,
}: {
  playlist: Playlist;
  onSelect: () => void;
  onShare: (e: React.MouseEvent) => void;
  onExport: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const palette = useMemo(() => {
    return getTrackPalette(playlist.name, playlist.description || '', playlist.id);
  }, [playlist.name, playlist.description, playlist.id]);

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 cursor-pointer group overflow-hidden"
      style={{
        background: isHovered
          ? `linear-gradient(135deg, ${palette.accent}2c 0%, ${palette.bgFrom}65 55%, #0a0a0f 100%)`
          : `linear-gradient(135deg, ${palette.accent}12 0%, ${palette.bgFrom}25 55%, #0b0b0f 100%)`,
        borderColor: isHovered ? `${palette.accent}55` : `${palette.accent}20`,
      }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
        <div
          className="w-10 h-10 rounded-xl border flex items-center justify-center text-zinc-400 group-hover:text-white transition-all shrink-0"
          style={{
            borderColor: isHovered ? `${palette.accent}50` : 'rgba(255, 255, 255, 0.08)',
            backgroundColor: isHovered ? `${palette.accent}25` : `${palette.accent}10`,
          }}
        >
          <Music size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
            {playlist.name}
          </h4>
          <p className="text-[10px] text-zinc-500 font-mono">
            {playlist.trackIds.length} tracks
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 text-zinc-500 shrink-0">
        <Tooltip content="Share & QR code" side="top">
          <button
            onClick={onShare}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Share playlist link and QR code"
          >
            <QrCode size={12} />
          </button>
        </Tooltip>
        <Tooltip content="Export JSON backup" side="top">
          <button
            onClick={onExport}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Export playlist to JSON"
          >
            <FileDown size={12} />
          </button>
        </Tooltip>
        <Tooltip content="Edit playlist" side="top">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Edit playlist"
          >
            <Pencil size={12} />
          </button>
        </Tooltip>
        <Tooltip content="Delete playlist" side="top">
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Delete playlist"
          >
            <Trash2 size={12} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

interface PlaylistsViewProps {
  initialPlaylist?: Playlist | null;
}

export function PlaylistsView({ initialPlaylist = null }: PlaylistsViewProps) {
  const play = usePlayerStore((s) => s.play);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);
  const likedTrackIds = usePlayerStore((s) => s.likedTrackIds);
  const showToast = usePlayerStore((s) => s.showToast);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(initialPlaylist);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [sharingPlaylist, setSharingPlaylist] = useState<{ playlist: Playlist; tracks: Track[] } | null>(null);

  // Sync if target playlist changed from outside (e.g. from HomeView)
  useEffect(() => {
    if (initialPlaylist) {
      setSelectedPlaylist(initialPlaylist);
    }
  }, [initialPlaylist]);

  const playlists = useLiveQuery(() => db.playlists.orderBy('updatedAt').reverse().toArray(), []);

  // Split liked songs system playlist from user custom playlists
  const likedPlaylist = playlists?.find((p) => p.id === 'liked-songs') || (
    likedTrackIds.length > 0
      ? {
          id: 'liked-songs',
          name: 'Liked Songs',
          description: 'Your favorite tracks in one collection ❤️',
          trackIds: likedTrackIds,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
      : null
  );

  const customPlaylists = playlists?.filter((p) => p.id !== 'liked-songs') || [];

  const playlistTracks = useLiveQuery(async () => {
    if (!selectedPlaylist) return [];
    // If selected playlist is liked-songs, prioritize likedTrackIds if not yet flushed to DB
    const trackIds = selectedPlaylist.id === 'liked-songs' ? (likedPlaylist?.trackIds || likedTrackIds) : selectedPlaylist.trackIds;
    if (!trackIds.length) return [];
    const all = await db.tracks.bulkGet(trackIds);
    return trackIds
      .map((id, i) => ({ id, track: all[i] }))
      .filter((x): x is { id: string; track: Track } => x.track !== undefined)
      .map((x) => x.track);
  }, [selectedPlaylist?.id, selectedPlaylist?.trackIds, likedPlaylist?.trackIds, likedTrackIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedPlaylist || !playlistTracks) return;

    const fromIndex = playlistTracks.findIndex((t) => t.id === active.id);
    const toIndex = playlistTracks.findIndex((t) => t.id === over.id);

    if (fromIndex >= 0 && toIndex >= 0) {
      const newTrackIds = [...selectedPlaylist.trackIds];
      const [moved] = newTrackIds.splice(fromIndex, 1);
      newTrackIds.splice(toIndex, 0, moved);

      await db.playlists.update(selectedPlaylist.id, {
        trackIds: newTrackIds,
        updatedAt: Date.now(),
      });
      setSelectedPlaylist({ ...selectedPlaylist, trackIds: newTrackIds });
      showToast(`Playlist reordered`);
    }
  };

  const handlePlayAll = () => {
    if (!playlistTracks || playlistTracks.length === 0) return;
    play(playlistTracks[0], playlistTracks);
    showToast(`Playing "${selectedPlaylist?.name}"`);
  };

  const handleExportPlaylist = async (playlist: Playlist) => {
    try {
      const backup = await exportSinglePlaylist(playlist.id);
      if (backup) {
        showToast(`Exported "${playlist.name}" (${backup.tracks.length} tracks) to JSON`);
      }
    } catch {
      showToast(`Failed to export "${playlist.name}"`);
    }
  };

  const handleSharePlaylist = async (playlist: Playlist) => {
    try {
      const trackIds = playlist.id === 'liked-songs' ? (likedPlaylist?.trackIds || likedTrackIds) : playlist.trackIds;
      const all = await db.tracks.bulkGet(trackIds);
      const validTracks = all.filter((t): t is Track => t !== undefined);
      setSharingPlaylist({ playlist, tracks: validTracks });
    } catch {
      showToast('Could not prepare share link');
    }
  };

  const handleDeletePlaylist = async (playlist: Playlist) => {
    if (playlist.id === 'liked-songs') {
      showToast('Cannot delete Liked Songs collection');
      return;
    }
    if (!confirm(`Delete playlist "${playlist.name}"?`)) return;
    await db.playlists.delete(playlist.id);
    showToast(`Deleted "${playlist.name}"`);
    if (selectedPlaylist?.id === playlist.id) {
      setSelectedPlaylist(null);
    }
  };

  const totalDuration = (playlistTracks ?? []).reduce((acc, t) => acc + (t.duration || 0), 0);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#09090d] overflow-hidden shadow-sm h-full flex flex-col min-h-0">
      <AnimatePresence mode="wait">
        {selectedPlaylist ? (
          /* Detail View */
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col h-full min-h-0"
          >
            {/* Header Banner (Pinned) */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0c0c10] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
                  aria-label="Back to playlists"
                >
                  <ArrowLeft size={16} />
                </button>

                <div className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border',
                  selectedPlaylist.id === 'liked-songs'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                    : 'bg-white/[0.04] border-white/[0.08] text-zinc-300'
                )}>
                  {selectedPlaylist.id === 'liked-songs' ? <Heart size={20} className="fill-rose-500" /> : <Music size={20} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight truncate">
                      {selectedPlaylist.name}
                    </h3>
                    {selectedPlaylist.id !== 'liked-songs' && (
                      <Tooltip content="Edit playlist name & info" side="top">
                        <button
                          onClick={() => setEditingPlaylist(selectedPlaylist)}
                          className="p-1 text-zinc-500 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
                          aria-label="Edit playlist metadata"
                        >
                          <Pencil size={12} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                  {selectedPlaylist.description && (
                    <p className="text-[11px] text-zinc-400 truncate max-w-md">
                      {selectedPlaylist.description}
                    </p>
                  )}
                  <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                    {playlistTracks?.length ?? 0} tracks · {formatTime(totalDuration)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {(playlistTracks?.length ?? 0) > 0 && (
                  <button
                    onClick={handlePlayAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-sm cursor-pointer"
                  >
                    <Play size={11} fill="currentColor" />
                    <span>Play All</span>
                  </button>
                )}
                <Tooltip content="Share Playlist & QR Code" side="top">
                  <button
                    onClick={() => handleSharePlaylist(selectedPlaylist)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium transition-colors cursor-pointer"
                    aria-label="Share playlist link & QR code"
                  >
                    <QrCode size={13} className="text-white" />
                    <span className="text-[11px]">Share</span>
                  </button>
                </Tooltip>
                <Tooltip content="Export playlist as JSON backup" side="top">
                  <button
                    onClick={() => handleExportPlaylist(selectedPlaylist)}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-emerald-400 hover:bg-white/[0.08] transition-colors cursor-pointer"
                    aria-label="Export playlist to JSON"
                  >
                    <FileDown size={14} />
                  </button>
                </Tooltip>
                {selectedPlaylist.id !== 'liked-songs' && (
                  <Tooltip content="Delete playlist" side="top">
                    <button
                      onClick={() => handleDeletePlaylist(selectedPlaylist)}
                      className="p-1.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-white/[0.08] transition-colors cursor-pointer"
                      aria-label="Delete playlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Scrollable Track Table */}
            <div className="overflow-y-auto flex-1 min-h-0">
              {playlistTracks === undefined ? (
                <table className="w-full text-left border-collapse table-fixed" role="grid" aria-label={`Loading tracks in ${selectedPlaylist.name}`}>
                  <thead className="sticky top-0 z-10 bg-[#09090d]">
                    <tr className="border-b border-white/[0.06] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      <th className="w-10 px-2 py-2 text-center">#</th>
                      <th className="px-2 py-2">Track</th>
                      <th className="w-28 px-2 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e24]/40">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TrackRowSkeleton key={`pl-tracks-skel-${i}`} index={i} />
                    ))}
                  </tbody>
                </table>
              ) : playlistTracks.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-xs">
                  {selectedPlaylist.id === 'liked-songs' ? (
                    <Heart size={28} className="mx-auto text-rose-500/40 mb-2" />
                  ) : (
                    <Music size={28} className="mx-auto text-zinc-700 mb-2" />
                  )}
                  <p className="font-medium text-zinc-400">
                    {selectedPlaylist.id === 'liked-songs' ? 'No liked tracks yet' : 'Playlist is empty'}
                  </p>
                  <p className="text-zinc-600 mt-1">
                    {selectedPlaylist.id === 'liked-songs'
                      ? 'Click the heart icon (❤️) on any track to add it to your favorites'
                      : 'Add tracks from search, queue, or recently played'}
                  </p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <table className="w-full text-left border-collapse table-fixed" role="grid" aria-label={`Tracks in ${selectedPlaylist.name}`}>
                    <thead className="sticky top-0 z-10 bg-[#09090d]">
                      <tr className="border-b border-white/[0.06] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="w-10 px-2 py-2 text-center">#</th>
                        <th className="px-2 py-2">Track</th>
                        <th className="w-28 px-2 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e24]/40">
                      <SortableContext
                        items={playlistTracks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {playlistTracks.map((track, i) => (
                          <TrackRow
                            key={track.id}
                            track={track}
                            index={i}
                            isSortable={true}
                            sortableId={track.id}
                            playlist={selectedPlaylist}
                            isActive={currentTrackId === track.id}
                          />
                        ))}
                      </SortableContext>
                    </tbody>
                  </table>
                </DndContext>
              )}
            </div>
          </motion.div>
        ) : (
          /* Grid View */
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full p-4 min-h-0"
          >
            {/* Header (Pinned) */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <Music size={15} className="text-zinc-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans">
                  Your Playlists
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
                >
                  <Download size={13} className="text-emerald-400" />
                  <span>Import</span>
                </button>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-sm cursor-pointer"
                >
                  <Plus size={13} />
                  <span>New Playlist</span>
                </button>
              </div>
            </div>

            {/* Scrollable Playlist Cards Grid */}
            <div className="overflow-y-auto flex-1 min-h-0 pr-0.5 space-y-3">
              {/* 1. Liked Songs Pinned Showcase Banner / Card */}
              {likedPlaylist && (
                <div
                  onClick={() => setSelectedPlaylist(likedPlaylist)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-[#120f17] to-[#0c0c10] hover:from-rose-950/60 border border-rose-500/25 hover:border-rose-500/40 transition-all cursor-pointer group shadow-md"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-2">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 group-hover:scale-105 transition-transform shrink-0 shadow-inner">
                      <Heart size={22} className="fill-rose-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-rose-400 font-mono">
                          Pinned Collection
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white tracking-tight truncate">
                        Liked Songs
                      </h4>
                      <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {likedPlaylist.trackIds.length} favorite {likedPlaylist.trackIds.length === 1 ? 'track' : 'tracks'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Tooltip content="Share Liked Songs" side="top">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSharePlaylist(likedPlaylist);
                        }}
                        className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                        aria-label="Share Liked Songs"
                      >
                        <QrCode size={14} />
                      </button>
                    </Tooltip>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlaylist(likedPlaylist);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-semibold transition-all"
                    >
                      Open
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Custom Playlists Grid */}
              {playlists === undefined ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <PlaylistCardSkeleton key={`pl-grid-skel-${i}`} />
                  ))}
                </div>
              ) : customPlaylists.length === 0 && !likedPlaylist ? (
                <div className="py-14 text-center text-zinc-500 border border-dashed border-white/[0.08] rounded-2xl my-2 flex flex-col items-center bg-white/[0.01]">
                  <FolderPlus size={32} className="text-zinc-600 mb-2" />
                  <p className="text-xs font-semibold text-zinc-200">No playlists in your library</p>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                    Create custom playlists or import from Spotify, YouTube, or JSON backup files.
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/[0.04] text-white border border-white/[0.1] text-xs font-medium rounded-xl hover:bg-white/[0.08] transition-all cursor-pointer"
                    >
                      <Download size={13} className="text-emerald-400" />
                      <span>Import Playlist / Backup</span>
                    </button>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-3.5 py-1.5 bg-white text-black text-xs font-semibold rounded-xl hover:bg-zinc-200 transition-all shadow-sm cursor-pointer"
                    >
                      + Create New
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {customPlaylists.map((pl) => (
                    <PlaylistGridCard
                      key={pl.id}
                      playlist={pl}
                      onSelect={() => setSelectedPlaylist(pl)}
                      onShare={(e) => {
                        e.stopPropagation();
                        handleSharePlaylist(pl);
                      }}
                      onExport={(e) => {
                        e.stopPropagation();
                        handleExportPlaylist(pl);
                      }}
                      onEdit={(e) => {
                        e.stopPropagation();
                        setEditingPlaylist(pl);
                      }}
                      onDelete={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(pl);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(pl) => {
          setSelectedPlaylist(pl);
          setIsCreateModalOpen(false);
        }}
      />

      {editingPlaylist && (
        <EditPlaylistModal
          playlist={editingPlaylist}
          isOpen={true}
          onClose={() => setEditingPlaylist(null)}
          onUpdated={(updated) => {
            if (selectedPlaylist?.id === updated.id) {
              setSelectedPlaylist(updated);
            }
            setEditingPlaylist(null);
          }}
        />
      )}

      <ImportPlaylistModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={(pl) => {
          setSelectedPlaylist(pl);
          setIsImportModalOpen(false);
        }}
      />

      {sharingPlaylist && (
        <SharePlaylistModal
          isOpen={true}
          onClose={() => setSharingPlaylist(null)}
          playlist={sharingPlaylist.playlist}
          tracks={sharingPlaylist.tracks}
        />
      )}
    </div>
  );
}
