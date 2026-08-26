'use client';

import { useState } from 'react';
import Image from 'next/image';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TransportControls } from './TransportControls';
import { CustomScrubber } from './CustomScrubber';
import { VolumeSlider } from './VolumeSlider';
import { Search, Sparkles, Music2, Loader2 } from 'lucide-react';
import type { Track } from '@/types';

// Fallback playable verified tracks if offline
const EVERGREEN_RADIO_TRACKS: Track[] = [
  {
    id: '5qap5aO4i9A',
    title: 'Lofi Hip Hop Radio — Beats to Relax/Study to',
    artist: 'Lofi Girl / ChilledCow Records',
    duration: 180,
    thumbnailUrl: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
    addedAt: Date.now(),
  },
  {
    id: 'TURbeWK2wwg',
    title: 'Night Coffee — Cozy Jazz & Chill Beats',
    artist: 'Coffee Shop Vibes',
    duration: 210,
    thumbnailUrl: 'https://i.ytimg.com/vi/TURbeWK2wwg/hqdefault.jpg',
    addedAt: Date.now(),
  },
  {
    id: 'lTRiuFIWV54',
    title: 'Chillhop Yearmix — Instrumental Beats',
    artist: 'Chillhop Music',
    duration: 240,
    thumbnailUrl: 'https://i.ytimg.com/vi/lTRiuFIWV54/hqdefault.jpg',
    addedAt: Date.now(),
  },
];

export function PlayerHero() {
  const { currentTrack, toggleCommandPalette, play, showToast } = usePlayerStore();
  const [isStartingRadio, setIsStartingRadio] = useState(false);

  const handleQuickStartRadio = async () => {
    setIsStartingRadio(true);
    try {
      const res = await fetch('/api/search?q=lofi+chill+beats+focus');
      const data = await res.json();
      const results: Track[] = data.results ?? [];

      if (results.length > 0) {
        play(results[0], results);
        showToast('Started Focus & Lofi Radio (10+ tracks queued)');
      } else {
        throw new Error('No tracks found');
      }
    } catch {
      // Fallback to verified evergreen tracks
      play(EVERGREEN_RADIO_TRACKS[0], EVERGREEN_RADIO_TRACKS);
      showToast('Started Chillout Focus Radio');
    } finally {
      setIsStartingRadio(false);
    }
  };

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-[#27272a] bg-[#121216]/90 backdrop-blur-sm shadow-md">
        <div className="w-14 h-14 rounded-2xl bg-[#1e1e26] border border-zinc-700/60 flex items-center justify-center mb-3 text-zinc-300 shadow-inner">
          <Music2 size={28} />
        </div>
        <h2 className="text-base font-bold text-white tracking-tight">Focus & Minimalist Listening</h2>
        <p className="text-xs text-zinc-400 max-w-md mt-1 leading-relaxed">
          Zero algorithmic bloat, no comments, no ads. Search any song, curate playlists, or import YouTube playlists.
        </p>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={toggleCommandPalette}
            aria-label="Open Command Palette"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-md"
          >
            <Search size={14} />
            <span>Search YouTube</span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 font-mono-time text-[10px]">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={handleQuickStartRadio}
            disabled={isStartingRadio}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#2e2e38] bg-[#181820] text-zinc-200 text-xs font-medium hover:bg-[#24242e] hover:border-zinc-600 transition-colors disabled:opacity-50"
          >
            {isStartingRadio ? (
              <Loader2 size={13} className="animate-spin text-amber-300" />
            ) : (
              <Sparkles size={13} className="text-amber-300" />
            )}
            <span>{isStartingRadio ? 'Starting Radio…' : 'Quick Start Radio'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl border border-[#27272a] bg-[#121216] shadow-xl">
      <div className="flex flex-col md:flex-row items-center gap-5">
        {/* Album Artwork */}
        <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-xl overflow-hidden shadow-2xl bg-zinc-900 border border-zinc-700/60 shrink-0">
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
          <div className="min-w-0 mb-2 text-center md:text-left">
            <h2
              className="text-base md:text-lg font-bold text-white tracking-tight truncate"
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
