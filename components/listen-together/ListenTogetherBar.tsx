'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { Users, Copy, Check, LogOut, Radio, Lock, Unlock, X } from 'lucide-react';

const REACTION_EMOJIS = ['🔥', '❤️', '👏', '🎧', '🎵'];

/** Borderless icon button, 36px target. */
const iconBtn =
  'w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white';

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
  const popoverTriggerRef = useRef<HTMLButtonElement>(null);

  // Close popover on outside click or Escape
  useEffect(() => {
    if (!showPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target) || popoverTriggerRef.current?.contains(target)) return;
      setShowPopover(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPopover(false);
        popoverTriggerRef.current?.focus();
      }
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
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        showToast('Invite link copied');
        setTimeout(() => setCopied(false), 2000);
      },
      () => showToast('Copy failed')
    );
  };

  const handleTransferDj = async (targetId: string, targetName: string) => {
    const success = await transferDj(targetId);
    if (success) {
      showToast(`${targetName} is now the DJ`);
      setShowPopover(false);
    } else {
      showToast('Could not transfer DJ');
    }
  };

  const handleToggleControls = async () => {
    const next = !allowListenerControls;
    await toggleListenerControls(next);
    showToast(next ? 'Listeners can control playback' : 'Only the DJ controls playback');
  };

  const synced = syncStatus === 'synced';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      className="w-full shrink-0 mb-3 relative z-40"
      role="region"
      aria-label="Listen Together session"
    >
      <div className="p-2 rounded-2xl bg-[#101014] border border-white/[0.06] flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* Session */}
        <div className="flex items-center gap-3 min-w-0 pl-1">
          <Radio size={18} className="text-zinc-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{roomName || 'Session'}</p>
            <p className="text-xs text-zinc-400 flex items-center gap-1.5">
              <span className="font-mono tracking-wider text-zinc-300">{roomCode}</span>
              <span aria-hidden="true">·</span>
              <span>{isHost ? 'You are the DJ' : 'Listening'}</span>
            </p>
          </div>
          <Tooltip content={copied ? 'Copied' : 'Copy Invite Link'} side="bottom">
            <button type="button" onClick={handleCopyLink} aria-label="Copy invite link" className={iconBtn}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            </button>
          </Tooltip>
        </div>

        {/* Reactions */}
        <div className="flex items-center" role="group" aria-label="Reactions">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => sendReaction(emoji)}
              aria-label={`React ${emoji}`}
              className="w-9 h-9 rounded-lg hover:bg-white/[0.08] active:scale-90 transition duration-150 text-base flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 relative">
          {isHost && (
            <Tooltip
              content={allowListenerControls ? 'Listeners Can Control' : 'DJ Controls Only'}
              side="bottom"
            >
              <button
                type="button"
                onClick={handleToggleControls}
                aria-label="Listener controls"
                aria-pressed={allowListenerControls}
                className={cn(iconBtn, allowListenerControls && 'text-white')}
              >
                {allowListenerControls ? <Unlock size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
              </button>
            </Tooltip>
          )}

          <button
            ref={popoverTriggerRef}
            type="button"
            onClick={() => setShowPopover((prev) => !prev)}
            aria-label={`Participants, ${participants.length || 1}`}
            aria-expanded={showPopover}
            className={cn(
              'h-9 px-2.5 rounded-lg flex items-center gap-2 text-sm text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white',
              showPopover && 'bg-white/[0.08] text-white'
            )}
          >
            <Users size={16} aria-hidden="true" />
            <span className="tabular-nums">{participants.length || 1}</span>
            <span
              className={cn('w-1.5 h-1.5 rounded-full', synced ? 'bg-emerald-400' : 'bg-amber-400')}
              role="img"
              aria-label={synced ? 'Connected' : 'Reconnecting'}
            />
          </button>

          <Tooltip content="Leave Session" side="bottom">
            <button type="button" onClick={leaveRoom} aria-label="Leave session" className={cn(iconBtn, 'hover:text-rose-300')}>
              <LogOut size={16} aria-hidden="true" />
            </button>
          </Tooltip>

          <AnimatePresence>
            {showPopover && (
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#14141a] border border-white/[0.08] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.6)] z-50 flex flex-col gap-1"
                role="dialog"
                aria-label="Participants"
              >
                <div className="flex items-center justify-between pl-2">
                  <h4 className="text-sm font-medium text-white">
                    Listeners <span className="text-zinc-500 font-normal">{participants.length}</span>
                  </h4>
                  <button type="button" onClick={() => setShowPopover(false)} aria-label="Close" className={iconBtn}>
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>

                {isHost && (
                  <div className="flex items-center justify-between gap-3 pl-2 min-h-[44px]">
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200">Listener Controls</p>
                      <p className="text-xs text-zinc-400">
                        {allowListenerControls ? 'Anyone can play and pause' : 'Only the DJ'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={allowListenerControls}
                      aria-label="Listener controls"
                      onClick={handleToggleControls}
                      className="w-11 h-9 shrink-0 flex items-center justify-center cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
                    >
                      <span
                        className={cn(
                          'w-9 h-5 rounded-full p-0.5 transition-colors duration-150',
                          allowListenerControls ? 'bg-white' : 'bg-white/[0.15]'
                        )}
                      >
                        <span
                          className={cn(
                            'block w-4 h-4 rounded-full transition-transform duration-150',
                            allowListenerControls ? 'translate-x-4 bg-black' : 'translate-x-0 bg-zinc-300'
                          )}
                        />
                      </span>
                    </button>
                  </div>
                )}

                <ul className="max-h-56 overflow-y-auto">
                  {participants.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 pl-2 min-h-[44px] rounded-lg">
                      <span className="text-sm text-white truncate">
                        {p.name}
                        {p.id === userId && <span className="text-zinc-500"> (You)</span>}
                      </span>
                      {p.isHost ? (
                        <span className="text-xs text-zinc-400 shrink-0 pr-2">DJ</span>
                      ) : isHost ? (
                        <button
                          type="button"
                          onClick={() => handleTransferDj(p.id, p.name)}
                          className="shrink-0 min-h-[36px] px-3 rounded-lg text-sm text-zinc-200 hover:text-white hover:bg-white/[0.08] transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
                        >
                          Make DJ
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
