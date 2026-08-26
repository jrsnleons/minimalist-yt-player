'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopNav } from '@/components/layout/TopNav';
import { PlayerHero } from '@/components/player/PlayerHero';
import { YouTubeIframe } from '@/components/player/YouTubeIframe';
import { DirectAudioPlayer } from '@/components/player/DirectAudioPlayer';
import { PlayerErrorBoundary } from '@/components/player/PlayerErrorBoundary';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { CenterStageQueue } from '@/components/playlist/CenterStageQueue';
import { PlaylistsView } from '@/components/views/PlaylistsView';
import { RecentlyPlayedView } from '@/components/views/RecentlyPlayedView';
import { VibeSuggestionsView } from '@/components/views/VibeSuggestionsView';
import { SearchView } from '@/components/views/SearchView';
import { Toast } from '@/components/ui/Toast';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useAdblockCheck } from '@/hooks/useAdblockCheck';
import { ListMusic, Search, Music, Clock, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActiveTab = 'queue' | 'search' | 'playlists' | 'recent' | 'vibe';

interface TabItem {
  key: ActiveTab;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

function AppShell() {
  const { playbackMode, queue, recentlyPlayed, loadRecentlyPlayed, loadSavedPreferences } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('queue');

  // Activate global keyboard shortcuts, OS mediaSession, and adblock probe
  useHotkeys();
  useMediaSession();
  useAdblockCheck();

  // Load preferences and recently played on startup
  useEffect(() => {
    loadSavedPreferences();
    loadRecentlyPlayed();
  }, [loadSavedPreferences, loadRecentlyPlayed]);

  const tabs: TabItem[] = [
    { key: 'queue', label: 'Queue', icon: ListMusic, badge: queue.length },
    { key: 'search', label: 'Search & Explore', icon: Search },
    { key: 'playlists', label: 'Playlists', icon: Music },
    { key: 'recent', label: 'Recently Played', icon: Clock, badge: recentlyPlayed.length },
    { key: 'vibe', label: 'Based on Vibe', icon: Sparkles },
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-[#fafafa] select-none antialiased relative">
      {/* Noir Noise & Vignette Texture Overlays */}
      <div className="noir-noise-bg" aria-hidden="true" />
      <div className="noir-vignette" aria-hidden="true" />

      {/* Headless/PiP playback engine controller */}
      <PlayerErrorBoundary>
        {playbackMode === 'iframe' ? <YouTubeIframe /> : <DirectAudioPlayer />}
      </PlayerErrorBoundary>

      {/* 1. Pinned Top Navigation */}
      <div className="relative z-20 shrink-0">
        <TopNav />
      </div>

      {/* 2. Static Desktop Body (Unscrollable Viewport, Scrollable Content Area) */}
      <main className="flex-1 min-h-0 max-w-4xl mx-auto w-full px-4 pt-3 pb-3 flex flex-col overflow-hidden relative z-10" aria-label="Main content">
        <PlayerErrorBoundary>
          {/* Pinned A: Compact Now Playing Card at Top (shrink-0) */}
          <div className="shrink-0 mb-3">
            <PlayerHero />
          </div>

          {/* Pinned B: Single-Column Section Navigation Tabs (shrink-0) */}
          <div className="shrink-0 mb-3 border-b border-[#27272a] px-2 bg-[#0c0c10]/95 backdrop-blur-md rounded-xl p-1.5 shadow-sm">
            <div className="flex items-center gap-1 overflow-x-auto relative">
              {tabs.map(({ key, label, icon: Icon, badge }) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    aria-selected={isActive}
                    role="tab"
                    className={cn(
                      'relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-colors',
                      isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#141419]'
                    )}
                  >
                    {/* Animated sliding background pill */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute inset-0 bg-[#1e1e26] border border-[#2e2e38] rounded-lg shadow-sm -z-0"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}

                    <span className="relative z-10 flex items-center gap-1.5">
                      <Icon size={13} className={isActive ? 'text-white' : 'text-zinc-500'} />
                      <span>{label}</span>
                      {typeof badge === 'number' && badge > 0 && (
                        <span
                          className={cn(
                            'px-1.5 py-0.2 rounded-full text-[10px] font-mono-time transition-colors',
                            isActive ? 'bg-[#2e2e38] text-white' : 'bg-[#181820] text-zinc-500'
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable C: Active Content Container (flex-1 min-h-0 overflow-hidden) */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="h-full flex-1 flex flex-col min-h-0"
              >
                {activeTab === 'queue' && <CenterStageQueue />}
                {activeTab === 'search' && <SearchView />}
                {activeTab === 'playlists' && <PlaylistsView />}
                {activeTab === 'recent' && <RecentlyPlayedView />}
                {activeTab === 'vibe' && <VibeSuggestionsView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </PlayerErrorBoundary>
      </main>

      {/* Global Overlays */}
      <CommandPalette />
      <SettingsModal />
      <Toast />
    </div>
  );
}

export default function Page() {
  return <AppShell />;
}
