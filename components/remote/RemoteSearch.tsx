'use client';

import { useRef, useState } from 'react';
import { ListEnd, ListStart, Loader2, Search } from 'lucide-react';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { formatTime } from '@/lib/utils';
import type { Track } from '@/types';
import type { RemoteApi } from '@/components/remote/RemoteController';

const smallBtn =
  'w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white';

export function RemoteSearch({ api, locked }: { api: RemoteApi; locked: boolean }) {
  const { enabled, send, notify } = api;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);
  const canEdit = enabled && !locked;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?${new URLSearchParams({ q, type: 'song' })}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (id !== reqId.current) return;
      const list: Track[] = Array.isArray(data.tracks) && data.tracks.length ? data.tracks : data.results ?? [];
      setResults(list);
    } catch {
      if (id !== reqId.current) return;
      setError('Search failed. Try again.');
      setResults(null);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  };

  const add = async (track: Track, type: 'playNext' | 'addToQueue') => {
    if (await send({ type, track })) notify(type === 'playNext' ? 'Playing next' : 'Added to queue');
  };

  return (
    <section aria-label="Search" className="flex flex-col gap-3">
      <form onSubmit={submit} role="search" className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search songs"
          placeholder="Search songs"
          enterKeyHint="search"
          autoComplete="off"
          className="flex-1 min-w-0 min-h-[44px] px-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-base text-white placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        />
        <button
          type="submit"
          aria-label="Search"
          disabled={query.trim().length < 2 || loading}
          className="w-11 h-11 shrink-0 rounded-xl bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {loading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
        </button>
      </form>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {results && results.length === 0 && <p className="text-sm text-zinc-400 py-6 text-center">No results.</p>}

      {results && results.length > 0 && (
        <ul className="flex flex-col">
          {results.map((track) => (
            <li key={track.id} className="flex items-center gap-1">
              <button
                onClick={() => send({ type: 'playTrack', track })}
                disabled={!canEdit}
                aria-label={`Play ${track.title}`}
                className="flex items-center gap-3 flex-1 min-w-0 min-h-[56px] py-1.5 pr-1 text-left rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
              >
                <TrackArtwork track={track} size="fill" rounded="md" className="w-11 h-11 shrink-0" />
                <span className="min-w-0 flex flex-col">
                  <span className="truncate text-sm font-medium text-zinc-100">{track.title}</span>
                  <span className="truncate text-xs text-zinc-400">
                    {track.artist}
                    {track.duration > 0 && <span className="font-mono"> · {formatTime(track.duration)}</span>}
                  </span>
                </span>
              </button>
              <button
                aria-label={`Play ${track.title} next`}
                disabled={!canEdit}
                onClick={() => add(track, 'playNext')}
                className={smallBtn}
              >
                <ListStart size={18} aria-hidden="true" />
              </button>
              <button
                aria-label={`Add ${track.title} to queue`}
                disabled={!canEdit}
                onClick={() => add(track, 'addToQueue')}
                className={smallBtn}
              >
                <ListEnd size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
