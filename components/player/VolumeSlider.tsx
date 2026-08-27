'use client';

import { useRef, useCallback } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

interface VolumeSliderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  accentColor?: string;
}

export function VolumeSlider({
  className,
  size = 'md',
  showLabel = true,
  accentColor = '#ffffff',
}: VolumeSliderProps) {
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const sliderRef = useRef<HTMLDivElement>(null);

  const displayVolume = isMuted ? 0 : volume;
  const percentage = Math.min(100, Math.max(0, displayVolume));

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 5 : -5;
      setVolume(Math.min(100, Math.max(0, volume + delta)));
    },
    [volume, setVolume]
  );

  const widthClass = {
    sm: 'w-16',
    md: 'w-20',
    lg: 'w-32 sm:w-36',
  }[size];

  const trackHeight = {
    sm: 'h-1 group-hover:h-1.5',
    md: 'h-1.5 group-hover:h-2',
    lg: 'h-2 group-hover:h-2.5',
  }[size];

  const iconSize = {
    sm: 14,
    md: 15,
    lg: 17,
  }[size];

  return (
    <div
      className={cn('flex items-center gap-2 select-none', className)}
      onWheel={handleWheel}
    >
      <Tooltip content={isMuted ? 'Unmute (M)' : `Mute (M) · Current: ${displayVolume}%`} side="top">
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute' : `Mute (${displayVolume}%)`}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1e1e24] transition-colors rounded-md cursor-pointer shrink-0"
        >
          <VolumeIcon size={iconSize} />
        </button>
      </Tooltip>

      <div className={cn('relative flex items-center h-6 group cursor-pointer', widthClass)}>
        {/* Track Background */}
        <div className={cn('absolute inset-x-0 bg-zinc-800 rounded-full overflow-hidden pointer-events-none transition-all shadow-inner', trackHeight)}>
          {/* Filled Volume Progress */}
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${percentage}%`,
              backgroundColor: accentColor || '#ffffff',
            }}
          />
        </div>

        {/* Draggable Thumb Indicator */}
        <div
          className="absolute w-3 h-3 rounded-full bg-white shadow-md border border-zinc-900 pointer-events-none transition-transform transform -translate-x-1/2 group-hover:scale-110"
          style={{ left: `${percentage}%` }}
        />

        {/* Range Slider Overlay */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={displayVolume}
          onChange={(e) => setVolume(parseInt(e.target.value, 10))}
          aria-label="Volume level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={displayVolume}
          aria-valuetext={`${displayVolume}%`}
          className="w-full h-full opacity-0 cursor-pointer relative z-10"
        />
      </div>

      {showLabel && (
        <span className="font-mono-time text-[11px] text-zinc-400 font-semibold w-8 text-left shrink-0">
          {displayVolume}%
        </span>
      )}
    </div>
  );
}
