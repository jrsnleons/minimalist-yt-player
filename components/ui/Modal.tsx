'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Handle native ESC press
  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement, Event>) => {
    e.preventDefault();
    onClose();
  };

  // Click backdrop to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const modalContent = (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        'fixed inset-0 m-auto p-0 rounded-[14px] border border-white/[0.08] bg-[#141418]',
        'text-white shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop:bg-black/70',
        'max-w-lg w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] focus:outline-none z-[100] overflow-hidden',
        className
      )}
      style={{ colorScheme: 'dark' }}
    >
      <div className="flex flex-col max-h-[calc(100dvh-2rem)]">
        {title && (
          <div className="flex items-center justify-between gap-3 pl-6 pr-3 pt-4 pb-2 shrink-0">
            <h2 id={titleId} className="text-xl font-semibold tracking-tight text-white">
              {title}
            </h2>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close"
              className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="px-6 pt-2 pb-6 overflow-y-auto min-h-0">{children}</div>
      </div>
    </dialog>
  );

  return createPortal(modalContent, document.body);
}
