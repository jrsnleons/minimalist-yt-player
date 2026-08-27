'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { usePlayerStore } from '@/store/usePlayerStore';

interface SlotRect {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: string;
}

export function YouTubeIframe() {
  const { containerRef } = useYouTubePlayer();
  const isVideoEnabled = usePlayerStore((s) => s.isVideoEnabled);
  const zenMode = usePlayerStore((s) => s.zenMode);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const [slotRect, setSlotRect] = useState<SlotRect | null>(null);
  const [lastRect, setLastRect] = useState<SlotRect | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const rafRef = useRef<number | null>(null);

  const updatePosition = useCallback(() => {
    if (!currentTrack) {
      setSlotRect(null);
      return;
    }

    const targetId = zenMode ? 'zen-artwork-slot' : 'hero-artwork-slot';
    const el = document.getElementById(targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const newRect: SlotRect = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: zenMode ? '24px' : '16px',
        };
        setSlotRect(newRect);
        setLastRect(newRect);
        return;
      }
    }
    setSlotRect(null);
  }, [zenMode, currentTrack]);

  // Handle 600ms smooth RAF tracking loop whenever video mode or zen mode changes
  useEffect(() => {
    updatePosition();

    const startTime = performance.now();
    const duration = 650; // Follow 500ms CSS morph animation smoothly

    const tick = (now: number) => {
      updatePosition();
      if (now - startTime < duration) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isVideoEnabled, zenMode, updatePosition]);

  // Event listeners for window resize / scroll and element resize observer
  useEffect(() => {
    if (!currentTrack) return;

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    const targetId = zenMode ? 'zen-artwork-slot' : 'hero-artwork-slot';
    const el = document.getElementById(targetId);
    let ro: ResizeObserver | null = null;
    if (el) {
      ro = new ResizeObserver(updatePosition);
      ro.observe(el);
    }

    const interval = setInterval(updatePosition, 300);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      ro?.disconnect();
      clearInterval(interval);
    };
  }, [zenMode, currentTrack?.id, updatePosition]);

  // Handle smooth fade out before off-screen detachment
  useEffect(() => {
    if (isVideoEnabled) {
      setIsFadingOut(false);
    } else {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setIsFadingOut(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isVideoEnabled]);

  const activeRect = slotRect || lastRect;
  const isDisplayed = (isVideoEnabled || isFadingOut) && !!currentTrack && !!activeRect;
  const isFullyVisible = isVideoEnabled && !!currentTrack && !!slotRect;

  return (
    <div
      style={
        isDisplayed && activeRect
          ? {
              position: 'fixed',
              top: `${activeRect.top}px`,
              left: `${activeRect.left}px`,
              width: `${activeRect.width}px`,
              height: `${activeRect.height}px`,
              borderRadius: activeRect.borderRadius,
              zIndex: zenMode ? 55 : 25,
              pointerEvents: isFullyVisible ? 'auto' : 'none',
              opacity: isFullyVisible ? 1 : 0,
              overflow: 'hidden',
              transition:
                'opacity 0.35s ease-in-out, top 0.5s ease-in-out, left 0.5s ease-in-out, width 0.5s ease-in-out, height 0.5s ease-in-out, border-radius 0.5s ease-in-out',
            }
          : {
              position: 'fixed',
              top: '-9999px',
              left: '-9999px',
              width: '1px',
              height: '1px',
              pointerEvents: 'none',
              opacity: 0,
              zIndex: -1,
              overflow: 'hidden',
            }
      }
      className="bg-black shadow-2xl border border-white/20"
    >
      <div
        id="yt-player-container"
        ref={containerRef}
        className="w-full h-full bg-black flex items-center justify-center overflow-hidden [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:object-cover"
      />
    </div>
  );
}
