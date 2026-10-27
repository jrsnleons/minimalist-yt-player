'use client';

import { useState, useRef, useEffect, useCallback, useId, isValidElement, cloneElement } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delayMs?: number;
}

interface TooltipCoords {
  top: number;
  left: number;
  transform: string;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
  delayMs = 150,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;
    let transform = '';

    const GAP = 7;

    switch (side) {
      case 'top':
        top = rect.top - GAP;
        left = rect.left + rect.width / 2;
        transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        top = rect.bottom + GAP;
        left = rect.left + rect.width / 2;
        transform = 'translate(-50%, 0)';
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - GAP;
        transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + GAP;
        transform = 'translate(0, -50%)';
        break;
    }

    // Viewport clamping
    const safeLeft = Math.max(12, Math.min(typeof window !== 'undefined' ? window.innerWidth - 12 : left, left));
    const safeTop = Math.max(12, Math.min(typeof window !== 'undefined' ? window.innerHeight - 12 : top, top));

    setCoords({ top: safeTop, left: safeLeft, transform });
  }, [side]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, updatePosition]);

  useEffect(() => {
    if (!isVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsVisible(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const sideVariants = {
    top: { initial: { opacity: 0, y: 3 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 2 } },
    bottom: { initial: { opacity: 0, y: -3 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -2 } },
    left: { initial: { opacity: 0, x: 3 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 2 } },
    right: { initial: { opacity: 0, x: -3 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -2 } },
  };

  const describedChild =
    isVisible && isValidElement<{ 'aria-describedby'?: string }>(children)
      ? cloneElement(children, { 'aria-describedby': tooltipId })
      : children;

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      className={cn('inline-flex items-center justify-center', className)}
    >
      {describedChild}

      {mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isVisible && content && coords && (
              // Positioned wrapper owns the translate; the inner element owns the motion.
              <span
                key="tooltip"
                style={{
                  position: 'fixed',
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  transform: coords.transform,
                  zIndex: 99999,
                  pointerEvents: 'none',
                }}
              >
                <motion.span
                  id={tooltipId}
                  role="tooltip"
                  initial={sideVariants[side].initial}
                  animate={sideVariants[side].animate}
                  exit={sideVariants[side].exit}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="block px-2.5 py-1 text-xs font-medium rounded-lg bg-[#181820]/95 text-zinc-100 border border-white/15 shadow-[0_8px_20px_rgba(0,0,0,0.8)] backdrop-blur-md whitespace-nowrap select-none tracking-normal"
                >
                  {content}
                </motion.span>
              </span>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
