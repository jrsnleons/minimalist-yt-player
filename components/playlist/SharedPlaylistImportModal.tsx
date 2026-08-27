'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { usePlayerStore } from '@/store/usePlayerStore';
import { db } from '@/db/schema';
import { formatTime } from '@/lib/utils';
import { Play, Download, Music, Sparkles, Check } from 'lucide-react';
import type { SharedPlaylistData } from '@/lib/share';

interface SharedPlaylistImportModalProps {
  data: SharedPlaylistData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SharedPlaylistImportModal({
  data,
  isOpen,
  onClose,
}: SharedPlaylistImportModalProps) {
  const play = usePlayerStore((s) => s.play);
  const showToast = usePlayerStore((s) => s.showToast);
  const [isSaved, setIsSaved] = useState(false);

  if (!data) return null;

  const totalDuration = data.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  const handlePlayNow = async () => {
    if (data.tracks.length === 0) return;
    // Store tracks in DB so player can reference them
    await db.tracks.bulkPut(data.tracks).catch(() => {});
    play(data.tracks[0], data.tracks);
    showToast(`Playing shared playlist: "${data.name}"`);
    onClose();
  };

  const handleSaveToLibrary = async () => {
    try {
      await db.tracks.bulkPut(data.tracks);
      const playlistId = `shared-${Date.now()}`;
      await db.playlists.add({
        id: playlistId,
        name: data.name,
        description: data.description || 'Imported via share link',
        trackIds: data.tracks.map((t) => t.id),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setIsSaved(true);
      showToast(`Saved "${data.name}" to your library! 🎶`);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch {
      showToast('Could not save playlist');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Shared Playlist Received" className="max-w-lg">
      <div className="space-y-4">
        {/* Banner Header */}
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.08] bg-[#0c0c10]">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
            <Sparkles size={24} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
              Shared with you
            </span>
            <h3 className="text-base font-bold text-white tracking-tight truncate">{data.name}</h3>
            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
              {data.tracks.length} tracks · {formatTime(totalDuration)}
            </p>
          </div>
        </div>

        {/* Track Preview List */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c10] overflow-hidden max-h-56 overflow-y-auto">
          <table className="w-full text-left border-collapse table-fixed" role="grid">
            <thead className="sticky top-0 z-10 bg-[#09090d]">
              <tr className="border-b border-white/[0.06] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="w-8 px-3 py-2 text-center">#</th>
                <th className="px-2 py-2">Track</th>
                <th className="w-16 px-3 py-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {data.tracks.map((track, i) => (
                <tr key={`${track.id}-${i}`} className="hover:bg-white/[0.02] text-xs">
                  <td className="px-3 py-2 text-center text-zinc-500 font-mono text-[10px]">{i + 1}</td>
                  <td className="px-2 py-2 truncate">
                    <div className="font-medium text-zinc-200 truncate">{track.title}</div>
                    <div className="text-[11px] text-zinc-500 truncate">{track.artist}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[10px] text-zinc-400">
                    {formatTime(track.duration)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleSaveToLibrary}
            disabled={isSaved}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            {isSaved ? <Check size={14} className="text-emerald-400" /> : <Download size={14} />}
            <span>{isSaved ? 'Saved to Library' : 'Save to Library'}</span>
          </button>
          <button
            type="button"
            onClick={handlePlayNow}
            className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-all cursor-pointer shadow-md"
          >
            <Play size={13} fill="currentColor" />
            <span>Play Now</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
