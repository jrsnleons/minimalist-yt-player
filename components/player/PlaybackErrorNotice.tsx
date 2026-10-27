'use client';

import { AlertCircle } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';

/**
 * Inline message shown when the current song fails to load or play.
 * Reads `playbackError` from the store (mirrored from engine toasts); engines are not touched.
 */
export function PlaybackErrorNotice({ variant, className }: { variant: 'bar' | 'sheet'; className?: string }) {
  const error = usePlayerStore((s) => s.playbackError);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const next = usePlayerStore((s) => s.next);
  const clearPlaybackError = usePlayerStore((s) => s.clearPlaybackError);
  const retryCurrentTrack = usePlayerStore((s) => s.retryCurrentTrack);

  if (!error || !currentTrack || error.trackId !== currentTrack.id) return null;

  const btn =
    'px-3 min-h-[36px] rounded-lg text-sm font-medium transition-colors cursor-pointer shrink-0';

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-2 text-sm text-zinc-100',
        variant === 'bar'
          ? 'absolute bottom-full left-0 right-0 px-4 py-1 bg-[#1d1d23] border-t border-white/[0.14]'
          : 'rounded-[10px] bg-[#1d1d23] pl-3 pr-1 py-1 flex-wrap',
        className
      )}
    >
      <AlertCircle size={16} className="text-rose-300 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">Can&apos;t play this song. {error.message}.</span>
      <button
        type="button"
        onClick={() => {
          clearPlaybackError();
          next();
        }}
        className={cn(btn, 'text-zinc-100 hover:bg-white/[0.1]')}
      >
        Skip
      </button>
      <button type="button" onClick={retryCurrentTrack} className={cn(btn, 'bg-[#f4f4f6] text-[#0b0b0e] font-semibold hover:bg-white')}>
        Try Again
      </button>
    </div>
  );
}
