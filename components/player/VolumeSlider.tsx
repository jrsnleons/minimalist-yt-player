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
  const percentage = displayVolume;

  const progressStyle = {
    background: `linear-gradient(to right, #fafafa ${percentage}%, #27272a ${percentage}%)`,
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Tooltip content={isMuted ? 'Unmute (M)' : 'Mute (M)'} side="top">
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className="p-1 text-zinc-400 hover:text-white transition-opacity rounded"
        >
          <VolumeIcon size={16} />
        </button>
      </Tooltip>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={displayVolume}
        onChange={(e) => setVolume(parseInt(e.target.value, 10))}
        style={progressStyle}
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={displayVolume}
        aria-valuetext={`${displayVolume}%`}
        className="w-20 h-[3px] rounded-full cursor-pointer"
      />
    </div>
  );
}
