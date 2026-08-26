'use client';

import { useState, useEffect } from 'react';
import { Plus, Clock, Music, HardDrive, ListPlus } from 'lucide-react';
import Image from 'next/image';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { CreatePlaylistModal } from '@/components/playlist/CreatePlaylistModal';
import { estimateStorageMB, cn } from '@/lib/utils';
import type { Playlist } from '@/types';

interface SidebarPlaylistsProps {
  onSelectPlaylist: (playlist: Playlist | null) => void;
  activePlaylistId?: string;
}

export function SidebarPlaylists({ onSelectPlaylist, activePlaylistId }: SidebarPlaylistsProps) {
  const { leftSidebarOpen, recentlyPlayed, play, currentTrack } = usePlayerStore();
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
          'flex flex-col h-full border-r border-[#27272a] bg-[#0f0f13] select-none',
          'sidebar-transition overflow-hidden shrink-0 z-20',
          leftSidebarOpen ? 'w-64' : 'w-0'
        )}
        aria-label="Library sidebar"
        aria-hidden={!leftSidebarOpen}
      >
        <div className="flex flex-col h-full w-64 overflow-hidden">
          {/* Section: Recently Played */}
          <section className="px-3 pt-3 pb-2" aria-labelledby="recently-played-heading">
            <div className="flex items-center gap-2 px-1 mb-2">
              <Clock size={12} className="text-zinc-500" />
              <h3 id="recently-played-heading" className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Recently Played
              </h3>
            </div>

            {recentlyPlayed.length === 0 ? (
              <div className="px-3 py-3 rounded-lg border border-dashed border-[#27272a] text-center my-1">
                <p className="text-xs text-zinc-500">No tracks played yet</p>
              </div>
            ) : (
              <ul className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                {recentlyPlayed.slice(0, 8).map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <li key={track.id}>
                      <button
                        onClick={() => play(track)}
                        aria-label={`Play ${track.title} by ${track.artist}`}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors group',
                          isCurrent
                            ? 'bg-[#1e1e24] text-white border border-[#2e2e38]'
                            : 'hover:bg-[#18181f] text-zinc-300'
                        )}
                      >
                        <div className="relative w-7 h-7 rounded overflow-hidden bg-zinc-800 border border-zinc-700/50 shrink-0">
                          {track.thumbnailUrl ? (
                            <Image src={track.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600">♫</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-xs truncate font-medium', isCurrent ? 'text-white' : 'text-zinc-300')}>
                            {track.title}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="border-t border-[#222228] mx-3 my-1" />

          {/* Section: Playlists */}
          <section className="flex-1 overflow-y-auto px-3 py-2 min-h-0" aria-labelledby="playlists-heading">
            <div className="flex items-center justify-between px-1 mb-2">
              <div className="flex items-center gap-2">
                <Music size={12} className="text-zinc-500" />
                <h3 id="playlists-heading" className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Playlists
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(true)}
                aria-label="Create new playlist"
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#1e1e24] transition-colors flex items-center gap-1 text-[11px]"
              >
                <Plus size={13} />
                <span>New</span>
              </button>
            </div>

            {!playlists || playlists.length === 0 ? (
              <div className="px-3 py-6 rounded-lg border border-dashed border-[#27272a] text-center my-2">
                <ListPlus size={20} className="mx-auto text-zinc-600 mb-1.5" />
                <p className="text-xs text-zinc-400 font-medium">Create your first playlist</p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-2.5 px-3 py-1 bg-white text-black text-[11px] font-medium rounded hover:bg-zinc-200 transition-colors"
                >
                  + New Playlist
                </button>
              </div>
            ) : (
              <ul className="space-y-1">
                {playlists.map((playlist) => {
                  const isActive = activePlaylistId === playlist.id;
                  return (
                    <li key={playlist.id}>
                      <button
                        onClick={() => onSelectPlaylist(isActive ? null : playlist)}
                        aria-label={`Open playlist: ${playlist.name}`}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors border',
                          isActive
                            ? 'bg-[#1e1e24] text-white border-[#3f3f46]'
                            : 'border-transparent text-zinc-400 hover:bg-[#18181f] hover:text-zinc-200'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded bg-[#27272a] flex items-center justify-center shrink-0">
                            <Music size={10} className={isActive ? 'text-white' : 'text-zinc-400'} />
                          </div>
                          <span className="text-xs font-medium truncate">{playlist.name}</span>
                        </div>
                        <span className="text-[10px] font-mono-time text-zinc-500 px-1.5 py-0.5 rounded bg-[#16161b] shrink-0">
                          {playlist.trackIds.length}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Bottom Storage Stats */}
          <div className="px-4 py-3 border-t border-[#27272a] bg-[#0c0c0f] shrink-0">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-mono-time">
              <div className="flex items-center gap-1.5">
                <HardDrive size={12} className="text-zinc-400" />
                <span>IndexedDB</span>
              </div>
              <span className="text-zinc-400">
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
