'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useListenTogetherStore } from '@/store/useListenTogetherStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';

const field =
  'w-full min-h-[44px] px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60';
const primary =
  'w-full min-h-[44px] rounded-lg bg-white text-black text-sm font-semibold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

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

  const nameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  useEffect(() => {
    if (prefillCode) {
      setRoomCodeInput(prefillCode);
      setActiveTab('join');
    }
  }, [prefillCode]);

  useEffect(() => {
    if (!isModalOpen) return;
    setErrorMessage(null);
    setNameInput(userName);
    const t = setTimeout(() => (activeTab === 'join' ? codeRef : nameRef).current?.focus(), 80);
    return () => clearTimeout(t);
    // Focus only when the dialog opens or the tab changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, activeTab]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return setErrorMessage('Enter a nickname.');
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

    if (success) showToast('Session started. Share the code to invite others.');
    else setErrorMessage('Could not start the session. Try again.');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return setErrorMessage('Enter the 6-character code.');
    if (!nameInput.trim()) return setErrorMessage('Enter a nickname.');
    setUserName(nameInput.trim());
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await joinRoom(roomCodeInput.trim());
    setIsSubmitting(false);

    if (result.success) showToast('Joined session');
    else setErrorMessage(result.error || 'Session not found. Check the code and try again.');
  };

  const switchTab = (tab: 'create' | 'join') => {
    setActiveTab(tab);
    setErrorMessage(null);
  };

  const nameId = `${uid}-name`;
  const sessionId = `${uid}-session`;
  const codeId = `${uid}-code`;

  return (
    <Modal isOpen={isModalOpen} onClose={closeModal} title="Listen Together" className="max-w-sm">
      <div className="flex flex-col gap-5">
        <p className="text-sm text-zinc-400">Play the same song at the same time on every device.</p>

        <div role="tablist" aria-label="Session type" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.04]">
          {(
            [
              ['create', 'Start Session'],
              ['join', 'Join Session'],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => switchTab(tab)}
              className={cn(
                'min-h-[36px] rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-white',
                activeTab === tab ? 'bg-white/[0.1] text-white' : 'text-zinc-400 hover:text-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {errorMessage && (
          <p role="alert" className="text-sm text-rose-300">
            {errorMessage}
          </p>
        )}

        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={nameId} className="text-sm text-zinc-300">
                Nickname
              </label>
              <input
                id={nameId}
                ref={nameRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Alex"
                maxLength={24}
                autoComplete="nickname"
                className={field}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={sessionId} className="text-sm text-zinc-300">
                Session Name <span className="text-zinc-500">(optional)</span>
              </label>
              <input
                id={sessionId}
                type="text"
                value={roomNameInput}
                onChange={(e) => setRoomNameInput(e.target.value)}
                placeholder="Late Night Study"
                maxLength={32}
                className={field}
              />
            </div>
            <button type="submit" disabled={isSubmitting} className={primary}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Starting
                </>
              ) : (
                'Start Session'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={codeId} className="text-sm text-zinc-300">
                Code
              </label>
              <input
                id={codeId}
                ref={codeRef}
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="AB12CD"
                maxLength={6}
                autoComplete="off"
                spellCheck={false}
                className={cn(field, 'font-mono tracking-[0.25em] uppercase')}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={nameId} className="text-sm text-zinc-300">
                Nickname
              </label>
              <input
                id={nameId}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Sam"
                maxLength={24}
                autoComplete="nickname"
                className={field}
                required
              />
            </div>
            <button type="submit" disabled={isSubmitting} className={primary}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Joining
                </>
              ) : (
                'Join Session'
              )}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
