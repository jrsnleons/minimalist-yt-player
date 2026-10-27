'use client';

import { Heart, Play, Pause, Search, Settings, Radio } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';
import { usePlaybackLock } from '@/hooks/usePlaybackLock';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { NAV_ITEMS, type MainNavTab } from './AppSidebar';
import { cn } from '@/lib/utils';

interface MobileChromeProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
}

/** Top bar for phones: wordmark plus the actions that live in the desktop sidebar. */
export function MobileHeader() {
  const toggleSettings = usePlayerStore((s) => s.toggleSettings);
  const toggleCommandPalette = usePlayerStore((s) => s.toggleCommandPalette);
  const isInRoom = useListenTogetherStore((s) => s.isInRoom);
  const openListenModal = useListenTogetherStore((s) => s.openModal);

  const btn =
    'w-11 h-11 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer';

  return (
    <header className="md:hidden flex items-center justify-between shrink-0 pl-4 pr-2 h-14 border-b border-white/[0.08]">
      <p className="text-lg font-bold tracking-tight text-white">Onyx</p>
      <div className="flex items-center">
        <button onClick={toggleCommandPalette} aria-label="Search" className={btn}>
          <Search size={20} />
        </button>
        <button
          onClick={() => openListenModal()}
          aria-label="Listen Together"
          className={cn(btn, isInRoom && 'text-emerald-400')}
        >
          <Radio size={20} />
        </button>
        <button onClick={toggleSettings} aria-label="Settings" className={btn}>
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}

function MiniProgress() {
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const pct = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;
  return (
    <div className="absolute left-2.5 right-2.5 bottom-0.5 h-0.5 rounded-full bg-white/20" aria-hidden="true">
      <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Mini player above a bottom tab bar (phones). */
export function MobileChrome({ activeTab, onTabChange }: MobileChromeProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const toggleZenMode = usePlayerStore((s) => s.toggleZenMode);
  const showToast = usePlayerStore((s) => s.showToast);
  const isLiked = usePlayerStore((s) => (s.currentTrack ? s.likedTrackIds.includes(s.currentTrack.id) : false));
  const toggleLikeTrack = usePlayerStore((s) => s.toggleLikeTrack);
  const locked = usePlaybackLock();

  const handlePlay = () => {
    if (locked) {
      showToast('DJ is controlling playback');
      return;
    }
    togglePlay();
  };

  return (
    <div className="md:hidden shrink-0">
      {currentTrack && (
        <div
          className="relative mx-2 mb-1 rounded-[10px] p-2 flex items-center gap-2.5 bg-[color-mix(in_oklab,var(--track-accent,#e9b44c)_22%,#1a1a20)]"
          role="region"
          aria-label="Mini player"
        >
          <TrackArtwork track={currentTrack} size="md" rounded="md" />
          <button
            onClick={() => toggleZenMode(true)}
            aria-label={`Open player: ${currentTrack.title} by ${currentTrack.artist}`}
            className="flex-1 min-w-0 flex flex-col text-left cursor-pointer min-h-[44px] justify-center"
          >
            <span className="truncate text-sm font-medium text-white">{currentTrack.title}</span>
            <span className="truncate text-[13px] text-zinc-200">{currentTrack.artist}</span>
          </button>
          <button
            onClick={() => toggleLikeTrack(currentTrack)}
            aria-label="Like"
            aria-pressed={isLiked}
            className="w-11 h-11 rounded-full flex items-center justify-center text-white cursor-pointer shrink-0"
          >
            <Heart size={20} className={isLiked ? 'fill-current' : ''} />
          </button>
          <button
            onClick={handlePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            aria-disabled={locked || undefined}
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center text-white cursor-pointer shrink-0',
              locked && 'opacity-40'
            )}
          >
            {isPlaying ? (
              <Pause size={22} fill="currentColor" />
            ) : (
              <Play size={22} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <MiniProgress />
        </div>
      )}

      <nav aria-label="Main" className="border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-4">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <li key={key}>
                <button
                  onClick={() => onTabChange(key)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'w-full flex flex-col items-center justify-center gap-1 min-h-[56px] text-xs font-medium cursor-pointer transition-colors',
                    active ? 'text-white' : 'text-zinc-400'
                  )}
                >
                  <Icon size={22} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
