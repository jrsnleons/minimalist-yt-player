'use client';

import { useListenTogetherStore } from '@/store/useListenTogetherStore';

/** True when a Listen Together session is active and this listener cannot control playback. */
export function usePlaybackLock(): boolean {
  const isInRoom = useListenTogetherStore((s) => s.isInRoom);
  const isHost = useListenTogetherStore((s) => s.isHost);
  const allowListenerControls = useListenTogetherStore((s) => s.allowListenerControls);
  return isInRoom && !isHost && !allowListenerControls;
}
