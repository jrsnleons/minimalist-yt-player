'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { uuid, cn } from '@/lib/utils';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { inputClass, primaryBtn, ghostBtn, quietBtn } from '@/lib/ui';
import { Music, Plus, Check } from 'lucide-react';
import type { Track, Playlist } from '@/types';

interface AddToPlaylistModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AddToPlaylistModal({ track, isOpen, onClose }: AddToPlaylistModalProps) {
  const showToast = usePlayerStore((s) => s.showToast);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [recentlyToggled, setRecentlyToggled] = useState<string | null>(null);

  const playlists = useLiveQuery(() => db.playlists.toArray(), []);

  if (!track) return null;

  const handleAddToPlaylist = async (playlist: Playlist) => {
    const exists = playlist.trackIds.includes(track.id);
    let updatedTrackIds: string[];

    setRecentlyToggled(playlist.id);
    setTimeout(() => setRecentlyToggled(null), 1200);

    if (exists) {
      updatedTrackIds = playlist.trackIds.filter((id) => id !== track.id);
      showToast(`Removed from "${playlist.name}"`);
    } else {
      updatedTrackIds = [...playlist.trackIds, track.id];
      // Save track metadata to IndexedDB
      await db.tracks.put(track);
      showToast(`Added to "${playlist.name}"`);
    }

    await db.playlists.update(playlist.id, {
      trackIds: updatedTrackIds,
      updatedAt: Date.now(),
    });
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;

    await db.tracks.put(track);
    const newPlaylist: Playlist = {
      id: uuid(),
      name,
      trackIds: [track.id],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.playlists.add(newPlaylist);
    showToast(`Created "${name}" and added song`);
    setNewPlaylistName('');
    setIsCreating(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Playlist" className="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <TrackArtwork track={track} size="md" rounded="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{track.title}</p>
            <p className="text-[13px] text-zinc-400 truncate">{track.artist}</p>
          </div>
        </div>

        <div>
          <p className="text-[13px] font-medium text-zinc-300 mb-1.5">Playlists</p>

          {!playlists || playlists.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">No playlists yet</p>
          ) : (
            <ul className="max-h-56 overflow-y-auto -mx-1 px-1">
              {playlists.map((pl) => {
                const alreadyIn = pl.trackIds.includes(track.id);
                const isToggled = recentlyToggled === pl.id;

                return (
                  <li key={pl.id}>
                    <button
                      type="button"
                      onClick={() => handleAddToPlaylist(pl)}
                      aria-pressed={alreadyIn}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 px-3 min-h-[44px] rounded-lg text-left transition-colors cursor-pointer',
                        isToggled ? 'bg-white/[0.1]' : 'hover:bg-white/[0.06]'
                      )}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Music size={16} className="text-zinc-400 shrink-0" aria-hidden="true" />
                        <span className="text-sm font-medium text-zinc-100 truncate">{pl.name}</span>
                      </span>
                      {alreadyIn ? (
                        <span className="flex items-center gap-1 text-[13px] text-zinc-100 shrink-0">
                          <Check size={14} aria-hidden="true" /> Added
                        </span>
                      ) : (
                        <span className="text-[13px] text-zinc-400 shrink-0">
                          {pl.trackIds.length} {pl.trackIds.length === 1 ? 'song' : 'songs'}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-white/[0.08] pt-3">
          {isCreating ? (
            <form onSubmit={handleCreateAndAdd} className="flex flex-wrap gap-2">
              <label htmlFor="atp-new-name" className="sr-only">
                New playlist name
              </label>
              <input
                id="atp-new-name"
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Playlist name"
                autoFocus
                maxLength={80}
                className={cn(inputClass, 'flex-1 min-w-[160px]')}
              />
              <button type="submit" disabled={!newPlaylistName.trim()} className={primaryBtn}>
                Create
              </button>
              <button type="button" onClick={() => setIsCreating(false)} className={quietBtn}>
                Cancel
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setIsCreating(true)} className={cn(ghostBtn, 'w-full')}>
              <Plus size={16} aria-hidden="true" />
              <span>New Playlist</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
