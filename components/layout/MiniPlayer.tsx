'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { TransportControls } from '@/components/player/TransportControls';
import { CustomScrubber } from '@/components/player/CustomScrubber';
import { VolumeSlider } from '@/components/player/VolumeSlider';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { Shuffle, Repeat, Repeat1, Video, VideoOff } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

export function MiniPlayer() {
  const {
    currentTrack,
    shuffleMode,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    isVideoEnabled,
    toggleVideo,
    playbackMode,
  } = usePlayerStore();

  const repeatLabel =
    repeatMode === 'off' ? 'Repeat off (R)' : repeatMode === 'all' ? 'Repeat all (R)' : 'Repeat one (R)';
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  return (
    <footer
      className="flex items-center justify-between px-5 h-[76px] border-t border-[#27272a] bg-[#0c0c0f] shrink-0 select-none z-40 relative shadow-2xl"
      aria-label="Mini player"
    >
      {/* Left Column: Track Artwork + Info */}
      <div className="flex items-center gap-3 w-72 min-w-0 shrink-0">
        <TrackArtwork track={currentTrack} size="md" rounded="lg" />

        {currentTrack ? (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate" title={currentTrack.title}>
              {currentTrack.title}
            </p>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5" title={currentTrack.artist}>
              {currentTrack.artist}
            </p>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-400">No active track</p>
            <p className="text-[10px] text-zinc-600">Select a song to play</p>
          </div>
        )}
      </div>

      {/* Center Column: Primary Transport + High-Precision Scrubber */}
      <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0 max-w-2xl px-6">
        <TransportControls compact />
        <CustomScrubber compact className="w-full" />
      </div>

      {/* Right Column: Secondary Actions + Volume Slider */}
      <div className="w-72 shrink-0 flex items-center justify-end gap-3">
        {/* Shuffle */}
        <Tooltip content={`${shuffleMode ? 'Shuffle on' : 'Shuffle off'} (S)`} side="top">
          <button
            onClick={toggleShuffle}
            aria-label={shuffleMode ? 'Disable shuffle' : 'Enable shuffle'}
            aria-pressed={shuffleMode}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              shuffleMode ? 'text-white bg-[#27272a]' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <Shuffle size={14} />
          </button>
        </Tooltip>

        {/* Repeat */}
        <Tooltip content={repeatLabel} side="top">
          <button
            onClick={cycleRepeat}
            aria-label={repeatLabel}
            aria-pressed={repeatMode !== 'off'}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              repeatMode !== 'off' ? 'text-white bg-[#27272a]' : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <RepeatIcon size={14} />
          </button>
        </Tooltip>

        {/* Video PiP */}
        {playbackMode === 'iframe' && (
          <Tooltip content={`${isVideoEnabled ? 'Hide video' : 'Show video PiP'} (V)`} side="top">
            <button
              onClick={toggleVideo}
              aria-label={isVideoEnabled ? 'Hide video' : 'Show video PiP'}
              aria-pressed={isVideoEnabled}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isVideoEnabled ? 'text-white bg-[#27272a]' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {isVideoEnabled ? <Video size={14} /> : <VideoOff size={14} />}
            </button>
          </Tooltip>
        )}

        <div className="h-4 w-px bg-[#27272a] mx-0.5" />

        <VolumeSlider />
      </div>
    </footer>
  );
}
