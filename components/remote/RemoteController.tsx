'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart, ListMusic, LogOut, Music, Pause, Play, Repeat, Repeat1, Search, Shuffle,
  SkipBack, SkipForward, Volume1, Volume2, VolumeX,
} from 'lucide-react';
import { useRemoteClient, type RemoteConnection } from '@/hooks/useRemoteClient';
import { forgetToken } from '@/lib/remote/tokenStore';
import { useDynamicTrackPalette } from '@/hooks/useDynamicTrackPalette';
import { TrackArtwork } from '@/components/ui/TrackArtwork';
import { RemoteEntry } from '@/components/remote/RemoteEntry';
import { RemoteQueue } from '@/components/remote/RemoteQueue';
import { RemoteSearch } from '@/components/remote/RemoteSearch';
import { RemotePlaylists } from '@/components/remote/RemotePlaylists';
import { cn, formatTime } from '@/lib/utils';
import type { RemoteCommand, RemoteState } from '@/lib/remote/types';

type Tab = 'queue' | 'search' | 'playlists';

const TABS: { key: Tab; label: string; icon: typeof Search }[] = [
  { key: 'queue', label: 'Up Next', icon: ListMusic },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'playlists', label: 'Playlists', icon: Music },
];

const STATUS: Record<RemoteConnection, { label: string; dot: string }> = {
  connected: { label: 'Connected', dot: 'bg-emerald-400' },
  connecting: { label: 'Connecting…', dot: 'bg-zinc-500' },
  reconnecting: { label: 'Reconnecting…', dot: 'bg-amber-400' },
  'host-offline': { label: 'Host Offline', dot: 'bg-zinc-500' },
  'no-token': { label: 'Not Paired', dot: 'bg-zinc-500' },
  invalid: { label: 'Disconnected', dot: 'bg-rose-400' },
  ended: { label: 'Session Ended', dot: 'bg-rose-400' },
};

export interface RemoteApi {
  state: RemoteState;
  enabled: boolean;
  send: (cmd: RemoteCommand) => Promise<boolean>;
  notify: (message: string) => void;
}

const iconBtn =
  'w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

function useInterpolatedProgress(state: RemoteState | null, receivedAt: number) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(performance.now());
    if (!state?.isPlaying) return;
    const id = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(id);
  }, [state?.isPlaying, receivedAt]);
  if (!state) return 0;
  const elapsed = state.isPlaying ? Math.max(0, now - receivedAt) / 1000 : 0;
  const p = state.progress + elapsed;
  return state.duration > 0 ? Math.min(p, state.duration) : p;
}

export function RemoteController({ code }: { code: string }) {
  const router = useRouter();
  const { connection, state, receivedAt, send, applyOptimistic, sendError, clearSendError } = useRemoteClient(code);
  const [tab, setTab] = useState<Tab>('queue');
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const palette = useDynamicTrackPalette(state?.currentTrack);

  const notify = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2200);
  };
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const progress = useInterpolatedProgress(state, receivedAt);

  if (connection === 'no-token') {
    return <RemoteEntry initialCode={code} notice="This code needs the full link. Scan the QR code or paste the copied link." />;
  }
  if (connection === 'invalid' || connection === 'ended') {
    return (
      <RemoteEntry
        notice={
          connection === 'ended'
            ? 'The session ended. Start a new one with Connect Phone.'
            : 'Session not found. It may have ended, or the link is wrong. If this keeps failing, start a new session.'
        }
      />
    );
  }

  const enabled = connection === 'connected';
  const status = STATUS[connection];
  const locked = !!state?.locked;
  const playbackEnabled = enabled && !locked && !!state?.currentTrack;
  const track = state?.currentTrack ?? null;

  const api: RemoteApi | null = state ? { state, enabled, send, notify } : null;

  const toggleOptimistic = (patch: Partial<RemoteState>, cmd: RemoteCommand) => {
    applyOptimistic(patch);
    send(cmd);
  };

  const leave = () => {
    forgetToken(code);
    router.push('/remote');
  };

  return (
    <div className="h-dvh flex flex-col bg-[#0b0b0e] text-[#f4f4f6]">
      <header
        className="shrink-0 flex items-center justify-between gap-3 pl-4 pr-2 h-14 border-b border-white/[0.08]"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(56px + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-base font-bold tracking-tight">Remote</h1>
          <p role="status" className="flex items-center gap-2 text-sm text-zinc-300">
            <span className={cn('w-2 h-2 rounded-full', status.dot)} aria-hidden="true" />
            {status.label}
          </p>
        </div>
        <button onClick={leave} aria-label="Leave Remote" className={cn(iconBtn, 'text-zinc-400 hover:text-white hover:bg-white/[0.08]')}>
          <LogOut size={18} aria-hidden="true" />
        </button>
      </header>

      <main
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto w-full max-w-md flex flex-col gap-5 pt-5">
          {/* Announces track changes to screen readers */}
          <p className="sr-only" aria-live="polite">
            {track ? `Now playing ${track.title} by ${track.artist}` : 'Nothing playing'}
          </p>

          {connection === 'host-offline' && (
            <p className="text-sm text-zinc-300 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3">
              Onyx is not open on the playing device. Controls resume when it reconnects.
            </p>
          )}
          {connection === 'reconnecting' && (
            <p className="text-sm text-zinc-300 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3">
              Connection lost. Retrying. If this keeps failing, start a new session.
            </p>
          )}
          {locked && (
            <p className="text-sm text-zinc-300 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3">
              Listen Together is active. The session host controls playback.
            </p>
          )}

          {/* Cover */}
          <div
            className="relative w-full aspect-square mx-auto rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.08]"
            style={{ maxWidth: 'min(100%, 44dvh)' }}
          >
            {track ? (
              <TrackArtwork track={track} size="fill" rounded="none" className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-400">
                <Music size={36} aria-hidden="true" />
                <p className="text-sm">{state ? 'Nothing playing' : 'Waiting for Onyx'}</p>
              </div>
            )}
          </div>

          {/* Title and like */}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold truncate">{track?.title ?? 'Not Playing'}</p>
              <p className="text-sm text-zinc-400 truncate">{track?.artist ?? ' '}</p>
            </div>
            <button
              aria-label="Like"
              aria-pressed={!!state?.liked}
              disabled={!enabled || !track}
              onClick={() => toggleOptimistic({ liked: !state?.liked }, { type: 'toggleLike' })}
              className={cn(iconBtn, 'hover:bg-white/[0.08]', state?.liked ? 'text-rose-400' : 'text-zinc-300')}
            >
              <Heart size={22} className={state?.liked ? 'fill-current' : undefined} aria-hidden="true" />
            </button>
          </div>

          {/* Scrubber */}
          <Scrubber
            progress={progress}
            duration={state?.duration ?? 0}
            receivedAt={receivedAt}
            isPlaying={!!state?.isPlaying}
            disabled={!playbackEnabled}
            accent={palette.isExtracted ? palette.accent : undefined}
            onSeek={(seconds) => send({ type: 'seek', seconds })}
          />

          {/* Transport */}
          <div className="flex items-center justify-between px-1">
            <button
              aria-label="Shuffle"
              aria-pressed={!!state?.shuffle}
              disabled={!playbackEnabled}
              onClick={() => toggleOptimistic({ shuffle: !state?.shuffle }, { type: 'toggleShuffle' })}
              className={cn(iconBtn, 'hover:bg-white/[0.08]', state?.shuffle ? 'text-white bg-white/[0.1]' : 'text-zinc-400')}
            >
              <Shuffle size={20} aria-hidden="true" />
            </button>
            <button
              aria-label="Previous"
              disabled={!playbackEnabled}
              onClick={() => send({ type: 'previous' })}
              className={cn(iconBtn, 'w-12 h-12 text-zinc-100 hover:bg-white/[0.08]')}
            >
              <SkipBack size={26} className="fill-current" aria-hidden="true" />
            </button>
            <button
              aria-label={state?.isPlaying ? 'Pause' : 'Play'}
              disabled={!playbackEnabled}
              onClick={() =>
                toggleOptimistic({ isPlaying: !state?.isPlaying }, { type: state?.isPlaying ? 'pause' : 'play' })
              }
              className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {state?.isPlaying ? (
                <Pause size={28} className="fill-current" aria-hidden="true" />
              ) : (
                <Play size={28} className="fill-current ml-0.5" aria-hidden="true" />
              )}
            </button>
            <button
              aria-label="Next"
              disabled={!playbackEnabled}
              onClick={() => send({ type: 'next' })}
              className={cn(iconBtn, 'w-12 h-12 text-zinc-100 hover:bg-white/[0.08]')}
            >
              <SkipForward size={26} className="fill-current" aria-hidden="true" />
            </button>
            <button
              aria-label={`Repeat ${state?.repeat === 'one' ? 'One' : state?.repeat === 'all' ? 'All' : 'Off'}`}
              aria-pressed={state ? state.repeat !== 'off' : false}
              disabled={!playbackEnabled}
              onClick={() =>
                toggleOptimistic(
                  { repeat: state?.repeat === 'off' ? 'all' : state?.repeat === 'all' ? 'one' : 'off' },
                  { type: 'cycleRepeat' }
                )
              }
              className={cn(iconBtn, 'hover:bg-white/[0.08]', state && state.repeat !== 'off' ? 'text-white bg-white/[0.1]' : 'text-zinc-400')}
            >
              {state?.repeat === 'one' ? <Repeat1 size={20} aria-hidden="true" /> : <Repeat size={20} aria-hidden="true" />}
            </button>
          </div>

          {/* Volume */}
          <VolumeControl
            volume={state?.volume ?? 0}
            muted={!!state?.isMuted}
            disabled={!enabled || !state}
            onVolume={(v) => {
              applyOptimistic({ volume: v, isMuted: false });
              send({ type: 'setVolume', volume: v });
            }}
            onMute={() => toggleOptimistic({ isMuted: !state?.isMuted }, { type: 'toggleMute' })}
          />

          {(sendError) && (
            <p role="alert" className="text-sm text-rose-300" onClick={clearSendError}>
              {sendError}
            </p>
          )}

          {/* Tabs */}
          <div className="flex flex-col gap-3 pt-1">
            <div role="tablist" aria-label="Remote sections" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  role="tab"
                  id={`remote-tab-${key}`}
                  aria-selected={tab === key}
                  aria-controls={`remote-panel-${key}`}
                  onClick={() => setTab(key)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 min-h-[40px] rounded-lg text-sm font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white',
                    tab === key ? 'bg-white/[0.12] text-white' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <div role="tabpanel" id={`remote-panel-${tab}`} aria-labelledby={`remote-tab-${tab}`}>
              {api ? (
                <>
                  {tab === 'queue' && <RemoteQueue api={api} locked={locked} />}
                  {tab === 'search' && <RemoteSearch api={api} locked={locked} />}
                  {tab === 'playlists' && <RemotePlaylists api={api} locked={locked} />}
                </>
              ) : (
                <p className="text-sm text-zinc-400 py-6 text-center">Waiting for the playing device.</p>
              )}
            </div>
          </div>
        </div>
      </main>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed left-0 right-0 flex justify-center px-4"
        style={{ bottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        {notice && (
          <p className="rounded-full bg-zinc-100 text-black text-sm font-medium px-4 py-2 shadow-lg">{notice}</p>
        )}
      </div>
    </div>
  );
}

function Scrubber({
  progress, duration, receivedAt, isPlaying, disabled, accent, onSeek,
}: {
  progress: number;
  duration: number;
  receivedAt: number;
  isPlaying: boolean;
  disabled: boolean;
  accent?: string;
  onSeek: (seconds: number) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const [held, setHeld] = useState<{ value: number; at: number } | null>(null);

  // After a seek, show the target until the host reports a newer snapshot.
  const heldActive = held && receivedAt < held.at;
  const shown = drag ?? (heldActive ? held.value : progress);
  const max = Math.max(duration, 1);
  const pct = Math.min(100, (shown / max) * 100);

  const commit = () => {
    if (drag === null) return;
    onSeek(drag);
    setHeld({ value: drag, at: performance.now() });
    setDrag(null);
  };

  return (
    <div className="flex flex-col -mt-1">
      <input
        type="range"
        className="range"
        min={0}
        max={max}
        step={1}
        value={Math.min(shown, max)}
        disabled={disabled || duration <= 0}
        aria-label="Seek"
        aria-valuetext={`${formatTime(shown)} of ${formatTime(duration)}`}
        style={{ height: 44, ['--pct' as string]: `${pct}%`, ...(accent ? { ['--range-fill' as string]: accent } : {}) }}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
      <div className="flex justify-between font-mono text-xs text-zinc-400 -mt-1.5" aria-hidden="true">
        <span>{formatTime(shown)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      <span className="sr-only">{isPlaying ? 'Playing' : 'Paused'}</span>
    </div>
  );
}

function VolumeControl({
  volume, muted, disabled, onVolume, onMute,
}: {
  volume: number;
  muted: boolean;
  disabled: boolean;
  onVolume: (v: number) => void;
  onMute: () => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const lastSent = useRef(0);
  const shown = drag ?? (muted ? 0 : volume);
  const Icon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-2">
      <button
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
        disabled={disabled}
        onClick={onMute}
        className={cn(iconBtn, 'text-zinc-300 hover:bg-white/[0.08] shrink-0')}
      >
        <Icon size={20} aria-hidden="true" />
      </button>
      <input
        type="range"
        className="range"
        min={0}
        max={100}
        step={1}
        value={shown}
        disabled={disabled}
        aria-label="Volume"
        aria-valuetext={muted ? 'Muted' : `${Math.round(shown)} percent`}
        style={{ height: 44, ['--pct' as string]: `${shown}%` }}
        onChange={(e) => {
          const v = Number(e.target.value);
          setDrag(v);
          const now = Date.now();
          if (now - lastSent.current > 120) {
            lastSent.current = now;
            onVolume(v);
          }
        }}
        onPointerUp={() => { if (drag !== null) { onVolume(drag); setDrag(null); } }}
        onKeyUp={() => { if (drag !== null) { onVolume(drag); setDrag(null); } }}
        onBlur={() => { if (drag !== null) { onVolume(drag); setDrag(null); } }}
      />
    </div>
  );
}
