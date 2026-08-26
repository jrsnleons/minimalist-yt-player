'use client';

import Image from 'next/image';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TransportControls } from './TransportControls';
import { CustomScrubber } from './CustomScrubber';
import { VolumeSlider } from './VolumeSlider';

export function PlayerHero() {
  const { currentTrack } = usePlayerStore();

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-600 min-h-64">
        <div className="w-32 h-32 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <span className="text-4xl text-zinc-700 select-none">♫</span>
        </div>
        <p className="text-sm font-medium text-zinc-400">Search for a track to begin</p>
        <p className="text-xs text-zinc-600">
          Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono-time">⌘K</kbd> to search tracks or library
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8 max-w-lg mx-auto">
      {/* Album Art */}
      <div className="relative w-52 h-52 rounded-xl overflow-hidden shadow-2xl bg-zinc-900 border border-zinc-800 shrink-0">
        {currentTrack.thumbnailUrl ? (
          <Image
            src={currentTrack.thumbnailUrl}
            alt={`${currentTrack.title} artwork`}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">
            <span className="text-5xl">♫</span>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="text-center w-full">
        <h2
          className="text-base font-semibold text-white truncate"
          title={currentTrack.title}
        >
          {currentTrack.title}
        </h2>
        <p
          className="text-sm text-zinc-400 truncate mt-1"
          title={currentTrack.artist}
        >
          {currentTrack.artist}
        </p>
      </div>

      {/* Scrubber */}
      <CustomScrubber className="w-full" />

      {/* Transport Controls */}
      <TransportControls className="justify-center" />

      {/* Volume */}
      <VolumeSlider className="justify-center" />
    </div>
  );
}
