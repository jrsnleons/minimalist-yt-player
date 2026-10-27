'use client';

import { useEffect, useRef, type RefObject } from 'react';

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getTabbable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) => !el.hasAttribute('inert') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'
  );
}

interface FocusTrapOptions {
  /** Trap is on while true. Defaults to true. */
  active?: boolean;
  /** Called when Escape is pressed inside the container. */
  onEscape?: () => void;
  /** Element (or selector inside the container) to focus on open. Defaults to the first tabbable element. */
  initialFocus?: RefObject<HTMLElement | null> | string;
  /** Return focus to the element that was focused before opening. Defaults to true. */
  returnFocus?: boolean;
}

/**
 * Keeps keyboard focus inside a custom (non-<dialog>) overlay: moves focus in on open,
 * cycles Tab / Shift+Tab, closes on Escape and restores focus to the trigger on close.
 * Key events that originate outside the container (e.g. a native dialog opened on top) are ignored.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  { active = true, onEscape, initialFocus, returnFocus = true }: FocusTrapOptions = {}
) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');

    let target: HTMLElement | null = null;
    if (typeof initialFocus === 'string') target = container.querySelector<HTMLElement>(initialFocus);
    else if (initialFocus?.current) target = initialFocus.current;
    if (!target) target = getTabbable(container)[0] ?? container;
    target.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      const eventTarget = e.target as Node | null;
      if (eventTarget && !container.contains(eventTarget)) return;

      if (e.key === 'Escape') {
        if (e.defaultPrevented) return;
        if (onEscapeRef.current) {
          e.preventDefault();
          onEscapeRef.current();
        }
        return;
      }

      if (e.key !== 'Tab') return;
      const items = getTabbable(container);
      if (items.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || current === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      } else if (!container.contains(current)) {
        e.preventDefault();
        first.focus();
      }
    };

    // If focus escapes (e.g. a click on the page behind), pull it back in.
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || container.contains(t)) return;
      if (t.closest('dialog[open], [role="dialog"][aria-modal="true"], [data-focus-trap-ignore]')) return;
      (getTabbable(container)[0] ?? container).focus({ preventScroll: true });
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      if (returnFocus && trigger && trigger.isConnected) {
        trigger.focus({ preventScroll: true });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, containerRef, returnFocus]);
}
