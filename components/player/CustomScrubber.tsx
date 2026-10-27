'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { usePlaybackLock } from '@/hooks/usePlaybackLock';
import { formatTime, cn } from '@/lib/utils';

interface CustomScrubberProps {
  className?: string;
  compact?: boolean;
  /** Fill color on hover and focus. Defaults to white. */
  accentColor?: string;
  /** Put the times under the slider ends instead of beside it (mobile sheet). */
  stacked?: boolean;
}

export function CustomScrubber({
  className,
  compact = false,
  accentColor,
  stacked = false,
}: CustomScrubberProps) {
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);
  const locked = usePlaybackLock();

  const percentage = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (locked) return;
    seek(parseFloat(e.target.value));
  };

  const timeClass = 'font-mono-time text-zinc-400 text-xs shrink-0 tabular-nums';

  const slider = (
    <input
      type="range"
      min={0}
      max={duration > 0 ? duration : 100}
      step={0.5}
      value={Math.min(progress, duration > 0 ? duration : 100)}
      onChange={handleChange}
      aria-disabled={locked || undefined}
      title={locked ? 'DJ controls playback' : undefined}
      aria-label="Seek"
      aria-valuetext={`${formatTime(progress)} of ${formatTime(duration)}`}
      className={cn('range flex-1 min-w-0 select-none', locked && 'opacity-50 cursor-not-allowed')}
      style={
        {
          '--pct': `${percentage}%`,
          ...(accentColor ? { '--range-hover': accentColor } : {}),
        } as React.CSSProperties
      }
    />
  );

  if (stacked) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex">{slider}</div>
        <div className="flex justify-between mt-0.5">
          <span className={timeClass}>{formatTime(progress)}</span>
          <span className={timeClass}>{formatTime(duration)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2.5 w-full', className)}>
      {!compact && <span className={cn(timeClass, 'w-11 text-right')}>{formatTime(progress)}</span>}
      {slider}
      {!compact && <span className={cn(timeClass, 'w-11')}>{formatTime(duration)}</span>}
    </div>
  );
}
