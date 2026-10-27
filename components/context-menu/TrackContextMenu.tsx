'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

const itemClass =
  'w-full flex items-center gap-2.5 px-3 min-h-[36px] text-sm text-zinc-100 hover:bg-white/[0.08] focus-visible:bg-white/[0.1] rounded-lg transition-colors cursor-pointer text-left font-medium outline-none focus-visible:outline-2 focus-visible:outline-white focus-visible:-outline-offset-2';
const dangerItemClass =
  'w-full flex items-center gap-2.5 px-3 min-h-[36px] text-sm text-rose-300 hover:bg-rose-500/10 focus-visible:bg-rose-500/10 rounded-lg transition-colors cursor-pointer text-left font-medium outline-none focus-visible:outline-2 focus-visible:outline-white focus-visible:-outline-offset-2';

/** Menu items that belong directly to `menu` (not to a nested submenu). */
function itemsOf(menu: HTMLElement): HTMLElement[] {
  return Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(
    (el) => el.closest('[role="menu"]') === menu
  );
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
  const triggerRef = useRef<HTMLElement | null>(null);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMounted(true);
  }, []);

  // Close on outside click; return focus to whatever opened the menu.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  useEffect(() => {
    if (!mounted) return;
    const menu = menuRef.current;
    const first = menu ? itemsOf(menu)[0] : null;
    first?.focus({ preventScroll: true });
    const trigger = triggerRef.current;
    return () => {
      if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [mounted]);

  const closeSubmenu = useCallback(() => {
    setShowPlaylistSubmenu(false);
    const menu = menuRef.current;
    const parentItem = menu?.querySelector<HTMLElement>('[aria-haspopup="menu"]');
    parentItem?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const currentMenu = target.closest<HTMLElement>('[role="menu"]');
    if (!currentMenu) return;
    const items = itemsOf(currentMenu);
    const idx = items.indexOf(target);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        items[(idx + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'ArrowRight':
        if (target.getAttribute('aria-haspopup') === 'menu') {
          e.preventDefault();
          setShowPlaylistSubmenu(true);
          requestAnimationFrame(() => {
            const sub = menuRef.current?.querySelector<HTMLElement>('[aria-label="Playlists"]');
            (sub ? itemsOf(sub)[0] : null)?.focus();
          });
        }
        break;
      case 'ArrowLeft':
        if (currentMenu !== menuRef.current) {
          e.preventDefault();
          closeSubmenu();
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        if (currentMenu !== menuRef.current) closeSubmenu();
        else onClose();
        break;
      case 'Tab':
        onClose();
        break;
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  // Adjust position to stay in viewport
  const adjustedX = Math.max(10, Math.min(position.x, window.innerWidth - 240));
  const adjustedY = Math.max(10, Math.min(position.y, window.innerHeight - 320));

  const menuContent = (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${track.title}`}
      aria-orientation="vertical"
      data-focus-trap-ignore=""
      className="fixed z-[100] w-[224px] p-1.5 rounded-[10px] border border-white/[0.14] bg-[#1d1d23] shadow-[0_12px_32px_rgba(0,0,0,0.6)] select-none"
      style={{ left: adjustedX, top: adjustedY }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <div className="px-3 pt-1 pb-2 border-b border-white/[0.08] mb-1.5" role="presentation">
        <p className="font-semibold text-white truncate text-sm">{track.title}</p>
        <p className="text-zinc-400 truncate text-[13px]">{track.artist}</p>
      </div>

      <button
        role="menuitem"
        tabIndex={-1}
        onClick={() => {
          onPlayNow();
          onClose();
        }}
        className={itemClass}
      >
        <Play size={14} className="fill-current shrink-0" aria-hidden="true" />
        <span>Play Now</span>
      </button>

      <button
        role="menuitem"
        tabIndex={-1}
        onClick={() => {
          onPlayNext();
          onClose();
        }}
        className={itemClass}
      >
        <ListStart size={14} className="text-zinc-400 shrink-0" aria-hidden="true" />
        <span>Play Next</span>
      </button>

      <button
        role="menuitem"
        tabIndex={-1}
        onClick={() => {
          onAddToQueue();
          onClose();
        }}
        className={itemClass}
      >
        <Plus size={14} className="text-zinc-400 shrink-0" aria-hidden="true" />
        <span>Add to Queue</span>
      </button>

      {onToggleLike && (
        <button
          role="menuitem"
          tabIndex={-1}
          onClick={() => {
            onToggleLike();
            onClose();
          }}
          className={itemClass}
        >
          <Heart
            size={14}
            className={cn('shrink-0', isLiked ? 'text-rose-400 fill-rose-400' : 'text-zinc-400')}
            aria-hidden="true"
          />
          <span>{isLiked ? 'Remove from Liked' : 'Add to Liked'}</span>
        </button>
      )}

      <div className="my-1.5 border-t border-white/[0.08]" role="separator" />

      <div
        className="relative"
        onMouseEnter={() => setShowPlaylistSubmenu(true)}
        onMouseLeave={() => setShowPlaylistSubmenu(false)}
      >
        <button
          role="menuitem"
          tabIndex={-1}
          onClick={() => setShowPlaylistSubmenu((v) => !v)}
          className={cn(itemClass, 'justify-between')}
          aria-haspopup="menu"
          aria-expanded={showPlaylistSubmenu}
        >
          <span className="flex items-center gap-2.5">
            <ListPlus size={14} className="text-zinc-400 shrink-0" aria-hidden="true" />
            <span>Add to Playlist</span>
          </span>
          <ChevronRight size={14} className="text-zinc-400" aria-hidden="true" />
        </button>

        {showPlaylistSubmenu && (
          <div
            role="menu"
            aria-label="Playlists"
            className="absolute left-full top-0 ml-1 w-[200px] max-h-[260px] overflow-y-auto p-1.5 rounded-[10px] border border-white/[0.14] bg-[#1d1d23] shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
          >
            {playlists.length === 0 ? (
              <p className="px-3 py-2 text-zinc-400 text-sm">No playlists yet</p>
            ) : (
              playlists.map((pl) => (
                <button
                  key={pl.id}
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => {
                    onAddToPlaylist(pl);
                    onClose();
                  }}
                  className={itemClass}
                >
                  <Music size={14} className="text-zinc-400 shrink-0" aria-hidden="true" />
                  <span className="truncate">{pl.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {showRemoveFromPlaylist && onRemoveFromPlaylist && (
        <>
          <div className="my-1.5 border-t border-white/[0.08]" role="separator" />
          <button
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              onRemoveFromPlaylist();
              onClose();
            }}
            className={dangerItemClass}
          >
            <Trash2 size={14} className="shrink-0" aria-hidden="true" />
            <span>Remove from Playlist</span>
          </button>
        </>
      )}

      {showRemoveFromQueue && onRemoveFromQueue && (
        <>
          <div className="my-1.5 border-t border-white/[0.08]" role="separator" />
          <button
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              onRemoveFromQueue();
              onClose();
            }}
            className={dangerItemClass}
          >
            <Trash2 size={14} className="shrink-0" aria-hidden="true" />
            <span>Remove from Queue</span>
          </button>
        </>
      )}
    </div>
  );

  return createPortal(menuContent, document.body);
}
