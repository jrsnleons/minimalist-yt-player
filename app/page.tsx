'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopNav, type MainNavTab } from '@/components/layout/TopNav';
import { SidebarPlayer } from '@/components/player/SidebarPlayer';
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
      className="flex flex-col h-screen w-screen overflow-hidden text-[#fafafa] select-none antialiased relative"
      style={{
        // Expose dynamic accent variables for smooth subtle highlights
        ['--track-accent' as string]: palette.accent,
        ['--track-glow' as string]: palette.glow,
      }}
    >
      {/* Minimal Apple Atmospheric Depth */}
      <div className="apple-vignette" aria-hidden="true" />

      {/* Dynamic Atmospheric Track Accent Glow */}
      {currentTrack && (
        <div
          className="fixed -top-40 left-1/2 -translate-x-1/2 w-[650px] h-[320px] pointer-events-none opacity-20 blur-[130px] transition-all duration-1000 transform-gpu z-0"
          style={{
            background: `radial-gradient(circle, ${palette.accent} 0%, ${palette.glow} 40%, transparent 80%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Headless/PiP playback engine controller */}
      <PlayerErrorBoundary>
        {playbackMode === 'iframe' ? <YouTubeIframe /> : <DirectAudioPlayer />}
      </PlayerErrorBoundary>

      {/* 1. Pinned Top Navigation with Integrated 3-Pill Tabs */}
      <div className="relative z-20 shrink-0">
        <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* 2. Main Content & Sidebar Workspace */}
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-3 sm:px-4 pt-3 pb-3 flex gap-4 overflow-hidden relative z-10">
        <main
          className="flex-1 min-w-0 h-full flex flex-col overflow-hidden relative"
          aria-label="Main content"
        >
          {/* Active Listen Together Session Banner */}
          <ListenTogetherBar />

          <PlayerErrorBoundary>
            {/* Scrollable: Active Content Container (Vertical Scroll Only) */}
            <div
              className="flex-1 min-h-0 overflow-hidden flex flex-col"
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
              aria-labelledby={`topnav-tab-${activeTab}`}
            >
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

        {/* Dual-Mode Sidebar Player (Docked Right Column & Floating Pill) */}
        <SidebarPlayer />
      </div>

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
