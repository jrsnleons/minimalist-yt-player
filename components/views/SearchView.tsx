'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from '@/components/playlist/TrackRow';
import { debounce } from '@/lib/utils';
import { Search, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import type { Track } from '@/types';

const POPULAR_QUERIES = [
  'Lofi Hip Hop Study',
  'Hans Zimmer OST',
  'Synthwave Chill',
  'Deep Focus Ambient',
  'Video Game Soundtracks',
  'Piano Relaxation',
  'Jazz Coffee Shop',
];

export function SearchView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentTrack } = usePlayerStore();

  const handleSearch = useCallback(
    debounce(async (q: string) => {
      if (!q.trim() || q.trim().length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results?: Track[] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (query.trim().length >= 2) {
      setIsLoading(true);
      handleSearch(query);
    } else {
      setResults([]);
      setIsLoading(false);
    }
  }, [query, handleSearch]);

  const selectChip = (chip: string) => {
    setQuery(chip);
  };

  return (
    <div className="rounded-2xl border border-[#27272a] bg-[#0f0f13] overflow-hidden shadow-sm h-full flex flex-col min-h-0">
      {/* Search Input Bar (Pinned) */}
      <div className="p-4 border-b border-[#222228] bg-[#121217] shrink-0">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3.5 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search YouTube Music for songs, artists, albums..."
            autoFocus
            className="w-full pl-9 pr-9 py-2 rounded-xl bg-[#181820] border border-[#2e2e38] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 transition-colors shadow-inner"
          />
          {isLoading && (
            <Loader2 size={14} className="absolute right-3.5 text-zinc-400 animate-spin" />
          )}
        </div>

        {/* Quick Discovery Chips */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-0.5 text-xs">
          <div className="flex items-center gap-1 text-zinc-500 shrink-0 font-medium text-[10px]">
            <TrendingUp size={11} />
            <span>Trending:</span>
          </div>
          {POPULAR_QUERIES.map((chip) => (
            <button
              key={chip}
              onClick={() => selectChip(chip)}
              className="px-2 py-0.5 rounded-full bg-[#1a1a22] hover:bg-[#252530] border border-[#27272f] hover:border-zinc-600 text-zinc-300 text-[10px] font-medium transition-colors shrink-0 cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table (Scrollable) */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {results.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-zinc-400" />
                <p>Searching YouTube Music...</p>
              </div>
            ) : query.trim() ? (
              <p className="text-zinc-400">No tracks found matching &quot;{query}&quot;</p>
            ) : (
              <div className="max-w-xs mx-auto">
                <Sparkles size={26} className="mx-auto text-zinc-700 mb-2" />
                <p className="font-medium text-zinc-300">Discover & Explore</p>
                <p className="text-zinc-600 mt-1">Type any query above or select a trending genre</p>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse" role="grid">
            <thead className="sticky top-0 z-10 bg-[#0f0f13]">
              <tr className="border-b border-[#222228] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="w-12 px-3 py-2 text-center">#</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Artist</th>
                <th className="w-36 px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e24]/40">
              {results.map((track, i) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={i}
                  isActive={currentTrack?.id === track.id}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
