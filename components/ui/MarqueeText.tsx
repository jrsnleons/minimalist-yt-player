'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MarqueeTextProps {
  text: string;
  className?: string;
  subText?: string;
  subClassName?: string;
  isParentHovered?: boolean;
}

export function MarqueeText({
  text,
  className,
  subText,
  subClassName,
  isParentHovered = false,
}: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isSelfHovered, setIsSelfHovered] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const hasOverflow = textRef.current.scrollWidth > containerRef.current.clientWidth + 2;
        setIsOverflowing(hasOverflow);
      }
    };

    checkOverflow();
    const ro = new ResizeObserver(checkOverflow);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [text]);

  const activeHover = isSelfHovered || isParentHovered;
  const offset = isOverflowing && textRef.current && containerRef.current
    ? textRef.current.scrollWidth - containerRef.current.clientWidth
    : 0;

  // Proportional scroll duration so long titles move smoothly without rushing
  const duration = Math.max(2.8, Math.min(8, offset / 30));

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsSelfHovered(true)}
      onMouseLeave={() => setIsSelfHovered(false)}
      className="overflow-hidden w-full relative min-w-0"
    >
      <div className="overflow-hidden whitespace-nowrap w-full">
        <span
          ref={textRef}
          style={{
            display: 'inline-block',
            transform: activeHover && isOverflowing ? `translateX(-${offset + 4}px)` : 'translateX(0px)',
            transition: activeHover && isOverflowing
              ? `transform ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1) 0.25s`
              : 'transform 0.35s ease-out',
          }}
          className={cn(
            'whitespace-nowrap transition-colors',
            !activeHover && isOverflowing && 'truncate block',
            className
          )}
          title={text}
        >
          {text}
        </span>
      </div>

      {subText && (
        <p className={cn('text-[10px] text-zinc-400 truncate mt-0.5 leading-none', subClassName)}>
          {subText}
        </p>
      )}
    </div>
  );
}
