'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ListMusic, Radio, Music2, Search, Heart } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { CustomScrubber } from './CustomScrubber';
import { VolumeSlider } from './VolumeSlider';
import { TransportControls } from './TransportControls';
import { UpNext } from './UpNext';
import { PlaybackErrorNotice } from './PlaybackErrorNotice';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { AmbientVisualizer } from './AmbientVisualizer';
import { Tooltip } from '@/components/ui/Tooltip';
import { useDynamicTrackPalette } from '@/hooks/useDynamicTrackPalette';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { usePlatformShortcut } from '@/hooks/usePlatformShortcut';
import { tip } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';

/**
 * Full-screen player. On phones it is the Now Playing sheet (opened from the mini player);
 * on desktop it is Focus Mode. The artwork/video slot keeps the id the iframe engine looks for.
 */
export function ZenPlayerView() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const toggleZenMode = usePlayerStore((s) => s.toggleZenMode);
  const toggleCommandPalette = usePlayerStore((s) => s.toggleCommandPalette);
  const isLiked = usePlayerStore((s) => (currentTrack ? s.likedTrackIds.includes(currentTrack.id) : false));
  const toggleLikeTrack = usePlayerStore((s) => s.toggleLikeTrack);
  const isVideoEnabled = usePlayerStore((s) => s.isVideoEnabled);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const play = usePlayerStore((s) => s.play);
  const showToast = usePlayerStore((s) => s.showToast);

  const [showQueue, setShowQueue] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus Mode / Now Playing sheet: trap focus, close on Escape, return focus to the opener.
  useFocusTrap(containerRef, { initialFocus: containerRef, onEscape: () => toggleZenMode(false) });
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const paletteKey = usePlatformShortcut('⌘K');

  const palette = useDynamicTrackPalette(currentTrack);

  const nextTrack =
    queue.length > 0 && queueIndex >= 0 && queueIndex < queue.length - 1 ? queue[queueIndex + 1] : null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      role="dialog"
      aria-modal="true"
      aria-label={isDesktop ? 'Focus mode' : 'Now playing'}
      className="fixed inset-0 z-50 flex flex-col text-white overflow-hidden outline-none bg-[color-mix(in_oklab,var(--track-accent,#e9b44c)_14%,#0b0b0e)]"
      style={{
        ['--track-accent' as string]: palette.accent,
      }}
    >
      {/* Restrained ambient layer (desktop focus mode only) */}
      {isDesktop && (
        <AmbientVisualizer
          mode="fullscreen"
          accentColor={palette.accent}
          secondaryColor={palette.secondary}
          blurAmount="blur-3xl"
          className="absolute inset-0 z-0 pointer-events-none opacity-25"
        />
      )}

      <header className="relative z-10 flex items-center justify-between px-3 sm:px-6 pt-[max(8px,env(safe-area-inset-top))] pb-2 min-h-14">
        <Tooltip content={tip('Close', 'focus')} side="bottom">
          <button
            onClick={() => toggleZenMode(false)}
            aria-label="Close"
            className="w-11 h-11 rounded-full flex items-center justify-center text-zinc-200 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
          >
            <ChevronDown size={24} />
          </button>
        </Tooltip>

        <h2 className="text-sm font-semibold text-zinc-100">{isDesktop ? 'Focus Mode' : 'Now Playing'}</h2>

        <div className="flex items-center">
          <Tooltip content={`Search (${paletteKey})`} side="bottom">
            <button
              onClick={toggleCommandPalette}
              aria-label="Search"
              className="w-11 h-11 rounded-full flex items-center justify-center text-zinc-200 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
            >
              <Search size={20} />
            </button>
          </Tooltip>
          <Tooltip content="Queue" side="bottom">
            <button
              onClick={() => setShowQueue((v) => !v)}
              aria-label="Queue"
              aria-pressed={showQueue}
              className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer',
                showQueue
                  ? 'text-[var(--track-accent,#e9b44c)]'
                  : 'text-zinc-200 hover:text-white hover:bg-white/[0.1]'
              )}
            >
              <ListMusic size={20} />
            </button>
          </Tooltip>
        </div>
      </header>

      <main className="relative z-10 flex-1 min-h-0 overflow-y-auto">
        {showQueue ? (
          <div className="max-w-xl mx-auto w-full px-5 pb-8">
            <UpNext />
          </div>
        ) : currentTrack ? (
          <div className="min-h-full max-w-md mx-auto w-full px-6 pb-[max(24px,env(safe-area-inset-bottom))] flex flex-col justify-center gap-5">
            <div className="flex items-center justify-center">
              <div
                id="zen-artwork-slot"
                className={cn(
                  'relative rounded-xl overflow-hidden bg-black shadow-2xl',
                  isVideoEnabled
                    ? 'w-[88vw] max-w-[560px] aspect-video'
                    : 'w-[min(78vw,340px)] md:w-[min(40vh,380px)] aspect-square'
                )}
              >
                <div
                  className={cn(
                    'w-full h-full',
                    isVideoEnabled ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  )}
                >
                  <TrackArtwork
                    track={currentTrack}
                    size="fill"
                    rounded="none"
                    priority={true}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 text-left">
                <MarqueeText
                  text={currentTrack.title}
                  subText={currentTrack.artist}
                  className="text-[22px] font-bold tracking-tight text-white"
                  subClassName="text-base text-zinc-300 mt-0.5"
                />
              </div>
              <Tooltip content={isLiked ? 'Remove from Liked' : 'Add to Liked'} side="left">
                <button
                  onClick={() => toggleLikeTrack(currentTrack)}
                  aria-label="Like"
                  aria-pressed={isLiked}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer',
                    isLiked
                      ? 'text-[var(--track-accent,#e9b44c)]'
                      : 'text-zinc-300 hover:text-white hover:bg-white/[0.1]'
                  )}
                >
                  <Heart size={24} className={isLiked ? 'fill-current' : ''} />
                </button>
              </Tooltip>
            </div>

            <PlaybackErrorNotice variant="sheet" />

            <CustomScrubber stacked accentColor={palette.accent} />

            <TransportControls size={isDesktop ? 'zen' : 'sheet'} withVideo className="justify-center" />

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.1]">
              <VolumeSlider size="md" showLabel={false} accentColor={palette.accent} className="hidden sm:flex" />
              <p className="text-[13px] text-zinc-300 truncate ml-auto">
                {nextTrack ? (
                  <>
                    <span className="text-zinc-400">Next: </span>
                    {nextTrack.title}
                  </>
                ) : (
                  <span className="text-zinc-400">End of queue</span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-full">
            <div className="w-16 h-16 rounded-xl bg-white/[0.06] flex items-center justify-center mb-4 text-zinc-300">
              <Music2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Nothing Playing</h3>
            <p className="text-sm text-zinc-300 max-w-sm mt-1 mb-6">
              Search for a song or start a radio to listen without distractions.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={toggleCommandPalette}
                className="flex items-center gap-2 px-4 min-h-[44px] rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <Search size={16} />
                <span>Search</span>
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/search?q=lofi+chill+beats+focus');
                    const data = await res.json();
                    if (data.results?.length > 0) {
                      play(data.results[0], data.results);
                      showToast('Started Focus Radio');
                    }
                  } catch {
                    showToast('Could not start radio');
                  }
                }}
                className="flex items-center gap-2 px-4 min-h-[44px] rounded-lg border border-white/20 text-zinc-100 text-sm font-medium hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <Radio size={16} />
                <span>Start Focus Radio</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </motion.div>
  );
}
