'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Play, Volume2, Plus, ListPlus, GripVertical, Trash2, ListStart, CornerDownRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackContextMenu } from '@/components/context-menu/TrackContextMenu';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatTime, cn } from '@/lib/utils';
import type { Track, Playlist } from '@/types';

interface TrackRowProps {
  track: Track;
  index: number;
  playlist?: Playlist;
  isActive?: boolean;
  isSortable?: boolean;
  sortableId?: string;
  onRemoveFromQueue?: () => void;
}

export function TrackRow({
  track,
  index,
  playlist,
  isActive,
  isSortable = false,
  sortableId,
  onRemoveFromQueue,
}: TrackRowProps) {
  const { play, playNext, addToQueue, isPlaying, showToast } = usePlayerStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const rowRef = useRef<HTMLTableRowElement>(null);

  const playlists = useLiveQuery(() => db.playlists.toArray(), []);

  // Sortable hook setup if enabled
  const sortable = useSortable({
    id: sortableId || track.id,
    disabled: !isSortable,
  });

  const sortableStyle = isSortable
    ? {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.35 : 1,
      }
    : undefined;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleAddToPlaylist = async (targetPlaylist: Playlist) => {
    if (targetPlaylist.trackIds.includes(track.id)) {
      showToast(`Already in "${targetPlaylist.name}"`);
      return;
    }
    await db.playlists.update(targetPlaylist.id, {
      trackIds: [...targetPlaylist.trackIds, track.id],
      updatedAt: Date.now(),
    });
    await db.tracks.put(track);
    showToast(`Added to "${targetPlaylist.name}"`);
  };

  const handleRemoveFromPlaylist = async () => {
    if (!playlist) return;
    await db.playlists.update(playlist.id, {
      trackIds: playlist.trackIds.filter((id) => id !== track.id),
      updatedAt: Date.now(),
    });
    showToast(`Removed from "${playlist.name}"`);
  };

  const handlePlayNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    playNext(track);
    showToast(`"${track.title}" will play next after active song`);
  };

  return (
    <>
      <tr
        ref={isSortable ? sortable.setNodeRef : rowRef}
        style={sortableStyle}
        onContextMenu={handleContextMenu}
        onDoubleClick={() => play(track)}
        className={cn(
          'group cursor-pointer select-none transition-colors border-b border-[#18181f]/40 text-xs',
          isActive ? 'bg-[#1e1e26] text-white font-medium' : 'hover:bg-[#15151c] text-zinc-300'
        )}
        aria-label={`${track.title} by ${track.artist}`}
      >
        {/* Grip Handle / Index / Playing indicator */}
        <td className="w-12 px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1">
            {isSortable ? (
              <button
                {...sortable.attributes}
                {...sortable.listeners}
                aria-label="Drag to reorder"
                className="cursor-grab active:cursor-grabbing text-zinc-600 group-hover:text-zinc-400 p-0.5"
                title="Drag to reorder"
              >
                <GripVertical size={13} />
              </button>
            ) : null}

            {isActive ? (
              <span className="text-white flex items-center justify-center">
                <Volume2 size={13} className={isPlaying ? 'animate-pulse text-white' : 'text-zinc-400'} />
              </span>
            ) : (
              <>
                <span className={cn('font-mono-time text-zinc-500', isSortable ? 'hidden group-hover:hidden' : 'group-hover:hidden')}>
                  {index + 1}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    play(track);
                  }}
                  aria-label={`Play ${track.title}`}
                  className={cn('text-white hover:scale-110 transition-transform items-center justify-center', isSortable ? 'hidden' : 'hidden group-hover:flex')}
                >
                  <Play size={12} fill="currentColor" />
                </button>
              </>
            )}
          </div>
        </td>

        {/* Title & Artwork */}
        <td className="px-3 py-2 min-w-0">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded overflow-hidden bg-zinc-800 border border-zinc-700/50 shrink-0">
              {track.thumbnailUrl ? (
                <Image src={track.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600">♫</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn('truncate font-medium', isActive ? 'text-white font-semibold' : 'text-zinc-200')}>
                {track.title}
              </p>
            </div>
          </div>
        </td>

        {/* Artist */}
        <td className="px-3 py-2">
          <p className="text-zinc-400 truncate">{track.artist}</p>
        </td>

        {/* Actions & Duration */}
        <td className="px-3 py-2 text-right">
          <div className="flex items-center justify-end gap-1">
            {/* 1. Quick Play Now */}
            <Tooltip content="Play now" side="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  play(track);
                }}
                aria-label="Play now"
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#27272f] transition-all"
              >
                <Play size={12} fill="currentColor" />
              </button>
            </Tooltip>

            {/* 2. Quick Play Next (after active song) */}
            <Tooltip content="Play Next (after active song)" side="top">
              <button
                onClick={handlePlayNext}
                aria-label="Play next"
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-400 hover:text-emerald-300 hover:bg-[#27272f] transition-all"
              >
                <ListStart size={13} />
              </button>
            </Tooltip>

            {/* 3. Quick Add to Queue */}
            <Tooltip content="Add to end of queue" side="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToQueue(track);
                  showToast(`Added "${track.title}" to queue`);
                }}
                aria-label="Add to queue"
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#27272f] transition-all"
              >
                <Plus size={13} />
              </button>
            </Tooltip>

            {/* 4. Quick Add to Playlist */}
            <Tooltip content="Add to playlist" side="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaylistModalOpen(true);
                }}
                aria-label="Add to playlist"
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#27272f] transition-all"
              >
                <ListPlus size={13} />
              </button>
            </Tooltip>

            {/* 5. Remove from queue if applicable */}
            {onRemoveFromQueue && (
              <Tooltip content="Remove from queue" side="top">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromQueue();
                  }}
                  aria-label="Remove from queue"
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-[#27272f] transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </Tooltip>
            )}

            <span className="font-mono-time text-[11px] text-zinc-500 font-medium w-12 text-right ml-1">
              {formatTime(track.duration)}
            </span>
          </div>
        </td>
      </tr>

      {/* Right Click Context Menu */}
      {contextMenu && (
        <TrackContextMenu
          track={track}
          position={contextMenu}
          playlists={playlists ?? []}
          showRemoveFromPlaylist={!!playlist}
          onClose={() => setContextMenu(null)}
          onPlayNow={() => play(track)}
          onPlayNext={() => {
            playNext(track);
            showToast(`"${track.title}" will play next`);
          }}
          onAddToQueue={() => {
            addToQueue(track);
            showToast(`Added to queue`);
          }}
          onAddToPlaylist={handleAddToPlaylist}
          onRemoveFromPlaylist={handleRemoveFromPlaylist}
        />
      )}

      {/* Add To Playlist Modal */}
      {isPlaylistModalOpen && (
        <AddToPlaylistModal
          track={track}
          isOpen={isPlaylistModalOpen}
          onClose={() => setIsPlaylistModalOpen(false)}
        />
      )}
    </>
  );
}
