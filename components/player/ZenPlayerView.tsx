'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Minimize2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Sparkles,
  Music2,
  Search,
  Heart,
  Video,
  VideoOff,
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { CustomScrubber } from './CustomScrubber';
import { VolumeSlider } from './VolumeSlider';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { AmbientVisualizer } from './AmbientVisualizer';
import { Tooltip } from '@/components/ui/Tooltip';
import { useDynamicTrackPalette } from '@/hooks/useDynamicTrackPalette';
import { cn } from '@/lib/utils';

export function ZenPlayerView() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const shuffleMode = usePlayerStore((s) => s.shuffleMode);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const toggleZenMode = usePlayerStore((s) => s.toggleZenMode);
  const toggleCommandPalette = usePlayerStore((s) => s.toggleCommandPalette);
  const isLiked = usePlayerStore((s) => (currentTrack ? s.likedTrackIds.includes(currentTrack.id) : false));
  const toggleLikeTrack = usePlayerStore((s) => s.toggleLikeTrack);
  const isVideoEnabled = usePlayerStore((s) => s.isVideoEnabled);
  const toggleVideo = usePlayerStore((s) => s.toggleVideo);
  const playbackMode = usePlayerStore((s) => s.playbackMode);
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const play = usePlayerStore((s) => s.play);
  const showToast = usePlayerStore((s) => s.showToast);

  // Extract dynamic colors directly from the real album art
  const palette = useDynamicTrackPalette(currentTrack);

  const nextTrack = useMemo(() => {
    if (queue.length > 0 && queueIndex >= 0 && queueIndex < queue.length - 1) {
      return queue[queueIndex + 1];
    }
    return null;
  }, [queue, queueIndex]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex flex-col bg-[#050507] text-white select-none overflow-hidden"
    >
      {/* 1. Fullscreen Cinematic Visualizer Layer */}
      <AmbientVisualizer
        mode="fullscreen"
        accentColor={palette.accent}
        secondaryColor={palette.secondary}
        blurAmount="blur-3xl"
        className="absolute inset-0 z-0 pointer-events-none opacity-80"
      />

      {/* 2. Deep Atmospheric Palette Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-45 blur-[100px] transition-all duration-1000 transform-gpu z-0"
        style={{
          background: `radial-gradient(ellipse 85% 75% at 50% 38%, ${palette.accent}66 0%, ${palette.bgFrom} 55%, #050507 95%)`,
        }}
        aria-hidden="true"
      />

      {/* 3. Dark Vignette Edge Mask */}
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#050507] via-transparent to-[#050507]/70 z-0"
        aria-hidden="true"
      />

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-2 h-2 rounded-full animate-pulse shadow-sm"
            style={{ backgroundColor: palette.accent }}
          />
          <span className="text-xs font-bold tracking-widest uppercase text-white font-sans">
            ONYX ZEN
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-400">
            Press Esc or Z to exit
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Tooltip content="Search (⌘K)" side="bottom">
            <button
              onClick={toggleCommandPalette}
              aria-label="Search"
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <Search size={18} />
            </button>
          </Tooltip>

          <Tooltip content="Exit Focus Mode (Z / Esc)" side="bottom">
            <button
              onClick={() => toggleZenMode(false)}
              aria-label="Exit Focus Mode"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
            >
              <Minimize2 size={14} />
              <span>Exit</span>
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Center Player Stage */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 max-w-xl mx-auto w-full">
        {currentTrack ? (
          <div className="w-full flex flex-col items-center text-center">
            {/* High-Def Full Album Artwork / Video Container Slot (Smooth 1:1 to 16:9 Morphing) */}
            <div className="relative mb-7 group/zenart flex items-center justify-center">
              <div
                id="zen-artwork-slot"
                className={cn(
                  'relative rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-[#08080b] transition-all duration-500 ease-in-out',
                  isVideoEnabled
                    ? 'w-[88vw] max-w-[560px] aspect-video'
                    : 'w-64 h-64 sm:w-80 sm:h-80 md:w-88 md:h-88 aspect-square'
                )}
                style={{
                  boxShadow: `0 25px 70px -15px ${palette.glow}, 0 15px 35px -10px rgba(0,0,0,0.9)`,
                }}
              >
                <div
                  className={cn(
                    'w-full h-full transition-opacity duration-300',
                    isVideoEnabled ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  )}
                >
                  <TrackArtwork
                    track={currentTrack}
                    size="fill"
                    rounded="none"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Quick Hover Video Toggle Button in Zen Mode */}
                {playbackMode === 'iframe' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVideo();
                    }}
                    aria-label={isVideoEnabled ? 'Switch to album artwork (V)' : 'Switch to live video (V)'}
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md text-white border border-white/20 opacity-0 group-hover/zenart:opacity-100 transition-opacity cursor-pointer hover:bg-black/95 z-[65] text-xs font-medium shadow-xl"
                    title={isVideoEnabled ? 'Show album artwork (V)' : 'Show live video (V)'}
                  >
                    {isVideoEnabled ? <VideoOff size={14} /> : <Video size={14} />}
                    <span>{isVideoEnabled ? 'Show Cover' : 'Watch Video'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Track Info & Like Button */}
            <div className="w-full max-w-md mb-6 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 text-left">
                <MarqueeText
                  text={currentTrack.title}
                  subText={currentTrack.artist}
                  className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
                  subClassName="text-sm sm:text-base font-semibold text-zinc-300 mt-1"
                />
              </div>
              <Tooltip content={isLiked ? 'Unlike' : 'Add to Liked Songs (❤️)'} side="left">
                <button
                  onClick={() => toggleLikeTrack(currentTrack)}
                  aria-label={isLiked ? 'Unlike track' : 'Like track'}
                  className={cn(
                    'p-3 rounded-2xl transition-all cursor-pointer shrink-0 border border-white/10 backdrop-blur-md',
                    isLiked
                      ? 'text-rose-500 bg-rose-500/20 border-rose-500/30'
                      : 'text-zinc-400 bg-white/[0.05] hover:text-rose-400 hover:bg-white/[0.1]'
                  )}
                >
                  <Heart size={22} className={isLiked ? 'fill-rose-500 text-rose-500' : ''} />
                </button>
              </Tooltip>
            </div>

            {/* Scrubber with Dynamic Accent Color */}
            <div className="w-full max-w-md mb-6">
              <CustomScrubber accentColor={palette.accent} />
            </div>

            {/* Transport Controls */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 mb-7">
              <button
                onClick={toggleShuffle}
                aria-label={`Shuffle: ${shuffleMode ? 'On' : 'Off'}`}
                className={cn(
                  'p-2 rounded-full transition-all cursor-pointer',
                  shuffleMode
                    ? 'text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                )}
                style={shuffleMode ? { backgroundColor: palette.accent } : undefined}
              >
                <Shuffle size={18} />
              </button>

              <button
                onClick={previous}
                aria-label="Previous track (P)"
                className="p-3 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
              >
                <SkipBack size={24} />
              </button>

              <button
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                className="p-4.5 rounded-full bg-white text-black hover:bg-zinc-200 transition-all active:scale-95 shadow-2xl cursor-pointer"
                style={{
                  boxShadow: isPlaying ? `0 0 35px ${palette.accent}66, 0 10px 20px rgba(0,0,0,0.5)` : 'none',
                }}
              >
                {isPlaying ? (
                  <Pause size={26} className="fill-black" />
                ) : (
                  <Play size={26} className="fill-black ml-0.5" />
                )}
              </button>

              <button
                onClick={next}
                aria-label="Next track (N)"
                className="p-3 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
              >
                <SkipForward size={24} />
              </button>

              <button
                onClick={cycleRepeat}
                aria-label={`Repeat: ${repeatMode}`}
                className={cn(
                  'p-2 rounded-full transition-all cursor-pointer',
                  repeatMode !== 'off'
                    ? 'text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                )}
                style={repeatMode !== 'off' ? { backgroundColor: palette.accent } : undefined}
              >
                {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
              </button>

              {playbackMode === 'iframe' && (
                <button
                  onClick={toggleVideo}
                  aria-label={isVideoEnabled ? 'Show album artwork (V)' : 'Show live video (V)'}
                  className={cn(
                    'p-2 rounded-full transition-all cursor-pointer',
                    isVideoEnabled
                      ? 'text-black shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                  )}
                  style={isVideoEnabled ? { backgroundColor: palette.accent } : undefined}
                  title={isVideoEnabled ? 'Switch to album cover (V)' : 'Switch to video on cover (V)'}
                >
                  {isVideoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                </button>
              )}
            </div>

            {/* Bottom Bar: Clear Volume Slider with Exact Percentage + Next Up Preview */}
            <div className="flex items-center justify-between w-full max-w-md pt-3.5 border-t border-zinc-800/70">
              {/* Volume Slider with Visibility, Value & Accent Fill */}
              <VolumeSlider
                size="lg"
                accentColor={palette.accent}
                showLabel={true}
              />

              {/* Next Up Track Indicator */}
              {nextTrack ? (
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 max-w-[190px] truncate ml-3">
                  <span className="text-zinc-500">Up Next:</span>
                  <span className="text-zinc-200 font-medium truncate">{nextTrack.title}</span>
                </div>
              ) : (
                <span className="text-[11px] text-zinc-500 ml-3">End of queue</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#141419] border border-zinc-700/60 flex items-center justify-center mb-4 text-zinc-400">
              <Music2 size={32} />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">No Track Active</h2>
            <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-6">
              Search for any song or quick-start focus radio to enter uninterrupted flow state.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleCommandPalette}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-md cursor-pointer"
              >
                <Search size={14} />
                <span>Search YouTube (⌘K)</span>
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 text-xs font-medium hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Sparkles size={13} className="text-amber-300" />
                <span>Start Focus Radio</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </motion.div>
  );
}
