/**
 * Single source of truth for keyboard shortcuts.
 * useHotkeys, tooltips and the shortcuts modal all read from here.
 */

export type ShortcutId =
  | 'playPause'
  | 'seekBack10'
  | 'seekForward10'
  | 'seekBack5'
  | 'seekForward5'
  | 'next'
  | 'previous'
  | 'shuffle'
  | 'repeat'
  | 'mute'
  | 'video'
  | 'focus'
  | 'panel'
  | 'help'
  | 'palette'
  | 'close';

export interface ShortcutDef {
  id: ShortcutId;
  /** Event keys that trigger the action (matched case-insensitively for letters). */
  keys: string[];
  /** Labels shown in the UI. */
  display: string[];
  label: string;
  group: 'Playback' | 'Display & Navigation';
  /** Not handled by the single-key handler (modifier combos, Escape). */
  special?: boolean;
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: 'playPause', keys: [' ', 'k'], display: ['Space', 'K'], label: 'Play / Pause', group: 'Playback' },
  { id: 'seekBack10', keys: ['j'], display: ['J'], label: 'Seek Back 10s', group: 'Playback' },
  { id: 'seekForward10', keys: ['l'], display: ['L'], label: 'Seek Forward 10s', group: 'Playback' },
  { id: 'seekBack5', keys: ['ArrowLeft'], display: ['←'], label: 'Seek Back 5s', group: 'Playback' },
  { id: 'seekForward5', keys: ['ArrowRight'], display: ['→'], label: 'Seek Forward 5s', group: 'Playback' },
  { id: 'next', keys: ['n'], display: ['N'], label: 'Next Track', group: 'Playback' },
  { id: 'previous', keys: ['p'], display: ['P'], label: 'Previous Track', group: 'Playback' },
  { id: 'shuffle', keys: ['s'], display: ['S'], label: 'Shuffle', group: 'Playback' },
  { id: 'repeat', keys: ['r'], display: ['R'], label: 'Repeat', group: 'Playback' },
  { id: 'mute', keys: ['m'], display: ['M'], label: 'Mute', group: 'Playback' },
  { id: 'palette', keys: [], display: ['⌘K'], label: 'Search & Commands', group: 'Display & Navigation', special: true },
  { id: 'video', keys: ['v'], display: ['V'], label: 'Video / Artwork', group: 'Display & Navigation' },
  { id: 'focus', keys: ['z', 'f'], display: ['Z', 'F'], label: 'Focus Mode', group: 'Display & Navigation' },
  { id: 'panel', keys: ['q'], display: ['Q'], label: 'Now Playing Panel', group: 'Display & Navigation' },
  { id: 'help', keys: ['?'], display: ['?'], label: 'Keyboard Shortcuts', group: 'Display & Navigation' },
  { id: 'close', keys: [], display: ['Esc'], label: 'Close / Exit Focus', group: 'Display & Navigation', special: true },
];

export const SHORTCUT_GROUPS: ShortcutDef['group'][] = ['Playback', 'Display & Navigation'];

const byId = new Map(SHORTCUTS.map((s) => [s.id, s]));

export function getShortcut(id: ShortcutId): ShortcutDef {
  return byId.get(id)!;
}

/** Resolve a keyboard event key to a shortcut id (single-key shortcuts only). */
export function matchShortcut(key: string): ShortcutId | null {
  const lower = key.length === 1 ? key.toLowerCase() : key;
  for (const s of SHORTCUTS) {
    if (!s.special && s.keys.includes(lower)) return s.id;
  }
  return null;
}

/** Text appended to tooltips, e.g. "Pause (Space)". Pass the platform label for the palette key. */
export function tip(label: string, id: ShortcutId, paletteKey?: string): string {
  const def = getShortcut(id);
  const shown = id === 'palette' && paletteKey ? paletteKey : def.display[0];
  return `${label} (${shown})`;
}
