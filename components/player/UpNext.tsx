'use client';

import { useState, useMemo } from 'react';
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
import { Plus, X, Radio, RotateCcw, Loader2 } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';
import { TrackRow } from '@/components/playlist/TrackRow';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatTime } from '@/lib/utils';

/** Up Next queue (drag to reorder, clear with confirmation) plus the Radio suggestions. */
export function UpNext() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const queue = usePlayerStore((s) => s.queue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const play = usePlayerStore((s) => s.play);
  const radioQueue = usePlayerStore((s) => s.radioQueue);
  const refreshRadioQueue = usePlayerStore((s) => s.refreshRadioQueue);
  const removeFromRadioQueue = usePlayerStore((s) => s.removeFromRadioQueue);
  const addRadioTrackToManualQueue = usePlayerStore((s) => s.addRadioTrackToManualQueue);
  const showToast = usePlayerStore((s) => s.showToast);

  const isInRoom = useListenTogetherStore((s) => s.isInRoom);
  const isHost = useListenTogetherStore((s) => s.isHost);
  const userId = useListenTogetherStore((s) => s.userId);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isRefreshingRadio, setIsRefreshingRadio] = useState(false);

  const totalDuration = useMemo(
    () => queue.reduce((acc, t) => acc + (t.duration || 0), 0),
    [queue]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (isInRoom && !isHost) {
      showToast('Only the DJ can reorder the shared queue');
      return;
    }
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = queue.findIndex((t, i) => `${t.id}-${i}` === active.id || t.id === active.id);
    const toIndex = queue.findIndex((t, i) => `${t.id}-${i}` === over.id || t.id === over.id);
    if (fromIndex >= 0 && toIndex >= 0) {
      reorderQueue(fromIndex, toIndex);
    }
  };

  const handleManualRadioRefresh = async () => {
    setIsRefreshingRadio(true);
    await refreshRadioQueue();
    setIsRefreshingRadio(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="up-next-heading">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 id="up-next-heading" className="text-base font-semibold text-white">
              Up Next
            </h2>
            {queue.length > 0 && (
              <span className="text-xs font-mono text-zinc-400 tabular-nums">
                {queue.length} · {formatTime(totalDuration)}
              </span>
            )}
          </div>
          {queue.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-[13px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] px-2 rounded-md min-h-[36px] transition-colors cursor-pointer select-none"
            >
              Clear
            </button>
          )}
        </div>

        {queue.length === 0 ? (
          <p className="py-3 text-sm text-zinc-400">
            Nothing queued. Songs added with Add to Queue appear here.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="w-full text-left border-collapse table-fixed" aria-label="Up Next queue">
              <tbody>
                <SortableContext
                  items={queue.map((t, i) => `${t.id}-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {queue.map((track, i) => {
                    const canRemove = !isInRoom || isHost || track.addedBy?.id === userId;
                    return (
                      <TrackRow
                        key={`${track.id}-${i}`}
                        track={track}
                        index={i}
                        variant="queue"
                        isSortable={!isInRoom || isHost}
                        sortableId={`${track.id}-${i}`}
                        isActive={currentTrack?.id === track.id}
                        onRemoveFromQueue={canRemove ? () => removeFromQueue(i) : undefined}
                      />
                    );
                  })}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        )}
      </section>

      <section aria-labelledby="radio-heading">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-zinc-400" aria-hidden="true" />
            <h2 id="radio-heading" className="text-base font-semibold text-white">
              Radio
            </h2>
          </div>
          <button
            onClick={handleManualRadioRefresh}
            disabled={isRefreshingRadio || !currentTrack}
            className="flex items-center gap-1.5 text-[13px] font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] px-2 rounded-md min-h-[36px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
          >
            {isRefreshingRadio ? (
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw size={13} aria-hidden="true" />
            )}
            <span>Refresh</span>
          </button>
        </div>

        {radioQueue.length === 0 ? (
          <p className="py-3 text-sm text-zinc-400">
            {currentTrack ? 'Loading suggestions…' : 'Play a song to load radio'}
          </p>
        ) : (
          <ul>
            {radioQueue.map((track, index) => (
              <li
                key={`radio-${track.id}-${index}`}
                className="relative flex items-center gap-1 p-1.5 rounded-lg hover:bg-white/[0.04] focus-within:bg-white/[0.04] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => play(track)}
                  aria-label={`Play ${track.title} by ${track.artist}`}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer after:content-[''] after:absolute after:inset-0"
                >
                  <TrackArtwork track={track} size="md" rounded="md" />
                  <span className="min-w-0 flex-1 flex flex-col">
                    <span className="truncate text-sm font-medium text-zinc-100">{track.title}</span>
                    <span className="truncate text-[13px] text-zinc-400">{track.artist}</span>
                  </span>
                </button>

                <Tooltip content="Add to Queue" side="top">
                  <button
                    onClick={() => addRadioTrackToManualQueue(track)}
                    aria-label={`Add ${track.title} to queue`}
                    className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer shrink-0"
                  >
                    <Plus size={16} />
                  </button>
                </Tooltip>
                <Tooltip content="Dismiss" side="top">
                  <button
                    onClick={() => removeFromRadioQueue(index)}
                    aria-label={`Dismiss ${track.title}`}
                    className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer shrink-0"
                  >
                    <X size={16} />
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          clearQueue();
          setShowClearConfirm(false);
        }}
        title="Clear Queue"
        description="This removes all songs from the queue."
        confirmText="Clear Queue"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
