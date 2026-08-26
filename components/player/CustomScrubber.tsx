'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { formatTime, cn } from '@/lib/utils';

interface CustomScrubberProps {
  className?: string;
  compact?: boolean;
}

export function CustomScrubber({ className, compact = false }: CustomScrubberProps) {
  const { progress, duration, seek } = usePlayerStore();

  const percentage = duration > 0 ? (progress / duration) * 100 : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  const progressStyle = {
    background: `linear-gradient(to right, #fafafa ${percentage}%, #27272a ${percentage}%)`,
  };

  return (
    <div className={cn('flex items-center gap-2 w-full', className)}>
      {!compact && (
        <span
          className="font-mono-time text-zinc-400 w-10 text-right shrink-0"
          aria-label={`Current time: ${formatTime(progress)}`}
        >
          {formatTime(progress)}
        </span>
      )}

      <div className="relative flex-1 flex items-center">
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 100}
          step={0.5}
          value={progress}
          onChange={handleChange}
          style={progressStyle}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={progress}
          aria-valuetext={`${formatTime(progress)} of ${formatTime(duration)}`}
          className="w-full h-[3px] rounded-full cursor-pointer"
        />
      </div>

      {!compact && (
        <span
          className="font-mono-time text-zinc-400 w-10 shrink-0"
          aria-label={`Duration: ${formatTime(duration)}`}
        >
          {formatTime(duration)}
        </span>
      )}
    </div>
  );
}
