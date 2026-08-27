'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export function Toast() {
  const toastMessage = usePlayerStore((s) => s.toastMessage);
  const dismissToast = usePlayerStore((s) => s.dismissToast);

  if (!toastMessage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'fixed bottom-24 right-4 z-50',
        'flex items-center gap-3 px-4 py-3 rounded-lg',
        'bg-zinc-800 border border-zinc-700 text-sm text-white',
        'shadow-lg max-w-xs',
        'animate-fade-in'
      )}
      style={{
        animation: 'fadeIn 0.15s ease forwards',
      }}
    >
      <span className="flex-1">{toastMessage}</span>
      <button
        onClick={dismissToast}
        aria-label="Dismiss notification"
        className="p-0.5 text-zinc-400 hover:text-white transition-opacity rounded cursor-pointer"
      >
        <X size={14} />
      </button>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
