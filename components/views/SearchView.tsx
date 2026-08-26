'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from '@/components/playlist/TrackRow';
import { db } from '@/db/schema';
import { debounce, uuid } from '@/lib/utils';
import { Search, Loader2, Music, Download, Play, X, Disc3 } from 'lucide-react';
import type { Track, SearchPlaylist, Playlist } from '@/types';
import { cn } from '@/lib/utils';

type SearchFilter = 'all' | 'song' | 'playlist';

export function SearchView() {
  const [query, setQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<SearchPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);

  const { currentTrack, play, showToast } = usePlayerStore();

  const handleSearch = useCallback(
    debounce(async (q: string, filterType: SearchFilter) => {
      if (!q.trim() || q.trim().length < 2) {
        setTracks([]);
        setPlaylists([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${filterType}`);
        const data = await res.json();
        setTracks(data.tracks ?? data.results ?? []);
        setPlaylists(data.playlists ?? []);
      } catch {
        setTracks([]);
        setPlaylists([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (query.trim().length >= 2) {
      setIsLoading(true);
      handleSearch(query, searchFilter);
    } else {
      setTracks([]);
      setPlaylists([]);
      setIsLoading(false);
    }
  }, [query, searchFilter, handleSearch]);

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

  const hasResults = tracks.length > 0 || playlists.length > 0;

  return (
    <div className="rounded-2xl border border-[#27272a] bg-[#0f0f13] overflow-hidden shadow-sm h-full flex flex-col min-h-0">
      {/* Pinned Search Input Header */}
      <div className="p-4 border-b border-[#222228] bg-[#121217] shrink-0 space-y-3">
        {/* Search Bar with Filter Pills */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 flex items-center">
            <Search size={15} className="absolute left-3.5 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search YouTube for songs, artists, or playlists…"
              autoFocus
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-[#181820] border border-[#2e2e38] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors shadow-inner"
            />
            {query.trim() && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 p-0.5 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
            {isLoading && (
              <Loader2 size={13} className="absolute right-3.5 text-zinc-400 animate-spin" />
            )}
          </div>

          {/* Clean Segmented Filter Selector */}
          <div className="flex items-center bg-[#181820] border border-[#2e2e38] p-0.5 rounded-xl shrink-0">
            {(['all', 'song', 'playlist'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSearchFilter(filter)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all cursor-pointer',
                  searchFilter === filter
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                {filter === 'all' ? 'All' : filter === 'song' ? 'Songs' : 'Playlists'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Results Area */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {!hasResults ? (
          <div className="py-20 text-center text-zinc-500 text-xs">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-zinc-400" />
                <p>Searching YouTube & YouTube Music…</p>
              </div>
            ) : query.trim() ? (
              <p className="text-zinc-400">No results found for &quot;{query}&quot;</p>
            ) : (
              <div className="max-w-xs mx-auto">
                <Disc3 size={28} className="mx-auto text-zinc-700 mb-2" />
                <p className="font-semibold text-zinc-300">Clean YouTube Music Search</p>
                <p className="text-zinc-500 text-[11px] mt-1 leading-relaxed">
                  Search millions of songs and curated public playlists with zero algorithmic fluff.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {/* Playlists Section (Shown in 'all' or 'playlist' mode) */}
            {(searchFilter === 'all' || searchFilter === 'playlist') && playlists.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Music size={13} className="text-zinc-400" />
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Playlists ({playlists.length})
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {playlists.map((pl) => {
                    const isPlLoading = loadingPlaylistId === pl.id;
                    return (
                      <div
                        key={pl.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#14141a] hover:bg-[#1c1c24] border border-[#27272f] hover:border-zinc-600 transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/50 shrink-0">
                            {pl.thumbnailUrl ? (
                              <Image src={pl.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">
                                <Music size={14} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-semibold text-zinc-200 truncate leading-snug">
                              {pl.title}
                            </h5>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                              {pl.author}
                            </p>
                          </div>
                        </div>

                        {/* Quick Playlist Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handlePlayPlaylist(pl)}
                            disabled={isPlLoading}
                            className="p-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                            title="Play playlist"
                          >
                            {isPlLoading ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Play size={11} fill="currentColor" />
                            )}
                          </button>

                          <button
                            onClick={() => handleImportPlaylist(pl)}
                            disabled={isPlLoading}
                            className="p-1.5 rounded-lg bg-[#22222a] text-zinc-300 hover:text-white hover:bg-[#2c2c36] border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
                            title="Import to library"
                          >
                            <Download size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Songs Section (Shown in 'all' or 'song' mode) */}
            {(searchFilter === 'all' || searchFilter === 'song') && tracks.length > 0 && (
              <section className="space-y-2">
                {searchFilter === 'all' && (
                  <div className="flex items-center gap-2 px-1 pt-1">
                    <Disc3 size={13} className="text-zinc-400" />
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Songs ({tracks.length})
                    </h4>
                  </div>
                )}

                <div className="rounded-xl border border-[#222228] bg-[#0c0c10] overflow-hidden">
                  <table className="w-full text-left border-collapse table-fixed" role="grid">
                    <thead className="sticky top-0 z-10 bg-[#0f0f13]">
                      <tr className="border-b border-[#222228] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="w-10 px-2 py-2 text-center">#</th>
                        <th className="px-2 py-2">Track</th>
                        <th className="w-48 px-2 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e24]/40">
                      {tracks.map((track, i) => (
                        <TrackRow
                          key={track.id}
                          track={track}
                          index={i}
                          isActive={currentTrack?.id === track.id}
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
