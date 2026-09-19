'use client';

import { useEffect, useRef, useState } from 'react';
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
      aria-label={title}
      className={cn(
        'fixed inset-0 m-auto p-0 rounded-3xl border border-white/[0.1] bg-[#09090d]/95',
        'text-white shadow-[0_25px_70px_rgba(0,0,0,0.9)] backdrop:bg-black/80 backdrop:backdrop-blur-xl',
        'max-w-lg w-full focus:outline-none z-[100] overflow-hidden',
        className
      )}
      style={{ colorScheme: 'dark' }}
    >
      <div className="flex flex-col">
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0d0d12]/80 shrink-0">
            <h2 className="text-sm font-semibold text-white tracking-tight font-sans">{title}</h2>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close modal"
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </dialog>
  );

  return createPortal(modalContent, document.body);
}
