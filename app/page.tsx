'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppSidebar, type MainNavTab } from '@/components/layout/AppSidebar';
import { MobileChrome, MobileHeader } from '@/components/layout/MobileChrome';
import { NowPlayingPanel } from '@/components/player/NowPlayingPanel';
import { PlaybackBar } from '@/components/player/PlaybackBar';
import { YouTubeIframe } from '@/components/player/YouTubeIframe';
import { DirectAudioPlayer } from '@/components/player/DirectAudioPlayer';
import { PlayerErrorBoundary } from '@/components/player/PlayerErrorBoundary';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';
import { ZenPlayerView } from '@/components/player/ZenPlayerView';
import { HomeView } from '@/components/views/HomeView';
import { SearchView } from '@/components/views/SearchView';
import { LibraryView } from '@/components/views/LibraryView';
import { ListenTogetherBar } from '@/components/listen-together/ListenTogetherBar';
import { ListenTogetherModal } from '@/components/listen-together/ListenTogetherModal';
import { FloatingReactions } from '@/components/listen-together/FloatingReactions';
import { Toast } from '@/components/ui/Toast';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useAdblockCheck } from '@/hooks/useAdblockCheck';
import { useDynamicTrackPalette } from '@/hooks/useDynamicTrackPalette';
import { useListenTogetherSync } from '@/hooks/useListenTogetherSync';
import type { Playlist } from '@/types';

function AppShell() {
  const playbackMode = usePlayerStore((s) => s.playbackMode);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const zenMode = usePlayerStore((s) => s.zenMode);
  const loadRecentlyPlayed = usePlayerStore((s) => s.loadRecentlyPlayed);
  const loadSavedPreferences = usePlayerStore((s) => s.loadSavedPreferences);
  const restorePreviousSession = usePlayerStore((s) => s.restorePreviousSession);
  const showToast = usePlayerStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<MainNavTab>('home');
  const [selectedPlaylistTarget, setSelectedPlaylistTarget] = useState<Playlist | null>(null);

  // Dynamic color palette extracted from active track
  const palette = useDynamicTrackPalette(currentTrack);

  // Activate global keyboard shortcuts, OS mediaSession, adblock probe, and Listen Together sync
  useHotkeys();
  useMediaSession();
  useAdblockCheck();
  useListenTogetherSync();

  // Load preferences, session restore, and recently played on startup
  useEffect(() => {
    const initApp = async () => {
      await loadSavedPreferences();
      await loadRecentlyPlayed();
      const restored = await restorePreviousSession();
      if (restored) {
        showToast('Restored previous listening session');
      }
    };
    initApp();
  }, [loadSavedPreferences, loadRecentlyPlayed, restorePreviousSession, showToast]);

  const handleSelectPlaylistFromHome = (playlist: Playlist) => {
    setSelectedPlaylistTarget(playlist);
    setActiveTab('library');
  };

  return (
    <div
      className="flex flex-col h-dvh w-screen overflow-hidden text-[#f4f4f6] antialiased relative"
      style={{
        // Cover accent (contrast-clamped) for the few places that use it
        ['--track-accent' as string]: palette.accent,
        ['--track-glow' as string]: palette.glow,
      }}
    >
      {/* Headless/PiP playback engine controller */}
      <PlayerErrorBoundary>
        {playbackMode === 'iframe' ? <YouTubeIframe /> : <DirectAudioPlayer />}
      </PlayerErrorBoundary>

      <div className="flex-1 min-h-0 flex">
        <AppSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSelectPlaylist={handleSelectPlaylistFromHome}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <MobileHeader />
          <main
            className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden relative px-4 md:px-8 pt-4 md:pt-7"
            aria-label="Main content"
          >
            {/* Active Listen Together Session Banner */}
            <ListenTogetherBar />

            <PlayerErrorBoundary>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="h-full flex-1 flex flex-col min-h-0 overflow-x-hidden"
                  >
                    {activeTab === 'home' && (
                      <HomeView
                        onNavigateTab={(tab) => setActiveTab(tab)}
                        onSelectPlaylist={handleSelectPlaylistFromHome}
                      />
                    )}
                    {activeTab === 'search' && <SearchView />}
                    {activeTab === 'library' && (
                      <LibraryView initialPlaylist={selectedPlaylistTarget} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </PlayerErrorBoundary>
          </main>
        </div>

        <NowPlayingPanel />
      </div>

      <PlaybackBar />
      <MobileChrome activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Zen / Non-Distraction Mode View */}
      <AnimatePresence>
        {zenMode && <ZenPlayerView />}
      </AnimatePresence>

      {/* Global Modals & Overlays */}
      <CommandPalette />
      <SettingsModal />
      <KeyboardShortcutsModal />
      <ListenTogetherModal />
      <FloatingReactions />
      <Toast />
    </div>
  );
}

export default function Page() {
  return <AppShell />;
}
