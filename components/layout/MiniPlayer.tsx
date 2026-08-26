'use client';

import Image from 'next/image';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TransportControls } from '@/components/player/TransportControls';
import { CustomScrubber } from '@/components/player/CustomScrubber';
import { VolumeSlider } from '@/components/player/VolumeSlider';

export function MiniPlayer() {
  const { currentTrack } = usePlayerStore();

  return (
    <footer
      className="flex items-center gap-4 px-4 h-[72px] border-t border-zinc-800 bg-zinc-900/90 backdrop-blur-md shrink-0 select-none z-40"
      aria-label="Mini player"
    >
      {/* Track info */}
      <div className="flex items-center gap-3 w-64 shrink-0">
        <div className="relative w-11 h-11 rounded-md overflow-hidden bg-zinc-800 border border-zinc-700/50 shrink-0">
          {currentTrack?.thumbnailUrl ? (
            <Image src={currentTrack.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-700">
              <span className="text-lg">♫</span>
            </div>
          )}
        </div>
        {currentTrack ? (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate" title={currentTrack.title}>
              {currentTrack.title}
            </p>
            <p className="text-xs text-zinc-400 truncate mt-0.5" title={currentTrack.artist}>
              {currentTrack.artist}
            </p>
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nothing playing</p>
        )}
      </div>

      {/* Center: Controls + Scrubber */}
      <div className="flex-1 flex flex-col items-center gap-1 min-w-0 max-w-xl mx-auto">
        <TransportControls compact />
        <CustomScrubber compact className="w-full" />
      </div>

      {/* Volume */}
      <div className="w-64 shrink-0 flex justify-end">
        <VolumeSlider />
      </div>
    </footer>
  );
}
