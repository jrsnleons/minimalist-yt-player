'use client';

import { useState } from 'react';
import { ListMusic, Sparkles, Filter, Trash2, Plus, GripVertical } from 'lucide-react';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePlayerStore } from '@/store/usePlayerStore';
import { formatTime, cn } from '@/lib/utils';
import { useRadioSuggestions } from '@/hooks/useRadioSuggestions';
import type { Track } from '@/types';

function SortableTrackItem({ track, index }: { track: Track; index: number }) {
  const { play, removeFromQueue, currentTrack } = usePlayerStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isCurrent = currentTrack?.id === track.id;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5 rounded-lg group transition-colors select-none border',
        isCurrent
          ? 'bg-[#1e1e24] border-[#3f3f46] text-white'
          : 'border-transparent hover:bg-[#18181f] text-zinc-300'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab active:cursor-grabbing text-zinc-600 group-hover:text-zinc-400 p-0.5"
      >
        <GripVertical size={13} />
      </button>

      {/* Track Thumbnail */}
      <TrackArtwork track={track} size="sm" rounded="sm" />

      {/* Track Info */}
      <button
        onClick={() => play(track)}
        aria-label={`Play ${track.title}`}
        className="flex-1 min-w-0 text-left"
      >
        <p className={cn('text-xs font-medium truncate', isCurrent ? 'text-white font-semibold' : 'text-zinc-200')}>
          {track.title}
        </p>
        <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
      </button>

      {/* Duration */}
      <span className="font-mono-time text-[10px] text-zinc-500 shrink-0">{formatTime(track.duration)}</span>

      {/* Remove from queue */}
      <button
        onClick={() => removeFromQueue(index)}
        aria-label={`Remove ${track.title} from queue`}
        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all text-xs rounded hover:bg-[#27272f]"
      >
        <Trash2 size={12} />
      </button>
    </li>
  );
}

export function QueueSidebar() {
  const { rightSidebarOpen, queue, reorderQueue, addToQueue, clearQueue, currentTrack } = usePlayerStore();
  const [instrumentalOnly, setInstrumentalOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'suggestions'>('queue');

  const suggestions = useRadioSuggestions(currentTrack?.id, instrumentalOnly, queue.map((t) => t.id));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = queue.findIndex((t) => t.id === active.id);
    const toIndex = queue.findIndex((t) => t.id === over.id);
    if (fromIndex >= 0 && toIndex >= 0) reorderQueue(fromIndex, toIndex);
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-l border-[#27272a] bg-[#0f0f13] select-none',
        'sidebar-transition overflow-hidden shrink-0 z-20',
        rightSidebarOpen ? 'w-80' : 'w-0'
      )}
      aria-label="Queue sidebar"
      aria-hidden={!rightSidebarOpen}
    >
      <div className="flex flex-col h-full w-80 overflow-hidden">
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-[#27272a] px-3 pt-2 bg-[#0c0c0f]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('queue')}
              aria-selected={activeTab === 'queue'}
              role="tab"
              className={cn(
                'flex items-center gap-1.5 py-2.5 px-2 text-xs font-semibold border-b-2 transition-colors',
                activeTab === 'queue'
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              )}
            >
              <ListMusic size={13} />
              <span>Up Next</span>
              {queue.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#27272a] text-zinc-300 text-[10px] font-mono-time">
                  {queue.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('suggestions')}
              aria-selected={activeTab === 'suggestions'}
              role="tab"
              className={cn(
                'flex items-center gap-1.5 py-2.5 px-2 text-xs font-semibold border-b-2 transition-colors',
                activeTab === 'suggestions'
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Sparkles size={13} />
              <span>Based on Vibe</span>
            </button>
          </div>

          {activeTab === 'queue' && queue.length > 0 && (
            <button
              onClick={clearQueue}
              aria-label="Clear queue"
              className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors px-1.5 py-1 rounded hover:bg-[#1e1e24]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Tab 1: Queue */}
        {activeTab === 'queue' && (
          <div className="flex-1 overflow-y-auto p-2">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <ListMusic size={28} className="text-zinc-700 mb-2" />
                <p className="text-xs font-medium text-zinc-400">Queue is empty</p>
                <p className="text-[11px] text-zinc-600 mt-1">Search or play a track to start building your queue</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={queue.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-1">
                    {queue.map((track, i) => (
                      <SortableTrackItem key={track.id} track={track} index={i} />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}

        {/* Tab 2: Suggestions */}
        {activeTab === 'suggestions' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Work-Friendly Filter Toggle Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#222228] bg-[#141419]">
              <div className="flex items-center gap-1.5">
                <Filter size={12} className="text-zinc-400" />
                <span className="text-xs text-zinc-300 font-medium">Work-Friendly Only</span>
              </div>
              <button
                onClick={() => setInstrumentalOnly((v) => !v)}
                aria-pressed={instrumentalOnly}
                aria-label={instrumentalOnly ? 'Disable work-friendly filter' : 'Enable work-friendly filter'}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase transition-colors',
                  instrumentalOnly
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-[#27272a] text-zinc-400 hover:text-white'
                )}
              >
                {instrumentalOnly ? 'Active' : 'Off'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {!currentTrack ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <Sparkles size={28} className="text-zinc-700 mb-2" />
                  <p className="text-xs text-zinc-400">Play a track to generate context-aware suggestions</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-1.5">
                      <div className="skeleton w-8 h-8 rounded" />
                      <div className="flex-1 space-y-1.5">
                        <div className="skeleton h-3 w-3/4" />
                        <div className="skeleton h-2.5 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-1">
                  {suggestions.map((track) => (
                    <li
                      key={track.id}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[#18181f] group transition-colors border border-transparent"
                    >
                      <TrackArtwork track={track} size="sm" rounded="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">{track.title}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
                      </div>
                      <span className="font-mono-time text-[10px] text-zinc-500 shrink-0">
                        {formatTime(track.duration)}
                      </span>
                      <button
                        onClick={() => addToQueue(track)}
                        aria-label={`Add ${track.title} to queue`}
                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#27272f] transition-colors"
                        title="Add to queue"
                      >
                        <Plus size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
