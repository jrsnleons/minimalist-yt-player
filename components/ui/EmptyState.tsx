import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  /** Buttons rendered under the text. Use at most one primary button. */
  children?: ReactNode;
  /** Use "error" for failures so screen readers announce them. */
  tone?: 'neutral' | 'error';
  className?: string;
}

/** Centered empty / error message used by views when there is nothing to show. */
export function EmptyState({ icon, title, description, children, tone = 'neutral', className }: EmptyStateProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cn('flex flex-col items-center justify-center text-center py-16 px-4', className)}
    >
      <span
        className={cn('mb-3 flex items-center justify-center', tone === 'error' ? 'text-rose-400' : 'text-zinc-500')}
        aria-hidden="true"
      >
        {icon}
      </span>
      <p className="text-sm font-semibold text-zinc-100">{title}</p>
      {description && <p className="text-sm text-zinc-400 mt-1 max-w-sm">{description}</p>}
      {children && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
