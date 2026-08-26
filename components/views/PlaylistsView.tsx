'use client';

import { useState } from 'react';
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
import { CreatePlaylistModal } from '@/components/playlist/CreatePlaylistModal';
import { EditPlaylistModal } from '@/components/playlist/EditPlaylistModal';
import { ImportPlaylistModal } from '@/components/playlist/ImportPlaylistModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatTime } from '@/lib/utils';
import { Music, Plus, Play, Trash2, ArrowLeft, FolderPlus, Download, Pencil } from 'lucide-react';
import type { Playlist, Track } from '@/types';

export function PlaylistsView() {
  const { play, currentTrack, showToast } = usePlayerStore();
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  const playlists = useLiveQuery(() => db.playlists.orderBy('updatedAt').reverse().toArray(), []);

  const playlistTracks = useLiveQuery(async () => {
    if (!selectedPlaylist || !selectedPlaylist.trackIds.length) return [];
    const all = await db.tracks.bulkGet(selectedPlaylist.trackIds);
    return selectedPlaylist.trackIds
      .map((id, i) => ({ id, track: all[i] }))
      .filter((x): x is { id: string; track: Track } => x.track !== undefined)
      .map((x) => x.track);
  }, [selectedPlaylist?.trackIds]);

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

  const handleDeletePlaylist = async (playlist: Playlist) => {
    if (!confirm(`Delete playlist "${playlist.name}"?`)) return;
    await db.playlists.delete(playlist.id);
    showToast(`Deleted "${playlist.name}"`);
    if (selectedPlaylist?.id === playlist.id) {
      setSelectedPlaylist(null);
    }
  };

  const totalDuration = (playlistTracks ?? []).reduce((acc, t) => acc + (t.duration || 0), 0);

  return (
    <div className="h-full flex flex-col min-h-0">
      <AnimatePresence mode="wait">
        {selectedPlaylist ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="rounded-2xl border border-[#27272a] bg-[#0f0f13] overflow-hidden shadow-sm flex flex-col flex-1 min-h-0"
          >
            {/* Header (Pinned inside card) */}
            <div className="flex items-center justify-between p-4 border-b border-[#222228] bg-[#121217] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  aria-label="Back to all playlists"
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1e1e24] transition-colors cursor-pointer shrink-0"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="w-11 h-11 rounded-xl bg-[#1e1e24] border border-zinc-700/60 flex items-center justify-center text-zinc-300 shrink-0">
                  <Music size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight truncate">
                      {selectedPlaylist.name}
                    </h3>
                    <Tooltip content="Edit playlist name & info" side="top">
                      <button
                        onClick={() => setEditingPlaylist(selectedPlaylist)}
                        className="p-1 text-zinc-500 hover:text-white hover:bg-[#22222a] rounded transition-colors cursor-pointer"
                        aria-label="Edit playlist metadata"
                      >
                        <Pencil size={12} />
                      </button>
                    </Tooltip>
                  </div>
                  {selectedPlaylist.description && (
                    <p className="text-[11px] text-zinc-400 truncate max-w-md">
                      {selectedPlaylist.description}
                    </p>
                  )}
                  <p className="text-[10px] font-mono-time text-zinc-500 mt-0.5">
                    {playlistTracks?.length ?? 0} tracks · {formatTime(totalDuration)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {(playlistTracks?.length ?? 0) > 0 && (
                  <button
                    onClick={handlePlayAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
                  >
                    <Play size={11} fill="currentColor" />
                    <span>Play All</span>
                  </button>
                )}
                <Tooltip content="Delete playlist" side="top">
                  <button
                    onClick={() => handleDeletePlaylist(selectedPlaylist)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-[#1e1e24] transition-colors cursor-pointer"
                    aria-label="Delete playlist"
                  >
                    <Trash2 size={14} />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Scrollable Track Table */}
            <div className="overflow-y-auto flex-1 min-h-0">
              {!playlistTracks || playlistTracks.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-xs">
                  <Music size={28} className="mx-auto text-zinc-700 mb-2" />
                  <p className="font-medium text-zinc-400">Playlist is empty</p>
                  <p className="text-zinc-600 mt-1">Add tracks from search, queue, or recently played</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <table className="w-full text-left border-collapse table-fixed" role="grid" aria-label={`Tracks in ${selectedPlaylist.name}`}>
                    <thead className="sticky top-0 z-10 bg-[#0f0f13]">
                      <tr className="border-b border-[#222228] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="w-10 px-2 py-2 text-center">#</th>
                        <th className="px-2 py-2">Track</th>
                        <th className="w-48 px-2 py-2 text-right">Actions</th>
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
                            isActive={currentTrack?.id === track.id}
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
          <motion.div
            key="grid"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="rounded-2xl border border-[#27272a] bg-[#0f0f13] p-4 shadow-sm flex flex-col flex-1 min-h-0"
          >
            {/* Header (Pinned) */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#222228] shrink-0">
              <div className="flex items-center gap-2">
                <Music size={15} className="text-zinc-400" />
                <h3 className="text-sm font-semibold text-white">Your Playlists</h3>
                <span className="text-xs font-mono-time text-zinc-500">({playlists?.length ?? 0})</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181820] hover:bg-[#242430] border border-[#2e2e38] text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Download size={13} className="text-emerald-400" />
                  <span>Import YT Playlist</span>
                </button>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
                >
                  <Plus size={13} />
                  <span>New Playlist</span>
                </button>
              </div>
            </div>

            {/* Scrollable Playlist Cards Grid */}
            <div className="overflow-y-auto flex-1 min-h-0 pr-0.5">
              {!playlists || playlists.length === 0 ? (
                <div className="py-14 text-center text-zinc-500 border border-dashed border-[#27272f] rounded-xl my-2 flex flex-col items-center">
                  <FolderPlus size={32} className="text-zinc-700 mb-2" />
                  <p className="text-xs font-medium text-zinc-300">No playlists in your library</p>
                  <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                    Create custom playlists or import your favorite public YouTube playlists.
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1e1e26] text-white border border-zinc-700 text-xs font-medium rounded-lg hover:bg-[#282834] transition-colors cursor-pointer"
                    >
                      <Download size={13} className="text-emerald-400" />
                      <span>Import YouTube Playlist</span>
                    </button>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-3.5 py-1.5 bg-white text-black text-xs font-semibold rounded-lg hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
                    >
                      + Create New
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {playlists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => setSelectedPlaylist(pl)}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#14141a] hover:bg-[#1c1c24] border border-[#27272f] hover:border-zinc-600 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                        <div className="w-9 h-9 rounded-lg bg-[#22222a] flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors shrink-0">
                          <Music size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                            {pl.name}
                          </h4>
                          <p className="text-[10px] text-zinc-500 font-mono-time">
                            {pl.trackIds.length} tracks
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-zinc-500 shrink-0">
                        <Tooltip content="Edit playlist" side="top">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPlaylist(pl);
                            }}
                            className="p-1 rounded text-zinc-500 hover:text-white hover:bg-[#27272f] transition-colors cursor-pointer"
                            aria-label="Edit playlist"
                          >
                            <Pencil size={12} />
                          </button>
                        </Tooltip>
                        <Tooltip content="Delete playlist" side="top">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlaylist(pl);
                            }}
                            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-[#27272f] transition-colors cursor-pointer"
                            aria-label="Delete playlist"
                          >
                            <Trash2 size={12} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreatePlaylistModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <EditPlaylistModal
        playlist={editingPlaylist}
        isOpen={!!editingPlaylist}
        onClose={() => setEditingPlaylist(null)}
        onUpdated={(updated) => {
          if (selectedPlaylist?.id === updated.id) {
            setSelectedPlaylist(updated);
          }
        }}
      />
      <ImportPlaylistModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={(pl) => setSelectedPlaylist(pl)}
      />
    </div>
  );
}
