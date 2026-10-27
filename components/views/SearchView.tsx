'use client';

import { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from '@/components/playlist/TrackRow';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlaylistPreviewModal } from '@/components/playlist/PlaylistPreviewModal';
import {
  Skeleton,
  TrackRowSkeleton,
  PlaylistCardSkeleton,
} from '@/components/ui/Skeleton';
import { db } from '@/db/schema';
import { uuid, cn } from '@/lib/utils';
import {
  Search,
  AlertCircle,
  Loader2,
  Download,
  Play,
  X,
} from 'lucide-react';
import type { Track, SearchPlaylist, Playlist } from '@/types';

type SearchFilter = 'all' | 'song' | 'video' | 'playlist';

interface CachedSearchResults {
  tracks: Track[];
  videos: Track[];
  playlists: SearchPlaylist[];
}

function SearchPlaylistCard({
  playlist,
  isLoading,
  onPlay,
  onImport,
  onViewSongs,
}: {
  playlist: SearchPlaylist;
  isLoading: boolean;
  onPlay: (pl: SearchPlaylist) => void;
  onImport: (pl: SearchPlaylist) => void;
  onViewSongs: (pl: SearchPlaylist) => void;
}) {
  return (
    <div className="group relative flex items-center justify-between gap-2 p-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] focus-within:bg-white/[0.07] transition-colors">
      <button
        type="button"
        onClick={() => onViewSongs(playlist)}
        aria-label={`View songs in ${playlist.title}`}
        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer after:content-[''] after:absolute after:inset-0 after:rounded-lg"
      >
        <TrackArtwork
          src={playlist.thumbnailUrl}
          title={playlist.title}
          artist={playlist.author}
          id={playlist.id}
          size="md"
          rounded="md"
        />
        <span className="min-w-0 flex-1 flex flex-col">
          <span className="truncate text-sm font-medium text-zinc-100">{playlist.title}</span>
          <span className="truncate text-[13px] text-zinc-400">{playlist.author || 'YouTube'}</span>
        </span>
      </button>

      {/* Secondary actions sit above the stretched button */}
      <div className="relative z-10 flex items-center gap-1 shrink-0">
        <button
          onClick={() => onPlay(playlist)}
          disabled={isLoading}
          className="w-9 h-9 rounded-full bg-[#f4f4f6] text-[#0b0b0e] hover:bg-white transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
          title="Play playlist"
          aria-label={`Play playlist ${playlist.title}`}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Play size={16} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <button
          onClick={() => onImport(playlist)}
          disabled={isLoading}
          className="w-9 h-9 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
          title="Import to library"
          aria-label={`Import playlist ${playlist.title}`}
        >
          <Download size={16} />
        </button>
      </div>
    </div>
  );
}

export function SearchView() {
  const [query, setQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [videos, setVideos] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<SearchPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);
  const [previewPlaylist, setPreviewPlaylist] = useState<SearchPlaylist | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // In-memory search cache mapping lowercase query -> results
  const searchCacheRef = useRef<Map<string, CachedSearchResults>>(new Map());

  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);
  const play = usePlayerStore((s) => s.play);
  const showToast = usePlayerStore((s) => s.showToast);

  // Search execution with caching & debouncing
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    setSearchError(false);
    if (trimmed.length < 2) {
      setTracks([]);
      setVideos([]);
      setPlaylists([]);
      setIsLoading(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    // 1. Instant Cache Hit
    const cached = searchCacheRef.current.get(trimmed);
    if (cached) {
      setTracks(cached.tracks);
      setVideos(cached.videos);
      setPlaylists(cached.playlists);
      setIsLoading(false);
      return;
    }

    // 2. Fetch if not cached
    setIsLoading(true);

    const timer = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&type=all`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data = await res.json();
        const newTracks: Track[] = data.tracks ?? [];
        const newVideos: Track[] = data.videos ?? [];
        const newPlaylists: SearchPlaylist[] = data.playlists ?? [];

        // Save to cache
        searchCacheRef.current.set(trimmed, {
          tracks: newTracks,
          videos: newVideos,
          playlists: newPlaylists,
        });

        setTracks(newTracks);
        setVideos(newVideos);
        setPlaylists(newPlaylists);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setTracks([]);
        setVideos([]);
        setPlaylists([]);
        setSearchError(true);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, retryCount]);

  const handlePlayPlaylist = async (pl: SearchPlaylist) => {
    setLoadingPlaylistId(pl.id);
    try {
      const res = await fetch(`/api/playlist?id=${encodeURIComponent(pl.id)}`);
      const data = await res.json();
      if (data.tracks && data.tracks.length > 0) {
        await db.tracks.bulkPut(data.tracks);
        play(data.tracks[0], data.tracks);
        showToast(`Playing "${pl.title}" (${data.tracks.length} tracks)`);
      } else {
        showToast('No playable tracks found in playlist');
      }
    } catch {
      showToast('Failed to load playlist tracks');
    } finally {
      setLoadingPlaylistId(null);
    }
  };

  const handleImportPlaylist = async (pl: SearchPlaylist) => {
    setLoadingPlaylistId(pl.id);
    try {
      const res = await fetch(`/api/playlist?id=${encodeURIComponent(pl.id)}`);
      const data = await res.json();
      if (data.tracks && data.tracks.length > 0) {
        await db.tracks.bulkPut(data.tracks);
        const newPl: Playlist = {
          id: uuid(),
          name: data.title || pl.title,
          description: data.description || `Imported by ${pl.author}`,
          trackIds: data.tracks.map((t: Track) => t.id),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await db.playlists.add(newPl);
        showToast(`Imported "${newPl.name}" with ${newPl.trackIds.length} tracks!`);
      } else {
        showToast('Playlist is empty or unavailable');
      }
    } catch {
      showToast('Failed to import playlist');
    } finally {
      setLoadingPlaylistId(null);
    }
  };

  const hasResults = tracks.length > 0 || videos.length > 0 || playlists.length > 0;
  const isSearchActive = query.trim().length >= 2;

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Pinned Search Input Header */}
      <div className="pb-4 shrink-0 space-y-4">
        <h1 className="text-[32px] leading-tight font-bold tracking-tight text-white">Search</h1>
        <div className="flex flex-wrap items-center gap-3">
          {/* Single clean container with no inner outline boxes */}
          <div className="relative flex-1 min-w-[220px] flex items-center rounded-lg bg-white/[0.04] border border-white/[0.12] focus-within:border-white/40 focus-within:bg-white/[0.06] transition-colors group">
            <Search
              size={16}
              className="absolute left-3.5 text-zinc-400 group-focus-within:text-white transition-colors pointer-events-none shrink-0"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setQuery('');
                }
              }}
              aria-label="Search"
              placeholder="Songs, artists, videos, or playlists"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              enterKeyHint="search"
              className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm text-white placeholder-zinc-400 py-3 pl-10 pr-16"
            />
            <div className="absolute right-2.5 flex items-center gap-1.5 shrink-0">
              {isLoading && (
                <Loader2 size={13} className="text-zinc-400 animate-spin" />
              )}
              {query.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  aria-label="Clear search"
                  title="Clear (ESC)"
                >
                  <X size={13} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.08] rounded-md pointer-events-none">
                  ESC
                </kbd>
              )}
            </div>
          </div>

          {/* Clean Segmented Filter Selector */}
          <div
            className="flex items-center bg-white/[0.04] p-0.5 rounded-lg shrink-0"
            role="group"
            aria-label="Filter results"
          >
            {(['all', 'song', 'video', 'playlist'] as const).map((filter) => {
              const count =
                filter === 'song'
                  ? tracks.length
                  : filter === 'video'
                  ? videos.length
                  : filter === 'playlist'
                  ? playlists.length
                  : null;

              return (
                <button
                  key={filter}
                  onClick={() => setSearchFilter(filter)}
                  aria-pressed={searchFilter === filter}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer min-h-[40px]',
                    searchFilter === filter
                      ? 'bg-[#f4f4f6] text-[#0b0b0e] font-semibold'
                      : 'text-zinc-300 hover:text-white'
                  )}
                >
                  <span>
                    {filter === 'all'
                      ? 'All'
                      : filter === 'song'
                      ? 'Songs'
                      : filter === 'video'
                      ? 'Videos'
                      : 'Playlists'}
                  </span>
                  {count !== null && count > 0 && (
                    <span
                      className={cn(
                        'px-1.5 rounded text-xs font-mono font-medium',
                        searchFilter === filter
                          ? 'bg-black/10 text-black'
                          : 'bg-white/[0.08] text-zinc-300'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Results / Skeletons / Empty State Area */}
      <div className="overflow-y-auto flex-1 min-h-0 pb-8">
        {isLoading && isSearchActive && !hasResults ? (
          /* ─── SHIMMER SKELETON LOADING STATE ───────────────────────── */
          <div className="space-y-8">
            {(searchFilter === 'all' || searchFilter === 'playlist') && (
              <section className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <PlaylistCardSkeleton key={`skeleton-pl-${i}`} />
                  ))}
                </div>
              </section>
            )}

            {(searchFilter === 'all' || searchFilter === 'song') && (
              <section className="space-y-2.5">
                <div>
                  <table className="w-full text-left border-collapse table-fixed">
                    <tbody>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <TrackRowSkeleton key={`skeleton-track-${i}`} index={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        ) : searchError ? (
          <EmptyState
            tone="error"
            icon={<AlertCircle size={28} />}
            title="Search failed"
            description="The request did not go through. Check the connection and try again."
          >
            <button
              type="button"
              onClick={() => setRetryCount((n) => n + 1)}
              className="px-4 min-h-[40px] rounded-lg bg-[#f4f4f6] text-[#0b0b0e] text-sm font-semibold hover:bg-white transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </EmptyState>
        ) : !hasResults ? (
          query.trim() ? (
            <EmptyState
              icon={<Search size={28} />}
              title="No results"
              description={`Nothing matches "${query.trim()}". Check the spelling or try fewer words.`}
            />
          ) : (
            <EmptyState
              icon={<Search size={28} />}
              title="Search Music"
              description="Find songs, YouTube videos, and playlists."
            />
          )
        ) : (
          /* ─── POPULATED RESULTS ────────────────────────────────────── */
          <div className="space-y-8">
            {/* 1. Playlists Section (Shown in 'all' or 'playlist' mode) */}
            {(searchFilter === 'all' || searchFilter === 'playlist') && playlists.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight text-white">
                    Playlists
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {playlists.map((pl) => (
                    <SearchPlaylistCard
                      key={pl.id}
                      playlist={pl}
                      isLoading={loadingPlaylistId === pl.id}
                      onPlay={handlePlayPlaylist}
                      onImport={handleImportPlaylist}
                      onViewSongs={setPreviewPlaylist}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 2. Songs Section (Shown in 'all' or 'song' mode) */}
            {(searchFilter === 'all' || searchFilter === 'song') && tracks.length > 0 && (
              <section className="space-y-3">
                {searchFilter === 'all' && (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-tight text-white">
                      Songs
                    </h2>
                  </div>
                )}

                <div>
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead className="sticky top-0 z-10 bg-[#0b0b0e]">
                      <tr className="border-b border-white/[0.06] text-xs font-medium text-zinc-400">
                        <th scope="col" className="w-14 px-2 py-2 text-center">#</th>
                        <th scope="col" className="px-2 py-2">Title</th>
                        <th scope="col" className="w-36 px-2 py-2 text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tracks.map((track, i) => (
                        <TrackRow
                          key={`song-${track.id}`}
                          track={track}
                          index={i}
                          isActive={currentTrackId === track.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 3. YouTube Videos Section (Shown in 'all' or 'video' mode) */}
            {(searchFilter === 'all' || searchFilter === 'video') && videos.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-tight text-white">
                      Videos
                    </h2>
                  </div>
                  {searchFilter === 'all' && (
                    <span className="text-[13px] text-zinc-400">
                      Live sets, full albums, and covers
                    </span>
                  )}
                </div>

                <div>
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead className="sticky top-0 z-10 bg-[#0b0b0e]">
                      <tr className="border-b border-white/[0.06] text-xs font-medium text-zinc-400">
                        <th scope="col" className="w-14 px-2 py-2 text-center">#</th>
                        <th scope="col" className="px-2 py-2">Title</th>
                        <th scope="col" className="w-36 px-2 py-2 text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.map((videoTrack, i) => (
                        <TrackRow
                          key={`video-${videoTrack.id}`}
                          track={videoTrack}
                          index={i}
                          isActive={currentTrackId === videoTrack.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Playlist Preview Modal */}
      {previewPlaylist && (
        <PlaylistPreviewModal
          playlist={previewPlaylist}
          isOpen={!!previewPlaylist}
          onClose={() => setPreviewPlaylist(null)}
        />
      )}
    </div>
  );
}
