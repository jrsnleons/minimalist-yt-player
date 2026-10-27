'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePlayerStore } from '@/store/usePlayerStore';
import { X } from 'lucide-react';

/** Transient message. When it carries an action (Undo) it stays 6s and Ctrl/Cmd+Z triggers it. */
export function Toast() {
  const toastMessage = usePlayerStore((s) => s.toastMessage);
  const toastAction = usePlayerStore((s) => s.toastAction);
  const dismissToast = usePlayerStore((s) => s.dismissToast);
  const [mounted, setMounted] = useState(false);
  const [undoKey, setUndoKey] = useState('Ctrl+Z');

  useEffect(() => {
    setMounted(true);
    if (/Mac|iPod|iPhone|iPad/i.test(navigator.userAgent)) setUndoKey('⌘Z');
  }, []);

  // Keyboard path to the action without moving focus: Ctrl/Cmd+Z while the toast is up.
  useEffect(() => {
    if (!toastAction) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'z' || !(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))) return;
      e.preventDefault();
      toastAction.onAction();
      dismissToast();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toastAction, dismissToast]);

  if (!toastMessage || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{ zIndex: 99999 }}
      className="fixed top-[calc(env(safe-area-inset-top,0px)+12px)] left-4 right-4 md:top-auto md:left-auto md:bottom-24 md:right-6 flex items-center gap-1 pl-4 pr-1.5 min-h-[48px] rounded-[10px] bg-[#1d1d23] border border-white/[0.14] text-white shadow-[0_12px_32px_rgba(0,0,0,0.6)] max-w-sm pointer-events-auto select-none animate-toast-in"
    >
      <span className="flex-1 text-sm text-zinc-100 leading-snug py-2.5">{toastMessage}</span>

      {toastAction && (
        <button
          type="button"
          onClick={() => {
            toastAction.onAction();
            dismissToast();
          }}
          aria-keyshortcuts="Control+Z Meta+Z"
          title={`${toastAction.label} (${undoKey})`}
          className="px-3 min-h-[36px] rounded-lg text-sm font-semibold text-[var(--track-accent,#e9b44c)] hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
        >
          {toastAction.label}
        </button>
      )}

      <button
        type="button"
        onClick={dismissToast}
        aria-label="Dismiss notification"
        className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
      >
        <X size={16} aria-hidden="true" />
      </button>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-toast-in {
          animation: toastIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>,
    document.body
  );
}
