'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from '@/components/playlist/TrackRow';
import { Clock, Trash2, Play } from 'lucide-react';
import { db } from '@/db/schema';

export function RecentlyPlayedView() {
  const recentlyPlayed = usePlayerStore((s) => s.recentlyPlayed);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);
  const play = usePlayerStore((s) => s.play);
  const showToast = usePlayerStore((s) => s.showToast);

  const handlePlayAll = () => {
    if (recentlyPlayed.length === 0) return;
    play(recentlyPlayed[0], recentlyPlayed);
    showToast('Playing recently played tracks');
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear your listening history?')) return;
    await db.history.clear();
    usePlayerStore.setState({ recentlyPlayed: [] });
    showToast('Listening history cleared');
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#09090d] overflow-hidden shadow-sm h-full flex flex-col min-h-0">
      {/* Header (Pinned) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0c0c10] shrink-0">
        <div className="flex items-center gap-2.5">
          <Clock size={15} className="text-zinc-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans">Listening History</h3>
          <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            {recentlyPlayed.length} track{recentlyPlayed.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {recentlyPlayed.length > 0 && (
            <>
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-sm cursor-pointer"
              >
                <Play size={11} fill="currentColor" />
                <span>Play All</span>
              </button>
              <button
                onClick={handleClearHistory}
                aria-label="Clear listening history"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-zinc-500 hover:text-red-400 hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table (Scrollable) */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {recentlyPlayed.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-600 mb-3">
              <Clock size={22} />
            </div>
            <p className="font-semibold text-zinc-300">No listening history yet</p>
            <p className="text-[11px] text-zinc-500 mt-1">Play any track to record it in your history</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-fixed" role="grid">
            <thead className="sticky top-0 z-10 bg-[#09090d]">
              <tr className="border-b border-white/[0.06] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="w-10 px-2 py-2 text-center">#</th>
                <th className="px-2 py-2">Track</th>
                <th className="w-28 px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {recentlyPlayed.map((track, i) => (
                <TrackRow
                  key={`${track.id}-${i}`}
                  track={track}
                  index={i}
                  isActive={currentTrackId === track.id}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
