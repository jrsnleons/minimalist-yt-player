'use client';

import { Heart, Music } from 'lucide-react';
import type { RemoteApi } from '@/components/remote/RemoteController';

export function RemotePlaylists({ api, locked }: { api: RemoteApi; locked: boolean }) {
  const { state, enabled, send, notify } = api;
  const playlists = state.playlists.filter((p) => p.count > 0);

  return (
    <section aria-label="Playlists" className="flex flex-col gap-2">
      {playlists.length === 0 ? (
        <p className="text-sm text-zinc-400 py-6 text-center">No playlists on the playing device.</p>
      ) : (
        <ul className="flex flex-col">
          {playlists.map((pl) => (
            <li key={pl.id}>
              <button
                disabled={!enabled || locked}
                onClick={async () => {
                  if (await send({ type: 'playPlaylist', playlistId: pl.id })) notify(`Playing ${pl.name}`);
                }}
                aria-label={`Play ${pl.name}`}
                className="flex items-center gap-3 w-full min-h-[56px] py-1.5 text-left rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
              >
                <span className="w-11 h-11 shrink-0 rounded-md overflow-hidden bg-white/[0.06] flex items-center justify-center text-zinc-400">
                  {pl.id === 'liked-songs' ? (
                    <Heart size={18} className="fill-current text-rose-400" aria-hidden="true" />
                  ) : pl.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pl.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Music size={18} aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex flex-col">
                  <span className="truncate text-sm font-medium text-zinc-100">{pl.name}</span>
                  <span className="text-xs text-zinc-400">
                    {pl.count} {pl.count === 1 ? 'song' : 'songs'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
