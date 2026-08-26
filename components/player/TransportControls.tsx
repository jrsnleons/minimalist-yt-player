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

  const repeatLabel = repeatMode === 'off' ? 'Repeat off (R)' : repeatMode === 'all' ? 'Repeat all (R)' : 'Repeat one (R)';
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  const iconSize = compact ? 16 : 18;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Shuffle */}
      {!compact && (
        <Tooltip content={`${shuffleMode ? 'Shuffle on' : 'Shuffle off'} (S)`} side="top">
          <button
            onClick={toggleShuffle}
            aria-label={shuffleMode ? 'Disable shuffle' : 'Enable shuffle'}
            aria-pressed={shuffleMode}
            className={cn(
              'p-2 rounded transition-opacity',
              shuffleMode ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <Shuffle size={iconSize} />
          </button>
        </Tooltip>
      )}

      {/* Previous */}
      <Tooltip content="Previous (P)" side="top">
        <button
          onClick={previous}
          aria-label="Previous track"
          disabled={!currentTrack}
          className="p-2 rounded text-zinc-300 hover:text-white disabled:text-zinc-700 transition-opacity"
        >
          <SkipBack size={iconSize} />
        </button>
      </Tooltip>

      {/* Play / Pause */}
      <Tooltip content={`${isPlaying ? 'Pause' : 'Play'} (Space)`} side="top">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          disabled={!currentTrack}
          className={cn(
            'p-2 rounded-full transition-opacity',
            compact
              ? 'text-white hover:text-zinc-300 disabled:text-zinc-700'
              : 'bg-white text-black hover:bg-zinc-200 disabled:opacity-40 w-10 h-10 flex items-center justify-center'
          )}
        >
          {isPlaying
            ? <Pause size={compact ? iconSize : 20} fill="currentColor" />
            : <Play size={compact ? iconSize : 20} fill="currentColor" />
          }
        </button>
      </Tooltip>

      {/* Next */}
      <Tooltip content="Next (N)" side="top">
        <button
          onClick={next}
          aria-label="Next track"
          disabled={!currentTrack}
          className="p-2 rounded text-zinc-300 hover:text-white disabled:text-zinc-700 transition-opacity"
        >
          <SkipForward size={iconSize} />
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
              'p-2 rounded transition-opacity',
              repeatMode !== 'off' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <RepeatIcon size={iconSize} />
          </button>
        </Tooltip>
      )}

      {/* Video toggle — only in iframe mode */}
      {!compact && playbackMode === 'iframe' && (
        <Tooltip content={`${isVideoEnabled ? 'Hide video' : 'Show video'} (V)`} side="top">
          <button
            onClick={toggleVideo}
            aria-label={isVideoEnabled ? 'Hide video' : 'Show video PiP'}
            aria-pressed={isVideoEnabled}
            className={cn(
              'p-2 rounded transition-opacity',
              isVideoEnabled ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {isVideoEnabled ? <Video size={iconSize} /> : <VideoOff size={iconSize} />}
          </button>
        </Tooltip>
      )}
    </div>
  );
}
