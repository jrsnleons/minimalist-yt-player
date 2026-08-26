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
    <div className="rounded-2xl border border-[#27272a] bg-[#0f0f13] overflow-hidden shadow-sm">
      {/* Header with Work-Friendly Toggle */}
      <div className="flex items-center justify-between p-5 border-b border-[#222228] bg-[#121217]">
        <div className="flex items-center gap-2.5">
          <Sparkles size={16} className="text-amber-300" />
          <h3 className="text-sm font-semibold text-white">Based on Current Vibe</h3>
          {currentTrack && (
            <span className="text-xs text-zinc-400 truncate max-w-xs">
              (Auto-mix for &quot;{currentTrack.title}&quot;)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Work-Friendly Filter Toggle */}
          <div className="flex items-center gap-2 bg-[#181820] border border-[#27272f] px-2.5 py-1 rounded-lg">
            <Filter size={12} className="text-zinc-400" />
            <span className="text-xs text-zinc-300">Instrumental / Work-Friendly</span>
            <button
              onClick={() => setInstrumentalOnly((v) => !v)}
              aria-pressed={instrumentalOnly}
              className={cn(
                'ml-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide transition-colors',
                instrumentalOnly ? 'bg-white text-black shadow-sm' : 'bg-[#27272f] text-zinc-400 hover:text-white'
              )}
            >
              {instrumentalOnly ? 'ON' : 'OFF'}
            </button>
          </div>

          {suggestions.length > 0 && (
            <button
              onClick={handleAddAllToQueue}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-sm"
            >
              <Plus size={12} />
              <span>Add All to Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
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
          <table className="w-full text-left border-collapse" role="grid">
            <thead>
              <tr className="border-b border-[#222228] text-[11px] font-semibold text-zinc-500 uppercase tracking-wider bg-[#0f0f13]">
                <th className="w-12 px-4 py-2.5 text-center">#</th>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Artist</th>
                <th className="w-32 px-4 py-2.5 text-right">Actions</th>
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
