'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  ListStart,
  Plus,
  ListPlus,
  Trash2,
  Heart,
  ChevronRight,
  Music,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Track, Playlist } from '@/types';

interface TrackContextMenuProps {
  track: Track;
  position: { x: number; y: number };
  playlists: Playlist[];
  showRemoveFromPlaylist?: boolean;
  showRemoveFromQueue?: boolean;
  isLiked?: boolean;
  onClose: () => void;
  onPlayNow: () => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onAddToPlaylist: (playlist: Playlist) => void;
  onRemoveFromPlaylist?: () => void;
  onRemoveFromQueue?: () => void;
  onToggleLike?: () => void;
}

export function TrackContextMenu({
  track,
  position,
  playlists,
  showRemoveFromPlaylist,
  showRemoveFromQueue,
  isLiked,
  onClose,
  onPlayNow,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onRemoveFromQueue,
  onToggleLike,
}: TrackContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click or Esc
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!mounted || typeof document === 'undefined') return null;

  // Adjust position to stay in viewport
  const adjustedX = Math.max(10, Math.min(position.x, window.innerWidth - 230));
  const adjustedY = Math.max(10, Math.min(position.y, window.innerHeight - 300));

  const menuContent = (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${track.title}`}
      className="fixed z-[100] min-w-[210px] p-1.5 rounded-2xl border border-white/10 bg-[#0d0d12]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-xs select-none animate-in fade-in zoom-in-95 duration-100"
      style={{ left: adjustedX, top: adjustedY }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Info */}
      <div className="px-2.5 py-1.5 border-b border-white/[0.06] mb-1">
        <p className="font-semibold text-white truncate text-[11px]">{track.title}</p>
        <p className="text-zinc-500 truncate text-[11px]">{track.artist}</p>
      </div>

      <button
        role="menuitem"
        onClick={() => {
          onPlayNow();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-zinc-200 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer text-left font-medium"
      >
        <Play size={13} className="text-white fill-current shrink-0" />
        <span>Play Now</span>
      </button>

      <button
        role="menuitem"
        onClick={() => {
          onPlayNext();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-zinc-200 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer text-left font-medium"
      >
        <ListStart size={13} className="text-zinc-400 shrink-0" />
        <span>Play Next</span>
      </button>

      <button
        role="menuitem"
        onClick={() => {
          onAddToQueue();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-zinc-200 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer text-left font-medium"
      >
        <Plus size={13} className="text-zinc-400 shrink-0" />
        <span>Add to Queue</span>
      </button>

      {onToggleLike && (
        <button
          role="menuitem"
          onClick={() => {
            onToggleLike();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-zinc-200 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer text-left font-medium"
        >
          <Heart
            size={13}
            className={cn('shrink-0', isLiked ? 'text-rose-500 fill-rose-500' : 'text-zinc-400')}
          />
          <span>{isLiked ? 'Unlike (Remove from Liked)' : 'Like (Add to Liked)'}</span>
        </button>
      )}

      <div className="my-1 border-t border-white/[0.06]" role="separator" />

      {/* Add to Playlist submenu */}
      <div
        className="relative"
        onMouseEnter={() => setShowPlaylistSubmenu(true)}
        onMouseLeave={() => setShowPlaylistSubmenu(false)}
      >
        <button
          role="menuitem"
          className="w-full flex items-center justify-between px-2.5 py-2 text-zinc-200 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer text-left font-medium"
          aria-haspopup="true"
          aria-expanded={showPlaylistSubmenu}
        >
          <div className="flex items-center gap-2.5">
            <ListPlus size={13} className="text-zinc-400 shrink-0" />
            <span>Add to Playlist</span>
          </div>
          <ChevronRight size={13} className="text-zinc-500" />
        </button>

        {showPlaylistSubmenu && (
          <div
            role="menu"
            aria-label="Playlists submenu"
            className="absolute left-full top-0 min-w-[190px] p-1.5 rounded-2xl border border-white/10 bg-[#0d0d12]/95 backdrop-blur-2xl shadow-2xl text-xs"
            style={{ marginLeft: 4 }}
          >
            {playlists.length === 0 ? (
              <p className="px-3 py-2 text-zinc-500 text-[11px]">No playlists yet</p>
            ) : (
              playlists.map((pl) => (
                <button
                  key={pl.id}
                  role="menuitem"
                  onClick={() => {
                    onAddToPlaylist(pl);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-zinc-200 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors truncate cursor-pointer text-left"
                >
                  <Music size={11} className="text-zinc-500 shrink-0" />
                  <span className="truncate">{pl.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {showRemoveFromPlaylist && onRemoveFromPlaylist && (
        <>
          <div className="my-1 border-t border-white/[0.06]" role="separator" />
          <button
            role="menuitem"
            onClick={() => {
              onRemoveFromPlaylist();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer text-left font-medium"
          >
            <Trash2 size={13} className="shrink-0" />
            <span>Remove from Playlist</span>
          </button>
        </>
      )}

      {showRemoveFromQueue && onRemoveFromQueue && (
        <>
          <div className="my-1 border-t border-white/[0.06]" role="separator" />
          <button
            role="menuitem"
            onClick={() => {
              onRemoveFromQueue();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer text-left font-medium"
          >
            <Trash2 size={13} className="shrink-0" />
            <span>Remove from Queue</span>
          </button>
        </>
      )}
    </div>
  );

  return createPortal(menuContent, document.body);
}
