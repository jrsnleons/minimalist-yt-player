'use client';

import { useEffect } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';

export function useAdblockCheck() {
  useEffect(() => {
    const check = async () => {
      try {
        const testReq = new Request(
          'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
          { method: 'HEAD', mode: 'no-cors' }
        );
        await fetch(testReq);
        // If we got here, adblock is NOT active — show tip
        usePlayerStore.getState().showToast(
          '💡 Tip: Enable uBlock Origin for uninterrupted listening.'
        );
      } catch {
        // Adblock IS active — no banner needed
      }
    };

    // Run after first paint
    const timer = setTimeout(check, 2000);
    return () => clearTimeout(timer);
  }, []);
}
