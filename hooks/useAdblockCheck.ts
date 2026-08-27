'use client';

import { useEffect } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';

export function useAdblockCheck() {
  useEffect(() => {
    // Only show the tip once per session to avoid spamming on every reload
    if (sessionStorage.getItem('adblockTipShown')) return;

    const check = async () => {
      try {
        // Use a hidden bait DOM element — more reliable than a network request
        // because modern blockers redirect ad URLs to dummy 200 responses
        // (which would cause false negatives with the old fetch approach).
        const bait = document.createElement('div');
        bait.className = 'adsbox ad-banner pub_300x250 pub_300x250m pub_728x90 text-ad';
        bait.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;';
        document.body.appendChild(bait);

        // Wait a tick for the blocker to collapse/hide the bait element
        await new Promise((r) => setTimeout(r, 100));

        const isBlocked =
          bait.offsetParent === null ||
          bait.offsetHeight === 0 ||
          bait.style.display === 'none' ||
          bait.style.visibility === 'hidden';

        document.body.removeChild(bait);

        if (!isBlocked) {
          // Adblock is NOT active — show tip
          sessionStorage.setItem('adblockTipShown', '1');
          usePlayerStore.getState().showToast(
            '💡 Tip: Enable uBlock Origin for uninterrupted listening.'
          );
        }
      } catch {
        // Ignore any DOM errors
      }
    };

    // Run after first paint
    const timer = setTimeout(check, 2000);
    return () => clearTimeout(timer);
  }, []);
}
