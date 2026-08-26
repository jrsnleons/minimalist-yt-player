'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { X, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PiPWindowProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const MIN_W = 240;
const MIN_H = 135;
const MAX_W = 640;
const MAX_H = 360;
const DEFAULT_W = 320;
const DEFAULT_H = 180;

export function PiPWindow({ isVisible, onClose, children }: PiPWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; initX: number; initY: number }>({
    dragging: false, startX: 0, startY: 0, initX: 0, initY: 0,
  });
  const resizeState = useRef<{ resizing: boolean; startX: number; startY: number; initW: number; initH: number }>({
    resizing: false, startX: 0, startY: 0, initW: DEFAULT_W, initH: DEFAULT_H,
  });

  const [isInteracting, setIsInteracting] = useState(false);
  const [pos, setPos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth - DEFAULT_W - 20 : 100,
    y: typeof window !== 'undefined' ? window.innerHeight - DEFAULT_H - 90 : 100,
  }));
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [minimized, setMinimized] = useState(false);

  // Set initial position once window size is known on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPos({
        x: Math.max(16, window.innerWidth - DEFAULT_W - 20),
        y: Math.max(16, window.innerHeight - DEFAULT_H - 90),
      });
    }
  }, []);

  // --- Drag ---
  const onDragStart = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-resize]') || (e.target as HTMLElement).closest('button')) return;
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, initX: pos.x, initY: pos.y };
    setIsInteracting(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - size.w, dragState.current.initX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - (minimized ? 36 : size.h) - 76, dragState.current.initY + dy)),
    });
  }, [size, minimized]);

  const onDragEnd = useCallback(() => {
    dragState.current.dragging = false;
    setIsInteracting(false);
  }, []);

  // --- Resize ---
  const onResizeStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    resizeState.current = { resizing: true, startX: e.clientX, startY: e.clientY, initW: size.w, initH: size.h };
    setIsInteracting(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [size]);

  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizeState.current.resizing) return;
    const dx = e.clientX - resizeState.current.startX;
    const dy = e.clientY - resizeState.current.startY;
    setSize({
      w: Math.max(MIN_W, Math.min(MAX_W, resizeState.current.initW + dx)),
      h: Math.max(MIN_H, Math.min(MAX_H, resizeState.current.initH + dy)),
    });
  }, []);

  const onResizeEnd = useCallback(() => {
    resizeState.current.resizing = false;
    setIsInteracting(false);
  }, []);

  return (
    <div
      ref={windowRef}
      className={cn(
        'fixed z-50 rounded-lg overflow-hidden border border-zinc-700/80 bg-zinc-950 shadow-2xl select-none',
        !isVisible
          ? 'pointer-events-none opacity-0 -z-50 w-px h-px overflow-hidden left-0 top-0'
          : 'cursor-grab active:cursor-grabbing transition-opacity duration-150'
      )}
      style={
        isVisible
          ? {
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: `${size.w}px`,
              height: minimized ? '36px' : `${size.h}px`,
            }
          : {
              width: '1px',
              height: '1px',
              top: 0,
              left: 0,
            }
      }
      onPointerDown={onDragStart}
      onPointerMove={(e) => {
        onDragMove(e);
        onResizeMove(e);
      }}
      onPointerUp={(e) => {
        onDragEnd();
        onResizeEnd();
      }}
      onPointerCancel={() => {
        onDragEnd();
        onResizeEnd();
      }}
      aria-label="Video picture-in-picture window"
      aria-hidden={!isVisible}
    >
      {/* Header bar (only interactive if visible) */}
      {isVisible && (
        <div className="flex items-center justify-between px-3 h-9 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">Video PiP</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized((m) => !m)}
              aria-label={minimized ? 'Expand video' : 'Minimize video'}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Minus size={12} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close video"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Content wrapper with pointer overlay during drag */}
      <div
        className={cn(
          'w-full relative',
          !isVisible ? 'w-px h-px' : minimized ? 'hidden' : ''
        )}
        style={isVisible && !minimized ? { height: `${size.h - 36}px` } : undefined}
      >
        {children}
        {isInteracting && isVisible && (
          <div className="absolute inset-0 bg-transparent z-10" />
        )}
      </div>

      {/* Resize handle */}
      {isVisible && !minimized && (
        <div
          data-resize
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-20"
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          aria-label="Resize video window"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-zinc-500">
            <path d="M0 10 L10 0 M5 10 L10 5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}
