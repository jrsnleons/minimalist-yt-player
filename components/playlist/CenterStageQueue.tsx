'use client';

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

export function CenterStageQueue() {
  const { queue, currentTrack, clearQueue, reorderQueue, removeFromQueue, toggleCommandPalette } =
    usePlayerStore();

  const totalDuration = queue.reduce((acc, t) => acc + (t.duration || 0), 0);

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
      <div className="h-full flex items-center justify-center p-8 rounded-2xl border border-[#27272a] bg-[#0f0f13] text-center shadow-sm">
        <div className="max-w-sm mx-auto flex flex-col items-center">
          <ListMusic size={32} className="text-zinc-700 mb-3" />
          <h3 className="text-sm font-semibold text-white">Playback Queue is Empty</h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Tracks you play, search, or add will appear here. Drag to reorder, right-click for options, or quick-add to playlists.
          </p>

          <button
            onClick={toggleCommandPalette}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors shadow-md cursor-pointer"
          >
            <Search size={13} />
            <span>Search Tracks (⌘K)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#27272a] bg-[#0f0f13] overflow-hidden shadow-sm h-full flex flex-col min-h-0">
      {/* Table Header Controls (Pinned) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#222228] bg-[#121217] shrink-0">
        <div className="flex items-center gap-2.5">
          <ListMusic size={15} className="text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">Playback Queue</h3>
          <span className="text-[10px] font-mono-time text-zinc-400 px-2 py-0.5 rounded bg-[#1e1e24] border border-[#2e2e38]">
            {queue.length} track{queue.length !== 1 ? 's' : ''} · {formatTime(totalDuration)}
          </span>
        </div>

        <button
          onClick={clearQueue}
          aria-label="Clear queue"
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-zinc-500 hover:text-red-400 hover:bg-[#1e1e24] transition-colors cursor-pointer"
        >
          <Trash2 size={12} />
          <span>Clear</span>
        </button>
      </div>

      {/* Drag and drop sortable table (Scrollable) */}
      <div className="overflow-y-auto flex-1 min-h-0">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full text-left border-collapse" role="grid" aria-label="Playback Queue">
            <thead className="sticky top-0 z-10 bg-[#0f0f13]">
              <tr className="border-b border-[#222228] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="w-12 px-3 py-2 text-center">#</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Artist</th>
                <th className="w-36 px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e24]/40">
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
                    isActive={currentTrack?.id === track.id}
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
