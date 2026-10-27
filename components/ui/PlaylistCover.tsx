'use client';

import { Music, Heart } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { cn } from '@/lib/utils';
import type { Playlist } from '@/types';

/** Cover for a playlist: first track's artwork, or a flat icon tile when empty. Fills its parent. */
export function PlaylistCover({
  playlist,
  className,
  iconSize = 16,
}: {
  playlist: Playlist;
  className?: string;
  iconSize?: number;
}) {
  const firstId = playlist.trackIds[0];
  const firstTrack = useLiveQuery(() => (firstId ? db.tracks.get(firstId) : undefined), [firstId]);

  if (playlist.id === 'liked-songs') {
    return (
      <span className={cn('flex items-center justify-center bg-white/[0.08] text-rose-400', className)}>
        <Heart size={iconSize} className="fill-current" />
      </span>
    );
  }
  if (firstTrack) {
    return <TrackArtwork track={firstTrack} size="fill" rounded="none" className={className} />;
  }
  return (
    <span className={cn('flex items-center justify-center bg-white/[0.06] text-zinc-400', className)}>
      <Music size={iconSize} />
    </span>
  );
}
