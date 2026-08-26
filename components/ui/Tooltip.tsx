'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const sideClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className={cn('relative group inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'absolute z-50 px-2 py-1 text-xs rounded',
          'bg-zinc-800 text-zinc-200 border border-zinc-700',
          'whitespace-nowrap pointer-events-none',
          'opacity-0 group-hover:opacity-100',
          'transition-opacity duration-150',
          sideClasses[side]
        )}
      >
        {content}
      </span>
    </div>
  );
}
