'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
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
  const { play, playNext, addToQueue, currentTrack, showToast } = usePlayerStore();
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
          'group cursor-default select-none',
          isActive ? 'bg-zinc-800/80' : 'hover:bg-zinc-800/40',
          'transition-colors'
        )}
        aria-label={`${track.title} by ${track.artist}`}
      >
        <td className="w-10 px-3 py-2 text-center">
          <span
            className={cn(
              'font-mono-time text-zinc-600',
              isActive && 'text-white'
            )}
          >
            {isActive ? '▶' : index + 1}
          </span>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded overflow-hidden bg-zinc-800 shrink-0">
              {track.thumbnailUrl && (
                <Image src={track.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
              )}
            </div>
            <div className="min-w-0">
              <p className={cn('text-sm truncate', isActive ? 'text-white font-medium' : 'text-zinc-200')}>
                {track.title}
              </p>
            </div>
          </div>
        </td>
        <td className="px-3 py-2">
          <p className="text-sm text-zinc-500 truncate">{track.artist}</p>
        </td>
        <td className="px-3 py-2 text-right">
          <span className="font-mono-time text-zinc-500">{formatTime(track.duration)}</span>
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
