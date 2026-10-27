'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import {
  Users,
  Copy,
  Check,
  LogOut,
  Radio,
  Crown,
  Lock,
  Unlock,
  X,
  ChevronDown,
} from 'lucide-react';

const REACTION_EMOJIS = ['🔥', '❤️', '👏', '🎧', '🎵'];

export function ListenTogetherBar() {
  const isInRoom = useListenTogetherStore((s) => s.isInRoom);
  const roomCode = useListenTogetherStore((s) => s.roomCode);
  const roomName = useListenTogetherStore((s) => s.roomName);
  const isHost = useListenTogetherStore((s) => s.isHost);
  const userId = useListenTogetherStore((s) => s.userId);
  const participants = useListenTogetherStore((s) => s.participants);
  const allowListenerControls = useListenTogetherStore((s) => s.allowListenerControls);
  const syncStatus = useListenTogetherStore((s) => s.syncStatus);
  const leaveRoom = useListenTogetherStore((s) => s.leaveRoom);
  const sendReaction = useListenTogetherStore((s) => s.sendReaction);
  const transferDj = useListenTogetherStore((s) => s.transferDj);
  const toggleListenerControls = useListenTogetherStore((s) => s.toggleListenerControls);
  const showToast = usePlayerStore((s) => s.showToast);

  const [copied, setCopied] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click or Escape
  useEffect(() => {
    if (!showPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPopover(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPopover]);

  if (!isInRoom || !roomCode) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      showToast(`Copied room link (${roomCode})`);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTransferDj = async (targetId: string, targetName: string) => {
    const success = await transferDj(targetId);
    if (success) {
      showToast(`Transferred DJ to ${targetName}`);
      setShowPopover(false);
    } else {
      showToast('Failed to transfer DJ');
    }
  };

  const handleToggleControls = async () => {
    const next = !allowListenerControls;
    await toggleListenerControls(next);
    showToast(next ? 'Listener playback controls enabled' : 'Listener playback controls locked');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="w-full shrink-0 mb-3 px-1 select-none relative z-40"
        role="region"
        aria-label="Active Listen Together session"
      >
        <div className="p-2.5 rounded-2xl apple-liquid-glass border border-white/15 shadow-xl flex flex-wrap items-center justify-between gap-3 bg-[#0a0a10]/85 backdrop-blur-2xl">
          {/* Left: Room Status & Identification */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Radio size={15} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white tracking-tight truncate font-sans">
                  {roomName || 'Live Session'}
                </span>
                <span
                  className={cn(
                    'text-xs font-mono font-medium px-2 py-0.5 rounded-full border',
                    isHost
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                      : 'bg-white/[0.06] border-white/[0.1] text-zinc-300'
                  )}
                >
                  {isHost ? (
                    <span className="flex items-center gap-1">
                      <Crown size={11} className="text-amber-400" /> DJ
                    </span>
                  ) : (
                    'Listener'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-zinc-400">
                  Room: <strong className="text-white tracking-wider">{roomCode}</strong>
                </span>

                <Tooltip content={copied ? 'Copied!' : 'Copy invite link'} side="top">
                  <button
                    onClick={handleCopyLink}
                    aria-label="Copy room invite link"
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer px-1 py-0.5 rounded-md hover:bg-white/[0.06]"
                  >
                    {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copied ? 'Copied' : 'Share'}</span>
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Center: Live Emoji Reactions */}
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] p-1 rounded-xl shrink-0">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                aria-label={`Send reaction ${emoji}`}
                className="w-7 h-7 rounded-lg hover:bg-white/[0.1] active:scale-90 transition-all text-sm flex items-center justify-center cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Right: DJ Controls Toggle, Participants Popover Trigger & Leave Action */}
          <div className="flex items-center gap-2 shrink-0 relative">
            {/* Quick DJ control lock/unlock toggle (DJ only) */}
            {isHost && (
              <Tooltip
                content={
                  allowListenerControls
                    ? 'Listener playback: Unlocked (Click to lock)'
                    : 'Listener playback: Locked (Click to allow)'
                }
                side="bottom"
              >
                <button
                  onClick={handleToggleControls}
                  aria-label="Toggle listener playback permissions"
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer min-h-[32px]',
                    allowListenerControls
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                  )}
                >
                  {allowListenerControls ? <Unlock size={12} /> : <Lock size={12} />}
                  <span className="hidden md:inline font-mono text-xs">
                    {allowListenerControls ? 'Controls Open' : 'DJ Only'}
                  </span>
                </button>
              </Tooltip>
            )}

            {/* Participants Popover Trigger */}
            <Tooltip content="Manage listeners & transfer DJ" side="bottom">
              <button
                onClick={() => setShowPopover((prev) => !prev)}
                aria-label="View participants"
                aria-expanded={showPopover}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer min-h-[32px]',
                  showPopover
                    ? 'bg-white/[0.12] border-white/25 text-white'
                    : 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:bg-white/[0.08]'
                )}
              >
                <Users size={13} className="text-zinc-400" />
                <span className="font-mono">{participants.length || 1}</span>
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full ml-0.5',
                    syncStatus === 'synced'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'bg-amber-400'
                  )}
                  title={syncStatus === 'synced' ? 'Synchronized' : 'Syncing'}
                />
                <ChevronDown size={11} className={cn('text-zinc-400 transition-transform duration-150', showPopover && 'rotate-180')} />
              </button>
            </Tooltip>

            {/* Participants Popover Menu */}
            <AnimatePresence>
              {showPopover && (
                <motion.div
                  ref={popoverRef}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-[#12121c] border border-white/20 p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] z-50 flex flex-col gap-3 select-none"
                  role="dialog"
                  aria-label="Session participants and permissions"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <div>
                      <h4 className="text-xs font-semibold text-white">Listeners</h4>
                      <p className="text-xs font-mono text-zinc-400">
                        {participants.length} connected
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPopover(false)}
                      aria-label="Close popover"
                      className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* DJ Permissions Toggle inside Popover */}
                  {isHost && (
                    <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-white truncate">Playback Controls</span>
                        <span className="block text-xs text-zinc-400 truncate font-mono">
                          {allowListenerControls ? 'Anyone can play/pause' : 'DJ exclusive'}
                        </span>
                      </div>
                      <button
                        onClick={handleToggleControls}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer min-h-[30px] shrink-0',
                          allowListenerControls
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20'
                            : 'bg-white/[0.06] border-white/[0.12] text-zinc-300 hover:bg-white/[0.1]'
                        )}
                      >
                        {allowListenerControls ? 'Open' : 'Locked'}
                      </button>
                    </div>
                  )}

                  {/* Participant List */}
                  <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                    {participants.map((p) => {
                      const isSelf = p.id === userId;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-xs font-mono font-semibold text-zinc-300 shrink-0">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-white block truncate">
                                {p.name} {isSelf && <span className="text-zinc-500 font-normal">(You)</span>}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {p.isHost ? (
                              <span className="flex items-center gap-1 text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                <Crown size={10} className="text-amber-400" /> DJ
                              </span>
                            ) : isHost ? (
                              <button
                                onClick={() => handleTransferDj(p.id, p.name)}
                                className="flex items-center gap-1 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 px-2 py-1 rounded-lg transition-colors cursor-pointer min-h-[26px]"
                                title="Transfer DJ crown to this listener"
                              >
                                <Crown size={10} />
                                <span>Make DJ</span>
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Tooltip content="Leave session" side="bottom">
              <button
                onClick={leaveRoom}
                aria-label="Leave session"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-medium transition-colors cursor-pointer min-h-[32px]"
              >
                <LogOut size={12} />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
