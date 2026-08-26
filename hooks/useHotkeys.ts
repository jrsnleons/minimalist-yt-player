'use client';

import { useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';

const SEEK_LARGE = 10;
const SEEK_SMALL = 5;

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    (el as HTMLElement).isContentEditable
  );
}

export function useHotkeys() {
  const {
    togglePlay,
    next,
    previous,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleVideo,
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleCommandPalette,
    seek,
    progress,
    commandPaletteOpen,
  } = usePlayerStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Let Cmd+K / Ctrl+K through always
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Escape: close command palette
      if (e.key === 'Escape' && commandPaletteOpen) {
        toggleCommandPalette();
        return;
      }

      // All single-key shortcuts are disabled when in a text input
      if (isInputFocused()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlay();
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          seek(Math.max(0, progress - SEEK_LARGE));
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          seek(progress + SEEK_LARGE);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(Math.max(0, progress - SEEK_SMALL));
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(progress + SEEK_SMALL);
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          next();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          previous();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'v':
        case 'V':
          e.preventDefault();
          toggleVideo();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          toggleShuffle();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          cycleRepeat();
          break;
        case '[':
          e.preventDefault();
          toggleLeftSidebar();
          break;
        case ']':
          e.preventDefault();
          toggleRightSidebar();
          break;
        default:
          break;
      }
    },
    [
      togglePlay, next, previous, toggleMute, toggleShuffle, cycleRepeat,
      toggleVideo, toggleLeftSidebar, toggleRightSidebar, toggleCommandPalette,
      seek, progress, commandPaletteOpen,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
