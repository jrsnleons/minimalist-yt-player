'use client';

import { useState, useEffect } from 'react';
import { db } from '@/db/schema';
import { Modal } from '@/components/ui/Modal';
import { inputClass, labelClass, primaryBtn, quietBtn } from '@/lib/ui';
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
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Playlist" className="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="edit-playlist-name" className={labelClass}>
            Name <span className="text-zinc-400">*</span>
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
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="edit-playlist-desc" className={labelClass}>
            Description <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="edit-playlist-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            rows={3}
            maxLength={250}
            className={`${inputClass} resize-none`}
          />
          <div className="text-right text-xs font-mono text-zinc-400 mt-1">
            {description.length}/250
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className={quietBtn}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className={primaryBtn}
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
