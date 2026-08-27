'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { TopNav } from '@/components/layout/TopNav';
import { PlayerHero } from '@/components/player/PlayerHero';
import { YouTubeIframe } from '@/components/player/YouTubeIframe';
import { DirectAudioPlayer } from '@/components/player/DirectAudioPlayer';
import { PlayerErrorBoundary } from '@/components/player/PlayerErrorBoundary';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ZenPlayerView } from '@/components/player/ZenPlayerView';
import { HomeView } from '@/components/views/HomeView';
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
import { useDynamicTrackPalette } from '@/hooks/useDynamicTrackPalette';
import {
  Compass,
  ListMusic,
  Search,
  Music,
  Clock,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Playlist } from '@/types';

type ActiveTab = 'home' | 'queue' | 'search' | 'playlists' | 'vibe' | 'recent';

interface TabItem {
  key: ActiveTab;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

function AppShell() {
  const playbackMode = usePlayerStore((s) => s.playbackMode);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const queueLength = usePlayerStore((s) => s.queue.length);
  const recentlyPlayedLength = usePlayerStore((s) => s.recentlyPlayed.length);
  const zenMode = usePlayerStore((s) => s.zenMode);
  const loadRecentlyPlayed = usePlayerStore((s) => s.loadRecentlyPlayed);
  const loadSavedPreferences = usePlayerStore((s) => s.loadSavedPreferences);
  const restorePreviousSession = usePlayerStore((s) => s.restorePreviousSession);
  const showToast = usePlayerStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedPlaylistTarget, setSelectedPlaylistTarget] = useState<Playlist | null>(null);

  // Dynamic color palette extracted from active track
  const palette = useDynamicTrackPalette(currentTrack);

  const playlistCount = useLiveQuery(() => db.playlists.count(), []);

  // Activate global keyboard shortcuts, OS mediaSession, and adblock probe
  useHotkeys();
  useMediaSession();
  useAdblockCheck();

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

  const tabs: TabItem[] = [
    { key: 'home', label: 'Home', icon: Compass },
    { key: 'queue', label: 'Queue', icon: ListMusic, badge: queueLength },
    { key: 'search', label: 'Search', icon: Search },
    { key: 'playlists', label: 'Playlists', icon: Music, badge: playlistCount },
    { key: 'vibe', label: 'Vibe', icon: Sparkles },
    { key: 'recent', label: 'History', icon: Clock, badge: recentlyPlayedLength },
  ];

  const handleSelectPlaylistFromHome = (playlist: Playlist) => {
    setSelectedPlaylistTarget(playlist);
    setActiveTab('playlists');
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
      {/* Noir Noise & Vignette Texture Overlays */}
      <div className="noir-noise-bg" aria-hidden="true" />
      <div className="noir-vignette" aria-hidden="true" />

      {/* Dynamic Atmospheric Track Accent Glow */}
      {currentTrack && (
        <div
          className="fixed -top-40 left-1/2 -translate-x-1/2 w-[650px] h-[320px] pointer-events-none opacity-25 blur-[120px] transition-all duration-1000 transform-gpu z-0"
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

      {/* 1. Pinned Top Navigation */}
      <div className="relative z-20 shrink-0">
        <TopNav />
      </div>

      {/* 2. Static Desktop Body (Zero Horizontal Scroll, Vertical Only Content Scroll) */}
      <main
        className="flex-1 min-h-0 max-w-4xl mx-auto w-full px-4 pt-3 pb-3 flex flex-col overflow-hidden relative z-10"
        aria-label="Main content"
      >
        <PlayerErrorBoundary>
          {/* Pinned A: Animated Now Playing Hero Banner (Only when track active) */}
          <AnimatePresence>
            {currentTrack && (
              <motion.div
                key="player-hero-wrapper"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="shrink-0 mb-3 overflow-hidden"
              >
                <PlayerHero />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pinned B: Single-Column Section Navigation Tabs (Onyx Glass Bar) */}
          <div className="shrink-0 mb-3 border border-white/[0.08] bg-[#09090d]/90 backdrop-blur-xl rounded-2xl p-1 shadow-md overflow-hidden">
            <div className="grid grid-cols-6 gap-1 w-full relative" role="tablist" aria-label="Main navigation tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    id={`tab-${tab.key}`}
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${tab.key}`}
                    onClick={() => {
                      if (tab.key === 'playlists') {
                        setSelectedPlaylistTarget(null);
                      }
                      setActiveTab(tab.key);
                    }}
                    className={cn(
                      'relative flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer select-none',
                      isActive ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-tab-indicator"
                        className="absolute inset-0 bg-white/[0.1] border border-white/[0.12] rounded-xl shadow-sm z-0"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <Icon size={14} className={cn('relative z-10', isActive ? 'text-white' : 'text-zinc-400')} />
                    <span className="relative z-10 font-sans tracking-wide">{tab.label}</span>
                    {typeof tab.badge === 'number' && tab.badge > 0 && (
                      <span
                        className={cn(
                          'relative z-10 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold leading-none',
                          isActive ? 'bg-white text-black' : 'bg-white/[0.08] text-zinc-400'
                        )}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable C: Active Content Container (Vertical Scroll Only) */}
          <div
            className="flex-1 min-h-0 overflow-hidden flex flex-col"
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
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
                {activeTab === 'queue' && <CenterStageQueue />}
                {activeTab === 'search' && <SearchView />}
                {activeTab === 'playlists' && (
                  <PlaylistsView initialPlaylist={selectedPlaylistTarget} />
                )}
                {activeTab === 'vibe' && <VibeSuggestionsView />}
                {activeTab === 'recent' && <RecentlyPlayedView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </PlayerErrorBoundary>
      </main>

      {/* Zen / Non-Distraction Mode View */}
      <AnimatePresence>
        {zenMode && <ZenPlayerView />}
      </AnimatePresence>

      {/* Global Modals & Overlays */}
      <CommandPalette />
      <SettingsModal />
      <Toast />
    </div>
  );
}

export default function Page() {
  return <AppShell />;
}
