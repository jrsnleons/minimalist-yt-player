'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      cancelBtnRef.current?.focus();
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement, Event>) => {
    e.preventDefault();
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      className={cn(
        'fixed inset-0 m-auto p-0 rounded-3xl border border-white/10 bg-[#121217]/95',
        'text-white shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop:bg-black/75 backdrop:backdrop-blur-xl',
        'max-w-sm w-full focus:outline-none z-[110] overflow-hidden'
      )}
      style={{ colorScheme: 'dark' }}
    >
      <div className="p-6 flex flex-col items-center text-center">
        {isDestructive && (
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3 shadow-inner">
            <AlertCircle size={22} />
          </div>
        )}

        <h3 id="confirm-modal-title" className="text-base font-semibold text-white tracking-tight">
          {title}
        </h3>
        <p id="confirm-modal-desc" className="text-xs text-zinc-400 mt-2 leading-relaxed">
          {description}
        </p>

        <div className="grid grid-cols-2 gap-2.5 w-full mt-6">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.09] text-zinc-200 text-xs font-medium transition-all cursor-pointer active:scale-98"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              'w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-98 shadow-sm',
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-white hover:bg-zinc-200 text-black'
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>,
    document.body
  );
}
