'use client';

import { useState, useEffect } from 'react';
import { Plus, Clock, Music, HardDrive } from 'lucide-react';
import Image from 'next/image';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { CreatePlaylistModal } from '@/components/playlist/CreatePlaylistModal';
import { estimateStorageMB, cn } from '@/lib/utils';
import type { Playlist, Track } from '@/types';

interface SidebarPlaylistsProps {
  onSelectPlaylist: (playlist: Playlist) => void;
  activePlaylistId?: string;
}

export function SidebarPlaylists({ onSelectPlaylist, activePlaylistId }: SidebarPlaylistsProps) {
  const { leftSidebarOpen, recentlyPlayed, play } = usePlayerStore();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [storageMB, setStorageMB] = useState<number>(0);

  const playlists = useLiveQuery(() => db.playlists.orderBy('updatedAt').reverse().toArray(), []);
  const trackCount = useLiveQuery(() => db.tracks.count(), []);

  useEffect(() => {
    estimateStorageMB().then(setStorageMB);
  }, []);

  return (
    <>
      <aside
        className={cn(
          'flex flex-col h-full border-r border-zinc-800 bg-zinc-900/30',
          'sidebar-transition overflow-hidden shrink-0',
          leftSidebarOpen ? 'w-64' : 'w-0'
        )}
        aria-label="Library sidebar"
        aria-hidden={!leftSidebarOpen}
      >
        <div className="flex flex-col h-full min-w-64 overflow-hidden">
          {/* Recently Played */}
          <section className="px-3 pt-4 pb-2" aria-labelledby="recently-played-heading">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={13} className="text-zinc-500" />
              <h3 id="recently-played-heading" className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Recently Played
              </h3>
            </div>

            {recentlyPlayed.length === 0 ? (
              <p className="text-xs text-zinc-700 px-1 py-2">Nothing yet — start playing!</p>
            ) : (
              <ul className="space-y-0.5">
                {recentlyPlayed.slice(0, 8).map((track) => (
                  <li key={track.id}>
                    <button
                      onClick={() => play(track)}
                      aria-label={`Play ${track.title} by ${track.artist}`}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-zinc-800 transition-opacity group"
                    >
                      <div className="relative w-8 h-8 rounded overflow-hidden bg-zinc-800 shrink-0">
                        {track.thumbnailUrl && (
                          <Image src={track.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-white truncate">{track.title}</p>
                        <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="border-t border-zinc-800 mx-3 my-1" />

          {/* Playlists */}
          <section className="flex-1 overflow-y-auto px-3 py-2" aria-labelledby="playlists-heading">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Music size={13} className="text-zinc-500" />
                <h3 id="playlists-heading" className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Playlists
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(true)}
                aria-label="Create new playlist"
                className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-opacity"
              >
                <Plus size={14} />
              </button>
            </div>

            {!playlists || playlists.length === 0 ? (
              <p className="text-xs text-zinc-700 px-1 py-2">No playlists yet</p>
            ) : (
              <ul className="space-y-0.5">
                {playlists.map((playlist) => (
                  <li key={playlist.id}>
                    <button
                      onClick={() => onSelectPlaylist(playlist)}
                      aria-label={`Open playlist: ${playlist.name}`}
                      aria-current={activePlaylistId === playlist.id ? 'page' : undefined}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-2 rounded text-left',
                        'text-xs transition-opacity',
                        activePlaylistId === playlist.id
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      )}
                    >
                      <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                        <Music size={11} className="text-zinc-500" />
                      </div>
                      <span className="truncate">{playlist.name}</span>
                      <span className="ml-auto text-zinc-600 shrink-0">{playlist.trackIds.length}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Storage stats */}
          <div className="px-3 py-3 border-t border-zinc-800">
            <div className="flex items-center gap-1.5 text-zinc-600">
              <HardDrive size={11} />
              <span className="text-[10px] font-mono-time">
                {trackCount ?? 0} tracks · {storageMB} MB
              </span>
            </div>
          </div>
        </div>
      </aside>

      <CreatePlaylistModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </>
  );
}
