'use client';

import { Heart, Video, VideoOff, PanelRight, Maximize2, Music } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { Tooltip } from '@/components/ui/Tooltip';
import { TransportControls } from './TransportControls';
import { PlaybackErrorNotice } from './PlaybackErrorNotice';
import { CustomScrubber } from './CustomScrubber';
import { VolumeSlider } from './VolumeSlider';
import { useDynamicTrackPalette } from '@/hooks/useDynamicTrackPalette';
import { tip } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';

const iconBtn =
  'w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer select-none';

/** Persistent full-width playback bar (desktop). */
export function PlaybackBar() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isLiked = usePlayerStore((s) => (s.currentTrack ? s.likedTrackIds.includes(s.currentTrack.id) : false));
  const toggleLikeTrack = usePlayerStore((s) => s.toggleLikeTrack);
  const isVideoEnabled = usePlayerStore((s) => s.isVideoEnabled);
  const toggleVideo = usePlayerStore((s) => s.toggleVideo);
  const playbackMode = usePlayerStore((s) => s.playbackMode);
  const sidebarPlayerMode = usePlayerStore((s) => s.sidebarPlayerMode);
  const setSidebarPlayerMode = usePlayerStore((s) => s.setSidebarPlayerMode);
  const toggleSidebarPlayerMode = usePlayerStore((s) => s.toggleSidebarPlayerMode);
  const toggleZenMode = usePlayerStore((s) => s.toggleZenMode);

  const palette = useDynamicTrackPalette(currentTrack);
  const panelOpen = sidebarPlayerMode === 'docked';

  const handleVideo = () => {
    // Video renders inside the Now Playing panel, so make sure it is visible.
    if (!isVideoEnabled && !panelOpen) setSidebarPlayerMode('docked');
    toggleVideo();
  };

  return (
    <footer
      className="relative hidden md:grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] items-center gap-4 h-[84px] shrink-0 px-4 border-t border-white/[0.08] bg-[#0b0b0e]"
      aria-label="Playback"
    >
      <PlaybackErrorNotice variant="bar" />

      {/* Left: track */}
      <div className="flex items-center gap-3 min-w-0">
        {currentTrack ? (
          <>
            <TrackArtwork track={currentTrack} size="lg" rounded="md" className="!w-14 !h-14" />
            <div className="min-w-0 flex flex-col">
              <span className="truncate text-sm font-medium text-white" title={currentTrack.title}>
                {currentTrack.title}
              </span>
              <span className="truncate text-[13px] text-zinc-400">{currentTrack.artist}</span>
            </div>
            <Tooltip content={isLiked ? 'Remove from Liked' : 'Add to Liked'} side="top">
              <button
                onClick={() => toggleLikeTrack(currentTrack)}
                aria-label="Like"
                aria-pressed={isLiked}
                className={cn(
                  iconBtn,
                  'shrink-0',
                  isLiked
                    ? 'text-[var(--track-accent,#e9b44c)]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                )}
              >
                <Heart size={18} className={isLiked ? 'fill-current' : ''} />
              </button>
            </Tooltip>
          </>
        ) : (
          <>
            <span className="w-14 h-14 rounded-md bg-white/[0.05] flex items-center justify-center text-zinc-400 shrink-0">
              <Music size={22} />
            </span>
            <span className="text-sm text-zinc-400">Nothing playing</span>
          </>
        )}
      </div>

      {/* Center: transport + timeline */}
      <div className="flex flex-col items-center gap-0.5">
        <TransportControls size="bar" />
        <CustomScrubber className="max-w-[560px]" accentColor={palette.accent} />
      </div>

      {/* Right: video, panel, volume, focus */}
      <div className="flex items-center justify-end gap-1">
        {playbackMode === 'iframe' && (
          <Tooltip content={tip(isVideoEnabled ? 'Show artwork' : 'Show video', 'video')} side="top">
            <button
              onClick={handleVideo}
              aria-label="Video"
              aria-pressed={isVideoEnabled}
              className={cn(
                iconBtn,
                isVideoEnabled
                  ? 'text-[var(--track-accent,#e9b44c)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.08]'
              )}
            >
              {isVideoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
          </Tooltip>
        )}
        <Tooltip content={tip('Now playing panel', 'panel')} side="top">
          <button
            onClick={toggleSidebarPlayerMode}
            aria-label="Now playing panel"
            aria-pressed={panelOpen}
            className={cn(
              iconBtn,
              panelOpen
                ? 'text-[var(--track-accent,#e9b44c)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.08]'
            )}
          >
            <PanelRight size={18} />
          </button>
        </Tooltip>
        <VolumeSlider size="sm" showLabel={false} accentColor={palette.accent} />
        <Tooltip content={tip('Focus mode', 'focus')} side="top">
          <button
            onClick={() => toggleZenMode(true)}
            aria-label="Focus mode"
            className={cn(iconBtn, 'text-zinc-400 hover:text-white hover:bg-white/[0.08]')}
          >
            <Maximize2 size={18} />
          </button>
        </Tooltip>
      </div>
    </footer>
  );
}
