'use client';

import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackRow } from './TrackRow';
import { ListMusic, Trash2, Search } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { usePlatformShortcut } from '@/hooks/usePlatformShortcut';

export function CenterStageQueue() {
  const queue = usePlayerStore((s) => s.queue);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const toggleCommandPalette = usePlayerStore((s) => s.toggleCommandPalette);

  const totalDuration = useMemo(
    () => queue.reduce((acc, t) => acc + (t.duration || 0), 0),
    [queue]
  );

  const shortcutKey = usePlatformShortcut('⌘K');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = queue.findIndex((t, i) => `${t.id}-${i}` === active.id || t.id === active.id);
    const toIndex = queue.findIndex((t, i) => `${t.id}-${i}` === over.id || t.id === over.id);
    if (fromIndex >= 0 && toIndex >= 0) {
      reorderQueue(fromIndex, toIndex);
    }
  };

  if (queue.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] text-center shadow-sm">
        <div className="max-w-sm mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-500 mb-3">
            <ListMusic size={22} />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white font-sans">Queue is Empty</h3>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            Tracks you play or add will appear here. Drag to reorder, right-click for options, or quick-add to playlists.
          </p>

          <button
            onClick={toggleCommandPalette}
            aria-label="Search Tracks (⌘K / Ctrl+K)"
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-sm cursor-pointer"
          >
            <Search size={13} />
            <span suppressHydrationWarning>Search Tracks ({shortcutKey})</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#09090d] overflow-hidden shadow-sm h-full flex flex-col min-h-0">
      {/* Table Header Controls (Pinned) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0c0c10] shrink-0">
        <div className="flex items-center gap-2.5">
          <ListMusic size={15} className="text-zinc-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white font-sans">Playback Queue</h3>
          <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            {queue.length} track{queue.length !== 1 ? 's' : ''} · {formatTime(totalDuration)}
          </span>
        </div>

        <button
          onClick={clearQueue}
          aria-label="Clear queue"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-zinc-500 hover:text-red-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <Trash2 size={12} />
          <span>Clear</span>
        </button>
      </div>

      {/* Drag and drop sortable table (Scrollable) */}
      <div className="overflow-y-auto flex-1 min-h-0">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full text-left border-collapse table-fixed" role="grid" aria-label="Playback Queue">
            <thead className="sticky top-0 z-10 bg-[#09090d]">
              <tr className="border-b border-white/[0.06] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="w-10 px-2 py-2 text-center">#</th>
                <th className="px-2 py-2">Track</th>
                <th className="w-28 px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              <SortableContext
                items={queue.map((t, i) => `${t.id}-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                {queue.map((track, i) => (
                  <TrackRow
                    key={`${track.id}-${i}`}
                    track={track}
                    index={i}
                    isSortable={true}
                    sortableId={`${track.id}-${i}`}
                    isActive={currentTrackId === track.id}
                    onRemoveFromQueue={() => removeFromQueue(i)}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  );
}
