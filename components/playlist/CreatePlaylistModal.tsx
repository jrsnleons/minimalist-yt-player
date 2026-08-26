'use client';

import { useState } from 'react';
import { db } from '@/db/schema';
import { Modal } from '@/components/ui/Modal';
import { uuid } from '@/lib/utils';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePlaylistModal({ isOpen, onClose }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await db.playlists.add({
        id: uuid(),
        name: name.trim(),
        description: description.trim() || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        trackIds: [],
      });
      setName('');
      setDescription('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Playlist">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="playlist-name" className="block text-xs text-zinc-400 mb-1.5">
            Name <span aria-hidden="true">*</span>
          </label>
          <input
            id="playlist-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Playlist"
            autoFocus
            required
            maxLength={80}
            className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label htmlFor="playlist-desc" className="block text-xs text-zinc-400 mb-1.5">
            Description <span className="text-zinc-600">(optional)</span>
          </label>
          <input
            id="playlist-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Focus beats, study vibes…"
            maxLength={200}
            className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-opacity"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="px-4 py-2 text-sm rounded-md bg-white text-black font-medium hover:bg-zinc-200 disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
