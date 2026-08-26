'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from './TrackRow';
import { ListMusic, Sparkles, Trash2, Search } from 'lucide-react';
import { formatTime } from '@/lib/utils';

export function CenterStageQueue() {
  const { queue, currentTrack, clearQueue, toggleCommandPalette, play } = usePlayerStore();

  const totalDuration = queue.reduce((acc, t) => acc + (t.duration || 0), 0);

  if (queue.length === 0) {
    return (
      <div className="mx-6 mb-6 p-8 rounded-2xl border border-[#27272a] bg-[#0f0f13] text-center">
        <div className="max-w-sm mx-auto flex flex-col items-center">
          <ListMusic size={32} className="text-zinc-700 mb-3" />
          <h3 className="text-sm font-semibold text-white">Active Queue is Empty</h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Tracks you play or add to queue will appear here. You can reorder, save to playlists, or browse context recommendations.
          </p>

          <button
            onClick={toggleCommandPalette}
            className="mt-4 flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700"
          >
            <Search size={13} />
            <span>Search YouTube to Add Songs</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-6 mb-6 rounded-2xl border border-[#27272a] bg-[#0f0f13] overflow-hidden shadow-sm">
      {/* Table Header Controls */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222228] bg-[#121217]">
        <div className="flex items-center gap-2.5">
          <ListMusic size={16} className="text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">Playback Queue</h3>
          <span className="text-[11px] font-mono-time text-zinc-400 px-2 py-0.5 rounded bg-[#1e1e24] border border-[#2e2e38]">
            {queue.length} track{queue.length !== 1 ? 's' : ''} · {formatTime(totalDuration)}
          </span>
        </div>

        <button
          onClick={clearQueue}
          aria-label="Clear queue"
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-zinc-500 hover:text-red-400 hover:bg-[#1e1e24] transition-colors"
        >
          <Trash2 size={12} />
          <span>Clear Queue</span>
        </button>
      </div>

      {/* Track Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" role="grid" aria-label="Playback Queue">
          <thead>
            <tr className="border-b border-[#222228] text-[11px] font-semibold text-zinc-500 uppercase tracking-wider bg-[#0f0f13]">
              <th className="w-12 px-4 py-2.5 text-center">#</th>
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Artist</th>
              <th className="w-24 px-4 py-2.5 text-right">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e24]/40">
            {queue.map((track, i) => (
              <TrackRow
                key={`${track.id}-${i}`}
                track={track}
                index={i}
                isActive={currentTrack?.id === track.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
