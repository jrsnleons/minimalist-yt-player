'use client';

import { useDirectAudio } from '@/hooks/useDirectAudio';

/**
 * Mounts the direct audio mode.
 * This component renders nothing visible — it just activates the useDirectAudio hook.
 */
export function DirectAudioPlayer() {
  useDirectAudio();
  return null;
}
