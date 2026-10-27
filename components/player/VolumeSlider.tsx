'use client';

import { useCallback } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { tip } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';

interface VolumeSliderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  /** Fill color on hover and focus. Defaults to white. */
  accentColor?: string;
}

export function VolumeSlider({
  className,
  size = 'md',
  showLabel = true,
  accentColor,
}: VolumeSliderProps) {
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);

  const displayVolume = isMuted ? 0 : volume;
  const percentage = Math.min(100, Math.max(0, displayVolume));

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const delta = e.deltaY < 0 ? 5 : -5;
      setVolume(Math.min(100, Math.max(0, volume + delta)));
    },
    [volume, setVolume]
  );

  const widthClass = {
    sm: 'w-20',
    md: 'w-24',
    lg: 'w-32 sm:w-36',
  }[size];

  const iconSize = { sm: 16, md: 18, lg: 20 }[size];

  return (
    <div className={cn('flex items-center gap-1', className)} onWheel={handleWheel}>
      <Tooltip content={tip(isMuted ? 'Unmute' : 'Mute', 'mute')} side="top">
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          aria-pressed={isMuted}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors rounded-full cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center select-none"
        >
          <VolumeIcon size={iconSize} />
        </button>
      </Tooltip>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={displayVolume}
        onChange={(e) => setVolume(parseInt(e.target.value, 10))}
        aria-label="Volume"
        aria-valuetext={`${displayVolume}%`}
        className={cn('range', widthClass)}
        style={
          {
            '--pct': `${percentage}%`,
            ...(accentColor ? { '--range-hover': accentColor } : {}),
          } as React.CSSProperties
        }
      />

      {showLabel && (
        <span className="font-mono-time text-xs text-zinc-400 w-9 text-left shrink-0 tabular-nums">
          {displayVolume}%
        </span>
      )}
    </div>
  );
}
