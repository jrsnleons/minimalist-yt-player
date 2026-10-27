'use client';

import { useState } from 'react';
import { db } from '@/db/schema';
import { Modal } from '@/components/ui/Modal';
import { inputClass, labelClass, primaryBtn, quietBtn } from '@/lib/ui';
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
          <label htmlFor="playlist-name" className={labelClass}>
            Name <span className="text-zinc-400">*</span>
          </label>
          <input
            id="playlist-name"
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
          <label htmlFor="playlist-desc" className={labelClass}>
            Description <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            id="playlist-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            maxLength={200}
            className={inputClass}
          />
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
            {loading ? 'Creating…' : 'Create Playlist'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
