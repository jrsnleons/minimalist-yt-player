'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Play, Volume2, Plus, ListPlus, GripVertical, Trash2, ListStart } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackContextMenu } from '@/components/context-menu/TrackContextMenu';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
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
  const [isRowHovered, setIsRowHovered] = useState(false);
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
    showToast(`"${track.title}" will play next`);
  };

  return (
    <>
      <tr
        ref={isSortable ? sortable.setNodeRef : rowRef}
        style={sortableStyle}
        onContextMenu={handleContextMenu}
        onDoubleClick={() => play(track)}
        onMouseEnter={() => setIsRowHovered(true)}
        onMouseLeave={() => setIsRowHovered(false)}
        className={cn(
          'group cursor-pointer select-none transition-colors border-b border-[#18181f]/40 text-xs w-full',
          isActive ? 'bg-[#1e1e26] text-white font-medium' : 'hover:bg-[#15151c] text-zinc-300'
        )}
        aria-label={`${track.title} by ${track.artist}`}
      >
        {/* Grip Handle / Index / Playing indicator */}
        <td className="w-10 px-2 py-2 text-center shrink-0">
          <div className="flex items-center justify-center gap-1">
            {isSortable ? (
              <button
                {...sortable.attributes}
                {...sortable.listeners}
                aria-label="Drag to reorder"
                className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-300 p-0.5"
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
                <span className={cn('font-mono-time text-zinc-500 text-[11px]', isSortable ? 'hidden group-hover:hidden' : 'group-hover:hidden')}>
                  {index + 1}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    play(track);
                  }}
                  aria-label={`Play ${track.title}`}
                  className={cn('text-white hover:scale-110 transition-transform items-center justify-center cursor-pointer', isSortable ? 'hidden' : 'hidden group-hover:flex')}
                >
                  <Play size={11} fill="currentColor" />
                </button>
              </>
            )}
          </div>
        </td>

        {/* Title & Artist with On-Hover Smooth Gliding Marquee */}
        <td className="px-2 py-2 min-w-0 max-w-0 w-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <TrackArtwork track={track} size="sm" rounded="lg" />
            <div className="min-w-0 flex-1 overflow-hidden">
              <MarqueeText
                text={track.title}
                subText={track.artist}
                isParentHovered={isRowHovered}
                className={cn('text-xs font-medium leading-snug', isActive ? 'text-white font-semibold' : 'text-zinc-200')}
                subClassName="text-zinc-400"
              />
            </div>
          </div>
        </td>

        {/* Actions & Duration Cluster */}
        <td className="w-48 px-2 py-2 text-right shrink-0">
          <div className="flex items-center justify-end gap-1">
            {/* 1. Quick Play Now */}
            <Tooltip content="Play now" side="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  play(track);
                }}
                aria-label="Play now"
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#27272f] transition-all cursor-pointer"
              >
                <Play size={11} fill="currentColor" />
              </button>
            </Tooltip>

            {/* 2. Quick Play Next */}
            <Tooltip content="Play next (after current song)" side="top">
              <button
                onClick={handlePlayNext}
                aria-label="Play next"
                className="p-1 rounded text-zinc-400 hover:text-emerald-300 hover:bg-[#27272f] transition-all cursor-pointer"
              >
                <ListStart size={12} />
              </button>
            </Tooltip>

            {/* 3. Quick Add to Queue */}
            <Tooltip content="Add to queue" side="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToQueue(track);
                  showToast(`Added to queue`);
                }}
                aria-label="Add to queue"
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#27272f] transition-all cursor-pointer"
              >
                <Plus size={12} />
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
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#27272f] transition-all cursor-pointer"
              >
                <ListPlus size={12} />
              </button>
            </Tooltip>

            {/* 5. Remove from Playlist / Queue */}
            {playlist ? (
              <Tooltip content="Remove from playlist" side="top">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromPlaylist();
                  }}
                  aria-label="Remove from playlist"
                  className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-[#27272f] transition-all cursor-pointer"
                >
                  <Trash2 size={11} />
                </button>
              </Tooltip>
            ) : onRemoveFromQueue ? (
              <Tooltip content="Remove from queue" side="top">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromQueue();
                  }}
                  aria-label="Remove from queue"
                  className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-[#27272f] transition-all cursor-pointer"
                >
                  <Trash2 size={11} />
                </button>
              </Tooltip>
            ) : null}

            {/* Duration */}
            <span className="font-mono-time text-[10px] text-zinc-500 font-medium w-10 text-right ml-1 shrink-0">
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
