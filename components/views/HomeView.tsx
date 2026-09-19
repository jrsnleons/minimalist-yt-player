'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePlayerStore } from '@/store/usePlayerStore';
import { TrackArtwork, getTrackPalette } from '@/components/ui/TrackArtwork';
import { useDynamicTrackPalette } from '@/hooks/useDynamicTrackPalette';
import { CreatePlaylistModal } from '@/components/playlist/CreatePlaylistModal';
import { ImportPlaylistModal } from '@/components/playlist/ImportPlaylistModal';
import { formatTime, cn } from '@/lib/utils';
import { usePlatformShortcut } from '@/hooks/usePlatformShortcut';
import {
  Search,
  Plus,
  Download,
  Play,
  Music,
  Clock,
  Disc3,
  ChevronRight,
  ArrowRight,
  Heart,
} from 'lucide-react';
import type { Playlist, Track } from '@/types';

interface HomeViewProps {
  onNavigateTab: (tab: 'search' | 'library') => void;
  onSelectPlaylist?: (playlist: Playlist) => void;
}

function RecentSongCard({
  track,
  isCurrent,
  onPlay,
}: {
  track: Track;
  isCurrent: boolean;
  onPlay: () => void;
}) {
  const palette = useDynamicTrackPalette(track);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onPlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group flex items-center gap-3 p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none overflow-hidden relative',
        isCurrent ? 'text-white' : 'text-zinc-300'
      )}
      style={{
        background: isCurrent
          ? `linear-gradient(135deg, ${palette.accent}40 0%, ${palette.bgFrom}85 50%, #09090d 100%)`
          : isHovered
          ? `linear-gradient(135deg, ${palette.accent}2a 0%, ${palette.bgFrom}55 55%, #0a0a0f 100%)`
          : `linear-gradient(135deg, ${palette.accent}12 0%, ${palette.bgFrom}25 50%, #0b0b0f 100%)`,
        borderColor: isCurrent
          ? `${palette.accent}80`
          : isHovered
          ? `${palette.accent}55`
          : `${palette.accent}20`,
      }}
    >
      <div className="relative shrink-0">
        <TrackArtwork track={track} size="sm" rounded="lg" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
          <Play size={12} fill="white" className="text-white ml-0.5" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-white truncate group-hover:text-white leading-snug">
          {track.title}
        </p>
        <p className="text-[11px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
      </div>
      <span className="text-[11px] font-mono text-zinc-500 pr-1 shrink-0">
        {formatTime(track.duration || 0)}
      </span>
    </div>
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
  const isLiked = playlist.id === 'liked-songs';
  const palette = useMemo(() => {
    return isLiked
      ? { accent: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)', bgFrom: '#24141a' }
      : getTrackPalette(playlist.name, playlist.description || '', playlist.id);
  }, [playlist.id, playlist.name, playlist.description, isLiked]);

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden"
      style={{
        background: isLiked
          ? isHovered
            ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.35) 0%, #200e1b 50%, #0b0b0f 100%)'
            : 'linear-gradient(135deg, rgba(244, 63, 94, 0.18) 0%, #150d18 55%, #0b0b0f 100%)'
          : isHovered
          ? `linear-gradient(135deg, ${palette.accent}2c 0%, ${palette.bgFrom}65 55%, #0a0a0f 100%)`
          : `linear-gradient(135deg, ${palette.accent}12 0%, ${palette.bgFrom}25 55%, #0b0b0f 100%)`,
        borderColor: isLiked
          ? isHovered ? 'rgba(244, 63, 94, 0.65)' : 'rgba(244, 63, 94, 0.3)'
          : isHovered ? `${palette.accent}55` : `${palette.accent}20`,
      }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
        <div
          className={cn(
            'w-10 h-10 rounded-xl border flex items-center justify-center transition-all shrink-0',
            isLiked
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-500'
              : 'text-zinc-400 group-hover:text-white'
          )}
          style={{
            backgroundColor: isLiked ? undefined : isHovered ? `${palette.accent}25` : `${palette.accent}10`,
            borderColor: isLiked ? undefined : isHovered ? `${palette.accent}50` : 'rgba(255, 255, 255, 0.08)',
          }}
        >
          {isLiked ? <Heart size={16} className="fill-rose-500" /> : <Music size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
            {playlist.name}
          </h4>
          <p className="text-[11px] text-zinc-500 font-mono">
            {playlist.trackIds.length} track{playlist.trackIds.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onPlay}
          aria-label={`Play ${playlist.name}`}
          className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all shadow-md cursor-pointer hover:bg-zinc-200"
        >
          <Play size={12} fill="currentColor" className="ml-0.5" />
        </button>
      </div>
    </div>
  );
}

export function HomeView({ onNavigateTab, onSelectPlaylist }: HomeViewProps) {
  const play = usePlayerStore((s) => s.play);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
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

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto pr-0.5 space-y-4">
      {/* ─── POPULATED HOME DASHBOARD ────────────────────────────── */}
      {isPopulated ? (
        <>
          {/* Quick Header Bar */}
          <div className="flex items-center justify-between px-1 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-zinc-200 font-sans">
                Overview
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.16] text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer min-h-[36px]"
              >
                <Download size={13} className="text-emerald-400" />
                <span>Import</span>
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold shadow-sm transition-all cursor-pointer min-h-[36px]"
              >
                <Plus size={13} />
                <span>New Playlist</span>
              </button>
            </div>
          </div>

          {/* Section 1: Playlists Shelf */}
          {hasPlaylists && (
            <section aria-label="Playlists" className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Music size={14} className="text-zinc-400" />
                  <h3 className="text-xs font-semibold tracking-tight text-zinc-200">
                    Playlists
                  </h3>
                  <span className="text-[11px] font-mono text-zinc-400">({playlists.length})</span>
                </div>
                <button
                  onClick={() => onNavigateTab('library')}
                  className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Show all</span>
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {playlists.slice(0, 6).map((pl) => (
                  <HomePlaylistCard
                    key={pl.id}
                    playlist={pl}
                    onOpen={() => handleOpenPlaylist(pl)}
                    onPlay={(e) => handlePlayPlaylist(pl, e)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section 2: Recent Listening Shelf */}
          {hasHistory && (
            <section aria-label="Recent Listening" className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-zinc-400" />
                  <h3 className="text-xs font-semibold tracking-tight text-zinc-200">
                    Recent Listening
                  </h3>
                  <span className="text-[11px] font-mono text-zinc-400">
                    ({recentlyPlayed.length})
                  </span>
                </div>
                <button
                  onClick={() => onNavigateTab('library')}
                  className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-0.5 cursor-pointer"
                >
                  <span>History</span>
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {recentlyPlayed.slice(0, 6).map((track, i) => (
                  <RecentSongCard
                    key={`${track.id}-${i}`}
                    track={track}
                    isCurrent={currentTrack?.id === track.id}
                    onPlay={() => play(track, recentlyPlayed)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        /* ─── EMPTY STATE: SLEEK ONYX LAUNCHPAD ─────────────────────── */
        <div className="flex flex-col items-center justify-center py-6 px-2 space-y-5 text-center my-auto">
          {/* Main Hero Card (Apple Liquid Glass) */}
          <div className="relative w-full max-w-2xl p-6 sm:p-8 rounded-3xl apple-liquid-glass overflow-hidden">
            {/* Subtle Ambient Depth */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-32 bg-gradient-to-r from-zinc-700/15 via-white/10 to-zinc-700/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Onyx Emblem */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/20 flex items-center justify-center text-white mb-3 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                <Disc3 size={24} className="text-white" />
              </div>

              <h2 className="text-xl font-semibold tracking-tight text-white font-sans">
                Onyx <span className="font-normal text-zinc-400">Audio</span>
              </h2>
              <p className="text-xs text-zinc-400 max-w-md mt-1 leading-relaxed">
                A quiet, private player for music collections and online streams.
              </p>

              {/* Direct Quick Search / Omnibox Trigger */}
              <div className="w-full max-w-lg mt-5">
                <button
                  onClick={toggleCommandPalette}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/20 transition-all text-left group cursor-pointer shadow-inner min-h-[44px]"
                >
                  <div className="flex items-center gap-3">
                    <Search size={15} className="text-zinc-400 group-hover:text-white transition-colors shrink-0" />
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-200">
                      Search tracks, artists, or paste a Spotify or YouTube link…
                    </span>
                  </div>
                  <kbd className="px-2 py-0.5 text-[11px] rounded-lg bg-white/[0.06] border border-white/[0.1] text-zinc-300 font-mono shrink-0">
                    {shortcutKey}
                  </kbd>
                </button>
              </div>
            </div>
          </div>

          {/* 3 Bento Launchpad Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
            {/* Card 1: Search & Explore */}
            <div
              onClick={() => onNavigateTab('search')}
              className="flex flex-col text-left p-4 rounded-2xl apple-card hover:bg-white/[0.04] transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-300 group-hover:text-white mb-2.5 transition-colors">
                <Search size={14} />
              </div>
              <h4 className="text-xs font-semibold text-white flex items-center justify-between">
                <span>Search</span>
                <ArrowRight size={12} className="text-zinc-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-snug">
                Find songs, full albums, and live recordings.
              </p>
            </div>

            {/* Card 2: Import Playlists */}
            <div
              onClick={() => setIsImportModalOpen(true)}
              className="flex flex-col text-left p-4 rounded-2xl apple-card hover:bg-white/[0.04] transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2.5 transition-colors">
                <Download size={14} />
              </div>
              <h4 className="text-xs font-semibold text-white flex items-center justify-between">
                <span>Import Playlists</span>
                <ArrowRight size={12} className="text-zinc-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-snug">
                Add public playlists from Spotify or YouTube links.
              </p>
            </div>

            {/* Card 3: Library */}
            <div
              onClick={() => onNavigateTab('library')}
              className="flex flex-col text-left p-4 rounded-2xl apple-card hover:bg-white/[0.04] transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2.5 transition-colors">
                <Music size={14} />
              </div>
              <h4 className="text-xs font-semibold text-white flex items-center justify-between">
                <span>Library</span>
                <ArrowRight size={12} className="text-zinc-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-snug">
                Browse liked songs, playlists, and history.
              </p>
            </div>
          </div>

          {/* Keyboard Shortcuts Reference */}
          <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-zinc-400 pt-2 border-t border-white/[0.06] w-full max-w-xl">
            <span><kbd className="text-zinc-300 bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded">Space</kbd> Play/Pause</span>
            <span><kbd className="text-zinc-300 bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded">{shortcutKey}</kbd> Omnibox</span>
            <span><kbd className="text-zinc-300 bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded">V</kbd> Video</span>
            <span><kbd className="text-zinc-300 bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded">Z</kbd> Focus</span>
            <span><kbd className="text-zinc-300 bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded">J/L</kbd> Seek</span>
          </div>
        </div>
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
