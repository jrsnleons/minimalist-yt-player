'use client';

import { useState, useRef } from 'react';
import { GripVertical, User, MoreHorizontal, Play } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackContextMenu } from '@/components/context-menu/TrackContextMenu';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { Equalizer } from '@/components/ui/Equalizer';
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
  /** queue: compact row for the Up Next list (no duration column). */
  variant?: 'list' | 'queue';
}

export function TrackRow({
  track,
  index,
  playlist,
  isActive,
  isSortable = false,
  sortableId,
  onRemoveFromQueue,
  variant = 'list',
}: TrackRowProps) {
  const play = usePlayerStore((s) => s.play);
  const playNext = usePlayerStore((s) => s.playNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const showToast = usePlayerStore((s) => s.showToast);
  const isTrackLiked = usePlayerStore((s) => s.likedTrackIds.includes(track.id));
  const toggleLikeTrack = usePlayerStore((s) => s.toggleLikeTrack);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const rowRef = useRef<HTMLTableRowElement>(null);

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

  const openMenu = (pos: { x: number; y: number }) => {
    setContextMenu(pos);
    // Playlists load only when a menu opens, not once per row.
    db.playlists.toArray().then(setPlaylists).catch(() => {});
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openMenu({ x: e.clientX, y: e.clientY });
  };

  const handleMoreOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    openMenu({ x: rect.right - 210, y: rect.bottom + 6 });
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
    const previousIds = playlist.trackIds;
    const previousUpdatedAt = playlist.updatedAt;
    const position = previousIds.indexOf(track.id);
    await db.playlists.update(playlist.id, {
      trackIds: previousIds.filter((id) => id !== track.id),
      updatedAt: Date.now(),
    });
    showToast(`Removed from "${playlist.name}"`, {
      action: {
        label: 'Undo',
        onAction: async () => {
          const current = await db.playlists.get(playlist.id);
          if (!current) return;
          // Put the song back in its original spot, leaving any later edits alone.
          const ids = current.trackIds.filter((id) => id !== track.id);
          ids.splice(Math.min(Math.max(position, 0), ids.length), 0, track.id);
          const unchanged = current.trackIds.length === previousIds.length - 1;
          await db.playlists.update(playlist.id, {
            trackIds: unchanged ? previousIds : ids,
            updatedAt: unchanged ? previousUpdatedAt : Date.now(),
          });
        },
      },
    });
  };

  const handlePlayNext = () => {
    playNext(track);
    showToast(`"${track.title}" will play next`);
  };

  const isQueue = variant === 'queue';

  return (
    <>
      <tr
        ref={isSortable ? sortable.setNodeRef : rowRef}
        style={sortableStyle}
        onContextMenu={handleContextMenu}
        data-active={isActive ? 'true' : undefined}
        className={cn(
          'group relative border-b border-white/[0.04] text-sm w-full transition-colors hover:bg-white/[0.04] focus-within:bg-white/[0.04]',
          isActive && 'bg-white/[0.05]'
        )}
      >
        {/* Grip / index / equalizer */}
        <td className={cn('px-2 py-1.5 text-center shrink-0', isQueue ? 'w-12' : 'w-14')}>
          <div className="flex items-center justify-center gap-1">
            {isSortable ? (
              <button
                {...sortable.attributes}
                {...sortable.listeners}
                aria-label={`Reorder ${track.title}`}
                className="relative z-10 cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-200 p-1 rounded"
                title="Drag to reorder"
              >
                <GripVertical size={14} />
              </button>
            ) : null}

            {!(isQueue && isSortable && !isActive) && (
              <span className="relative inline-grid place-items-center w-5 h-5 text-zinc-500">
                {isActive ? (
                  <Equalizer playing={isPlaying} />
                ) : (
                  <>
                    <span className="font-mono text-[13px] tabular-nums group-hover:hidden group-focus-within:hidden">
                      {index + 1}
                    </span>
                    <Play
                      size={14}
                      fill="currentColor"
                      className="hidden group-hover:block group-focus-within:block text-white"
                      aria-hidden="true"
                    />
                  </>
                )}
              </span>
            )}
          </div>
        </td>

        {/* Primary action: a real button stretched over the whole row */}
        <td className="px-2 py-1.5 min-w-0 max-w-0 w-auto">
          <button
            type="button"
            onClick={() => play(track)}
            aria-label={`Play ${track.title} by ${track.artist}`}
            aria-current={isActive ? 'true' : undefined}
            className="flex items-center gap-3 min-w-0 w-full text-left cursor-pointer after:content-[''] after:absolute after:inset-0 focus-visible:after:rounded-md focus-visible:outline-2 focus-visible:outline-white"
          >
            <span className="shrink-0">
              <TrackArtwork track={track} size="md" rounded="md" />
            </span>
            <span className="min-w-0 flex-1 flex flex-col">
              <span
                className={cn(
                  'truncate text-sm font-medium leading-snug',
                  isActive ? 'text-[var(--track-accent,#e9b44c)]' : 'text-zinc-100'
                )}
              >
                {track.title}
              </span>
              <span className="truncate text-[13px] text-zinc-400">{track.artist}</span>
            </span>
          </button>
        </td>

        {/* Secondary actions sit above the stretched button */}
        <td className={cn('px-2 py-1.5 text-right shrink-0', isQueue ? 'w-24' : 'w-36')}>
          <div className="flex items-center justify-end gap-1">
            {track.addedBy?.name ? (
              <Tooltip content={`Added by ${track.addedBy.name}`} side="top">
                <span
                  className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-zinc-400"
                  role="img"
                  aria-label={`Added by ${track.addedBy.name}`}
                >
                  <User size={14} />
                </span>
              </Tooltip>
            ) : null}

            <Tooltip content="More options" side="top">
              <button
                onClick={handleMoreOptionsClick}
                aria-label={`More options for ${track.title}`}
                aria-haspopup="menu"
                className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100"
              >
                <MoreHorizontal size={16} />
              </button>
            </Tooltip>

            {!isQueue && (
              <span className="font-mono text-[13px] text-zinc-400 w-11 text-right shrink-0 tabular-nums">
                {formatTime(track.duration)}
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* Context Menu (Triggered via Right Click or '...' button) */}
      {contextMenu && (
        <TrackContextMenu
          track={track}
          position={contextMenu}
          playlists={playlists}
          showRemoveFromPlaylist={!!playlist}
          showRemoveFromQueue={!!onRemoveFromQueue}
          isLiked={isTrackLiked}
          onClose={() => setContextMenu(null)}
          onPlayNow={() => play(track)}
          onPlayNext={handlePlayNext}
          onAddToQueue={() => {
            addToQueue(track);
            showToast('Added to queue');
          }}
          onAddToPlaylist={handleAddToPlaylist}
          onRemoveFromPlaylist={handleRemoveFromPlaylist}
          onRemoveFromQueue={onRemoveFromQueue}
          onToggleLike={() => toggleLikeTrack(track)}
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
