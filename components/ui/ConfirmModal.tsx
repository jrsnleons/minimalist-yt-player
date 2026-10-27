'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
        'fixed inset-0 m-auto p-0 rounded-[14px] border border-white/[0.08] bg-[#141418]',
        'text-white shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop:bg-black/70',
        'max-w-sm w-[calc(100%-2rem)] focus:outline-none z-[110] overflow-hidden'
      )}
      style={{ colorScheme: 'dark' }}
    >
      <div className="p-6 flex flex-col">
        <h3 id="confirm-modal-title" className="text-xl font-semibold text-white tracking-tight">
          {title}
        </h3>
        <p id="confirm-modal-desc" className="text-sm text-zinc-300 mt-2 leading-relaxed">
          {description}
        </p>

        <div className="flex items-center justify-end gap-2 w-full mt-6">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            className="px-4 min-h-[40px] rounded-lg border border-white/[0.14] hover:bg-white/[0.08] text-zinc-100 text-sm font-medium transition-colors cursor-pointer"
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
              'px-4 min-h-[40px] rounded-lg text-sm font-semibold transition-colors cursor-pointer',
              isDestructive
                ? 'bg-rose-500 hover:bg-rose-400 text-white'
                : 'bg-[#f4f4f6] hover:bg-white text-[#0b0b0e]'
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
