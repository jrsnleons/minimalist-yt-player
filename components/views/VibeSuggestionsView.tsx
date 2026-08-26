'use client';

import { useState } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from '@/components/playlist/TrackRow';
import { useRadioSuggestions } from '@/hooks/useRadioSuggestions';
import { Sparkles, Filter, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function VibeSuggestionsView() {
  const { currentTrack, queue, addToQueue, showToast } = usePlayerStore();
  const [instrumentalOnly, setInstrumentalOnly] = useState(false);

  const suggestions = useRadioSuggestions(currentTrack?.id, instrumentalOnly, queue.map((t) => t.id));

  const handleAddAllToQueue = () => {
    if (suggestions.length === 0) return;
    suggestions.forEach((t) => addToQueue(t));
    showToast(`Added ${suggestions.length} suggestions to Queue`);
  };

  return (
    <div className="rounded-2xl border border-[#27272a] bg-[#0f0f13] overflow-hidden shadow-sm h-full flex flex-col min-h-0">
      {/* Header with Work-Friendly Toggle (Pinned) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#222228] bg-[#121217] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles size={15} className="text-amber-300 shrink-0" />
          <h3 className="text-sm font-semibold text-white shrink-0">Based on Current Vibe</h3>
          {currentTrack && (
            <span className="text-[11px] text-zinc-400 truncate max-w-xs">
              (&quot;{currentTrack.title}&quot;)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Work-Friendly Filter Toggle */}
          <div className="flex items-center gap-1.5 bg-[#181820] border border-[#27272f] px-2.5 py-1 rounded-lg">
            <Filter size={11} className="text-zinc-400" />
            <span className="text-[11px] text-zinc-300">Instrumental Only</span>
            <button
              onClick={() => setInstrumentalOnly((v) => !v)}
              aria-pressed={instrumentalOnly}
              className={cn(
                'ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer',
                instrumentalOnly ? 'bg-white text-black shadow-sm' : 'bg-[#27272f] text-zinc-400 hover:text-white'
              )}
            >
              {instrumentalOnly ? 'ON' : 'OFF'}
            </button>
          </div>

          {suggestions.length > 0 && (
            <button
              onClick={handleAddAllToQueue}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={12} />
              <span>Add All</span>
            </button>
          )}
        </div>
      </div>

      {/* Table (Scrollable) */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {!currentTrack ? (
          <div className="py-16 text-center text-zinc-500 text-xs">
            <Sparkles size={28} className="mx-auto text-zinc-700 mb-2" />
            <p className="font-medium text-zinc-400">Play a song to start intelligent automix recommendations</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-zinc-500" />
            <p>Generating personalized track suggestions...</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-fixed" role="grid">
            <thead className="sticky top-0 z-10 bg-[#0f0f13]">
              <tr className="border-b border-[#222228] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="w-10 px-2 py-2 text-center">#</th>
                <th className="px-2 py-2">Track</th>
                <th className="w-48 px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e24]/40">
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
