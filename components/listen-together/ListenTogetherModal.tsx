'use client';

import { useState, useEffect, useRef } from 'react';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Radio, Users, X, Loader2, Copy, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ListenTogetherModal() {
  const isModalOpen = useListenTogetherStore((s) => s.isModalOpen);
  const prefillCode = useListenTogetherStore((s) => s.prefillCode);
  const userName = useListenTogetherStore((s) => s.userName);
  const setUserName = useListenTogetherStore((s) => s.setUserName);
  const closeModal = useListenTogetherStore((s) => s.closeModal);
  const createRoom = useListenTogetherStore((s) => s.createRoom);
  const joinRoom = useListenTogetherStore((s) => s.joinRoom);
  const showToast = usePlayerStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [nameInput, setNameInput] = useState(userName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefillCode) {
      setRoomCodeInput(prefillCode);
      setActiveTab('join');
    }
  }, [prefillCode]);

  useEffect(() => {
    if (isModalOpen) {
      setErrorMessage(null);
      setNameInput(userName);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isModalOpen, userName]);

  // Handle ESC dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal]);

  if (!isModalOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }
    setUserName(nameInput.trim());
    setIsSubmitting(true);
    setErrorMessage(null);

    const player = usePlayerStore.getState();
    const success = await createRoom(
      roomNameInput.trim() || undefined,
      player.currentTrack
        ? {
            currentTrack: player.currentTrack,
            isPlaying: player.isPlaying,
            progress: player.progress,
            queue: player.queue,
          }
        : undefined
    );
    setIsSubmitting(false);

    if (success) {
      showToast('Live session created! Share your code with friends.');
    } else {
      setErrorMessage('Failed to create session. Please try again.');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) {
      setErrorMessage('Please enter a 6-character room code');
      return;
    }
    if (!nameInput.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }
    setUserName(nameInput.trim());
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await joinRoom(roomCodeInput.trim());
    setIsSubmitting(false);

    if (result.success) {
      showToast('Joined live session!');
    } else {
      setErrorMessage(result.error || 'Room not found. Check the code and try again.');
    }
  };

  return (
    <div
      onClick={closeModal}
      className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Listen Together session dialog"
    >
      <div
        className="relative w-full max-w-md rounded-[28px] border border-white/15 bg-[#0c0c12]/95 shadow-[0_24px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center">
              <Radio size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight font-sans">
                Listen Together
              </h3>
              <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                Listen to the same song at the same time
              </p>
            </div>
          </div>

          <button
            onClick={closeModal}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="p-5 pb-0">
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] p-1 rounded-2xl">
            <button
              onClick={() => {
                setActiveTab('create');
                setErrorMessage(null);
              }}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center',
                activeTab === 'create'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              )}
            >
              Start Session
            </button>
            <button
              onClick={() => {
                setActiveTab('join');
                setErrorMessage(null);
              }}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center',
                activeTab === 'join'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              )}
            >
              Join Session
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {activeTab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-sans">
                  Your Nickname
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Alex"
                  maxLength={24}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-white/30 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-sans">
                  Session Name (Optional)
                </label>
                <input
                  type="text"
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  placeholder="e.g. Late Night Study"
                  maxLength={32}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[38px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Creating…</span>
                    </>
                  ) : (
                    <>
                      <span>Start Live Session</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-sans">
                  Room Code
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. AB12CD"
                  maxLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-zinc-500 text-xs font-mono tracking-widest uppercase focus:outline-none focus:border-white/30 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-sans">
                  Your Nickname
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Sam"
                  maxLength={24}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-white/30 transition-colors"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[38px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Joining…</span>
                    </>
                  ) : (
                    <>
                      <span>Join Session</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
