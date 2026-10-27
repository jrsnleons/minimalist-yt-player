'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { cn, formatTime } from '@/lib/utils';
import type { RemoteApi } from '@/components/remote/RemoteController';

const smallBtn =
  'w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white';

export function RemoteQueue({ api, locked }: { api: RemoteApi; locked: boolean }) {
  const { state, enabled, send } = api;
  const [confirmClear, setConfirmClear] = useState(false);
  const canEdit = enabled && !locked;

  // Upcoming items only; indices are absolute positions in the host queue.
  const upcoming = state.queue
    .map((track, i) => ({ track, index: state.queueOffset + i }))
    .filter(({ index }) => index > state.queueIndex);
  const firstIndex = upcoming[0]?.index;
  const lastIndex = upcoming[upcoming.length - 1]?.index;

  return (
    <section aria-label="Up Next" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">
          Up Next <span className="font-normal text-zinc-400">· {upcoming.length}</span>
        </h2>
        <button
          onClick={() => setConfirmClear(true)}
          disabled={!canEdit || state.queueTotal === 0}
          className="min-h-[36px] px-3 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
        >
          Clear Queue
        </button>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-zinc-400 py-6 text-center">Nothing queued. Use Search to add songs.</p>
      ) : (
        <ul className="flex flex-col">
          {upcoming.map(({ track, index }) => (
            <li key={`${track.id}-${index}`} className="flex items-center gap-1 rounded-xl">
              <button
                onClick={() => send({ type: 'playTrack', track })}
                disabled={!canEdit}
                aria-label={`Play ${track.title} now`}
                className="flex items-center gap-3 flex-1 min-w-0 min-h-[56px] py-1.5 pr-1 text-left rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
              >
                <TrackArtwork track={track} size="fill" rounded="md" className="w-11 h-11 shrink-0" />
                <span className="min-w-0 flex flex-col">
                  <span className="truncate text-sm font-medium text-zinc-100">{track.title}</span>
                  <span className="truncate text-xs text-zinc-400">
                    {track.artist}
                    {track.duration > 0 && <span className="font-mono"> · {formatTime(track.duration)}</span>}
                  </span>
                </span>
              </button>
              <button
                aria-label={`Move ${track.title} up`}
                disabled={!canEdit || index === firstIndex}
                onClick={() => send({ type: 'moveInQueue', from: index, to: index - 1 })}
                className={smallBtn}
              >
                <ArrowUp size={18} aria-hidden="true" />
              </button>
              <button
                aria-label={`Move ${track.title} down`}
                disabled={!canEdit || index === lastIndex}
                onClick={() => send({ type: 'moveInQueue', from: index, to: index + 1 })}
                className={smallBtn}
              >
                <ArrowDown size={18} aria-hidden="true" />
              </button>
              <button
                aria-label={`Remove ${track.title}`}
                disabled={!canEdit}
                onClick={() => send({ type: 'removeFromQueue', index })}
                className={cn(smallBtn, 'hover:text-rose-300')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {state.queueTotal > state.queue.length && (
        <p className="text-xs text-zinc-400 text-center">Showing {state.queue.length} of {state.queueTotal} songs.</p>
      )}

      <ConfirmModal
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => send({ type: 'clearQueue' })}
        title="Clear Queue"
        description="Removes all songs from the queue and stops playback on the playing device."
        confirmText="Clear Queue"
      />
    </section>
  );
}
