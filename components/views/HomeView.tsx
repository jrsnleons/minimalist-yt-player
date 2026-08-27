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
  Sparkles,
  Music,
  Clock,
  Radio,
  Moon,
  Zap,
  Coffee,
  Disc3,
  Loader2,
  ChevronRight,
  ArrowRight,
  Heart,
  QrCode,
} from 'lucide-react';
import { SharePlaylistModal } from '@/components/playlist/SharePlaylistModal';
import type { Playlist, Track } from '@/types';

interface HomeViewProps {
  onNavigateTab: (tab: 'queue' | 'search' | 'playlists' | 'recent' | 'vibe') => void;
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
        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
      </div>
      <span className="text-[10px] font-mono text-zinc-500 pr-1 shrink-0">
        {formatTime(track.duration || 0)}
      </span>
    </div>
  );
}

function HomePlaylistCard({
  playlist,
  onOpen,
  onPlay,
  onShare,
}: {
  playlist: Playlist;
  onOpen: () => void;
  onPlay: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
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
          <p className="text-[10px] text-zinc-500 font-mono">
            {playlist.trackIds.length} track{playlist.trackIds.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onShare}
          aria-label={`Share ${playlist.name}`}
          className="w-7 h-7 rounded-lg bg-white/[0.08] hover:bg-white/[0.18] text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
          title="Share playlist link & QR code"
        >
          <QrCode size={12} />
        </button>
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

const CURATED_VIBES = [
  {
    id: 'lofi',
    label: 'Deep Focus',
    sublabel: 'Lofi beats & chill instrumental',
    query: 'lofi chill beats focus study',
    icon: Zap,
    gradient: 'from-amber-500/10 to-orange-500/5 hover:border-amber-500/30',
  },
  {
    id: 'noir',
    label: 'Midnight Noir',
    sublabel: 'Dark ambient & late-night jazz',
    query: 'dark ambient jazz noir chillout',
    icon: Moon,
    gradient: 'from-indigo-500/10 to-purple-500/5 hover:border-indigo-500/30',
  },
  {
    id: 'synthwave',
    label: 'Cyber Synth',
    sublabel: '80s retrowave & darksynth',
    query: 'synthwave retrowave chillwave mix',
    icon: Sparkles,
    gradient: 'from-fuchsia-500/10 to-pink-500/5 hover:border-fuchsia-500/30',
  },
  {
    id: 'acoustic',
    label: 'Acoustic Calm',
    sublabel: 'Warm guitar & relaxing folk',
    query: 'acoustic guitar instrumental chill relaxing',
    icon: Coffee,
    gradient: 'from-emerald-500/10 to-teal-500/5 hover:border-emerald-500/30',
  },
];

export function HomeView({ onNavigateTab, onSelectPlaylist }: HomeViewProps) {
  const play = usePlayerStore((s) => s.play);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const recentlyPlayed = usePlayerStore((s) => s.recentlyPlayed);
  const toggleCommandPalette = usePlayerStore((s) => s.toggleCommandPalette);
  const showToast = usePlayerStore((s) => s.showToast);
  const shortcutKey = usePlatformShortcut('⌘K');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sharingPlaylist, setSharingPlaylist] = useState<{ playlist: Playlist; tracks: Track[] } | null>(null);
  const [loadingVibeId, setLoadingVibeId] = useState<string | null>(null);

  const playlists = useLiveQuery(() => db.playlists.orderBy('updatedAt').reverse().toArray(), []);

  const hasPlaylists = playlists && playlists.length > 0;
  const hasHistory = recentlyPlayed && recentlyPlayed.length > 0;
  const isPopulated = hasPlaylists || hasHistory;

  const handleStartVibe = async (vibe: typeof CURATED_VIBES[0]) => {
    setLoadingVibeId(vibe.id);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(vibe.query)}&type=song`);
      const data = await res.json();
      const tracks: Track[] = data.tracks ?? data.results ?? [];

      if (tracks.length > 0) {
        play(tracks[0], tracks);
        showToast(`Started "${vibe.label}" session (${tracks.length} tracks)`);
      } else {
        showToast('No tracks found for this vibe');
      }
    } catch {
      showToast('Failed to start radio mix');
    } finally {
      setLoadingVibeId(null);
    }
  };

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

  const handleSharePlaylist = async (playlist: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const all = await db.tracks.bulkGet(playlist.trackIds);
      const validTracks = all.filter((t): t is Track => t !== undefined);
      setSharingPlaylist({ playlist, tracks: validTracks });
    } catch {
      showToast('Could not prepare share link');
    }
  };

  const handleOpenPlaylist = (playlist: Playlist) => {
    if (onSelectPlaylist) {
      onSelectPlaylist(playlist);
    } else {
      onNavigateTab('playlists');
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
              <span className="text-xs font-bold tracking-wider uppercase text-zinc-300 font-sans">
                Library Overview
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.16] text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
              >
                <Download size={13} className="text-emerald-400" />
                <span>Import</span>
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Plus size={13} />
                <span>New Playlist</span>
              </button>
            </div>
          </div>

          {/* Section 1: Your Playlists Shelf */}
          {hasPlaylists && (
            <section aria-label="Your Playlists" className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Music size={14} className="text-zinc-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                    Your Playlists
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500">({playlists.length})</span>
                </div>
                <button
                  onClick={() => onNavigateTab('playlists')}
                  className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-0.5 cursor-pointer"
                >
                  <span>View All</span>
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
                    onShare={(e) => handleSharePlaylist(pl, e)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section 2: Jump Back In (Recently Played Shelf) */}
          {hasHistory && (
            <section aria-label="Recently Played" className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-zinc-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                    Jump Back In
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500">
                    ({recentlyPlayed.length})
                  </span>
                </div>
                <button
                  onClick={() => onNavigateTab('recent')}
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

          {/* Section 3: Curated Flows & Vibes */}
          <section aria-label="Curated Ambient Vibes" className="space-y-2 pt-1">
            <div className="flex items-center gap-2 px-1">
              <Radio size={14} className="text-zinc-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                Instant Vibe Mixes
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {CURATED_VIBES.map((vibe) => {
                const Icon = vibe.icon;
                const isLoading = loadingVibeId === vibe.id;
                return (
                  <button
                    key={vibe.id}
                    onClick={() => handleStartVibe(vibe)}
                    disabled={isLoading}
                    className={cn(
                      'flex flex-col text-left p-3.5 rounded-2xl border bg-gradient-to-b border-white/[0.06] transition-all cursor-pointer group shadow-sm',
                      vibe.gradient,
                      isLoading ? 'opacity-60 cursor-wait' : 'hover:scale-[1.01]'
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-zinc-300 group-hover:text-white transition-colors">
                        {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
                      </div>
                      <Play
                        size={12}
                        className="text-zinc-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                        fill="currentColor"
                      />
                    </div>
                    <span className="text-xs font-semibold text-white tracking-tight">
                      {vibe.label}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                      {vibe.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        /* ─── EMPTY STATE: SLEEK ONYX LAUNCHPAD ─────────────────────── */
        <div className="flex flex-col items-center justify-center py-6 px-2 space-y-5 text-center my-auto">
          {/* Main Onyx Glass Hero Card */}
          <div className="relative w-full max-w-2xl p-6 sm:p-8 rounded-3xl border border-white/[0.08] bg-[#09090d]/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Subtle Ambient Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-32 bg-gradient-to-r from-zinc-700/20 via-white/10 to-zinc-700/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Onyx Emblem */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/20 flex items-center justify-center text-white mb-3 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                <Disc3 size={24} className="text-white" />
              </div>

              <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                ONYX <span className="font-light text-zinc-400">AUDIO</span>
              </h2>
              <p className="text-xs text-zinc-400 max-w-md mt-1 leading-relaxed">
                Distraction-free, local-first audio player. Zero tracking, no ads, and pure listening.
              </p>

              {/* Direct Quick Search / Omnibox Trigger */}
              <div className="w-full max-w-lg mt-5">
                <button
                  onClick={toggleCommandPalette}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/20 transition-all text-left group cursor-pointer shadow-inner"
                >
                  <div className="flex items-center gap-3">
                    <Search size={15} className="text-zinc-400 group-hover:text-white transition-colors" />
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-200">
                      Search music, artists, or paste Spotify / YouTube link…
                    </span>
                  </div>
                  <kbd className="px-2 py-0.5 text-[10px] rounded-lg bg-white/[0.06] border border-white/[0.1] text-zinc-300 font-mono">
                    {shortcutKey}
                  </kbd>
                </button>
              </div>
            </div>
          </div>

          {/* 3 Bento Launchpad Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
            {/* Card 1: Explore & Search */}
            <div
              onClick={() => onNavigateTab('search')}
              className="flex flex-col text-left p-4 rounded-2xl bg-[#09090d] hover:bg-[#111117] border border-white/[0.07] hover:border-white/[0.16] transition-all cursor-pointer group shadow-sm"
            >
              <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-300 group-hover:text-white mb-2.5 transition-colors">
                <Search size={14} />
              </div>
              <h4 className="text-xs font-semibold text-white flex items-center justify-between">
                <span>Explore Catalog</span>
                <ArrowRight size={12} className="text-zinc-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                Search singles, live sets, full concert videos, and albums.
              </p>
            </div>

            {/* Card 2: Import Playlists */}
            <div
              onClick={() => setIsImportModalOpen(true)}
              className="flex flex-col text-left p-4 rounded-2xl bg-[#09090d] hover:bg-[#111117] border border-white/[0.07] hover:border-white/[0.16] transition-all cursor-pointer group shadow-sm"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2.5 transition-colors">
                <Download size={14} />
              </div>
              <h4 className="text-xs font-semibold text-white flex items-center justify-between">
                <span>Import Music</span>
                <ArrowRight size={12} className="text-zinc-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                Paste public Spotify & YouTube playlists with zero login.
              </p>
            </div>

            {/* Card 3: Instant Focus Flow */}
            <div
              onClick={() => handleStartVibe(CURATED_VIBES[0])}
              className="flex flex-col text-left p-4 rounded-2xl bg-[#09090d] hover:bg-[#111117] border border-white/[0.07] hover:border-white/[0.16] transition-all cursor-pointer group shadow-sm"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2.5 transition-colors">
                {loadingVibeId === 'lofi' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Zap size={14} />
                )}
              </div>
              <h4 className="text-xs font-semibold text-white flex items-center justify-between">
                <span>Instant Chill Mix</span>
                <ArrowRight size={12} className="text-zinc-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                One click to launch an ad-free lofi & ambient session.
              </p>
            </div>
          </div>

          {/* Curated Vibe Flow Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mr-1">
              Quick Vibes:
            </span>
            {CURATED_VIBES.map((vibe) => (
              <button
                key={vibe.id}
                onClick={() => handleStartVibe(vibe)}
                disabled={loadingVibeId === vibe.id}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] text-zinc-300 hover:text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingVibeId === vibe.id ? (
                  <Loader2 size={11} className="animate-spin text-amber-400" />
                ) : null}
                <span>{vibe.label}</span>
              </button>
            ))}
          </div>

          {/* Keyboard Shortcuts Reference */}
          <div className="flex items-center justify-center gap-3 text-[10px] font-mono text-zinc-500 pt-2 border-t border-white/[0.04] w-full max-w-xl">
            <span><kbd className="text-zinc-400 bg-white/[0.05] px-1 py-0.5 rounded">Space</kbd> Play/Pause</span>
            <span><kbd className="text-zinc-400 bg-white/[0.05] px-1 py-0.5 rounded">{shortcutKey}</kbd> Omnibox</span>
            <span><kbd className="text-zinc-400 bg-white/[0.05] px-1 py-0.5 rounded">V</kbd> Video</span>
            <span><kbd className="text-zinc-400 bg-white/[0.05] px-1 py-0.5 rounded">Z</kbd> Zen</span>
            <span><kbd className="text-zinc-400 bg-white/[0.05] px-1 py-0.5 rounded">J/L</kbd> Seek</span>
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
            onNavigateTab('playlists');
          }
        }}
      />
      {sharingPlaylist && (
        <SharePlaylistModal
          isOpen={true}
          onClose={() => setSharingPlaylist(null)}
          playlist={sharingPlaylist.playlist}
          tracks={sharingPlaylist.tracks}
        />
      )}
    </div>
  );
}
