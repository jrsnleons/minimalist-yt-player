'use client';

import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function Skeleton({ className, rounded = 'md', ...props }: SkeletonProps) {
  const roundedClass = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={cn(
        'skeleton-shimmer border border-white/[0.04]',
        roundedClass,
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

/** Flat, static stand-in for cover art while a list loads (images never shimmer). */
function ArtworkPlaceholder({ className, rounded = 'md' }: { className?: string; rounded?: SkeletonProps['rounded'] }) {
  const r = { none: 'rounded-none', sm: 'rounded', md: 'rounded-md', lg: 'rounded-lg', xl: 'rounded-xl', '2xl': 'rounded-2xl', full: 'rounded-full' }[rounded];
  return <div aria-hidden="true" className={cn('shrink-0 bg-white/[0.06]', r, className)} />;
}

/** Table row skeleton matching TrackRow layout */
export function TrackRowSkeleton({ index }: { index?: number }) {
  return (
    <tr className="border-b border-white/[0.03] text-xs select-none pointer-events-none">
      {/* Index */}
      <td className="w-14 px-2 py-2 text-center shrink-0">
        <div className="flex items-center justify-center">
          {typeof index === 'number' ? (
            <span className="font-mono text-zinc-600 text-[13px]">{index + 1}</span>
          ) : (
            <Skeleton className="w-4 h-3" rounded="sm" />
          )}
        </div>
      </td>

      {/* Artwork + Title & Artist */}
      <td className="px-2 py-2 min-w-0 max-w-0 w-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <ArtworkPlaceholder className="w-10 h-10" rounded="lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/5 max-w-[220px]" rounded="sm" />
            <Skeleton className="h-2.5 w-2/5 max-w-[140px] opacity-60" rounded="sm" />
          </div>
        </div>
      </td>

      {/* Actions & Duration */}
      <td className="w-36 px-2 py-2 text-right shrink-0">
        <div className="flex items-center justify-end gap-1.5">
          <Skeleton className="w-5 h-5" rounded="md" />
          <Skeleton className="w-5 h-5" rounded="md" />
          <Skeleton className="w-7 h-2.5 ml-1" rounded="sm" />
        </div>
      </td>
    </tr>
  );
}

/** Playlist Card Skeleton matching SearchView / PlaylistsView grid */
export function PlaylistCardSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0c0c10] border border-white/[0.06] shadow-sm select-none pointer-events-none">
      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
        <ArtworkPlaceholder className="w-10 h-10" rounded="lg" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3 w-4/5 max-w-[160px]" rounded="sm" />
          <Skeleton className="h-2.5 w-1/2 max-w-[100px] opacity-60" rounded="sm" />
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Skeleton className="w-7 h-7" rounded="xl" />
        <Skeleton className="w-7 h-7" rounded="xl" />
      </div>
    </div>
  );
}

/** Command Palette list item skeleton */
export function CommandPaletteSkeletonItem() {
  return (
    <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-transparent select-none pointer-events-none">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ArtworkPlaceholder className="w-8 h-8" rounded="lg" />
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton className="h-3 w-48 max-w-[70%]" rounded="sm" />
          <Skeleton className="h-2.5 w-28 max-w-[45%] opacity-60" rounded="sm" />
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 ml-3">
        <Skeleton className="w-8 h-3" rounded="sm" />
        <Skeleton className="w-12 h-6" rounded="lg" />
      </div>
    </div>
  );
}
