'use client';

import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import type { Track } from '@/types';

export function useRadioSuggestions(
  videoId: string | undefined,
  instrumentalOnly: boolean,
  excludeIds: string[]
) {
  const [suggestions, setSuggestions] = useState<Track[]>([]);

  useEffect(() => {
    if (!videoId) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    const params = new URLSearchParams({
      videoId,
      instrumental: String(instrumentalOnly),
      exclude: excludeIds.join(','),
    });

    fetch(`/api/radio?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { suggestions?: Track[] }) => {
        if (data.suggestions) setSuggestions(data.suggestions);
      })
      .catch(() => {}); // Abort or error — silent

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, instrumentalOnly]);

  return suggestions;
}
