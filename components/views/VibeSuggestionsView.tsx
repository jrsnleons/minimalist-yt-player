'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from '@/components/playlist/TrackRow';
import { TrackRowSkeleton } from '@/components/ui/Skeleton';
import { useRadioSuggestions } from '@/hooks/useRadioSuggestions';
import { Sparkles, Plus, Loader2 } from 'lucide-react';

export function VibeSuggestionsView() {
  const { currentTrack, queue, addToQueue, showToast } = usePlayerStore();

  const { suggestions, isLoading, error } = useRadioSuggestions(
    currentTrack?.id,
    queue.map((t) => t.id)
  );

  const handleAddAllToQueue = () => {
    if (suggestions.length === 0) return;
    suggestions.forEach((t) => addToQueue(t));
    showToast(`Added ${suggestions.length} suggestions to Queue`);
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#09090d] overflow-hidden shadow-sm h-full flex flex-col min-h-0">
      {/* Header Banner (Pinned) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0c0c10] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles size={15} className="text-white shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans shrink-0">
            Vibe Automix
          </h3>
          {currentTrack && (
            <span className="text-[11px] text-zinc-400 truncate max-w-xs font-mono">
              (&quot;{currentTrack.title}&quot;)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isLoading && suggestions.length > 0 && (
            <button
              onClick={handleAddAllToQueue}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-sm cursor-pointer"
            >
              <Plus size={12} />
              <span>Add All to Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* Table (Scrollable) */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {!currentTrack ? (
          <div className="py-20 text-center text-zinc-500 text-xs flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-600 mb-3">
              <Sparkles size={22} />
            </div>
            <p className="font-bold text-white uppercase tracking-wider text-xs font-sans">
              Awaiting Playback
            </p>
            <p className="text-[11px] text-zinc-400 mt-1.5">
              Play any song to generate continuous harmonic radio recommendations
            </p>
          </div>
        ) : isLoading ? (
          <div className="p-3.5 space-y-3">
            <div className="flex items-center gap-2 px-1 text-xs text-zinc-400">
              <Loader2 size={13} className="animate-spin text-white" />
              <span className="font-mono text-[11px]">Generating vibe-matched recommendations…</span>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c10] overflow-hidden">
              <table className="w-full text-left border-collapse table-fixed" role="grid">
                <thead className="sticky top-0 z-10 bg-[#09090d]">
                  <tr className="border-b border-white/[0.06] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="w-10 px-2 py-2 text-center">#</th>
                    <th className="px-2 py-2">Track</th>
                    <th className="w-28 px-2 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TrackRowSkeleton key={`vibe-skel-${i}`} index={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-zinc-500 text-xs">
            <p className="font-medium text-red-400/80">{error}</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs">
            <p className="font-medium text-zinc-400">No suggestions available for this track.</p>
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
              {suggestions.map((track, i) => (
                <TrackRow key={track.id} track={track} index={i} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
