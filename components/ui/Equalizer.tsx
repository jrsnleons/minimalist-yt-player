import { cn } from '@/lib/utils';

/** Three small bars. Animated only while `playing`; static under prefers-reduced-motion. */
export function Equalizer({ playing, className }: { playing: boolean; className?: string }) {
  return (
    <span className={cn('eq', className)} data-playing={playing} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
