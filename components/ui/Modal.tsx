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

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-label={title}
      className={cn(
        'fixed inset-0 m-auto p-0 rounded-2xl border border-[#27272f] bg-[#0c0c10]',
        'text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-md',
        'max-w-lg w-full focus:outline-none z-[100]',
        className
      )}
      style={{ colorScheme: 'dark' }}
    >
      <div className="flex flex-col">
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#222228] bg-[#121217] rounded-t-2xl">
            <h2 className="text-sm font-semibold text-white tracking-tight">{title}</h2>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1e1e24] transition-colors cursor-pointer"
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
