'use client';

import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  // Click backdrop to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-label={title}
      className={cn(
        'fixed inset-0 m-auto p-0 rounded-lg border border-zinc-800 bg-zinc-900',
        'text-white shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm',
        'max-w-lg w-full focus:outline-none',
        className
      )}
      style={{ colorScheme: 'dark' }}
    >
      <div className="flex flex-col">
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-white">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </dialog>
  );
}
