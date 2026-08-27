'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TransportControls } from './TransportControls';
import { CustomScrubber } from './CustomScrubber';
import { VolumeSlider } from './VolumeSlider';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { AmbientVisualizer } from './AmbientVisualizer';
import { Maximize2, Heart, Video, VideoOff } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { useDynamicTrackPalette } from '@/hooks/useDynamicTrackPalette';
import { cn } from '@/lib/utils';

export function PlayerHero() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const blurredHeroBackground = usePlayerStore((s) => s.blurredHeroBackground);
  const toggleZenMode = usePlayerStore((s) => s.toggleZenMode);
  const isLiked = usePlayerStore((s) => (currentTrack ? s.likedTrackIds.includes(currentTrack.id) : false));
  const toggleLikeTrack = usePlayerStore((s) => s.toggleLikeTrack);
  const isVideoEnabled = usePlayerStore((s) => s.isVideoEnabled);
  const toggleVideo = usePlayerStore((s) => s.toggleVideo);
  const playbackMode = usePlayerStore((s) => s.playbackMode);

  // Dynamic palette based on real album artwork
  const palette = useDynamicTrackPalette(currentTrack);

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="relative p-5 rounded-3xl border border-white/[0.08] bg-[#09090d]/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden group">
      {/* Ambient Audio Visualizer Wave Layer */}
      <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none opacity-35 z-0">
        <AmbientVisualizer
          mode="wave"
          accentColor={palette.accent}
          secondaryColor={palette.secondary}
        />
      </div>

      {/* Dynamic Blurred Video/Artwork Background Effect */}
      {blurredHeroBackground && (
        <AnimatePresence>
          <motion.div
            key={currentTrack.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="absolute -inset-16 pointer-events-none z-0 overflow-hidden"
          >
            {currentTrack.thumbnailUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center scale-150 filter blur-3xl opacity-30"
                style={{ backgroundImage: `url(${currentTrack.thumbnailUrl})` }}
              />
            ) : (
              <div
                className="absolute inset-0 scale-150 filter blur-3xl opacity-35"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${palette.accent} 0%, ${palette.bgFrom} 80%)`,
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090d] via-[#09090d]/80 to-[#09090d]/40" />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Main Content Layer */}
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-5">
        {/* Album Artwork / Video Container Slot (Smooth 1:1 to 16:9 Morphing) */}
        <div
          id="hero-artwork-slot"
          className={cn(
            'relative rounded-2xl overflow-hidden shrink-0 border border-white/15 group/art bg-black transition-all duration-500 ease-in-out',
            isVideoEnabled
              ? 'w-[200px] h-[112px] md:w-[228px] md:h-[128px] aspect-video shadow-2xl'
              : 'w-28 h-28 md:w-32 md:h-32 aspect-square shadow-xl'
          )}
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
              priority={true}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Quick Hover Video Toggle Button */}
          {playbackMode === 'iframe' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleVideo();
              }}
              aria-label={isVideoEnabled ? 'Switch to album artwork (V)' : 'Switch to live video (V)'}
              className="absolute bottom-1.5 right-1.5 p-1.5 rounded-lg bg-black/75 backdrop-blur-md text-white border border-white/20 opacity-0 group-hover/art:opacity-100 transition-opacity cursor-pointer hover:bg-black/95 z-30 shadow-lg"
              title={isVideoEnabled ? 'Switch to album artwork (V)' : 'Switch to live video (V)'}
            >
              {isVideoEnabled ? <VideoOff size={13} /> : <Video size={13} />}
            </button>
          )}
        </div>

        {/* Details and Controls */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full w-full">
          {/* Track Titles & Like Button */}
          <div className="flex items-center justify-between gap-3 min-w-0 mb-1.5 overflow-hidden">
            <div className="min-w-0 flex-1 overflow-hidden">
              <MarqueeText
                text={currentTrack.title}
                subText={currentTrack.artist}
                className="text-sm md:text-base font-bold text-white tracking-tight leading-snug"
                subClassName="text-xs text-zinc-400 font-medium mt-0.5"
              />
            </div>
            <Tooltip content={isLiked ? 'Unlike' : 'Add to Liked Songs (❤️)'} side="left">
              <button
                onClick={() => toggleLikeTrack(currentTrack)}
                aria-label={isLiked ? 'Unlike track' : 'Like track'}
                className={cn(
                  'p-1.5 rounded-xl transition-all cursor-pointer shrink-0',
                  isLiked
                    ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
                    : 'text-zinc-400 hover:text-rose-400 hover:bg-white/[0.08]'
                )}
              >
                <Heart size={16} className={isLiked ? 'fill-rose-500 text-rose-500' : ''} />
              </button>
            </Tooltip>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="w-full my-1">
            <CustomScrubber className="w-full" accentColor={palette.accent} />
          </div>

          {/* Bottom Bar inside Hero: Controls on left, Volume + Zen Mode on right */}
          <div className="flex items-center justify-between mt-1 pt-1 gap-2">
            <TransportControls />
            <div className="flex items-center gap-3">
              <VolumeSlider accentColor={palette.accent} />
              <Tooltip content="Zen Focus Mode (Z)" side="top">
                <button
                  onClick={() => toggleZenMode(true)}
                  aria-label="Enter Zen Focus Mode (Z)"
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <Maximize2 size={14} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
