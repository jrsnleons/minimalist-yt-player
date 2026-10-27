'use client';

import { PanelRightClose, Heart, Music } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { Tooltip } from '@/components/ui/Tooltip';
import { UpNext } from './UpNext';
import { tip } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';

/** Right-hand Now Playing panel (desktop). Hosts #hero-artwork-slot for the video-on-artwork overlay. */
export function NowPlayingPanel() {
  const sidebarPlayerMode = usePlayerStore((s) => s.sidebarPlayerMode);
  const setSidebarPlayerMode = usePlayerStore((s) => s.setSidebarPlayerMode);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isVideoEnabled = usePlayerStore((s) => s.isVideoEnabled);
  const isLiked = usePlayerStore((s) => (s.currentTrack ? s.likedTrackIds.includes(s.currentTrack.id) : false));
  const toggleLikeTrack = usePlayerStore((s) => s.toggleLikeTrack);

  if (sidebarPlayerMode !== 'docked') return null;

  return (
    <aside
      className="hidden md:flex w-80 shrink-0 flex-col min-h-0 border-l border-white/[0.08] bg-[color-mix(in_oklab,var(--track-accent,#e9b44c)_7%,#0b0b0e)]"
      aria-label="Now playing"
    >
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Now Playing</h2>
          <Tooltip content={tip('Hide panel', 'panel')} side="bottom">
            <button
              onClick={() => setSidebarPlayerMode('pill')}
              aria-label="Hide panel"
              className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <PanelRightClose size={18} />
            </button>
          </Tooltip>
        </div>

        {currentTrack ? (
          <>
            <div
              id="hero-artwork-slot"
              className={cn(
                'relative w-full rounded-[10px] overflow-hidden bg-black shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]',
                isVideoEnabled ? 'aspect-video' : 'aspect-square'
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

            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xl font-semibold tracking-tight text-white leading-snug line-clamp-2" title={currentTrack.title}>
                  {currentTrack.title}
                </p>
                <p className="text-[15px] text-zinc-300 truncate">{currentTrack.artist}</p>
              </div>
              <Tooltip content={isLiked ? 'Remove from Liked' : 'Add to Liked'} side="left">
                <button
                  onClick={() => toggleLikeTrack(currentTrack)}
                  aria-label="Like"
                  aria-pressed={isLiked}
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer',
                    isLiked
                      ? 'text-[var(--track-accent,#e9b44c)]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                  )}
                >
                  <Heart size={20} className={isLiked ? 'fill-current' : ''} />
                </button>
              </Tooltip>
            </div>
          </>
        ) : (
          <div className="py-8 flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-white/[0.05] flex items-center justify-center text-zinc-400">
              <Music size={22} />
            </div>
            <p className="text-sm font-semibold text-zinc-200">Nothing Playing</p>
            <p className="text-sm text-zinc-400">Pick a song from Home or Search.</p>
          </div>
        )}

        <UpNext />
      </div>
    </aside>
  );
}
