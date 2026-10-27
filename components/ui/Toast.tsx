'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePlayerStore } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, Radio } from 'lucide-react';

export function Toast() {
  const toastMessage = usePlayerStore((s) => s.toastMessage);
  const dismissToast = usePlayerStore((s) => s.dismissToast);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!toastMessage || !mounted || typeof document === 'undefined') return null;

  const isPositive =
    toastMessage.includes('Added') ||
    toastMessage.includes('Playing') ||
    toastMessage.includes('Created') ||
    toastMessage.includes('Exported') ||
    toastMessage.includes('copied') ||
    toastMessage.includes('Imported');

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{ zIndex: 99999 }}
      className={cn(
        'fixed bottom-24 right-6',
        'flex items-center gap-3 px-4 py-3 rounded-2xl',
        'bg-[#101016]/95 backdrop-blur-2xl border border-white/20 text-white',
        'shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-w-sm pointer-events-auto',
        'animate-toast-in select-none'
      )}
    >
      <div className="w-6 h-6 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
        {isPositive ? (
          <CheckCircle2 size={15} className="text-emerald-400" />
        ) : (
          <Radio size={14} className="text-white" />
        )}
      </div>

      <span className="flex-1 text-xs font-medium text-zinc-100 leading-snug">
        {toastMessage}
      </span>

      <button
        onClick={dismissToast}
        aria-label="Dismiss notification"
        className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 transition-all rounded-lg cursor-pointer shrink-0"
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-toast-in {
          animation: toastIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>,
    document.body
  );
}
