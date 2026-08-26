'use client';

import Image from 'next/image';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TransportControls } from './TransportControls';
import { CustomScrubber } from './CustomScrubber';
import { VolumeSlider } from './VolumeSlider';
import { Search, Sparkles, Music2 } from 'lucide-react';

export function PlayerHero() {
  const { currentTrack, toggleCommandPalette, play } = usePlayerStore();

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center my-4 mx-6 rounded-2xl border border-[#27272a] bg-[#121216]/80 backdrop-blur-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#1e1e26] border border-zinc-700/60 flex items-center justify-center mb-4 text-zinc-300 shadow-inner">
          <Music2 size={32} />
        </div>
        <h2 className="text-lg font-semibold text-white tracking-tight">Focus & Minimalist Listening</h2>
        <p className="text-xs text-zinc-400 max-w-md mt-1.5 leading-relaxed">
          Zero algorithmic bloat, no comments, no ads. Search any song or artist, or curate your offline playlists.
        </p>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={toggleCommandPalette}
            aria-label="Open Command Palette"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-md"
          >
            <Search size={14} />
            <span>Search YouTube</span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 font-mono-time text-[10px]">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => {
              play({
                id: 'jfKfPfyJRdk',
                title: 'lofi hip hop radio - beats to relax/study to',
                artist: 'Lofi Girl',
                duration: 240,
                thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
                addedAt: Date.now(),
              });
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#2e2e38] bg-[#1a1a20] text-zinc-200 text-xs font-medium hover:bg-[#25252e] hover:border-zinc-600 transition-colors"
          >
            <Sparkles size={13} className="text-amber-300" />
            <span>Quick Start Radio</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-6 my-4 p-6 rounded-2xl border border-[#27272a] bg-[#121216] shadow-xl">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Album Artwork */}
        <div className="relative w-36 h-36 md:w-40 md:h-40 rounded-xl overflow-hidden shadow-2xl bg-zinc-900 border border-zinc-700/60 shrink-0">
          {currentTrack.thumbnailUrl ? (
            <Image
              src={currentTrack.thumbnailUrl}
              alt={`${currentTrack.title} artwork`}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-700 text-3xl">♫</div>
          )}
        </div>

        {/* Center/Right Details and Controls */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full w-full">
          {/* Track Titles */}
          <div className="min-w-0 mb-3 text-center md:text-left">
            <h2
              className="text-lg md:text-xl font-bold text-white tracking-tight truncate"
              title={currentTrack.title}
            >
              {currentTrack.title}
            </h2>
            <p
              className="text-xs md:text-sm text-zinc-400 font-medium truncate mt-0.5"
              title={currentTrack.artist}
            >
              {currentTrack.artist}
            </p>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="w-full my-1">
            <CustomScrubber className="w-full" />
          </div>

          {/* Bottom Bar inside Hero: Controls on left, Volume on right */}
          <div className="flex items-center justify-between mt-2 pt-1">
            <TransportControls />
            <VolumeSlider />
          </div>
        </div>
      </div>
    </div>
  );
}
