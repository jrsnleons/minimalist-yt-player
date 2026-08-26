'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delayMs?: number;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
  delayMs = 150,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const sideClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };

  const sideVariants = {
    top: { initial: { opacity: 0, y: 3 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 2 } },
    bottom: { initial: { opacity: 0, y: -3 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -2 } },
    left: { initial: { opacity: 0, x: 3 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 2 } },
    right: { initial: { opacity: 0, x: -3 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -2 } },
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      className={cn('relative inline-flex items-center justify-center', className)}
    >
      {children}
      <AnimatePresence>
        {isVisible && content && (
          <motion.span
            role="tooltip"
            initial={sideVariants[side].initial}
            animate={sideVariants[side].animate}
            exit={sideVariants[side].exit}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={cn(
              'absolute z-[999] px-2 py-0.5 text-[11px] font-medium rounded-md',
              'bg-[#1e1e26] text-zinc-200 border border-zinc-700/80 shadow-xl',
              'whitespace-nowrap pointer-events-none select-none tracking-normal',
              sideClasses[side]
            )}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
