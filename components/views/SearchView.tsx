'use client';

import { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from '@/components/playlist/TrackRow';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
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
  Loader2,
  Music,
  Download,
  Play,
  X,
  Disc3,
  Video,
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
    <div
      onClick={() => onViewSongs(playlist)}
      className="group flex items-center justify-between p-3 rounded-2xl border border-white/[0.07] bg-[#0c0c11] hover:bg-white/[0.04] hover:border-white/[0.14] transition-all duration-200 cursor-pointer overflow-hidden select-none"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
        <div className="shrink-0">
          <TrackArtwork
            src={playlist.thumbnailUrl}
            title={playlist.title}
            artist={playlist.author}
            id={playlist.id}
            size="md"
            rounded="lg"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate leading-snug">
            {playlist.title}
          </h5>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-sans">
            {playlist.author || 'YouTube'}
          </p>
        </div>
      </div>

      {/* Quick Playlist Actions */}
      <div
        className="flex items-center gap-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onViewSongs(playlist)}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer min-h-[36px] flex items-center"
          title="View songs"
          aria-label={`View songs in ${playlist.title}`}
        >
          Songs
        </button>

        <button
          onClick={() => onPlay(playlist)}
          disabled={isLoading}
          className="p-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all shadow-sm cursor-pointer disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Play playlist"
          aria-label={`Play playlist ${playlist.title}`}
        >
          {isLoading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Play size={13} fill="currentColor" />
          )}
        </button>

        <button
          onClick={() => onImport(playlist)}
          disabled={isLoading}
          className="p-2 rounded-xl bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
          title="Import to library"
          aria-label={`Import playlist ${playlist.title}`}
        >
          <Download size={13} />
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
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

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
    <div className="rounded-2xl border border-white/[0.08] bg-[#09090d] overflow-hidden shadow-sm h-full flex flex-col min-h-0">
      {/* Pinned Search Input Header */}
      <div className="p-4 border-b border-white/[0.06] bg-[#0c0c10] shrink-0 space-y-3">
        {/* Search Bar with Filter Pills */}
        <div className="flex items-center gap-3">
          {/* Single clean container with no inner outline boxes */}
          <div className="relative flex-1 flex items-center rounded-2xl bg-white/[0.04] border border-white/[0.08] focus-within:border-white/25 focus-within:bg-white/[0.06] transition-all duration-200 group">
            <Search
              size={15}
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
              placeholder="Search songs, artists, videos, or playlists…"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              enterKeyHint="search"
              className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder-zinc-500 py-2.5 pl-9 pr-16"
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
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  aria-label="Clear search query"
                  title="Clear (ESC)"
                >
                  <X size={13} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[11px] font-mono text-zinc-500 bg-white/[0.04] border border-white/[0.08] rounded-md pointer-events-none">
                  ESC
                </kbd>
              )}
            </div>
          </div>

          {/* Clean Segmented Filter Selector */}
          <div
            className="flex items-center bg-white/[0.03] border border-white/[0.08] p-0.5 rounded-xl shrink-0"
            role="tablist"
            aria-label="Search filter category"
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
                  role="tab"
                  aria-selected={searchFilter === filter}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer min-h-[36px]',
                    searchFilter === filter
                      ? 'bg-white text-black shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
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
                        'px-1.5 py-0.2 rounded text-[11px] font-mono font-medium',
                        searchFilter === filter
                          ? 'bg-black/10 text-black'
                          : 'bg-white/[0.06] text-zinc-400'
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
      <div className="overflow-y-auto flex-1 min-h-0">
        {isLoading && isSearchActive && !hasResults ? (
          /* ─── SHIMMER SKELETON LOADING STATE ───────────────────────── */
          <div className="p-3.5 space-y-4">
            {(searchFilter === 'all' || searchFilter === 'playlist') && (
              <section className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <PlaylistCardSkeleton key={`skeleton-pl-${i}`} />
                  ))}
                </div>
              </section>
            )}

            {(searchFilter === 'all' || searchFilter === 'song') && (
              <section className="space-y-2.5">
                <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c10] overflow-hidden">
                  <table className="w-full text-left border-collapse table-fixed" role="grid">
                    <tbody className="divide-y divide-white/[0.03]">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <TrackRowSkeleton key={`skeleton-track-${i}`} index={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        ) : !hasResults ? (
          /* ─── MINIMALIST EMPTY OR NO RESULTS STATE ───────────────────── */
          <div className="py-20 px-4 text-center text-zinc-500 text-xs flex flex-col items-center justify-center my-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-zinc-500 mb-3">
              <Search size={20} />
            </div>
            {query.trim() ? (
              <div className="max-w-sm mx-auto space-y-1">
                <p className="font-semibold text-zinc-200 text-xs font-sans">
                  No Results Found
                </p>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  No tracks or playlists found matching &quot;{query}&quot;.
                </p>
              </div>
            ) : (
              <div className="max-w-sm mx-auto space-y-1">
                <p className="font-semibold text-zinc-200 text-xs font-sans">
                  Search Music
                </p>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Find official tracks, YouTube videos, and playlists.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ─── POPULATED RESULTS ────────────────────────────────────── */
          <div className="p-3.5 space-y-4">
            {/* 1. Playlists Section (Shown in 'all' or 'playlist' mode) */}
            {(searchFilter === 'all' || searchFilter === 'playlist') && playlists.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Music size={14} className="text-zinc-400" />
                  <h4 className="text-xs font-semibold text-zinc-200 tracking-tight font-sans">
                    Playlists ({playlists.length})
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
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
              <section className="space-y-2">
                {searchFilter === 'all' && (
                  <div className="flex items-center gap-2 px-1 pt-1">
                    <Disc3 size={14} className="text-zinc-400" />
                    <h4 className="text-xs font-semibold text-zinc-200 tracking-tight font-sans">
                      Songs ({tracks.length})
                    </h4>
                  </div>
                )}

                <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c10] overflow-hidden">
                  <table className="w-full text-left border-collapse table-fixed" role="grid">
                    <thead className="sticky top-0 z-10 bg-[#09090d]">
                      <tr className="border-b border-white/[0.06] text-[11px] font-medium text-zinc-400">
                        <th className="w-10 px-2 py-2 text-center">#</th>
                        <th className="px-2 py-2">Track</th>
                        <th className="w-28 px-2 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
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
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1 pt-1">
                  <div className="flex items-center gap-2">
                    <Video size={14} className="text-zinc-400" />
                    <h4 className="text-xs font-semibold text-zinc-200 tracking-tight font-sans">
                      Videos ({videos.length})
                    </h4>
                  </div>
                  {searchFilter === 'all' && (
                    <span className="text-[11px] text-zinc-400 font-mono">
                      Live sets, full albums & covers
                    </span>
                  )}
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c10] overflow-hidden">
                  <table className="w-full text-left border-collapse table-fixed" role="grid">
                    <thead className="sticky top-0 z-10 bg-[#09090d]">
                      <tr className="border-b border-white/[0.06] text-[11px] font-medium text-zinc-400">
                        <th className="w-10 px-2 py-2 text-center">#</th>
                        <th className="px-2 py-2">Video / Track</th>
                        <th className="w-28 px-2 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
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
