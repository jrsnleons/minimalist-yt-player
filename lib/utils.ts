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
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Parse an ISO 8601 duration string (e.g. "PT1H2M3S") to seconds.
 * Used by YouTube Data API v3 responses.
 */
export function parseISO8601Duration(duration: string | undefined | null): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? '0', 10);
  const m = parseInt(match[2] ?? '0', 10);
  const s = parseInt(match[3] ?? '0', 10);
  return h * 3600 + m * 60 + s;
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

/** Generate a unique UUID with fallback */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Estimate IndexedDB storage usage in MB */
export async function estimateStorageMB(): Promise<number> {
  if (!navigator.storage?.estimate) return 0;
  const { usage = 0 } = await navigator.storage.estimate();
  return Math.round((usage / (1024 * 1024)) * 100) / 100;
}

/**
 * Strips bloated query strings and tracking tokens from YouTube & CDN thumbnails.
 * Converts 200+ char URLs (e.g. ?sqp=...&rs=...) into clean ~44 char URLs:
 * https://i.ytimg.com/vi/{videoId}/hqdefault.jpg
 */
export function cleanThumbnailUrl(url?: string | null, videoId?: string): string {
  if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }
  if (!url) return '';
  if (url.includes('ytimg.com/vi/')) {
    const match = url.match(/ytimg\.com\/vi\/([a-zA-Z0-9_-]{11})/);
    if (match) {
      return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }
  return url.split('?')[0] || url;
}
