'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { uuid, cn } from '@/lib/utils';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
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
      showToast(`Added to "${playlist.name}" ✓`);
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
    showToast(`Created "${name}" and added track ✓`);
    setNewPlaylistName('');
    setIsCreating(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Playlist" className="max-w-md">
      <div className="flex flex-col gap-4">
        {/* Selected Track info preview */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
          <TrackArtwork track={track} size="md" rounded="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{track.title}</p>
            <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
          </div>
        </div>

        {/* Existing Playlists list */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          <p className="text-xs font-semibold text-zinc-300 tracking-tight px-1 font-sans">
            Select Playlist
          </p>

          {!playlists || playlists.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">No playlists created yet</p>
          ) : (
            playlists.map((pl) => {
              const alreadyIn = pl.trackIds.includes(track.id);
              const isToggled = recentlyToggled === pl.id;

              return (
                <button
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl)}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all group cursor-pointer active:scale-98',
                    isToggled
                      ? 'bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                      : alreadyIn
                      ? 'bg-white/[0.04] border border-white/[0.12] hover:bg-white/[0.07]'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12]'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Music
                      size={14}
                      className={cn(
                        'transition-colors shrink-0',
                        alreadyIn ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-white'
                      )}
                    />
                    <span className="text-xs font-medium text-zinc-200 truncate">{pl.name}</span>
                  </div>
                  {alreadyIn ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono font-medium">
                      <Check size={12} className="text-emerald-400" /> Added
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400 font-mono">{pl.trackIds.length} tracks</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-white/[0.06] pt-3">
          {isCreating ? (
            <form onSubmit={handleCreateAndAdd} className="flex gap-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name..."
                autoFocus
                className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-white/30 focus:ring-1 focus:ring-white/20 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!newPlaylistName.trim()}
                className="px-3.5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 disabled:opacity-40 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Create & Add
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] text-xs transition-all cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-white/[0.12] hover:border-white/30 bg-white/[0.01] hover:bg-white/[0.04] text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer active:scale-98"
            >
              <Plus size={13} />
              <span>Create New Playlist & Add</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
