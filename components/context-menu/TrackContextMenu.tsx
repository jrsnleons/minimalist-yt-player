'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Track, Playlist } from '@/types';

interface TrackContextMenuProps {
  track: Track;
  position: { x: number; y: number };
  playlists: Playlist[];
  showRemoveFromPlaylist: boolean;
  onClose: () => void;
  onPlayNow: () => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onAddToPlaylist: (playlist: Playlist) => void;
  onRemoveFromPlaylist: () => void;
}

export function TrackContextMenu({
  track,
  position,
  playlists,
  showRemoveFromPlaylist,
  onClose,
  onPlayNow,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
  onRemoveFromPlaylist,
}: TrackContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);

  // Close on outside click or Esc
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Adjust position to stay in viewport
  const adjustedX = Math.min(position.x, window.innerWidth - 220);
  const adjustedY = Math.min(position.y, window.innerHeight - 250);

  const item = (label: string, onClick: () => void, danger = false) => (
    <button
      onClick={() => { onClick(); onClose(); }}
      className={cn(
        'w-full text-left px-3 py-2 text-sm rounded-sm',
        'hover:bg-zinc-700 transition-colors',
        danger ? 'text-red-400 hover:text-red-300' : 'text-zinc-200'
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${track.title}`}
      className="fixed z-[100] min-w-[200px] py-1 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {item('Play Now', onPlayNow)}
      {item('Play Next', onPlayNext)}
      {item('Add to Queue', onAddToQueue)}

      <div className="my-1 border-t border-zinc-800" />

      {/* Add to Playlist submenu */}
      <div
        className="relative"
        onMouseEnter={() => setShowPlaylistSubmenu(true)}
        onMouseLeave={() => setShowPlaylistSubmenu(false)}
      >
        <button
          className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-200 rounded-sm hover:bg-zinc-700 transition-colors"
          aria-haspopup="true"
          aria-expanded={showPlaylistSubmenu}
        >
          Add to Playlist
          <ChevronRight size={14} className="text-zinc-500" />
        </button>

        {showPlaylistSubmenu && (
          <div
            className="absolute left-full top-0 min-w-[180px] py-1 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
            style={{ marginLeft: 4 }}
          >
            {playlists.length === 0 ? (
              <p className="px-3 py-2 text-xs text-zinc-600">No playlists yet</p>
            ) : (
              playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => { onAddToPlaylist(pl); onClose(); }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-200 rounded-sm hover:bg-zinc-700 transition-colors truncate"
                >
                  {pl.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {showRemoveFromPlaylist && (
        <>
          <div className="my-1 border-t border-zinc-800" />
          {item('Remove from Playlist', onRemoveFromPlaylist, true)}
        </>
      )}
    </div>
  );
}
