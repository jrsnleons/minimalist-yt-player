'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

interface SwitchRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Labeled on/off setting. The whole row is one button with role="switch" and aria-checked,
 * so the target is at least 56px tall and Space / Enter toggle it.
 */
export function SwitchRow({ label, description, checked, onChange, disabled, className }: SwitchRowProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const descId = `${id}-desc`;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={description ? descId : undefined}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'w-full flex items-center justify-between gap-4 py-3 px-3 -mx-3 min-h-[56px] rounded-lg text-left',
        'hover:bg-white/[0.04] transition-colors cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-white',
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
      style={{ width: 'calc(100% + 1.5rem)' }}
    >
      <span className="min-w-0 flex flex-col">
        <span id={labelId} className="text-sm font-medium text-zinc-100">
          {label}
        </span>
        {description && (
          <span id={descId} className="text-[13px] text-zinc-400 mt-0.5">
            {description}
          </span>
        )}
      </span>

      <span
        aria-hidden="true"
        className={cn(
          'relative shrink-0 h-7 w-12 rounded-full transition-colors duration-150',
          checked ? 'bg-[#f4f4f6]' : 'bg-[#3a3a44]'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-6 w-6 rounded-full transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
            checked ? 'translate-x-5 bg-[#0b0b0e]' : 'translate-x-0 bg-zinc-300'
          )}
        />
      </span>
    </button>
  );
}
