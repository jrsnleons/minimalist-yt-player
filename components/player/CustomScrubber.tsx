'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { formatTime, cn } from '@/lib/utils';

interface CustomScrubberProps {
  className?: string;
  compact?: boolean;
  accentColor?: string;
}

export function CustomScrubber({
  className,
  compact = false,
  accentColor = '#ffffff',
}: CustomScrubberProps) {
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);

  const percentage = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  return (
    <div className={cn('flex items-center gap-3 w-full select-none', className)}>
      {!compact && (
        <span
          className="font-mono-time text-zinc-400 text-xs w-11 text-right shrink-0 font-medium"
          aria-label={`Current time: ${formatTime(progress)}`}
        >
          {formatTime(progress)}
        </span>
      )}

      <div className="relative flex-1 flex items-center h-6 group cursor-pointer">
        {/* Track Background */}
        <div className="absolute inset-x-0 h-1.5 bg-zinc-800 rounded-full overflow-hidden pointer-events-none group-hover:h-2 transition-all shadow-inner">
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${percentage}%`,
              backgroundColor: accentColor || '#ffffff',
            }}
          />
        </div>

        {/* Draggable Thumb Knob */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-lg border border-zinc-950 pointer-events-none transition-transform transform -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:scale-110"
          style={{ left: `${percentage}%` }}
        />

        {/* Range slider input */}
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 100}
          step={0.5}
          value={progress}
          onChange={handleChange}
          aria-label="Seek progress"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={progress}
          aria-valuetext={`${formatTime(progress)} of ${formatTime(duration)}`}
          className="w-full h-full opacity-0 cursor-pointer relative z-10"
        />
      </div>

      {!compact && (
        <span
          className="font-mono-time text-zinc-400 text-xs w-11 shrink-0 font-medium"
          aria-label={`Duration: ${formatTime(duration)}`}
        >
          {formatTime(duration)}
        </span>
      )}
    </div>
  );
}
