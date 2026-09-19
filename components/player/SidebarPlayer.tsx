'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { TrackRow } from '@/components/playlist/TrackRow';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CustomScrubber } from './CustomScrubber';
import { TransportControls } from './TransportControls';
import { VolumeSlider } from './VolumeSlider';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { AmbientVisualizer } from './AmbientVisualizer';
import { Tooltip } from '@/components/ui/Tooltip';
import { useDynamicTrackPalette } from '@/hooks/useDynamicTrackPalette';
import { formatTime, cn } from '@/lib/utils';
import {
  ListMusic,
  Trash2,
  Sparkles,
  Plus,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Repeat1,
  RotateCcw,
  Loader2,
  Maximize2,
  Heart,
  Video,
  VideoOff,
  PanelRightClose,
  PanelRightOpen,
  Music,
} from 'lucide-react';

export function SidebarPlayer() {
  const sidebarPlayerMode = usePlayerStore((s) => s.sidebarPlayerMode);
  const setSidebarPlayerMode = usePlayerStore((s) => s.setSidebarPlayerMode);
  const toggleSidebarPlayerMode = usePlayerStore((s) => s.toggleSidebarPlayerMode);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const shuffleMode = usePlayerStore((s) => s.shuffleMode);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const isVideoEnabled = usePlayerStore((s) => s.isVideoEnabled);
  const toggleVideo = usePlayerStore((s) => s.toggleVideo);
  const playbackMode = usePlayerStore((s) => s.playbackMode);
  const toggleZenMode = usePlayerStore((s) => s.toggleZenMode);
  const isLiked = usePlayerStore((s) => (currentTrack ? s.likedTrackIds.includes(currentTrack.id) : false));
  const toggleLikeTrack = usePlayerStore((s) => s.toggleLikeTrack);

  const queue = usePlayerStore((s) => s.queue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const play = usePlayerStore((s) => s.play);

  const radioQueue = usePlayerStore((s) => s.radioQueue);
  const refreshRadioQueue = usePlayerStore((s) => s.refreshRadioQueue);
  const removeFromRadioQueue = usePlayerStore((s) => s.removeFromRadioQueue);
  const addRadioTrackToManualQueue = usePlayerStore((s) => s.addRadioTrackToManualQueue);
  const showToast = usePlayerStore((s) => s.showToast);

  const isInRoom = useListenTogetherStore((s) => s.isInRoom);
  const isHost = useListenTogetherStore((s) => s.isHost);
  const userId = useListenTogetherStore((s) => s.userId);
  const allowListenerControls = useListenTogetherStore((s) => s.allowListenerControls);

  const isPlaybackLocked = isInRoom && !isHost && !allowListenerControls;

  const handleTogglePlay = () => {
    if (isPlaybackLocked) {
      showToast('DJ is controlling playback');
      return;
    }
    togglePlay();
  };

  const handlePrevious = () => {
    if (isPlaybackLocked) {
      showToast('DJ is controlling playback');
      return;
    }
    previous();
  };

  const handleNext = () => {
    if (isPlaybackLocked) {
      showToast('DJ is controlling playback');
      return;
    }
    next();
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isRefreshingRadio, setIsRefreshingRadio] = useState(false);

  const palette = useDynamicTrackPalette(currentTrack);

  const totalDuration = useMemo(
    () => queue.reduce((acc, t) => acc + (t.duration || 0), 0),
    [queue]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (isInRoom && !isHost) {
      showToast('Only the DJ can reorder the shared queue');
      return;
    }
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = queue.findIndex((t, i) => `${t.id}-${i}` === active.id || t.id === active.id);
    const toIndex = queue.findIndex((t, i) => `${t.id}-${i}` === over.id || t.id === over.id);
    if (fromIndex >= 0 && toIndex >= 0) {
      reorderQueue(fromIndex, toIndex);
    }
  };

  const handleManualRadioRefresh = async () => {
    setIsRefreshingRadio(true);
    await refreshRadioQueue();
    setIsRefreshingRadio(false);
  };

  return (
    <>
      {/* 1. DOCKED MODE (Desktop Side Column) */}
      <AnimatePresence>
        {sidebarPlayerMode === 'docked' && (
          <motion.aside
            key="docked-sidebar-player"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="hidden md:flex w-84 xl:w-96 shrink-0 h-full flex-col gap-3 overflow-hidden select-none"
            aria-label="Player and queue sidebar"
          >
            {/* Top Card: Now Playing Player */}
            <div className="relative p-4 rounded-[32px] apple-liquid-glass overflow-hidden shrink-0 border border-white/10 shadow-xl group">
              {/* Subtle ambient visualizer wave */}
              <div className="absolute inset-x-0 bottom-0 h-14 pointer-events-none opacity-20 z-0">
                <AmbientVisualizer
                  mode="wave"
                  accentColor={palette.accent}
                  secondaryColor={palette.secondary}
                />
              </div>

              {/* Header: Title & Minimize Action */}
              <div className="relative z-10 flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-zinc-300 tracking-wide font-sans">
                    Now Playing
                  </span>
                </div>

                <Tooltip content="Minimize to Pill (Q)" side="bottom">
                  <button
                    onClick={() => setSidebarPlayerMode('pill')}
                    aria-label="Minimize player to pill (Q)"
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                  >
                    <PanelRightClose size={14} />
                  </button>
                </Tooltip>
              </div>

              {/* Artwork / Video Container Slot */}
              {currentTrack ? (
                <div className="relative z-10 flex flex-col gap-3">
                  <div
                    id="hero-artwork-slot"
                    className={cn(
                      'relative rounded-2xl overflow-hidden shrink-0 border border-white/15 bg-black transition-all duration-300 ease-in-out mx-auto',
                      isVideoEnabled
                        ? 'w-full aspect-video shadow-2xl'
                        : 'w-32 h-32 aspect-square shadow-xl'
                    )}
                  >
                    <div
                      className={cn(
                        'w-full h-full transition-opacity duration-300',
                        isVideoEnabled ? 'opacity-0 pointer-events-none' : 'opacity-100'
                      )}
                    >
                      <TrackArtwork
                        track={currentTrack}
                        size="fill"
                        rounded="none"
                        priority={true}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Title & Like Row */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <MarqueeText
                        text={currentTrack.title}
                        subText={currentTrack.artist}
                        className="text-sm font-semibold text-white tracking-tight leading-snug"
                        subClassName="text-xs text-zinc-400 font-medium mt-0.5"
                      />
                    </div>
                    <Tooltip content={isLiked ? 'Unlike' : 'Like (L)'} side="left">
                      <button
                        onClick={() => toggleLikeTrack(currentTrack)}
                        aria-label={isLiked ? 'Unlike track' : 'Like track'}
                        className={cn(
                          'p-2 rounded-xl transition-all cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center',
                          isLiked
                            ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
                            : 'text-zinc-400 hover:text-rose-400 hover:bg-white/[0.08]'
                        )}
                      >
                        <Heart size={15} className={isLiked ? 'fill-rose-500 text-rose-500' : ''} />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Layer 1: Timeline Scrubber */}
                  <div className={cn('w-full', isPlaybackLocked && 'pointer-events-none opacity-60')} title={isPlaybackLocked ? 'DJ controls playback' : undefined}>
                    <CustomScrubber className="w-full" accentColor={palette.accent} />
                  </div>

                  {/* Layer 2: Centered Playback Controls */}
                  <div className="flex items-center justify-center gap-2.5 w-full py-0.5">
                    {/* Shuffle */}
                    <Tooltip content={shuffleMode ? 'Shuffle On (S)' : 'Shuffle Off (S)'} side="top">
                      <button
                        onClick={toggleShuffle}
                        aria-label={shuffleMode ? 'Disable shuffle' : 'Enable shuffle'}
                        className={cn(
                          'p-2 rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center',
                          shuffleMode
                            ? 'text-white bg-white/[0.14]'
                            : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                        )}
                      >
                        <Shuffle size={15} />
                      </button>
                    </Tooltip>

                    {/* Previous */}
                    <Tooltip content={isPlaybackLocked ? 'DJ controls playback' : 'Previous (J)'} side="top">
                      <button
                        onClick={handlePrevious}
                        aria-label="Previous track"
                        className={cn(
                          'p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center',
                          isPlaybackLocked && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <SkipBack size={18} />
                      </button>
                    </Tooltip>

                    {/* Play / Pause */}
                    <Tooltip content={isPlaybackLocked ? 'DJ controls playback' : (isPlaying ? 'Pause (Space)' : 'Play (Space)')} side="top">
                      <button
                        onClick={handleTogglePlay}
                        aria-label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                        className={cn(
                          'w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg cursor-pointer shrink-0',
                          isPlaybackLocked && 'opacity-50 cursor-not-allowed hover:scale-100 active:scale-100'
                        )}
                      >
                        {isPlaying ? (
                          <Pause size={17} className="fill-black" />
                        ) : (
                          <Play size={17} className="fill-black ml-0.5" />
                        )}
                      </button>
                    </Tooltip>

                    {/* Next */}
                    <Tooltip content={isPlaybackLocked ? 'DJ controls playback' : 'Next (K)'} side="top">
                      <button
                        onClick={handleNext}
                        aria-label="Next track"
                        className={cn(
                          'p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center',
                          isPlaybackLocked && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <SkipForward size={18} />
                      </button>
                    </Tooltip>

                    {/* Repeat */}
                    <Tooltip
                      content={
                        repeatMode === 'off'
                          ? 'Repeat Off (R)'
                          : repeatMode === 'all'
                          ? 'Repeat All (R)'
                          : 'Repeat One (R)'
                      }
                      side="top"
                    >
                      <button
                        onClick={cycleRepeat}
                        aria-label="Cycle repeat mode"
                        className={cn(
                          'p-2 rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center',
                          repeatMode !== 'off'
                            ? 'text-white bg-white/[0.14]'
                            : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                        )}
                      >
                        {repeatMode === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
                      </button>
                    </Tooltip>
                  </div>

                  {/* Layer 3: Volume & Video / Presentation Controls */}
                  <div className="flex items-center justify-between pt-1 gap-2 border-t border-white/[0.05]">
                    {/* Volume Slider */}
                    <div
                      className="flex-1 min-w-0 max-w-[170px]"
                      onWheel={(e) => {
                        e.preventDefault();
                        const currentVol = usePlayerStore.getState().volume;
                        const delta = e.deltaY < 0 ? 5 : -5;
                        usePlayerStore.getState().setVolume(Math.min(100, Math.max(0, currentVol + delta)));
                      }}
                    >
                      <VolumeSlider accentColor={palette.accent} size="sm" showLabel={false} />
                    </div>

                    {/* Video and Focus Mode Toggles */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {playbackMode === 'iframe' && (
                        <Tooltip content={isVideoEnabled ? 'Switch to Artwork (V)' : 'Switch to Video (V)'} side="top">
                          <button
                            onClick={toggleVideo}
                            aria-label={isVideoEnabled ? 'Switch to artwork' : 'Switch to video'}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-medium transition-colors cursor-pointer min-h-[32px]',
                              isVideoEnabled
                                ? 'border-white/20 bg-white/[0.1] text-white'
                                : 'border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                            )}
                          >
                            {isVideoEnabled ? <VideoOff size={13} /> : <Video size={13} />}
                            <span className="text-[11px] font-sans">{isVideoEnabled ? 'Artwork' : 'Video'}</span>
                          </button>
                        </Tooltip>
                      )}

                      <Tooltip content="Focus Mode (Z)" side="top">
                        <button
                          onClick={() => toggleZenMode(true)}
                          aria-label="Enter focus mode"
                          className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                        >
                          <Maximize2 size={13} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 py-8 px-4 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-500 mb-2">
                    <Music size={22} />
                  </div>
                  <p className="text-xs font-semibold text-zinc-300">Nothing Playing</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Select a song from home or search to start listening
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Card: Scrollable Up Next Queue & Radio Continuation */}
            <div className="flex-1 min-h-0 apple-liquid-glass rounded-3xl p-3 flex flex-col overflow-hidden border border-white/10 shadow-lg">
              {/* Queue Header */}
              <div className="flex items-center justify-between px-2 pb-2.5 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2">
                  <ListMusic size={15} className="text-white" />
                  <h3 className="text-xs font-semibold tracking-tight text-white font-sans">Queue</h3>
                  {queue.length > 0 && (
                    <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                      {queue.length} · {formatTime(totalDuration)}
                    </span>
                  )}
                </div>

                {queue.length > 0 && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    aria-label="Clear queue"
                    className="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] text-zinc-400 hover:text-rose-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Scrollable Queue Content */}
              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/[0.04] pr-0.5 mt-1">
                {/* 1. Manual Queue Section */}
                <div className="py-2">
                  <div className="flex items-center justify-between px-1 mb-1.5">
                    <span className="text-xs font-semibold text-zinc-300 tracking-tight font-sans">
                      Up Next ({queue.length})
                    </span>
                    {queue.length > 1 && (!isInRoom || isHost) && (
                      <span className="text-[11px] text-zinc-500 font-mono">Drag to reorder</span>
                    )}
                  </div>

                  {queue.length === 0 ? (
                    <div className="p-4 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] text-center my-1.5">
                      <p className="text-xs font-semibold text-zinc-300">No tracks queued</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                        Songs you play or queue will line up here.
                      </p>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <table className="w-full text-left border-collapse table-fixed" role="grid" aria-label="Playback Queue">
                        <tbody className="divide-y divide-white/[0.03]">
                          <SortableContext
                            items={queue.map((t, i) => `${t.id}-${i}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            {queue.map((track, i) => {
                              const canRemove = !isInRoom || isHost || track.addedBy?.id === userId;
                              return (
                                <TrackRow
                                  key={`${track.id}-${i}`}
                                  track={track}
                                  index={i}
                                  isSortable={!isInRoom || isHost}
                                  sortableId={`${track.id}-${i}`}
                                  isActive={currentTrack?.id === track.id}
                                  onRemoveFromQueue={canRemove ? () => removeFromQueue(i) : undefined}
                                />
                              );
                            })}
                          </SortableContext>
                        </tbody>
                      </table>
                    </DndContext>
                  )}
                </div>

                {/* 2. Radio Section */}
                <div className="py-2.5">
                  <div className="flex items-center justify-between px-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-400" />
                      <span className="text-xs font-semibold text-zinc-300 tracking-tight font-sans">
                        Radio
                      </span>
                    </div>
                    <button
                      onClick={handleManualRadioRefresh}
                      disabled={isRefreshingRadio || !currentTrack}
                      aria-label="Refresh radio recommendations"
                      className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30 min-h-[32px] px-1.5 rounded-lg hover:bg-white/[0.04]"
                    >
                      {isRefreshingRadio ? (
                        <Loader2 size={11} className="animate-spin text-amber-400" />
                      ) : (
                        <RotateCcw size={11} />
                      )}
                      <span>Refresh</span>
                    </button>
                  </div>

                  {radioQueue.length === 0 ? (
                    <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center text-xs text-zinc-400">
                      {currentTrack ? 'Loading recommendations…' : 'Play a song to load radio'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {radioQueue.map((track, index) => (
                        <div
                          key={`radio-${track.id}-${index}`}
                          className="group flex items-center justify-between p-1.5 rounded-xl hover:bg-white/[0.04] transition-colors text-xs select-none"
                        >
                          <div
                            onClick={() => play(track)}
                            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer mr-1"
                          >
                            <TrackArtwork track={track} size="sm" rounded="lg" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                                {track.title}
                              </p>
                              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                                {track.artist}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => addRadioTrackToManualQueue(track)}
                              aria-label={`Add ${track.title} to queue`}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                              title="Add to queue"
                            >
                              <Plus size={12} />
                            </button>

                            <button
                              onClick={() => play(track)}
                              aria-label={`Play ${track.title} now`}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                              title="Play now"
                            >
                              <Play size={11} fill="currentColor" />
                            </button>

                            <button
                              onClick={() => removeFromRadioQueue(index)}
                              aria-label={`Dismiss ${track.title}`}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
                              title="Dismiss"
                            >
                              <PanelRightClose size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 2. FLOATING PILL MODE (Bottom Right Float) */}
      <AnimatePresence>
        {currentTrack && (
          <div className={cn(sidebarPlayerMode === 'docked' ? 'md:hidden' : 'block')}>
            <motion.div
              key="floating-player-pill"
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="fixed bottom-6 right-6 z-50 apple-liquid-glass rounded-2xl pl-2.5 pr-3 py-2 flex items-center gap-3 shadow-[0_12px_40px_rgba(0,0,0,0.7)] border border-white/20 backdrop-blur-2xl group max-w-[340px]"
              role="region"
              aria-label="Floating mini player"
            >
              {/* Clickable Area to Expand */}
              <button
                onClick={() => setSidebarPlayerMode('docked')}
                aria-label="Expand player and queue (Q)"
                className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer focus:outline-none"
              >
                <div className="relative shrink-0">
                  <TrackArtwork
                    track={currentTrack}
                    size="sm"
                    rounded="xl"
                    className="w-9 h-9 object-cover border border-white/10"
                  />
                  {isPlaying && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black animate-pulse" />
                  )}
                </div>

                <div className="min-w-0 max-w-[130px] sm:max-w-[160px]">
                  <p className="text-xs font-semibold text-white truncate leading-tight group-hover:text-zinc-200 transition-colors">
                    {currentTrack.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5 leading-tight">
                    {currentTrack.artist}
                  </p>
                </div>
              </button>

              {/* Minimalist Controls */}
              <div className="flex items-center gap-1 shrink-0 ml-1">
                {/* Play / Pause */}
                <Tooltip content={isPlaybackLocked ? 'DJ controls playback' : (isPlaying ? 'Pause' : 'Play')} side="top">
                  <button
                    onClick={handleTogglePlay}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className={cn(
                      'w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-md',
                      isPlaybackLocked && 'opacity-50 cursor-not-allowed hover:scale-100 active:scale-100'
                    )}
                  >
                    {isPlaying ? (
                      <Pause size={13} className="fill-black" />
                    ) : (
                      <Play size={13} className="fill-black ml-0.5" />
                    )}
                  </button>
                </Tooltip>

                {/* Next */}
                <Tooltip content={isPlaybackLocked ? 'DJ controls playback' : 'Next'} side="top">
                  <button
                    onClick={handleNext}
                    aria-label="Next track"
                    className={cn(
                      'p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer',
                      isPlaybackLocked && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <SkipForward size={14} />
                  </button>
                </Tooltip>

                {/* Expand to Docked Mode */}
                <Tooltip content="Expand Queue (Q)" side="top">
                  <button
                    onClick={() => setSidebarPlayerMode('docked')}
                    aria-label="Expand queue sidebar"
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    <PanelRightOpen size={14} />
                  </button>
                </Tooltip>
              </div>

              {/* Ambient 2px Hairline Progress Bar along Pill Bottom */}
              <FloatingPillProgress accentColor={palette.accent} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Clear Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          clearQueue();
          setShowClearConfirm(false);
        }}
        title="Clear Queue"
        description="This will remove all songs currently queued in the active session."
        confirmText="Clear Queue"
        cancelText="Cancel"
        isDestructive={true}
      />
    </>
  );
}

function FloatingPillProgress({ accentColor }: { accentColor: string }) {
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.duration);
  const percentage = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  return (
    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.08] overflow-hidden rounded-b-2xl pointer-events-none">
      <div
        className="h-full transition-all duration-150 ease-out"
        style={{
          width: `${percentage}%`,
          backgroundColor: accentColor || '#ffffff',
        }}
      />
    </div>
  );
}
