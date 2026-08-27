'use client';

import { useState, useEffect } from 'react';
import type { Track } from '@/types';

export function useRadioSuggestions(
  videoId: string | undefined,
  excludeIds: string[]
) {
  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Serialize excludeIds to a stable string dependency so the effect only
  // re-runs when the actual IDs change, not on every array reference change.
  const excludeKey = excludeIds.join(',');

  useEffect(() => {
    if (!videoId) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      videoId,
      exclude: excludeKey,
    });

    fetch(`/api/radio?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Radio request failed: ${res.status}`);
        return res.json();
      })
      .then((data: { suggestions?: Track[] }) => {
        if (data.suggestions) setSuggestions(data.suggestions);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return; // Expected on cleanup
        setError('Could not load suggestions');
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [videoId, excludeKey]);

  return { suggestions, isLoading, error };
}
