'use client';

import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Video, VideoOff,
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

interface TransportControlsProps {
  className?: string;
  compact?: boolean;
}

export function TransportControls({ className, compact = false }: TransportControlsProps) {
  const {
    isPlaying, togglePlay, next, previous,
    shuffleMode, toggleShuffle,
    repeatMode, cycleRepeat,
    isVideoEnabled, toggleVideo,
    playbackMode, currentTrack,
  } = usePlayerStore();

  const repeatLabel =
    repeatMode === 'off' ? 'Repeat off (R)' : repeatMode === 'all' ? 'Repeat all (R)' : 'Repeat one (R)';
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  return (
    <div className={cn('flex items-center gap-1.5 select-none', className)}>
      {/* Shuffle */}
      {!compact && (
        <Tooltip content={`${shuffleMode ? 'Shuffle on' : 'Shuffle off'} (S)`} side="top">
          <button
            onClick={toggleShuffle}
            aria-label={shuffleMode ? 'Disable shuffle' : 'Enable shuffle'}
            aria-pressed={shuffleMode}
            className={cn(
              'p-2 rounded-lg transition-colors',
              shuffleMode
                ? 'text-white bg-[#27272a]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#18181f]'
            )}
          >
            <Shuffle size={15} />
          </button>
        </Tooltip>
      )}

      {/* Previous */}
      <Tooltip content="Previous (P)" side="top">
        <button
          onClick={previous}
          aria-label="Previous track"
          disabled={!currentTrack}
          className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-[#18181f] disabled:text-zinc-700 disabled:hover:bg-transparent transition-colors"
        >
          <SkipBack size={compact ? 15 : 18} />
        </button>
      </Tooltip>

      {/* Play / Pause Primary Button */}
      <Tooltip content={`${isPlaying ? 'Pause' : 'Play'} (Space)`} side="top">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          disabled={!currentTrack}
          className={cn(
            'rounded-full transition-all flex items-center justify-center shadow-md active:scale-95',
            compact
              ? 'w-8 h-8 bg-white text-black hover:bg-zinc-200 disabled:opacity-40'
              : 'w-11 h-11 bg-white text-black hover:bg-zinc-200 disabled:opacity-40'
          )}
        >
          {isPlaying ? (
            <Pause size={compact ? 15 : 20} fill="currentColor" />
          ) : (
            <Play size={compact ? 15 : 20} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </Tooltip>

      {/* Next */}
      <Tooltip content="Next (N)" side="top">
        <button
          onClick={next}
          aria-label="Next track"
          disabled={!currentTrack}
          className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-[#18181f] disabled:text-zinc-700 disabled:hover:bg-transparent transition-colors"
        >
          <SkipForward size={compact ? 15 : 18} />
        </button>
      </Tooltip>

      {/* Repeat */}
      {!compact && (
        <Tooltip content={repeatLabel} side="top">
          <button
            onClick={cycleRepeat}
            aria-label={repeatLabel}
            aria-pressed={repeatMode !== 'off'}
            className={cn(
              'p-2 rounded-lg transition-colors',
              repeatMode !== 'off'
                ? 'text-white bg-[#27272a]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#18181f]'
            )}
          >
            <RepeatIcon size={15} />
          </button>
        </Tooltip>
      )}

      {/* Video PiP toggle */}
      {!compact && playbackMode === 'iframe' && (
        <Tooltip content={`${isVideoEnabled ? 'Hide video' : 'Show video PiP'} (V)`} side="top">
          <button
            onClick={toggleVideo}
            aria-label={isVideoEnabled ? 'Hide video' : 'Show video PiP'}
            aria-pressed={isVideoEnabled}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isVideoEnabled
                ? 'text-white bg-[#27272a]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#18181f]'
            )}
          >
            {isVideoEnabled ? <Video size={15} /> : <VideoOff size={15} />}
          </button>
        </Tooltip>
      )}
    </div>
  );
}
