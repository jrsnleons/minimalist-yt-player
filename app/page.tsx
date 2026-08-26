'use client';

import { useState, useEffect } from 'react';
import { TopNav } from '@/components/layout/TopNav';
import { MiniPlayer } from '@/components/layout/MiniPlayer';
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#09090b] text-[#fafafa] select-none antialiased">
      {/* Headless/PiP playback engine controller */}
      <PlayerErrorBoundary>
        {playbackMode === 'iframe' ? <YouTubeIframe /> : <DirectAudioPlayer />}
      </PlayerErrorBoundary>

      {/* Top navigation */}
      <TopNav />

      {/* Single-Column Focused Desktop Body */}
      <main className="flex-1 overflow-y-auto relative bg-[#09090b]" aria-label="Main content">
        <div className="max-w-4xl mx-auto w-full px-4 py-4 space-y-4">
          <PlayerErrorBoundary>
            {/* 1. Compact Now Playing Card at Top */}
            <PlayerHero />

            {/* 2. Single-Column Section Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-[#27272a] px-2 bg-[#0c0c10] rounded-xl p-1.5 shadow-sm">
              <div className="flex items-center gap-1 overflow-x-auto">
                {tabs.map(({ key, label, icon: Icon, badge }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    aria-selected={activeTab === key}
                    role="tab"
                    className={cn(
                      'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0',
                      activeTab === key
                        ? 'bg-[#1e1e26] text-white shadow-sm border border-[#2e2e38]'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#141419]'
                    )}
                  >
                    <Icon size={14} className={activeTab === key ? 'text-white' : 'text-zinc-500'} />
                    <span>{label}</span>
                    {typeof badge === 'number' && badge > 0 ? (
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded-full text-[10px] font-mono-time',
                          activeTab === key ? 'bg-[#2e2e38] text-white' : 'bg-[#181820] text-zinc-500'
                        )}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Active Single-Column View */}
            <div className="pt-1 pb-6">
              {activeTab === 'queue' && <CenterStageQueue />}
              {activeTab === 'search' && <SearchView />}
              {activeTab === 'playlists' && <PlaylistsView />}
              {activeTab === 'recent' && <RecentlyPlayedView />}
              {activeTab === 'vibe' && <VibeSuggestionsView />}
            </div>
          </PlayerErrorBoundary>
        </div>
      </main>

      {/* Persistent bottom mini-player */}
      <PlayerErrorBoundary>
        <MiniPlayer />
      </PlayerErrorBoundary>

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
