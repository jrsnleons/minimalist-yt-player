'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from '@/components/playlist/TrackRow';
import { TrackArtwork, getTrackPalette } from '@/components/ui/TrackArtwork';
import { getCachedPalette, extractPaletteFromImageUrl } from '@/lib/paletteExtractor';
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
  Sparkles,
  Zap,
} from 'lucide-react';
import type { Track, SearchPlaylist, Playlist } from '@/types';

type SearchFilter = 'all' | 'song' | 'video' | 'playlist';

const QUICK_SEARCH_TAGS = [
  { label: 'Lofi Focus', query: 'lofi hip hop chill beats study' },
  { label: 'Cyber Synth', query: 'synthwave retrowave darksynth' },
  { label: 'Midnight Jazz', query: 'dark ambient jazz noir chillout' },
  { label: 'Acoustic Calm', query: 'acoustic guitar fingerstyle relaxing' },
  { label: 'Melodic Deep', query: 'melodic deep house chill vocal' },
  { label: 'Solo Piano', query: 'peaceful solo piano neoclassical' },
  { label: 'Anime Chill', query: 'lofi anime aesthetic chill soundtrack' },
  { label: 'Rock Classics', query: 'classic rock live acoustic' },
];

function SearchPlaylistCard({
  playlist,
  isLoading,
  onPlay,
  onImport,
}: {
  playlist: SearchPlaylist;
  isLoading: boolean;
  onPlay: (pl: SearchPlaylist) => void;
  onImport: (pl: SearchPlaylist) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const palette = useMemo(() => {
    return getTrackPalette(playlist.title, playlist.author, playlist.id);
  }, [playlist.title, playlist.author, playlist.id]);

  const [extractedPalette, setExtractedPalette] = useState(() => getCachedPalette(playlist.thumbnailUrl));

  useEffect(() => {
    if (!playlist.thumbnailUrl) return;
    const cached = getCachedPalette(playlist.thumbnailUrl);
    if (cached) {
      setExtractedPalette(cached);
      return;
    }
    let isMounted = true;
    extractPaletteFromImageUrl(playlist.thumbnailUrl).then((p) => {
      if (isMounted && p) setExtractedPalette(p);
    });
    return () => {
      isMounted = false;
    };
  }, [playlist.thumbnailUrl]);

  const pal = extractedPalette || palette;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 group overflow-hidden"
      style={{
        background: isHovered
          ? `linear-gradient(135deg, ${pal.accent}2c 0%, ${pal.bgFrom}65 55%, #0a0a0f 100%)`
          : `linear-gradient(135deg, ${pal.accent}12 0%, ${pal.bgFrom}25 55%, #0b0b0f 100%)`,
        borderColor: isHovered ? `${pal.accent}55` : `${pal.accent}20`,
      }}
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
          <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-sans">
            {playlist.author}
          </p>
        </div>
      </div>

      {/* Quick Playlist Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onPlay(playlist)}
          disabled={isLoading}
          className="p-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          title="Play playlist"
          aria-label={`Play playlist ${playlist.title}`}
        >
          {isLoading ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Play size={11} fill="currentColor" />
          )}
        </button>

        <button
          onClick={() => onImport(playlist)}
          disabled={isLoading}
          className="p-1.5 rounded-xl bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer disabled:opacity-50"
          title="Import to library"
          aria-label={`Import playlist ${playlist.title}`}
        >
          <Download size={11} />
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

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);
  const play = usePlayerStore((s) => s.play);
  const showToast = usePlayerStore((s) => s.showToast);

  // Search execution with AbortController and debouncing
  useEffect(() => {
    const trimmed = query.trim();
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

    setIsLoading(true);

    const timer = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&type=${searchFilter}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setTracks(data.tracks ?? []);
        setVideos(data.videos ?? []);
        setPlaylists(data.playlists ?? []);
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
  }, [query, searchFilter]);

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

  const handleSelectQuickTag = (tagQuery: string) => {
    setQuery(tagQuery);
    inputRef.current?.focus();
  };

  const hasResults = tracks.length > 0 || videos.length > 0 || playlists.length > 0;
  const isSearchActive = query.trim().length >= 2;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#09090d] overflow-hidden shadow-sm h-full flex flex-col min-h-0">
      {/* Pinned Search Input Header */}
      <div className="p-4 border-b border-white/[0.06] bg-[#0c0c10] shrink-0 space-y-3">
        {/* Search Bar with Filter Pills */}
        <div className="flex items-center gap-3">
          {/* Unified search bar container with smooth focus ring, eliminating double outlines */}
          <div className="relative flex-1 flex items-center rounded-2xl bg-white/[0.04] border border-white/[0.08] focus-within:border-white/30 focus-within:ring-2 focus-within:ring-white/10 focus-within:bg-white/[0.06] transition-all duration-200 group shadow-inner">
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
              placeholder="Search songs, artists, videos, or curated playlists…"
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
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono text-zinc-500 bg-white/[0.04] border border-white/[0.08] rounded-md pointer-events-none">
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
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all cursor-pointer',
                    searchFilter === filter
                      ? 'bg-white text-black shadow-sm'
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
                        'px-1 py-0.2 rounded text-[9px] font-mono',
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
        {isLoading && isSearchActive ? (
          /* ─── SHIMMER SKELETON LOADING STATE ───────────────────────── */
          <div className="p-3.5 space-y-4">
            {/* 1. Playlists Skeleton (if 'all' or 'playlist') */}
            {(searchFilter === 'all' || searchFilter === 'playlist') && (
              <section className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <Skeleton className="w-3.5 h-3.5" rounded="sm" />
                  <Skeleton className="w-24 h-3" rounded="sm" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {Array.from({ length: searchFilter === 'playlist' ? 6 : 3 }).map((_, i) => (
                    <PlaylistCardSkeleton key={`skeleton-pl-${i}`} />
                  ))}
                </div>
              </section>
            )}

            {/* 2. Songs Skeleton (if 'all' or 'song') */}
            {(searchFilter === 'all' || searchFilter === 'song') && (
              <section className="space-y-2.5">
                {searchFilter === 'all' && (
                  <div className="flex items-center gap-2 px-1 pt-1">
                    <Skeleton className="w-3.5 h-3.5" rounded="sm" />
                    <Skeleton className="w-28 h-3" rounded="sm" />
                  </div>
                )}
                <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c10] overflow-hidden">
                  <table className="w-full text-left border-collapse table-fixed" role="grid">
                    <thead className="sticky top-0 z-10 bg-[#09090d]">
                      <tr className="border-b border-white/[0.06] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="w-10 px-2 py-2 text-center">#</th>
                        <th className="px-2 py-2">Track</th>
                        <th className="w-28 px-2 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {Array.from({ length: searchFilter === 'song' ? 8 : 5 }).map((_, i) => (
                        <TrackRowSkeleton key={`skeleton-song-${i}`} index={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 3. Videos Skeleton (if 'all' or 'video') */}
            {(searchFilter === 'all' || searchFilter === 'video') && (
              <section className="space-y-2.5">
                {searchFilter === 'all' && (
                  <div className="flex items-center gap-2 px-1 pt-1">
                    <Skeleton className="w-3.5 h-3.5" rounded="sm" />
                    <Skeleton className="w-32 h-3" rounded="sm" />
                  </div>
                )}
                <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c10] overflow-hidden">
                  <table className="w-full text-left border-collapse table-fixed" role="grid">
                    <thead className="sticky top-0 z-10 bg-[#09090d]">
                      <tr className="border-b border-white/[0.06] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="w-10 px-2 py-2 text-center">#</th>
                        <th className="px-2 py-2">Video / Track</th>
                        <th className="w-28 px-2 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {Array.from({ length: searchFilter === 'video' ? 8 : 4 }).map((_, i) => (
                        <TrackRowSkeleton key={`skeleton-video-${i}`} index={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        ) : !hasResults ? (
          /* ─── EMPTY OR NO RESULTS STATE ────────────────────────────── */
          <div className="py-12 px-4 text-center text-zinc-500 text-xs flex flex-col items-center justify-center my-auto">
            {query.trim() ? (
              <div className="max-w-sm mx-auto space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-500 mb-3 mx-auto">
                  <Search size={20} />
                </div>
                <p className="font-bold text-white uppercase tracking-wider text-xs font-sans">
                  No Results Found
                </p>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  We couldn&apos;t find any tracks or playlists matching &quot;<span className="text-zinc-200">{query}</span>&quot;. Try alternative keywords or broader search terms.
                </p>
              </div>
            ) : (
              <div className="max-w-lg mx-auto space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 mb-2 mx-auto shadow-sm">
                  <Disc3 size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-white uppercase tracking-wider text-xs font-sans">
                    Explore YouTube Catalog
                  </h3>
                  <p className="text-zinc-400 text-[11px] mt-1 max-w-sm mx-auto leading-relaxed">
                    Search millions of official singles, live sets, concert videos, and curated playlists with zero noise.
                  </p>
                </div>

                {/* Quick Discovery Tags */}
                <div className="pt-2">
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2.5">
                    <Sparkles size={11} className="text-amber-400" />
                    <span>Popular Searches:</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
                    {QUICK_SEARCH_TAGS.map((tag) => (
                      <button
                        key={tag.label}
                        type="button"
                        onClick={() => handleSelectQuickTag(tag.query)}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.18] text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer group shadow-sm flex items-center gap-1.5"
                      >
                        <Zap size={10} className="text-zinc-500 group-hover:text-amber-400 transition-colors" />
                        <span>{tag.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
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
                  <Music size={13} className="text-zinc-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
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
                    <Disc3 size={13} className="text-zinc-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                      Music Tracks ({tracks.length})
                    </h4>
                  </div>
                )}

                <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c10] overflow-hidden">
                  <table className="w-full text-left border-collapse table-fixed" role="grid">
                    <thead className="sticky top-0 z-10 bg-[#09090d]">
                      <tr className="border-b border-white/[0.06] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
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
                    <Video size={13} className="text-zinc-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                      YouTube Videos ({videos.length})
                    </h4>
                  </div>
                  {searchFilter === 'all' && (
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Live sets, full albums & covers
                    </span>
                  )}
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c10] overflow-hidden">
                  <table className="w-full text-left border-collapse table-fixed" role="grid">
                    <thead className="sticky top-0 z-10 bg-[#09090d]">
                      <tr className="border-b border-white/[0.06] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
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
    </div>
  );
}
