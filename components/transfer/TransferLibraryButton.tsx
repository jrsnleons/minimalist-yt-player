'use client';

import { ArrowLeftRight } from 'lucide-react';
import { useTransferStore } from '@/store/useTransferStore';
import { cn } from '@/lib/utils';

/**
 * Opens the Transfer Library dialog. The dialog itself is mounted once by the command
 * palette, so this button can be placed anywhere (for example in Settings) without
 * mounting a second copy.
 */
export function TransferLibraryButton({ className, onOpen }: { className?: string; onOpen?: () => void }) {
  const open = useTransferStore((s) => s.open);

  return (
    <button
      type="button"
      onClick={() => {
        open('send');
        onOpen?.();
      }}
      className={cn(
        'inline-flex items-center gap-2 min-h-[36px] px-3 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
        className
      )}
    >
      <ArrowLeftRight size={16} aria-hidden="true" />
      Transfer Library
    </button>
  );
}
