'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Search, Music, Zap, Loader2, Play, Plus, Settings, Video, Shuffle, Repeat, Trash2, PanelLeft, PanelRight, Clock } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { debounce, formatTime, cn } from '@/lib/utils';
import type { Track, CommandPaletteScope, AppAction } from '@/types';

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
  const [scope, setScope] = useState<'all' | 'local' | 'youtube' | 'actions'>('all');
  const [ytResults, setYtResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // App actions list
  const actions: AppAction[] = [
    {
      id: 'open-settings',
      label: 'Open Settings & Engine Options',
      action: () => toggleSettings(),
    },
    {
      id: 'toggle-video',
      label: `Toggle Video PiP (${isVideoEnabled ? 'Currently On' : 'Currently Off'})`,
      shortcut: 'V',
      action: () => toggleVideo(),
    },
    {
      id: 'toggle-shuffle',
      label: `Toggle Shuffle (${shuffleMode ? 'Enabled' : 'Disabled'})`,
      shortcut: 'S',
      action: () => toggleShuffle(),
    },
    {
      id: 'cycle-repeat',
      label: `Cycle Repeat Mode (${repeatMode.toUpperCase()})`,
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
    {
      id: 'toggle-left-sidebar',
      label: 'Toggle Library Sidebar',
      shortcut: '[',
      action: () => toggleLeftSidebar(),
    },
    {
      id: 'toggle-right-sidebar',
      label: 'Toggle Queue Sidebar',
      shortcut: ']',
      action: () => toggleRightSidebar(),
    },
  ];

  // Local tracks search across IndexedDB
  const localTracks = useLiveQuery(async () => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return db.tracks
      .filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
      .limit(8)
      .toArray();
  }, [query]);

  // Debounced YouTube search
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

  // Auto-focus and reset on open
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setActiveIndex(0);
      setScope('all');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  // Filter actions based on query
  const filteredActions = query.trim()
    ? actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : actions;

  // Build unified result list with sections
  interface ListItem {
    id: string;
    section: 'Actions' | 'Library Tracks' | 'YouTube Music' | 'Recently Played';
    type: 'action' | 'track';
    action?: AppAction;
    track?: Track;
  }

  const items: ListItem[] = [];

  if (!query.trim()) {
    // When empty, show quick actions & recently played
    if (scope === 'all' || scope === 'actions') {
      filteredActions.slice(0, 4).forEach((a) => {
        items.push({ id: `act-${a.id}`, section: 'Actions', type: 'action', action: a });
      });
    }
    if ((scope === 'all' || scope === 'local') && recentlyPlayed.length > 0) {
      recentlyPlayed.slice(0, 6).forEach((t) => {
        items.push({ id: `recent-${t.id}`, section: 'Recently Played', type: 'track', track: t });
      });
    }
  } else {
    // When searching:
    if (scope === 'all' || scope === 'actions') {
      filteredActions.forEach((a) => {
        items.push({ id: `act-${a.id}`, section: 'Actions', type: 'action', action: a });
      });
    }
    if ((scope === 'all' || scope === 'local') && localTracks && localTracks.length > 0) {
      localTracks.forEach((t) => {
        items.push({ id: `local-${t.id}`, section: 'Library Tracks', type: 'track', track: t });
      });
    }
    if ((scope === 'all' || scope === 'youtube') && ytResults.length > 0) {
      ytResults.forEach((t) => {
        items.push({ id: `yt-${t.id}`, section: 'YouTube Music', type: 'track', track: t });
      });
    }
  }

  // Keyboard navigation
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

  // Scroll active item into view
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
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-20 px-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={toggleCommandPalette}
        aria-hidden="true"
      />

      {/* Palette Container */}
      <div
        className="relative w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-950/95 shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl"
        role="combobox"
        aria-expanded="true"
        aria-haspopup="listbox"
        aria-label="Command palette"
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800/80 bg-zinc-900/40">
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
            placeholder={
              scope === 'local'
                ? 'Search your library...'
                : scope === 'youtube'
                ? 'Search YouTube Music tracks...'
                : scope === 'actions'
                ? 'Search commands and shortcuts...'
                : 'Search tracks, library, commands...'
            }
            aria-label="Command palette search input"
            aria-autocomplete="list"
            aria-controls="palette-results-list"
            className="flex-1 bg-transparent text-white placeholder-zinc-500 text-sm focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono-time shrink-0">
            ESC
          </kbd>
        </div>

        {/* Filter Scope Tabs */}
        <div className="flex items-center px-3 border-b border-zinc-800/80 bg-zinc-900/20 text-xs" role="tablist">
          {[
            { key: 'all', label: 'All' },
            { key: 'youtube', label: 'YouTube' },
            { key: 'local', label: 'Library' },
            { key: 'actions', label: 'Actions' },
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
                'px-3 py-2 border-b-2 font-medium transition-colors',
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
          id="palette-results-list"
          role="listbox"
          aria-label="Search results"
          className="max-h-[380px] overflow-y-auto py-2 divide-y divide-zinc-800/40"
        >
          {items.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              {isLoading ? 'Searching YouTube Music...' : query ? 'No results found' : 'Type to search tracks or actions'}
            </div>
          ) : (
            // Group items by section
            (['Actions', 'Recently Played', 'Library Tracks', 'YouTube Music'] as const).map((sectionName) => {
              const sectionItems = items.filter((item) => item.section === sectionName);
              if (sectionItems.length === 0) return null;

              return (
                <div key={sectionName} className="py-1.5 px-2">
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    {sectionName}
                  </div>
                  <div className="space-y-0.5 mt-1">
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
                              isSelected ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <Zap size={14} className={isSelected ? 'text-white' : 'text-zinc-500'} />
                              <span>{item.action.label}</span>
                            </div>
                            {item.action.shortcut && (
                              <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-900 border border-zinc-700 text-zinc-400 font-mono-time">
                                {item.action.shortcut}
                              </kbd>
                            )}
                          </button>
                        );
                      }

                      if (item.type === 'track' && item.track) {
                        const t = item.track;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              play(t);
                              toggleCommandPalette();
                            }}
                            onMouseEnter={() => setActiveIndex(itemGlobalIndex)}
                            role="option"
                            aria-selected={isSelected}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group',
                              isSelected ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                            )}
                          >
                            <div className="relative w-8 h-8 rounded bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700/50">
                              {t.thumbnailUrl ? (
                                <Image src={t.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">♫</div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{t.title}</p>
                              <p className="text-[11px] text-zinc-500 truncate">{t.artist}</p>
                            </div>

                            <span className="font-mono-time text-[11px] text-zinc-500 shrink-0">
                              {formatTime(t.duration)}
                            </span>
                          </button>
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

        {/* Footer Navigation Hints */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800/80 bg-zinc-900/40 text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono-time text-zinc-400">↑↓</kbd> Navigate</span>
            <span><kbd className="font-mono-time text-zinc-400">↵</kbd> Select / Play</span>
            <span><kbd className="font-mono-time text-zinc-400">ESC</kbd> Close</span>
          </div>
          <span className="font-mono-time text-zinc-600 text-[10px]">Minimalist Player</span>
        </div>
      </div>
    </div>
  );
}
