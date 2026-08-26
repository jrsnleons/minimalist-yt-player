'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Play, Volume2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackContextMenu } from '@/components/context-menu/TrackContextMenu';
import { formatTime, cn } from '@/lib/utils';
import type { Track, Playlist } from '@/types';

interface TrackRowProps {
  track: Track;
  index: number;
  playlist?: Playlist;
  isActive?: boolean;
}

export function TrackRow({ track, index, playlist, isActive }: TrackRowProps) {
  const { play, playNext, addToQueue, isPlaying, showToast } = usePlayerStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const rowRef = useRef<HTMLTableRowElement>(null);

  const playlists = useLiveQuery(() => db.playlists.toArray(), []);

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
  };

  return (
    <>
      <tr
        ref={rowRef}
        onContextMenu={handleContextMenu}
        onDoubleClick={() => play(track)}
        className={cn(
          'group cursor-pointer select-none transition-colors border-b border-[#18181f]/40',
          isActive
            ? 'bg-[#1e1e26] text-white'
            : 'hover:bg-[#15151c] text-zinc-300'
        )}
        aria-label={`${track.title} by ${track.artist}`}
      >
        {/* Index / Play Button / Playing wave */}
        <td className="w-12 px-4 py-2.5 text-center">
          <div className="flex items-center justify-center">
            {isActive ? (
              <span className="text-white flex items-center justify-center">
                <Volume2 size={14} className={isPlaying ? 'animate-pulse text-white' : 'text-zinc-400'} />
              </span>
            ) : (
              <>
                <span className="font-mono-time text-xs text-zinc-500 group-hover:hidden">
                  {index + 1}
                </span>
                <button
                  onClick={() => play(track)}
                  aria-label={`Play ${track.title}`}
                  className="hidden group-hover:flex text-white hover:scale-110 transition-transform items-center justify-center"
                >
                  <Play size={13} fill="currentColor" />
                </button>
              </>
            )}
          </div>
        </td>

        {/* Title & Thumbnail */}
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-md overflow-hidden bg-zinc-800 border border-zinc-700/50 shrink-0">
              {track.thumbnailUrl ? (
                <Image src={track.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600">♫</div>
              )}
            </div>
            <div className="min-w-0">
              <p className={cn('text-xs font-medium truncate', isActive ? 'text-white font-semibold' : 'text-zinc-200')}>
                {track.title}
              </p>
            </div>
          </div>
        </td>

        {/* Artist */}
        <td className="px-4 py-2.5">
          <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
        </td>

        {/* Duration */}
        <td className="w-24 px-4 py-2.5 text-right">
          <span className="font-mono-time text-xs text-zinc-500 font-medium">{formatTime(track.duration)}</span>
        </td>
      </tr>

      {contextMenu && (
        <TrackContextMenu
          track={track}
          position={contextMenu}
          playlists={playlists ?? []}
          showRemoveFromPlaylist={!!playlist}
          onClose={() => setContextMenu(null)}
          onPlayNow={() => play(track)}
          onPlayNext={() => { playNext(track); showToast(`Playing next: ${track.title}`); }}
          onAddToQueue={() => { addToQueue(track); showToast(`Added to queue`); }}
          onAddToPlaylist={handleAddToPlaylist}
          onRemoveFromPlaylist={handleRemoveFromPlaylist}
        />
      )}
    </>
  );
}
