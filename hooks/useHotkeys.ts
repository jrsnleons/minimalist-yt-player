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
    tag === 'select' ||
    (el as HTMLElement).isContentEditable ||
    el.getAttribute('role') === 'textbox' ||
    el.getAttribute('role') === 'combobox'
  );
}

export function useHotkeys() {
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const toggleVideo = usePlayerStore((s) => s.toggleVideo);
  const toggleLeftSidebar = usePlayerStore((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = usePlayerStore((s) => s.toggleRightSidebar);
  const toggleCommandPalette = usePlayerStore((s) => s.toggleCommandPalette);
  const toggleZenMode = usePlayerStore((s) => s.toggleZenMode);
  const seek = usePlayerStore((s) => s.seek);
  const commandPaletteOpen = usePlayerStore((s) => s.commandPaletteOpen);
  const zenMode = usePlayerStore((s) => s.zenMode);

  // NOTE: `progress` is intentionally NOT subscribed here.
  // Instead, read progress at call-time via getState() to avoid 60fps churn.

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Let Cmd+K / Ctrl+K through always
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Escape: close command palette, or exit Zen mode
      if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          toggleCommandPalette();
          return;
        }
        if (zenMode) {
          toggleZenMode(false);
          return;
        }
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
          seek(Math.max(0, usePlayerStore.getState().progress - SEEK_LARGE));
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          seek(usePlayerStore.getState().progress + SEEK_LARGE);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(Math.max(0, usePlayerStore.getState().progress - SEEK_SMALL));
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(usePlayerStore.getState().progress + SEEK_SMALL);
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
        case 'z':
        case 'Z':
        case 'f':
        case 'F':
          e.preventDefault();
          toggleZenMode();
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
      toggleZenMode,
      seek,
      commandPaletteOpen,
      zenMode,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
