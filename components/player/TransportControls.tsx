'use client';

import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Video, VideoOff,
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { usePlaybackLock } from '@/hooks/usePlaybackLock';
import { Tooltip } from '@/components/ui/Tooltip';
import { tip } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';

export type TransportSize = 'bar' | 'sheet' | 'zen';

interface TransportControlsProps {
  /** bar: 40px play. sheet and zen: 64px play, 48px skip. */
  size?: TransportSize;
  /** Show the video/artwork toggle in the row (sheet and zen). */
  withVideo?: boolean;
  className?: string;
}

const SIZES: Record<
  TransportSize,
  { play: string; skip: string; toggle: string; playIcon: number; skipIcon: number; toggleIcon: number; gap: string }
> = {
  bar: { play: 'w-10 h-10', skip: 'w-9 h-9', toggle: 'w-9 h-9', playIcon: 18, skipIcon: 18, toggleIcon: 16, gap: 'gap-2' },
  sheet: { play: 'w-16 h-16', skip: 'w-12 h-12', toggle: 'w-11 h-11', playIcon: 28, skipIcon: 24, toggleIcon: 20, gap: 'gap-1 justify-between w-full' },
  zen: { play: 'w-16 h-16', skip: 'w-12 h-12', toggle: 'w-11 h-11', playIcon: 28, skipIcon: 24, toggleIcon: 20, gap: 'gap-4 sm:gap-6' },
};

export function TransportControls({ size = 'bar', withVideo = false, className }: TransportControlsProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const shuffleMode = usePlayerStore((s) => s.shuffleMode);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const isVideoEnabled = usePlayerStore((s) => s.isVideoEnabled);
  const toggleVideo = usePlayerStore((s) => s.toggleVideo);
  const playbackMode = usePlayerStore((s) => s.playbackMode);
  const hasCurrentTrack = usePlayerStore((s) => !!s.currentTrack);
  const showToast = usePlayerStore((s) => s.showToast);

  const locked = usePlaybackLock();

  const dim = SIZES[size];
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;
  const repeatName = repeatMode === 'one' ? 'Repeat one' : repeatMode === 'all' ? 'Repeat all' : 'Repeat';

  const guard = (action: () => void) => () => {
    if (locked) {
      showToast('DJ is controlling playback');
      return;
    }
    action();
  };

  const lockedTip = (label: string, id: Parameters<typeof tip>[1]) =>
    locked ? 'DJ controls playback' : tip(label, id);

  const toggleClass = (active: boolean) =>
    cn(
      'relative rounded-full flex items-center justify-center transition-colors cursor-pointer select-none',
      dim.toggle,
      active
        ? 'text-[var(--track-accent,#e9b44c)]'
        : 'text-zinc-400 hover:text-white hover:bg-white/[0.08]'
    );

  const skipClass = cn(
    'rounded-full flex items-center justify-center text-zinc-200 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer select-none disabled:text-zinc-600 disabled:hover:bg-transparent disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:cursor-not-allowed',
    dim.skip
  );

  const dot = (active: boolean) =>
    active ? (
      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-current" aria-hidden="true" />
    ) : null;

  return (
    <div className={cn('flex items-center', dim.gap, className)}>
      <Tooltip content={tip(shuffleMode ? 'Shuffle on' : 'Shuffle off', 'shuffle')} side="top">
        <button
          onClick={toggleShuffle}
          aria-label="Shuffle"
          aria-pressed={shuffleMode}
          className={toggleClass(shuffleMode)}
        >
          <Shuffle size={dim.toggleIcon} />
          {dot(shuffleMode)}
        </button>
      </Tooltip>

      <Tooltip content={lockedTip('Previous', 'previous')} side="top">
        <button
          onClick={guard(previous)}
          aria-label="Previous"
          aria-disabled={locked || undefined}
          disabled={!hasCurrentTrack}
          className={skipClass}
        >
          <SkipBack size={dim.skipIcon} fill="currentColor" />
        </button>
      </Tooltip>

      <Tooltip content={lockedTip(isPlaying ? 'Pause' : 'Play', 'playPause')} side="top">
        <button
          onClick={guard(togglePlay)}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-disabled={locked || undefined}
          disabled={!hasCurrentTrack}
          className={cn(
            'rounded-full bg-[#f4f4f6] text-[#0b0b0e] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer select-none shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 aria-disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:hover:scale-100',
            dim.play
          )}
        >
          {isPlaying ? (
            <Pause size={dim.playIcon} fill="currentColor" />
          ) : (
            <Play size={dim.playIcon} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </Tooltip>

      <Tooltip content={lockedTip('Next', 'next')} side="top">
        <button
          onClick={guard(next)}
          aria-label="Next"
          aria-disabled={locked || undefined}
          disabled={!hasCurrentTrack}
          className={skipClass}
        >
          <SkipForward size={dim.skipIcon} fill="currentColor" />
        </button>
      </Tooltip>

      <Tooltip content={tip(repeatMode === 'off' ? 'Repeat off' : repeatName, 'repeat')} side="top">
        <button
          onClick={cycleRepeat}
          aria-label={repeatName}
          aria-pressed={repeatMode !== 'off'}
          className={toggleClass(repeatMode !== 'off')}
        >
          <RepeatIcon size={dim.toggleIcon} />
          {dot(repeatMode !== 'off')}
        </button>
      </Tooltip>

      {withVideo && playbackMode === 'iframe' && (
        <Tooltip content={tip(isVideoEnabled ? 'Show artwork' : 'Show video', 'video')} side="top">
          <button
            onClick={toggleVideo}
            aria-label="Video"
            aria-pressed={isVideoEnabled}
            className={toggleClass(isVideoEnabled)}
          >
            {isVideoEnabled ? <Video size={dim.toggleIcon} /> : <VideoOff size={dim.toggleIcon} />}
            {dot(isVideoEnabled)}
          </button>
        </Tooltip>
      )}
    </div>
  );
}
