'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Play,
  Plus,
  ListPlus,
  ListStart,
  Loader2,
  Zap,
  Radio,
  Check,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { AddToPlaylistModal } from '@/components/playlist/AddToPlaylistModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { CommandPaletteSkeletonItem } from '@/components/ui/Skeleton';
import { debounce, formatTime, uuid, cn } from '@/lib/utils';
import { exportFullLibrary } from '@/lib/backup';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useRemoteHostStore } from '@/store/useRemoteHostStore';
import type { Track, AppAction, Playlist } from '@/types';

// Helper to detect and parse pasted URLs in search input
function detectOmniboxUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('youtu.be/')) {
    return null;
  }

  // 1. YouTube Video (youtu.be)
  const youtuBe = trimmed.match(/^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (youtuBe) {
    return { type: 'youtube-video' as const, id: youtuBe[1], rawUrl: trimmed };
  }

  // 2. YouTube Video (watch?v= or shorts/)
  const ytVideo = trimmed.match(
    /^https?:\/\/(?:www\.|music\.)?youtube\.com\/(?:watch\?.*v=|shorts\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytVideo) {
    return { type: 'youtube-video' as const, id: ytVideo[1], rawUrl: trimmed };
  }

  // 3. YouTube Playlist (playlist?list=)
  const ytPlaylist = trimmed.match(
    /^https?:\/\/(?:www\.|music\.)?youtube\.com\/playlist\?.*list=([a-zA-Z0-9_-]+)/
  );
  if (ytPlaylist) {
    return { type: 'youtube-playlist' as const, id: ytPlaylist[1], rawUrl: trimmed };
  }

  // 4. Spotify Track/Playlist/Album
  const spotify = trimmed.match(
    /^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2,5}\/)?(track|playlist|album|artist)\/([a-zA-Z0-9]+)/
  );
  if (spotify) {
    return {
      type: 'spotify' as const,
      mediaType: spotify[1] as 'track' | 'playlist' | 'album' | 'artist',
      id: spotify[2],
      rawUrl: trimmed,
    };
  }

  return null;
}

export function CommandPalette() {
  const commandPaletteOpen = usePlayerStore((s) => s.commandPaletteOpen);
  const toggleCommandPalette = usePlayerStore((s) => s.toggleCommandPalette);
  const closeCommandPalette = usePlayerStore((s) => s.closeCommandPalette);
  const play = usePlayerStore((s) => s.play);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playNext = usePlayerStore((s) => s.playNext);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const toggleVideo = usePlayerStore((s) => s.toggleVideo);
  const toggleSettings = usePlayerStore((s) => s.toggleSettings);
  const toggleZenMode = usePlayerStore((s) => s.toggleZenMode);
  const toggleAmbientVisualizer = usePlayerStore((s) => s.toggleAmbientVisualizer);
  const shuffleMode = usePlayerStore((s) => s.shuffleMode);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const isVideoEnabled = usePlayerStore((s) => s.isVideoEnabled);
  const zenMode = usePlayerStore((s) => s.zenMode);
  const ambientVisualizerEnabled = usePlayerStore((s) => s.ambientVisualizerEnabled);
  const recentlyPlayed = usePlayerStore((s) => s.recentlyPlayed);
  const showToast = usePlayerStore((s) => s.showToast);

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'youtube' | 'local' | 'actions'>('all');
  const [ytResults, setYtResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSmartProcessing, setIsSmartProcessing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Instant tactile button and banner feedback state
  const [buttonFeedback, setButtonFeedback] = useState<Record<string, 'next' | 'queue'>>({});
  const [inlineBanner, setInlineBanner] = useState<{ text: string; id: number } | null>(null);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, { active: commandPaletteOpen, initialFocus: inputRef, onEscape: closeCommandPalette });

  const triggerFeedback = useCallback((message: string) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setInlineBanner({ text: message, id: Date.now() });
    bannerTimerRef.current = setTimeout(() => {
      setInlineBanner(null);
    }, 2800);
  }, []);

  // App actions — memoized to prevent recreation on every render
  const actions: AppAction[] = useMemo(
    () => [
      {
        id: 'toggle-zen-mode',
        label: `Toggle Focus Mode (${zenMode ? 'Exit' : 'Enter'})`,
        shortcut: 'Z',
        action: () => {
          toggleZenMode();
          triggerFeedback(`Focus Mode ${!zenMode ? 'Enabled' : 'Disabled'}`);
        },
      },
      {
        id: 'toggle-visualizer',
        label: `Toggle Visualizer (${ambientVisualizerEnabled ? 'Turn Off' : 'Turn On'})`,
        action: () => {
          toggleAmbientVisualizer();
          triggerFeedback(`Visualizer ${!ambientVisualizerEnabled ? 'On' : 'Off'}`);
        },
      },
      {
        id: 'open-settings',
        label: 'Open Settings',
        action: () => {
          toggleSettings();
        },
      },
      {
        id: 'export-backup',
        label: 'Export Library Backup (.json)',
        action: async () => {
          try {
            const b = await exportFullLibrary();
            const msg = `Exported ${b.summary.playlistCount} playlists & ${b.summary.trackCount} tracks`;
            triggerFeedback(msg);
            showToast(msg);
          } catch {
            triggerFeedback('Failed to export library');
            showToast('Failed to export library');
          }
        },
      },
      {
        id: 'toggle-video',
        label: `Toggle Video Overlay (${isVideoEnabled ? 'Turn Off' : 'Turn On'})`,
        shortcut: 'V',
        action: () => {
          toggleVideo();
          triggerFeedback(`Video Overlay ${!isVideoEnabled ? 'On' : 'Off'}`);
        },
      },
      {
        id: 'toggle-shuffle',
        label: `Toggle Shuffle (${shuffleMode ? 'Turn Off' : 'Turn On'})`,
        shortcut: 'S',
        action: () => {
          toggleShuffle();
          triggerFeedback(`Shuffle ${!shuffleMode ? 'On' : 'Off'}`);
        },
      },
      {
        id: 'cycle-repeat',
        label: `Cycle Repeat Mode (${repeatMode.toUpperCase()})`,
        shortcut: 'R',
        action: () => {
          cycleRepeat();
          triggerFeedback('Repeat mode updated');
        },
      },
      {
        id: 'connect-phone',
        label: 'Connect Phone',
        action: () => {
          useRemoteHostStore.getState().openModal();
        },
      },
      {
        id: 'clear-queue',
        label: 'Clear Queue',
        action: () => {
          setShowClearConfirm(true);
        },
      },
    ],
    [
      zenMode,
      toggleZenMode,
      ambientVisualizerEnabled,
      toggleAmbientVisualizer,
      toggleSettings,
      isVideoEnabled,
      toggleVideo,
      shuffleMode,
      toggleShuffle,
      repeatMode,
      cycleRepeat,
      clearQueue,
      showToast,
      triggerFeedback,
    ]
  );

  // Local tracks search
  const localTracks = useLiveQuery(async () => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return db.tracks
      .filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
      .limit(10)
      .toArray();
  }, [query]);

  // Check for smart URL in query
  const smartUrl = useMemo(() => detectOmniboxUrl(query), [query]);

  // YouTube search
  const searchYouTube = useCallback(
    debounce(async (q: string) => {
      if (!q.trim() || q.trim().length < 2 || detectOmniboxUrl(q)) {
        setYtResults([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results?: Track[]; tracks?: Track[]; videos?: Track[] };
        const combined = [...(data.tracks ?? data.results ?? []), ...(data.videos ?? [])];
        const seen = new Set<string>();
        const uniqueResults: Track[] = [];
        for (const item of combined) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            uniqueResults.push(item);
          }
        }
        setYtResults(uniqueResults.slice(0, 15));
      } catch {
        setYtResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (smartUrl) {
      setYtResults([]);
      setIsLoading(false);
      return;
    }

    if (scope === 'all' || scope === 'youtube') {
      if (query.trim().length >= 2) {
        setIsLoading(true);
        searchYouTube(query);
      } else {
        setYtResults([]);
        setIsLoading(false);
      }
    } else {
      setYtResults([]);
      setIsLoading(false);
    }
  }, [query, scope, searchYouTube, smartUrl]);

  // Reset and auto-focus
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setActiveIndex(0);
      setScope('all');
      setIsSmartProcessing(false);
      setInlineBanner(null);
      setButtonFeedback({});
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [commandPaletteOpen]);

  // Track button action handlers with instant tactile feedback
  const handlePlayNextTrack = (t: Track, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setButtonFeedback((prev) => ({ ...prev, [t.id]: 'next' }));
    playNext(t);
    triggerFeedback(`"${t.title}" queued to play next`);
    showToast(`"${t.title}" will play next`);
    setTimeout(() => {
      setButtonFeedback((prev) => {
        const copy = { ...prev };
        delete copy[t.id];
        return copy;
      });
    }, 1800);
  };

  const handleAddToQueueTrack = (t: Track, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setButtonFeedback((prev) => ({ ...prev, [t.id]: 'queue' }));
    addToQueue(t);
    triggerFeedback(`Added "${t.title}" to Up Next queue`);
    showToast(`Added "${t.title}" to Queue`);
    setTimeout(() => {
      setButtonFeedback((prev) => {
        const copy = { ...prev };
        delete copy[t.id];
        return copy;
      });
    }, 1800);
  };

  // Smart URL action executors
  const handleExecuteSmartUrl = useCallback(
    async (parsed: NonNullable<typeof smartUrl>) => {
      setIsSmartProcessing(true);
      try {
        if (parsed.type === 'youtube-video') {
          showToast('Loading YouTube video...');
          const fallbackTrack: Track = {
            id: parsed.id,
            title: `YouTube Track (${parsed.id})`,
            artist: 'YouTube',
            duration: 0,
            thumbnailUrl: `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`,
            addedAt: Date.now(),
          };

          // Check if already in indexedDB
          const existing = await db.tracks.get(parsed.id);
          const trackToPlay = existing || fallbackTrack;
          play(trackToPlay);
          toggleCommandPalette();

          // Background enrichment of metadata
          fetch(`/api/search?q=${parsed.id}`)
            .then((r) => r.json())
            .then((data) => {
              const matched = data.tracks?.[0] || data.results?.[0];
              if (matched && matched.title) {
                db.tracks.put(matched).catch(() => {});
                usePlayerStore.setState((s) => ({
                  currentTrack: s.currentTrack?.id === parsed.id ? matched : s.currentTrack,
                }));
              }
            })
            .catch(() => {});
        } else if (parsed.type === 'youtube-playlist') {
          showToast('Fetching YouTube playlist...');
          const res = await fetch(`/api/playlist?url=${encodeURIComponent(parsed.rawUrl)}`);
          const data = await res.json();
          if (!res.ok || !data.tracks || data.tracks.length === 0) {
            throw new Error(data.error || 'No tracks found in playlist');
          }

          await db.tracks.bulkPut(data.tracks);
          const newPl: Playlist = {
            id: uuid(),
            name: data.title || 'Imported Playlist',
            description: data.author ? `From ${data.author}` : 'Imported via Search',
            trackIds: data.tracks.map((t: Track) => t.id),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await db.playlists.add(newPl);
          play(data.tracks[0], data.tracks);
          showToast(`Imported & Playing "${newPl.name}" (${data.tracks.length} tracks)!`);
          toggleCommandPalette();
        } else if (parsed.type === 'spotify') {
          showToast(`Importing Spotify ${parsed.mediaType}...`);
          const res = await fetch(`/api/spotify?url=${encodeURIComponent(parsed.rawUrl)}`);
          const data = await res.json();
          if (!res.ok || !data.tracks || data.tracks.length === 0) {
            throw new Error(data.error || 'Failed to fetch Spotify playlist');
          }

          const resolveRes = await fetch('/api/spotify/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queries: data.tracks.slice(0, 15) }),
          });
          const resolveData = await resolveRes.json();
          const matchedTracks = (resolveData.matches || []).filter(Boolean) as Track[];

          if (matchedTracks.length === 0) {
            throw new Error('Could not match tracks on YouTube');
          }

          await db.tracks.bulkPut(matchedTracks);
          const newPl: Playlist = {
            id: uuid(),
            name: data.name || `Spotify ${parsed.mediaType}`,
            description: `Imported from Spotify (${matchedTracks.length} tracks)`,
            trackIds: matchedTracks.map((t) => t.id),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await db.playlists.add(newPl);
          play(matchedTracks[0], matchedTracks);
          showToast(`Imported & Playing "${newPl.name}"!`);
          toggleCommandPalette();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load URL';
        showToast(`Smart Import Error: ${msg}`);
      } finally {
        setIsSmartProcessing(false);
      }
    },
    [play, showToast, toggleCommandPalette]
  );

  interface ListItem {
    id: string;
    section: 'Smart Action' | 'Actions' | 'Recently Played' | 'Library' | 'YouTube Search';
    type: 'smart-action' | 'action' | 'track';
    action?: AppAction;
    track?: Track;
    smartData?: {
      title: string;
      subtitle: string;
      iconType: 'youtube' | 'playlist' | 'spotify';
      execute: () => Promise<void>;
    };
  }

  const filteredActions = query.trim()
    ? actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : actions;

  const items: ListItem[] = useMemo(() => {
    const list: ListItem[] = [];

    // 0. Smart URL Omnibox Action
    if (smartUrl) {
      let title = '';
      let subtitle = '';
      let iconType: 'youtube' | 'playlist' | 'spotify' = 'youtube';

      if (smartUrl.type === 'youtube-video') {
        title = `Play YouTube Video (${smartUrl.id})`;
        subtitle = 'Directly load and start playback from YouTube';
        iconType = 'youtube';
      } else if (smartUrl.type === 'youtube-playlist') {
        title = 'Import & Play YouTube Playlist';
        subtitle = `Load all tracks from playlist and add to queue`;
        iconType = 'playlist';
      } else if (smartUrl.type === 'spotify') {
        title = `Import & Play Spotify ${smartUrl.mediaType.toUpperCase()}`;
        subtitle = `Resolve tracks via YouTube and play instantly`;
        iconType = 'spotify';
      }

      list.push({
        id: 'smart-url-action',
        section: 'Smart Action',
        type: 'smart-action',
        smartData: {
          title,
          subtitle,
          iconType,
          execute: () => handleExecuteSmartUrl(smartUrl),
        },
      });
      return list;
    }

    if (!query.trim()) {
      if (scope === 'all' || scope === 'actions') {
        filteredActions.slice(0, 4).forEach((a) => {
          list.push({ id: `act-${a.id}`, section: 'Actions', type: 'action', action: a });
        });
      }
      if ((scope === 'all' || scope === 'local') && recentlyPlayed.length > 0) {
        recentlyPlayed.slice(0, 8).forEach((t) => {
          list.push({ id: `recent-${t.id}`, section: 'Recently Played', type: 'track', track: t });
        });
      }
    } else {
      if (scope === 'all' || scope === 'actions') {
        filteredActions.forEach((a) => {
          list.push({ id: `act-${a.id}`, section: 'Actions', type: 'action', action: a });
        });
      }
      if ((scope === 'all' || scope === 'local') && localTracks && localTracks.length > 0) {
        localTracks.forEach((t) => {
          list.push({ id: `local-${t.id}`, section: 'Library', type: 'track', track: t });
        });
      }
      if ((scope === 'all' || scope === 'youtube') && ytResults.length > 0) {
        ytResults.forEach((t) => {
          list.push({ id: `yt-${t.id}`, section: 'YouTube Search', type: 'track', track: t });
        });
      }
    }
    return list;
  }, [smartUrl, query, scope, filteredActions, recentlyPlayed, localTracks, ytResults, handleExecuteSmartUrl]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (items.length > 0 ? (i + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (items.length > 0 ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = items[activeIndex];
      if (!current) return;
      if (current.type === 'smart-action' && current.smartData) {
        current.smartData.execute();
      } else if (current.type === 'action' && current.action) {
        current.action.action();
        toggleCommandPalette();
      } else if (current.type === 'track' && current.track) {
        play(current.track);
        toggleCommandPalette();
      }
    }
  };

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[aria-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  if (!commandPaletteOpen) return null;

  const activeItemId = items[activeIndex] ? `cmd-item-${items[activeIndex].id}` : undefined;

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4" role="presentation">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/70" onClick={closeCommandPalette} aria-hidden="true" />

        {/* Panel */}
        <div
          ref={panelRef}
          className="relative w-full max-w-2xl rounded-[14px] border border-white/[0.08] bg-[#141418] shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col text-white select-none"
          role="dialog"
          aria-modal="true"
          aria-label="Search and commands"
        >
          {/* Input Header */}
          <div className="flex items-center gap-3 px-5 min-h-[56px] border-b border-white/[0.08]">
            {isLoading || isSmartProcessing ? (
              <Loader2 size={18} className="text-zinc-400 animate-spin shrink-0" aria-hidden="true" />
            ) : (
              <Search size={18} className="text-zinc-400 shrink-0" aria-hidden="true" />
            )}
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls="cmd-listbox"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search songs, commands, or paste a link"
              aria-label="Search"
              aria-autocomplete="list"
              aria-activedescendant={activeItemId}
              className="flex-1 min-w-0 bg-transparent text-white placeholder-zinc-500 text-[15px] outline-none focus:outline-none focus:ring-0 border-0"
            />
            <kbd className="px-2 py-0.5 text-xs rounded-md bg-[#1d1d23] border border-white/[0.14] text-zinc-300 font-mono shrink-0">
              Esc
            </kbd>
          </div>

          {/* In-palette confirmation */}
          <div role="status" aria-live="polite">
            <AnimatePresence>
              {inlineBanner && (
                <motion.div
                  key={inlineBanner.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="px-5 py-2 bg-white/[0.04] border-b border-white/[0.08] flex items-center gap-2 text-zinc-100 text-[13px]"
                >
                  <Check size={14} className="text-emerald-400 shrink-0" aria-hidden="true" />
                  <span className="truncate">{inlineBanner.text}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scope Filters */}
          {!smartUrl && (
            <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.08] overflow-x-auto" role="tablist" aria-label="Result type">
              {[
                { key: 'all', label: 'All' },
                { key: 'youtube', label: 'YouTube' },
                { key: 'local', label: 'Library' },
                { key: 'actions', label: 'Commands' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setScope(key as typeof scope);
                    setActiveIndex(0);
                  }}
                  role="tab"
                  aria-selected={scope === key}
                  tabIndex={scope === key ? 0 : -1}
                  className={cn(
                    'px-3 min-h-[32px] rounded-lg text-[13px] transition-colors cursor-pointer select-none shrink-0',
                    scope === key
                      ? 'bg-white/[0.12] text-white font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Results List */}
          <div
            ref={listRef}
            id="cmd-listbox"
            role="listbox"
            aria-label="Results"
            className="max-h-[min(420px,55dvh)] overflow-y-auto py-1"
          >
            {isLoading && items.length === 0 ? (
              <div className="py-2 px-2 space-y-1" role="status">
                <div className="px-2.5 py-1 text-[13px] text-zinc-400 flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  <span>Searching…</span>
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <CommandPaletteSkeletonItem key={`cmd-skel-${i}`} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-sm">
                {query ? 'No results' : 'Type to search songs or commands'}
              </div>
            ) : (
              (['Smart Action', 'Actions', 'Recently Played', 'Library', 'YouTube Search'] as const).map(
                (sectionName) => {
                  const sectionItems = items.filter((item) => item.section === sectionName);
                  if (sectionItems.length === 0) return null;

                  return (
                    <div key={sectionName} role="group" aria-label={sectionName} className="py-1 px-2">
                      <div className="px-2.5 py-1 text-[13px] font-medium text-zinc-400">{sectionName}</div>
                      <div className="mt-0.5">
                        {sectionItems.map((item) => {
                          const itemGlobalIndex = items.indexOf(item);
                          const isSelected = itemGlobalIndex === activeIndex;
                          const itemId = `cmd-item-${item.id}`;

                          // 1. Smart Omnibox URL Item
                          if (item.type === 'smart-action' && item.smartData) {
                            return (
                              <button
                                key={item.id}
                                id={itemId}
                                onClick={() => item.smartData!.execute()}
                                onMouseEnter={() => setActiveIndex(itemGlobalIndex)}
                                role="option"
                                aria-selected={isSelected}
                                disabled={isSmartProcessing}
                                className={cn(
                                  'w-full flex items-center justify-between gap-3 px-3 py-2 min-h-[52px] rounded-lg text-left transition-colors cursor-pointer',
                                  isSelected ? 'bg-white/[0.1] text-white' : 'text-zinc-200 hover:bg-white/[0.05]'
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-md bg-white/[0.08] flex items-center justify-center shrink-0 text-white">
                                    {isSmartProcessing ? (
                                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                                    ) : item.smartData.iconType === 'playlist' ? (
                                      <ListPlus size={18} aria-hidden="true" />
                                    ) : item.smartData.iconType === 'spotify' ? (
                                      <Radio size={18} aria-hidden="true" />
                                    ) : (
                                      <Play size={18} className="fill-white" aria-hidden="true" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-white truncate">{item.smartData.title}</p>
                                    <p className="text-[13px] text-zinc-400 truncate">{item.smartData.subtitle}</p>
                                  </div>
                                </div>
                                <kbd className="px-2 py-1 text-xs rounded-md bg-[#f4f4f6] text-[#0b0b0e] font-semibold shrink-0">
                                  Enter
                                </kbd>
                              </button>
                            );
                          }

                          // 2. Action Item
                          if (item.type === 'action' && item.action) {
                            return (
                              <button
                                key={item.id}
                                id={itemId}
                                onClick={() => {
                                  item.action!.action();
                                  if (item.action!.id === 'open-settings') {
                                    toggleCommandPalette();
                                  }
                                }}
                                onMouseEnter={() => setActiveIndex(itemGlobalIndex)}
                                role="option"
                                aria-selected={isSelected}
                                className={cn(
                                  'w-full flex items-center justify-between gap-3 px-3 min-h-[40px] rounded-lg text-left text-sm transition-colors cursor-pointer',
                                  isSelected ? 'bg-white/[0.1] text-white' : 'text-zinc-300 hover:bg-white/[0.05]'
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Zap size={14} className={isSelected ? 'text-white' : 'text-zinc-400'} aria-hidden="true" />
                                  <span className="font-medium truncate">{item.action.label}</span>
                                </div>
                                {item.action.shortcut && (
                                  <kbd className="px-1.5 py-0.5 text-xs rounded-md bg-[#1d1d23] border border-white/[0.14] text-zinc-300 font-mono shrink-0">
                                    {item.action.shortcut}
                                  </kbd>
                                )}
                              </button>
                            );
                          }

                          // 3. Track Item
                          if (item.type === 'track' && item.track) {
                            const t = item.track;
                            const isNextDone = buttonFeedback[t.id] === 'next';
                            const isQueueDone = buttonFeedback[t.id] === 'queue';
                            const rowBtn =
                              'flex items-center justify-center gap-1.5 px-2.5 min-h-[36px] rounded-lg text-[13px] font-medium transition-colors cursor-pointer';

                            return (
                              <div
                                key={item.id}
                                id={itemId}
                                onMouseEnter={() => setActiveIndex(itemGlobalIndex)}
                                role="option"
                                aria-selected={isSelected}
                                className={cn(
                                  'w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg transition-colors',
                                  isSelected ? 'bg-white/[0.1] text-white' : 'text-zinc-300 hover:bg-white/[0.05]'
                                )}
                              >
                                <div
                                  onClick={() => {
                                    play(t);
                                    toggleCommandPalette();
                                  }}
                                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                                >
                                  <TrackArtwork track={t} size="md" rounded="md" />

                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{t.title}</p>
                                    <p className="text-[13px] text-zinc-400 truncate">{t.artist}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="font-mono text-[13px] text-zinc-400 mr-1 hidden sm:inline tabular-nums">
                                    {formatTime(t.duration)}
                                  </span>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      play(t);
                                      toggleCommandPalette();
                                    }}
                                    aria-label={`Play ${t.title} now`}
                                    className={cn(
                                      rowBtn,
                                      isSelected
                                        ? 'bg-[#f4f4f6] text-[#0b0b0e] font-semibold hover:bg-white'
                                        : 'bg-white/[0.08] text-zinc-100 hover:bg-white/[0.14]'
                                    )}
                                  >
                                    <Play size={12} fill="currentColor" aria-hidden="true" />
                                    <span>Play</span>
                                  </button>

                                  <button
                                    onClick={(e) => handlePlayNextTrack(t, e)}
                                    aria-label={`Play ${t.title} next`}
                                    className={cn(rowBtn, 'text-zinc-200 hover:bg-white/[0.1]')}
                                  >
                                    {isNextDone ? (
                                      <Check size={14} className="text-emerald-400" aria-hidden="true" />
                                    ) : (
                                      <ListStart size={14} aria-hidden="true" />
                                    )}
                                    <span className="hidden sm:inline">{isNextDone ? 'Next Set' : 'Next'}</span>
                                  </button>

                                  <button
                                    onClick={(e) => handleAddToQueueTrack(t, e)}
                                    aria-label={`Add ${t.title} to queue`}
                                    className={cn(rowBtn, 'text-zinc-200 hover:bg-white/[0.1]')}
                                  >
                                    {isQueueDone ? (
                                      <Check size={14} className="text-emerald-400" aria-hidden="true" />
                                    ) : (
                                      <Plus size={14} aria-hidden="true" />
                                    )}
                                    <span className="hidden sm:inline">{isQueueDone ? 'Queued' : 'Queue'}</span>
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPlaylistTrack(t);
                                    }}
                                    aria-label={`Add ${t.title} to playlist`}
                                    title="Add to Playlist"
                                    className={cn(rowBtn, 'w-9 !px-0 text-zinc-200 hover:bg-white/[0.1]')}
                                  >
                                    <ListPlus size={16} aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>

          {/* Footer Hints */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2.5 border-t border-white/[0.08] text-xs text-zinc-400">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="font-mono text-zinc-300">↑↓</kbd> Navigate
              </span>
              <span>
                <kbd className="font-mono text-zinc-300">↵</kbd> Play
              </span>
              <span>
                <kbd className="font-mono text-zinc-300">Esc</kbd> Close
              </span>
            </div>
            <span className="hidden sm:inline">Paste a YouTube or Spotify link to play it</span>
          </div>
        </div>
      </div>

      {/* Add To Playlist Modal */}
      {playlistTrack && (
        <AddToPlaylistModal
          track={playlistTrack}
          isOpen={!!playlistTrack}
          onClose={() => setPlaylistTrack(null)}
        />
      )}

      {/* Confirm Clear Queue Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          clearQueue();
          setShowClearConfirm(false);
          closeCommandPalette();
        }}
        title="Clear Queue"
        description="This will remove all songs currently queued in the active session."
        confirmText="Clear Queue"
        cancelText="Cancel"
        isDestructive={true}
      />
    </>
  );
}
