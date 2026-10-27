'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { PlaylistCover } from '@/components/ui/PlaylistCover';
import { Equalizer } from '@/components/ui/Equalizer';
import { CreatePlaylistModal } from '@/components/playlist/CreatePlaylistModal';
import { ImportPlaylistModal } from '@/components/playlist/ImportPlaylistModal';
import { usePlatformShortcut } from '@/hooks/usePlatformShortcut';
import { SHORTCUTS } from '@/lib/shortcuts';
import { cn } from '@/lib/utils';
import { Search, Plus, Download, Play, Library } from 'lucide-react';
import type { Playlist, Track } from '@/types';

interface HomeViewProps {
  onNavigateTab: (tab: 'search' | 'library') => void;
  onSelectPlaylist?: (playlist: Playlist) => void;
}

const shelfGrid = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-x-4 gap-y-6';

function ShelfHeading({
  id,
  title,
  actionLabel,
  onAction,
}: {
  id: string;
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-baseline justify-between mb-3.5">
      <h2 id={id} className="text-xl font-semibold tracking-tight text-white">
        {title}
      </h2>
      <button
        onClick={onAction}
        className="text-[13px] font-medium text-zinc-300 hover:text-white hover:underline px-1 min-h-[36px] cursor-pointer"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function RecentSongCard({
  track,
  isCurrent,
  isPlaying,
  onPlay,
}: {
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  return (
    <li className="group relative flex flex-col gap-2 min-w-0">
      <div className="relative aspect-square w-full">
        <TrackArtwork track={track} size="fill" rounded="md" className="w-full h-full" />
        <span
          className="absolute right-2 bottom-2 w-10 h-10 rounded-full bg-[#f4f4f6] text-[#0b0b0e] grid place-items-center shadow-lg opacity-0 translate-y-1 transition group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
          aria-hidden="true"
        >
          <Play size={18} fill="currentColor" className="ml-0.5" />
        </span>
      </div>
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Play ${track.title} by ${track.artist}`}
        className="flex flex-col min-w-0 text-left cursor-pointer after:content-[''] after:absolute after:inset-0 after:rounded-md"
      >
        <span className="flex items-center gap-2 min-w-0">
          {isCurrent && <Equalizer playing={isPlaying} />}
          <span
            className={cn(
              'truncate text-sm font-medium',
              isCurrent ? 'text-[var(--track-accent,#e9b44c)]' : 'text-zinc-100'
            )}
          >
            {track.title}
          </span>
        </span>
        <span className="truncate text-[13px] text-zinc-400">{track.artist}</span>
      </button>
    </li>
  );
}

function HomePlaylistCard({
  playlist,
  onOpen,
  onPlay,
}: {
  playlist: Playlist;
  onOpen: () => void;
  onPlay: (e: React.MouseEvent) => void;
}) {
  return (
    <li className="group relative flex flex-col gap-2 min-w-0">
      <div className="relative aspect-square w-full">
        <PlaylistCover playlist={playlist} className="w-full h-full rounded-md" iconSize={32} />
        <button
          onClick={onPlay}
          aria-label={`Play ${playlist.name}`}
          className="absolute right-2 bottom-2 z-10 w-10 h-10 rounded-full bg-[#f4f4f6] text-[#0b0b0e] grid place-items-center shadow-lg cursor-pointer opacity-0 translate-y-1 transition hover:scale-105 group-hover:opacity-100 group-hover:translate-y-0 focus-visible:opacity-100 focus-visible:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 [@media(pointer:coarse)]:opacity-100 [@media(pointer:coarse)]:translate-y-0"
        >
          <Play size={18} fill="currentColor" className="ml-0.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${playlist.name}`}
        className="flex flex-col min-w-0 text-left cursor-pointer after:content-[''] after:absolute after:inset-0 after:rounded-md"
      >
        <span className="truncate text-sm font-medium text-zinc-100">{playlist.name}</span>
        <span className="text-[13px] text-zinc-400">
          {playlist.trackIds.length} {playlist.trackIds.length === 1 ? 'song' : 'songs'}
        </span>
      </button>
    </li>
  );
}

export function HomeView({ onNavigateTab, onSelectPlaylist }: HomeViewProps) {
  const play = usePlayerStore((s) => s.play);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const recentlyPlayed = usePlayerStore((s) => s.recentlyPlayed);
  const toggleCommandPalette = usePlayerStore((s) => s.toggleCommandPalette);
  const showToast = usePlayerStore((s) => s.showToast);
  const shortcutKey = usePlatformShortcut('⌘K');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const playlists = useLiveQuery(() => db.playlists.orderBy('updatedAt').reverse().toArray(), []);

  const hasPlaylists = playlists && playlists.length > 0;
  const hasHistory = recentlyPlayed && recentlyPlayed.length > 0;
  const isPopulated = hasPlaylists || hasHistory;

  const handlePlayPlaylist = async (playlist: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playlist.trackIds.length) {
      showToast(`Playlist "${playlist.name}" is empty`);
      return;
    }
    const tracks = await db.tracks.bulkGet(playlist.trackIds);
    const validTracks = tracks.filter((t): t is Track => t !== undefined);
    if (validTracks.length > 0) {
      play(validTracks[0], validTracks);
      showToast(`Playing "${playlist.name}" (${validTracks.length} tracks)`);
    } else {
      showToast('No playable tracks found');
    }
  };

  const handleOpenPlaylist = (playlist: Playlist) => {
    if (onSelectPlaylist) {
      onSelectPlaylist(playlist);
    } else {
      onNavigateTab('library');
    }
  };

  const keyHints: { key: string; label: string }[] = [
    { key: 'Space', label: 'Play / Pause' },
    { key: shortcutKey, label: 'Search' },
    ...['video', 'focus', 'seekBack10'].map((id) => {
      const def = SHORTCUTS.find((s) => s.id === id)!;
      return { key: id === 'seekBack10' ? 'J / L' : def.display[0], label: id === 'seekBack10' ? 'Seek' : def.label };
    }),
  ];

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto pb-8 gap-9">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <h1 className="text-[32px] leading-tight font-bold tracking-tight text-white">Home</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 rounded-lg border border-white/[0.12] hover:bg-white/[0.08] text-zinc-100 text-sm font-medium transition-colors cursor-pointer min-h-[40px]"
          >
            <Download size={16} aria-hidden="true" />
            <span>Import</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-3.5 rounded-lg bg-[#f4f4f6] text-[#0b0b0e] hover:bg-white text-sm font-semibold transition-colors cursor-pointer min-h-[40px]"
          >
            <Plus size={16} aria-hidden="true" />
            <span>New Playlist</span>
          </button>
        </div>
      </div>

      {isPopulated ? (
        <>
          {hasPlaylists && (
            <section aria-labelledby="home-playlists">
              <ShelfHeading
                id="home-playlists"
                title="Playlists"
                actionLabel="Show All"
                onAction={() => onNavigateTab('library')}
              />
              <ul className={shelfGrid}>
                {playlists.slice(0, 6).map((pl) => (
                  <HomePlaylistCard
                    key={pl.id}
                    playlist={pl}
                    onOpen={() => handleOpenPlaylist(pl)}
                    onPlay={(e) => handlePlayPlaylist(pl, e)}
                  />
                ))}
              </ul>
            </section>
          )}

          {hasHistory && (
            <section aria-labelledby="home-recent">
              <ShelfHeading
                id="home-recent"
                title="Recent Listening"
                actionLabel="History"
                onAction={() => onNavigateTab('library')}
              />
              <ul className={shelfGrid}>
                {recentlyPlayed.slice(0, 6).map((track, i) => (
                  <RecentSongCard
                    key={`${track.id}-${i}`}
                    track={track}
                    isCurrent={currentTrack?.id === track.id}
                    isPlaying={isPlaying}
                    onPlay={() => play(track, recentlyPlayed)}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      ) : (
        <section aria-labelledby="home-start" className="flex flex-col gap-6 max-w-2xl">
          <div>
            <h2 id="home-start" className="text-xl font-semibold tracking-tight text-white">
              Get Started
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Search for songs, paste a Spotify or YouTube link, or import a playlist.
            </p>
          </div>

          <button
            onClick={toggleCommandPalette}
            className="w-full flex items-center justify-between px-4 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] transition-colors text-left cursor-pointer min-h-[48px]"
          >
            <span className="flex items-center gap-3">
              <Search size={16} className="text-zinc-400" aria-hidden="true" />
              <span className="text-sm text-zinc-300">Search songs, artists, or paste a link</span>
            </span>
            <kbd className="font-mono text-xs text-zinc-400 shrink-0">{shortcutKey}</kbd>
          </button>

          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Search, title: 'Search', text: 'Find songs, albums, and live recordings.', go: () => onNavigateTab('search') },
              { icon: Download, title: 'Import', text: 'Add public playlists from Spotify or YouTube.', go: () => setIsImportModalOpen(true) },
              { icon: Library, title: 'Library', text: 'Browse liked songs, playlists, and history.', go: () => onNavigateTab('library') },
            ].map(({ icon: Icon, title, text, go }) => (
              <li key={title}>
                <button
                  onClick={go}
                  className="w-full h-full flex flex-col text-left p-4 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer gap-1.5"
                >
                  <Icon size={18} className="text-zinc-300" aria-hidden="true" />
                  <span className="text-sm font-semibold text-white">{title}</span>
                  <span className="text-[13px] text-zinc-400 leading-snug">{text}</span>
                </button>
              </li>
            ))}
          </ul>

          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 border-t border-white/[0.08] text-[13px] text-zinc-400">
            {keyHints.map((h) => (
              <li key={h.label}>
                <kbd className="font-mono text-xs text-zinc-200 bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded mr-1.5">
                  {h.key}
                </kbd>
                {h.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Global Modals */}
      <CreatePlaylistModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <ImportPlaylistModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={(pl) => {
          if (onSelectPlaylist) {
            onSelectPlaylist(pl);
          } else {
            onNavigateTab('library');
          }
        }}
      />
    </div>
  );
}
