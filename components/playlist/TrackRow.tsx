'use client';

import { useState, useRef } from 'react';
import { Volume2, GripVertical, Heart, MoreHorizontal } from 'lucide-react';
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
import { useDynamicTrackPalette } from '@/hooks/useDynamicTrackPalette';
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
  const play = usePlayerStore((s) => s.play);
  const playNext = usePlayerStore((s) => s.playNext);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const showToast = usePlayerStore((s) => s.showToast);
  const isTrackLiked = usePlayerStore((s) => s.likedTrackIds.includes(track.id));
  const toggleLikeTrack = usePlayerStore((s) => s.toggleLikeTrack);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isRowHovered, setIsRowHovered] = useState(false);
  const rowRef = useRef<HTMLTableRowElement>(null);

  // Extract real dominant color palette from track artwork
  const palette = useDynamicTrackPalette(track);

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

  // Rich internal color wash with clean solid left indicator (no external blurry shadows)
  const rowStyle: React.CSSProperties = {
    ...(sortableStyle || {}),
    background: isActive
      ? `linear-gradient(90deg, ${palette.accent}33 0%, ${palette.bgFrom}75 35%, rgba(255,255,255,0.03) 100%)`
      : isRowHovered
      ? `linear-gradient(90deg, ${palette.accent}20 0%, ${palette.bgFrom}40 30%, rgba(255,255,255,0.015) 100%)`
      : `linear-gradient(90deg, ${palette.accent}0a 0%, transparent 22%)`,
    borderLeft: isActive
      ? `3px solid ${palette.accent}`
      : isRowHovered
      ? `3px solid ${palette.accent}90`
      : '3px solid transparent',
    transition: 'background 0.15s ease-out, border-left 0.15s ease-out',
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleMoreOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ x: rect.right - 210, y: rect.bottom + 6 });
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

  const handlePlayNext = () => {
    playNext(track);
    showToast(`"${track.title}" will play next`);
  };

  return (
    <>
      <tr
        ref={isSortable ? sortable.setNodeRef : rowRef}
        style={rowStyle}
        onClick={() => play(track)}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsRowHovered(true)}
        onMouseLeave={() => setIsRowHovered(false)}
        className={cn(
          'group cursor-pointer select-none transition-colors border-b border-white/[0.03] text-xs w-full',
          isActive ? 'text-white font-medium' : 'text-zinc-300'
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
                onClick={(e) => e.stopPropagation()}
                aria-label="Drag to reorder"
                className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-300 p-0.5"
                title="Drag to reorder"
              >
                <GripVertical size={13} />
              </button>
            ) : null}

            {isActive ? (
              <span className="flex items-center justify-center">
                <Volume2
                  size={13}
                  className={isPlaying ? 'animate-pulse' : ''}
                  style={{ color: palette.accent }}
                />
              </span>
            ) : (
              <span className="font-mono text-zinc-500 text-[11px]">
                {index + 1}
              </span>
            )}
          </div>
        </td>

        {/* Title & Artist with On-Hover Smooth Gliding Marquee */}
        <td className="px-2 py-2 min-w-0 max-w-0 w-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0">
              <TrackArtwork track={track} size="sm" rounded="lg" />
            </div>
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

        {/* Actions & Duration Cluster: Only Heart, More Options (...), and Duration */}
        <td className="w-28 px-2 py-2 text-right shrink-0">
          <div className="flex items-center justify-end gap-1.5">
            {/* 1. Like / Heart Button */}
            <Tooltip content={isTrackLiked ? 'Unlike' : 'Like (Add to Liked Songs)'} side="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLikeTrack(track);
                }}
                aria-label={isTrackLiked ? 'Unlike track' : 'Like track'}
                className={cn(
                  'p-1.5 rounded-lg transition-all cursor-pointer',
                  isTrackLiked
                    ? 'text-rose-500 hover:text-rose-400 hover:bg-rose-500/10'
                    : 'text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-rose-400 hover:bg-white/[0.08]'
                )}
              >
                <Heart size={12} className={isTrackLiked ? 'fill-rose-500 text-rose-500' : ''} />
              </button>
            </Tooltip>

            {/* 2. More Options (...) Button */}
            <Tooltip content="More options" side="top">
              <button
                onClick={handleMoreOptionsClick}
                aria-label="More options"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal size={13} />
              </button>
            </Tooltip>

            {/* 3. Duration */}
            <span className="font-mono text-[10px] text-zinc-400 font-medium w-10 text-right ml-0.5 shrink-0">
              {formatTime(track.duration)}
            </span>
          </div>
        </td>
      </tr>

      {/* Context Menu (Triggered via Right Click or '...' button) */}
      {contextMenu && (
        <TrackContextMenu
          track={track}
          position={contextMenu}
          playlists={playlists ?? []}
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
