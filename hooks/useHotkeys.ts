'use client';

import { useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { matchShortcut } from '@/lib/shortcuts';

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
  const toggleCommandPalette = usePlayerStore((s) => s.toggleCommandPalette);
  const toggleZenMode = usePlayerStore((s) => s.toggleZenMode);
  const toggleSidebarPlayerMode = usePlayerStore((s) => s.toggleSidebarPlayerMode);
  const toggleShortcutsModal = usePlayerStore((s) => s.toggleShortcutsModal);
  const seek = usePlayerStore((s) => s.seek);
  const commandPaletteOpen = usePlayerStore((s) => s.commandPaletteOpen);
  const shortcutsModalOpen = usePlayerStore((s) => s.shortcutsModalOpen);
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

      // Escape: close shortcuts modal, close command palette, or exit Zen mode
      if (e.key === 'Escape') {
        if (shortcutsModalOpen) {
          toggleShortcutsModal(false);
          return;
        }
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

      const action = matchShortcut(e.key);
      if (!action) return;
      e.preventDefault();

      switch (action) {
        case 'playPause':
          togglePlay();
          break;
        case 'seekBack10':
          seek(Math.max(0, usePlayerStore.getState().progress - SEEK_LARGE));
          break;
        case 'seekForward10':
          seek(usePlayerStore.getState().progress + SEEK_LARGE);
          break;
        case 'seekBack5':
          seek(Math.max(0, usePlayerStore.getState().progress - SEEK_SMALL));
          break;
        case 'seekForward5':
          seek(usePlayerStore.getState().progress + SEEK_SMALL);
          break;
        case 'next':
          next();
          break;
        case 'previous':
          previous();
          break;
        case 'mute':
          toggleMute();
          break;
        case 'video':
          toggleVideo();
          break;
        case 'focus':
          toggleZenMode();
          break;
        case 'shuffle':
          toggleShuffle();
          break;
        case 'repeat':
          cycleRepeat();
          break;
        case 'panel':
          toggleSidebarPlayerMode();
          break;
        case 'help':
          toggleShortcutsModal();
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
      toggleCommandPalette,
      toggleZenMode,
      toggleSidebarPlayerMode,
      toggleShortcutsModal,
      seek,
      commandPaletteOpen,
      shortcutsModalOpen,
      zenMode,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
