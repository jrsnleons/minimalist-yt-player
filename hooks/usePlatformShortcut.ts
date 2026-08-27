'use client';

import { useState, useEffect } from 'react';

/**
 * Returns the platform-appropriate keyboard shortcut string.
 * Uses a safe default during SSR to prevent React hydration mismatch errors,
 * and updates after client mount.
 */
export function usePlatformShortcut(defaultKey: string = '⌘K'): string {
  const [shortcut, setShortcut] = useState(defaultKey);

  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent);
    setShortcut(isMac ? '⌘K' : 'Ctrl+K');
  }, []);

  return shortcut;
}
