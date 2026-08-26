'use client';

import { useState } from 'react';
import { ListMusic, Sparkles, Filter } from 'lucide-react';
import Image from 'next/image';
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
  const { play, removeFromQueue, playNext, currentTrack } = usePlayerStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isCurrent = currentTrack?.id === track.id;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded group',
        isCurrent ? 'bg-zinc-800' : 'hover:bg-zinc-800/50',
        'transition-opacity cursor-default'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 p-0.5"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <circle cx="4" cy="3" r="1" /><circle cx="8" cy="3" r="1" />
          <circle cx="4" cy="6" r="1" /><circle cx="8" cy="6" r="1" />
          <circle cx="4" cy="9" r="1" /><circle cx="8" cy="9" r="1" />
        </svg>
      </button>

      {/* Thumbnail */}
      <div className="relative w-8 h-8 rounded overflow-hidden bg-zinc-800 shrink-0">
        {track.thumbnailUrl && (
          <Image src={track.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => play(track)}
          aria-label={`Play ${track.title}`}
          className={cn('block text-left w-full', isCurrent ? 'text-white' : 'text-zinc-300 hover:text-white')}
        >
          <p className="text-xs truncate">{track.title}</p>
          <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
        </button>
      </div>

      {/* Duration */}
      <span className="font-mono-time text-zinc-600 shrink-0">{formatTime(track.duration)}</span>

      {/* Remove */}
      <button
        onClick={() => removeFromQueue(index)}
        aria-label={`Remove ${track.title} from queue`}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-600 hover:text-white transition-opacity text-xs"
      >
        ✕
      </button>
    </li>
  );
}

export function QueueSidebar() {
  const { rightSidebarOpen, queue, reorderQueue, addToQueue, currentTrack } = usePlayerStore();
  const [instrumentalOnly, setInstrumentalOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'suggestions'>('queue');

  const suggestions = useRadioSuggestions(currentTrack?.id, instrumentalOnly, queue.map((t) => t.id));

  const sensors = useSensors(
    useSensor(PointerSensor),
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
        'flex flex-col h-full border-l border-zinc-800 bg-zinc-900/30',
        'sidebar-transition overflow-hidden shrink-0',
        rightSidebarOpen ? 'w-80' : 'w-0'
      )}
      aria-label="Queue sidebar"
      aria-hidden={!rightSidebarOpen}
    >
      <div className="flex flex-col h-full min-w-80 overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center border-b border-zinc-800 px-3 pt-3">
          <button
            onClick={() => setActiveTab('queue')}
            aria-selected={activeTab === 'queue'}
            role="tab"
            className={cn(
              'flex items-center gap-1.5 pb-2 px-1 text-xs border-b-2 transition-colors mr-4',
              activeTab === 'queue' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            <ListMusic size={13} />
            Up Next
            {queue.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px]">
                {queue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            aria-selected={activeTab === 'suggestions'}
            role="tab"
            className={cn(
              'flex items-center gap-1.5 pb-2 px-1 text-xs border-b-2 transition-colors',
              activeTab === 'suggestions' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            <Sparkles size={13} />
            Based on Vibe
          </button>
        </div>

        {/* Queue tab */}
        {activeTab === 'queue' && (
          <div className="flex-1 overflow-y-auto py-2 px-1">
            {queue.length === 0 ? (
              <p className="text-xs text-zinc-700 text-center py-8">Queue is empty</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={queue.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-0.5">
                    {queue.map((track, i) => (
                      <SortableTrackItem key={track.id} track={track} index={i} />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}

        {/* Suggestions tab */}
        {activeTab === 'suggestions' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Work-Friendly filter */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
              <span className="text-xs text-zinc-500">Work-Friendly Only</span>
              <button
                onClick={() => setInstrumentalOnly((v) => !v)}
                aria-pressed={instrumentalOnly}
                aria-label={instrumentalOnly ? 'Disable work-friendly filter' : 'Enable work-friendly filter'}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-opacity',
                  instrumentalOnly ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                )}
              >
                <Filter size={11} />
                {instrumentalOnly ? 'On' : 'Off'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2 px-1">
              {!currentTrack ? (
                <p className="text-xs text-zinc-700 text-center py-8">Play a track to see suggestions</p>
              ) : suggestions.length === 0 ? (
                <p className="text-xs text-zinc-700 text-center py-8">Loading suggestions…</p>
              ) : (
                <ul className="space-y-0.5">
                  {suggestions.map((track) => (
                    <li
                      key={track.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800/50 group transition-opacity"
                    >
                      <div className="relative w-8 h-8 rounded overflow-hidden bg-zinc-800 shrink-0">
                        {track.thumbnailUrl && (
                          <Image src={track.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-300 truncate">{track.title}</p>
                        <p className="text-xs text-zinc-600 truncate">{track.artist}</p>
                      </div>
                      <span className="font-mono-time text-zinc-600 shrink-0 text-[10px]">
                        {formatTime(track.duration)}
                      </span>
                      <button
                        onClick={() => addToQueue(track)}
                        aria-label={`Add ${track.title} to queue`}
                        className="opacity-0 group-hover:opacity-100 p-1 text-xs text-zinc-500 hover:text-white transition-opacity"
                      >
                        +
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
