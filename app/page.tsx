'use client';

import { useState, useEffect } from 'react';
import { TopNav } from '@/components/layout/TopNav';
import { SidebarPlaylists } from '@/components/layout/SidebarPlaylists';
import { QueueSidebar } from '@/components/layout/QueueSidebar';
import { MiniPlayer } from '@/components/layout/MiniPlayer';
import { PlayerHero } from '@/components/player/PlayerHero';
import { YouTubeIframe } from '@/components/player/YouTubeIframe';
import { DirectAudioPlayer } from '@/components/player/DirectAudioPlayer';
import { PlayerErrorBoundary } from '@/components/player/PlayerErrorBoundary';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { PlaylistDetail } from '@/components/playlist/PlaylistDetail';
import { CenterStageQueue } from '@/components/playlist/CenterStageQueue';
import { Toast } from '@/components/ui/Toast';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useAdblockCheck } from '@/hooks/useAdblockCheck';
import type { Playlist } from '@/types';

function AppShell() {
  const { playbackMode, loadRecentlyPlayed, loadSavedPreferences } = usePlayerStore();
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);

  // Activate global keyboard shortcuts, OS mediaSession, and adblock detection
  useHotkeys();
  useMediaSession();
  useAdblockCheck();

  // Load preferences and recently played on startup
  useEffect(() => {
    loadSavedPreferences();
    loadRecentlyPlayed();
  }, [loadSavedPreferences, loadRecentlyPlayed]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#09090b] text-[#fafafa] select-none antialiased">
      {/* Headless/PiP playback engine controller */}
      <PlayerErrorBoundary>
        {playbackMode === 'iframe' ? <YouTubeIframe /> : <DirectAudioPlayer />}
      </PlayerErrorBoundary>

      {/* Top navigation */}
      <TopNav />

      {/* 3-column desktop layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left sidebar: Playlists & Recently Played */}
        <SidebarPlaylists
          onSelectPlaylist={(pl) => setActivePlaylist(pl)}
          activePlaylistId={activePlaylist?.id}
        />

        {/* Center stage: Always shows Compact Now Playing at top + Active Table below */}
        <main className="flex-1 min-w-[500px] overflow-y-auto relative bg-[#09090b]" aria-label="Main content">
          <PlayerErrorBoundary>
            <div className="max-w-5xl mx-auto w-full pb-8">
              {/* Top Compact Hero */}
              <PlayerHero />

              {/* Bottom Table: Selected Playlist OR Playback Queue */}
              {activePlaylist ? (
                <PlaylistDetail
                  playlist={activePlaylist}
                  onClose={() => setActivePlaylist(null)}
                />
              ) : (
                <CenterStageQueue />
              )}
            </div>
          </PlayerErrorBoundary>
        </main>

        {/* Right sidebar: Queue & Suggestions */}
        <QueueSidebar />
      </div>

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
