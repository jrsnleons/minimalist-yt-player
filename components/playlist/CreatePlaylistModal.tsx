'use client';

import { useState } from 'react';
import { db } from '@/db/schema';
import { Modal } from '@/components/ui/Modal';
import { uuid } from '@/lib/utils';
import type { Playlist } from '@/types';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (playlist: Playlist) => void;
}

export function CreatePlaylistModal({ isOpen, onClose, onCreated }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const newPlaylist: Playlist = {
        id: uuid(),
        name: name.trim(),
        description: description.trim() || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        trackIds: [],
      };
      await db.playlists.add(newPlaylist);
      setName('');
      setDescription('');
      if (onCreated) {
        onCreated(newPlaylist);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Playlist">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="playlist-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 font-sans">
            Name <span className="text-zinc-500">*</span>
          </label>
          <input
            id="playlist-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Midnight Session, Focus Beats…"
            autoFocus
            required
            maxLength={80}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-white/30 focus:ring-1 focus:ring-white/20 text-white text-xs placeholder-zinc-600 focus:outline-none transition-all"
          />
        </div>
        <div>
          <label htmlFor="playlist-desc" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 font-sans">
            Description <span className="text-zinc-600 font-normal normal-case">(optional)</span>
          </label>
          <input
            id="playlist-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Curated tracks for late night flow…"
            maxLength={200}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-white/30 focus:ring-1 focus:ring-white/20 text-white text-xs placeholder-zinc-600 focus:outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-black hover:bg-zinc-200 disabled:opacity-40 shadow-sm transition-all cursor-pointer"
          >
            {loading ? 'Creating…' : 'Create Playlist'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
