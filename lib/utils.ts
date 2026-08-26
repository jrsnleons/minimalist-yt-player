import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format seconds into m:ss or h:mm:ss string.
 * Uses JetBrains Mono font class in components.
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Filter tracks by duration: keep 60s–600s */
export function isValidTrackDuration(seconds: number): boolean {
  return seconds >= 60 && seconds <= 600;
}

/**
 * Instrumental-only filter for radio suggestions.
 * Exclude: feat., Official Music Video, Lyric Video, MV
 * Prioritize: Lofi, Ambient, OST, Instrumental, Remix, Study, Focus
 */
const EXCLUDE_PATTERNS = /feat\.|official music video|lyric video|\bMV\b/i;
const PRIORITY_PATTERNS = /lofi|lo-fi|ambient|ost|instrumental|remix|study|focus/i;

export function filterInstrumental(title: string): 'exclude' | 'priority' | 'neutral' {
  if (EXCLUDE_PATTERNS.test(title)) return 'exclude';
  if (PRIORITY_PATTERNS.test(title)) return 'priority';
  return 'neutral';
}

/** Debounce helper */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Generate a cryptographically random UUID */
export function uuid(): string {
  return crypto.randomUUID();
}

/** Estimate IndexedDB storage usage in MB */
export async function estimateStorageMB(): Promise<number> {
  if (!navigator.storage?.estimate) return 0;
  const { usage = 0 } = await navigator.storage.estimate();
  return Math.round((usage / (1024 * 1024)) * 100) / 100;
}
