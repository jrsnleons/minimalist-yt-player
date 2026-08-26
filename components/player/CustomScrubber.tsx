'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { formatTime, cn } from '@/lib/utils';

interface CustomScrubberProps {
  className?: string;
  compact?: boolean;
}

export function CustomScrubber({ className, compact = false }: CustomScrubberProps) {
  const { progress, duration, seek } = usePlayerStore();

  const percentage = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  return (
    <div className={cn('flex items-center gap-2.5 w-full select-none', className)}>
      {!compact && (
        <span
          className="font-mono-time text-zinc-400 text-xs w-11 text-right shrink-0 font-medium"
          aria-label={`Current time: ${formatTime(progress)}`}
        >
          {formatTime(progress)}
        </span>
      )}

      <div className="relative flex-1 flex items-center h-4 group cursor-pointer">
        {/* Track Background */}
        <div className="absolute inset-x-0 h-1 bg-[#27272a] rounded-full overflow-hidden pointer-events-none group-hover:h-1.5 transition-all">
          <div
            className="h-full bg-white group-hover:bg-white rounded-full transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

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
          className="w-full h-4 opacity-0 group-hover:opacity-100 cursor-pointer relative z-10 transition-opacity"
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
