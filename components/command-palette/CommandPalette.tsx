'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Search, Play, Plus, ListPlus, Loader2, Zap, Music, Clock } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { AddToPlaylistModal } from '@/components/playlist/AddToPlaylistModal';
import { debounce, formatTime, cn } from '@/lib/utils';
import type { Track, AppAction } from '@/types';

export function CommandPalette() {
  const {
    commandPaletteOpen,
    toggleCommandPalette,
    play,
    addToQueue,
    playNext,
    clearQueue,
    toggleShuffle,
    cycleRepeat,
    toggleVideo,
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleSettings,
    shuffleMode,
    repeatMode,
    isVideoEnabled,
    recentlyPlayed,
    showToast,
  } = usePlayerStore();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'youtube' | 'local' | 'actions'>('all');
  const [ytResults, setYtResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // App actions
  const actions: AppAction[] = [
    {
      id: 'open-settings',
      label: 'Open Settings & Playback Engine',
      action: () => toggleSettings(),
    },
    {
      id: 'toggle-video',
      label: `Toggle Video PiP (${isVideoEnabled ? 'On' : 'Off'})`,
      shortcut: 'V',
      action: () => toggleVideo(),
    },
    {
      id: 'toggle-shuffle',
      label: `Toggle Shuffle (${shuffleMode ? 'On' : 'Off'})`,
      shortcut: 'S',
      action: () => toggleShuffle(),
    },
    {
      id: 'cycle-repeat',
      label: `Cycle Repeat (${repeatMode.toUpperCase()})`,
      shortcut: 'R',
      action: () => cycleRepeat(),
    },
    {
      id: 'clear-queue',
      label: 'Clear Up Next Queue',
      action: () => {
        clearQueue();
        showToast('Queue cleared');
      },
    },
  ];

  // Local tracks search
  const localTracks = useLiveQuery(async () => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return db.tracks
      .filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
      .limit(10)
      .toArray();
  }, [query]);

  // YouTube search
  const searchYouTube = useCallback(
    debounce(async (q: string) => {
      if (!q.trim() || q.trim().length < 2) {
        setYtResults([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results?: Track[] };
        setYtResults(data.results ?? []);
      } catch {
        setYtResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
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
  }, [query, scope, searchYouTube]);

  // Reset and auto-focus
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setActiveIndex(0);
      setScope('all');
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [commandPaletteOpen]);

  interface ListItem {
    id: string;
    section: 'Actions' | 'Recently Played' | 'Library' | 'YouTube Search';
    type: 'action' | 'track';
    action?: AppAction;
    track?: Track;
  }

  const filteredActions = query.trim()
    ? actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : actions;

  const items: ListItem[] = [];

  if (!query.trim()) {
    if (scope === 'all' || scope === 'actions') {
      filteredActions.slice(0, 3).forEach((a) => {
        items.push({ id: `act-${a.id}`, section: 'Actions', type: 'action', action: a });
      });
    }
    if ((scope === 'all' || scope === 'local') && recentlyPlayed.length > 0) {
      recentlyPlayed.slice(0, 8).forEach((t) => {
        items.push({ id: `recent-${t.id}`, section: 'Recently Played', type: 'track', track: t });
      });
    }
  } else {
    if (scope === 'all' || scope === 'actions') {
      filteredActions.forEach((a) => {
        items.push({ id: `act-${a.id}`, section: 'Actions', type: 'action', action: a });
      });
    }
    if ((scope === 'all' || scope === 'local') && localTracks && localTracks.length > 0) {
      localTracks.forEach((t) => {
        items.push({ id: `local-${t.id}`, section: 'Library', type: 'track', track: t });
      });
    }
    if ((scope === 'all' || scope === 'youtube') && ytResults.length > 0) {
      ytResults.forEach((t) => {
        items.push({ id: `yt-${t.id}`, section: 'YouTube Search', type: 'track', track: t });
      });
    }
  }

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
      if (current.type === 'action' && current.action) {
        current.action.action();
        toggleCommandPalette();
      } else if (current.type === 'track' && current.track) {
        play(current.track);
        toggleCommandPalette();
      }
    } else if (e.key === 'Escape') {
      toggleCommandPalette();
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

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-start justify-center pt-16 px-4" role="presentation">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md" onClick={toggleCommandPalette} aria-hidden="true" />

        {/* Modal Container */}
        <div
          className="relative w-full max-w-2xl rounded-2xl border border-[#27272f] bg-[#0c0c10] shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl text-white select-none"
          role="combobox"
          aria-expanded="true"
          aria-haspopup="listbox"
          aria-label="Command palette"
        >
          {/* Input Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#222228] bg-[#121218]">
            {isLoading ? (
              <Loader2 size={18} className="text-zinc-400 animate-spin shrink-0" />
            ) : (
              <Search size={18} className="text-zinc-400 shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search songs, artists, library, actions..."
              aria-label="Search query input"
              aria-autocomplete="list"
              className="flex-1 bg-transparent text-white placeholder-zinc-500 text-sm focus:outline-none"
            />
            <kbd className="px-2 py-0.5 text-[10px] rounded bg-[#1e1e24] border border-zinc-700 text-zinc-400 font-mono-time shrink-0">
              ESC
            </kbd>
          </div>

          {/* Scope Filters */}
          <div className="flex items-center px-4 border-b border-[#1e1e24] bg-[#0f0f14] text-xs" role="tablist">
            {[
              { key: 'all', label: 'All Results' },
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
                className={cn(
                  'px-3 py-2.5 border-b-2 font-medium transition-colors',
                  scope === key
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div
            ref={listRef}
            role="listbox"
            className="max-h-[420px] overflow-y-auto py-2 divide-y divide-[#1e1e24]/50"
          >
            {items.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                {isLoading ? 'Searching YouTube Music...' : query ? 'No tracks found' : 'Type to search tracks or commands'}
              </div>
            ) : (
              (['Actions', 'Recently Played', 'Library', 'YouTube Search'] as const).map((sectionName) => {
                const sectionItems = items.filter((item) => item.section === sectionName);
                if (sectionItems.length === 0) return null;

                return (
                  <div key={sectionName} className="py-1.5 px-2">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      {sectionName}
                    </div>
                    <div className="space-y-1 mt-1">
                      {sectionItems.map((item) => {
                        const itemGlobalIndex = items.indexOf(item);
                        const isSelected = itemGlobalIndex === activeIndex;

                        if (item.type === 'action' && item.action) {
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                item.action!.action();
                                toggleCommandPalette();
                              }}
                              onMouseEnter={() => setActiveIndex(itemGlobalIndex)}
                              role="option"
                              aria-selected={isSelected}
                              className={cn(
                                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors',
                                isSelected ? 'bg-[#1e1e26] text-white' : 'text-zinc-300 hover:bg-[#14141a]'
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <Zap size={14} className={isSelected ? 'text-white' : 'text-zinc-500'} />
                                <span>{item.action.label}</span>
                              </div>
                              {item.action.shortcut && (
                                <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-[#27272f] border border-zinc-700 text-zinc-300 font-mono-time">
                                  {item.action.shortcut}
                                </kbd>
                              )}
                            </button>
                          );
                        }

                        if (item.type === 'track' && item.track) {
                          const t = item.track;
                          return (
                            <div
                              key={item.id}
                              onMouseEnter={() => setActiveIndex(itemGlobalIndex)}
                              role="option"
                              aria-selected={isSelected}
                              className={cn(
                                'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors group',
                                isSelected ? 'bg-[#1e1e26] text-white' : 'text-zinc-300 hover:bg-[#14141a]'
                              )}
                            >
                              {/* Left track preview */}
                              <div
                                onClick={() => {
                                  play(t);
                                  toggleCommandPalette();
                                }}
                                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                              >
                                <div className="relative w-9 h-9 rounded-md bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700/50">
                                  {t.thumbnailUrl ? (
                                    <Image src={t.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">♫</div>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">{t.title}</p>
                                  <p className="text-[11px] text-zinc-400 truncate">{t.artist}</p>
                                </div>
                              </div>

                              {/* Right Actions: Duration + Play Now + Add to Queue + Add to Playlist */}
                              <div className="flex items-center gap-2 shrink-0 ml-3">
                                <span className="font-mono-time text-[11px] text-zinc-500 mr-1">
                                  {formatTime(t.duration)}
                                </span>

                                {/* 1. Play Now */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    play(t);
                                    toggleCommandPalette();
                                  }}
                                  aria-label={`Play ${t.title} now`}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-white text-black text-[11px] font-semibold hover:bg-zinc-200 transition-colors shadow-sm"
                                  title="Play Now"
                                >
                                  <Play size={11} fill="currentColor" />
                                  <span>Play</span>
                                </button>

                                {/* 2. Add to Queue */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToQueue(t);
                                    showToast(`Added "${t.title}" to Queue`);
                                  }}
                                  aria-label={`Add ${t.title} to Queue`}
                                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#27272f] hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition-colors border border-zinc-700/60"
                                  title="Add to Queue"
                                >
                                  <Plus size={12} />
                                  <span>Queue</span>
                                </button>

                                {/* 3. Add to Playlist */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPlaylistTrack(t);
                                  }}
                                  aria-label={`Add ${t.title} to Playlist`}
                                  className="p-1.5 rounded bg-[#27272f] hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700/60"
                                  title="Add to Playlist"
                                >
                                  <ListPlus size={13} />
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
              })
            )}
          </div>

          {/* Footer Hints */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#1e1e24] bg-[#0e0e13] text-[11px] text-zinc-500">
            <div className="flex items-center gap-3">
              <span><kbd className="font-mono-time text-zinc-400">↑↓</kbd> Navigate</span>
              <span><kbd className="font-mono-time text-zinc-400">↵</kbd> Play</span>
              <span><kbd className="font-mono-time text-zinc-400">ESC</kbd> Close</span>
            </div>
            <span className="text-[10px] text-zinc-500">Search with 1-click Queue & Playlist</span>
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
    </>
  );
}
