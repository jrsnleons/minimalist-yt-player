'use client';

import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

interface VolumeSliderProps {
  className?: string;
}

export function VolumeSlider({ className }: VolumeSliderProps) {
  const { volume, isMuted, setVolume, toggleMute } = usePlayerStore();

  const displayVolume = isMuted ? 0 : volume;
  const percentage = Math.min(100, Math.max(0, displayVolume));

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className={cn('flex items-center gap-2 select-none', className)}>
      <Tooltip content={isMuted ? 'Unmute (M)' : 'Mute (M)'} side="top">
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1e1e24] transition-colors rounded-md"
        >
          <VolumeIcon size={15} />
        </button>
      </Tooltip>

      <div className="relative w-20 flex items-center h-4 group cursor-pointer">
        {/* Track Background */}
        <div className="absolute inset-x-0 h-1 bg-[#27272a] rounded-full overflow-hidden pointer-events-none group-hover:h-1.5 transition-all">
          <div
            className="h-full bg-white rounded-full transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Range slider input */}
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
          className="w-full h-4 opacity-0 group-hover:opacity-100 cursor-pointer relative z-10 transition-opacity"
        />
      </div>

      <span className="font-mono-time text-[10px] text-zinc-500 w-6 text-right shrink-0">
        {displayVolume}%
      </span>
    </div>
  );
}
