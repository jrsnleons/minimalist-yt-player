'use client';

import { useState, useEffect } from 'react';
import { db } from '@/db/schema';
import { Modal } from '@/components/ui/Modal';
import { usePlayerStore } from '@/store/usePlayerStore';
import type { Playlist } from '@/types';

interface EditPlaylistModalProps {
  playlist: Playlist | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updated: Playlist) => void;
}

export function EditPlaylistModal({ playlist, isOpen, onClose, onUpdated }: EditPlaylistModalProps) {
  const { showToast } = usePlayerStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description || '');
    }
  }, [playlist, isOpen]);

  if (!playlist) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const updatedData = {
        name: name.trim(),
        description: description.trim() || undefined,
        updatedAt: Date.now(),
      };

      await db.playlists.update(playlist.id, updatedData);
      const updatedPlaylist: Playlist = { ...playlist, ...updatedData };

      showToast(`Updated "${updatedPlaylist.name}"`);
      onUpdated?.(updatedPlaylist);
      onClose();
    } catch (err) {
      console.error('Failed to update playlist:', err);
      showToast('Failed to update playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Playlist Details" className="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="edit-playlist-name" className="block text-xs font-semibold text-zinc-400 mb-1.5">
            Playlist Name <span className="text-zinc-500">*</span>
          </label>
          <input
            id="edit-playlist-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Playlist name"
            autoFocus
            required
            maxLength={80}
            className="w-full px-3 py-2 rounded-xl bg-[#14141a] border border-zinc-700 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-zinc-400 shadow-inner"
          />
        </div>

        <div>
          <label htmlFor="edit-playlist-desc" className="block text-xs font-semibold text-zinc-400 mb-1.5">
            Description <span className="text-zinc-600 font-normal">(optional)</span>
          </label>
          <textarea
            id="edit-playlist-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a vibe or description for this playlist…"
            rows={3}
            maxLength={250}
            className="w-full px-3 py-2 rounded-xl bg-[#14141a] border border-zinc-700 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-zinc-400 resize-none shadow-inner"
          />
          <div className="text-right text-[10px] text-zinc-600 mt-0.5">
            {description.length}/250
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-[#222228]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs rounded-lg text-zinc-400 hover:text-white hover:bg-[#1e1e24] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="px-4 py-1.5 text-xs rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-40 transition-colors shadow-sm cursor-pointer"
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
