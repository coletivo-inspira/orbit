"use client";

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isUsable(el: HTMLElement | null): el is HTMLElement {
  return Boolean(el && el.isConnected && !el.closest("[inert]") && el.getClientRects().length > 0);
}

/** Makes every sibling of the dialog's ancestors inert (except `data-inert-exempt`, e.g. live toasts). */
function inertOutside(dialog: HTMLElement): () => void {
  const touched: HTMLElement[] = [];
  for (let node: HTMLElement | null = dialog; node && node !== document.body; node = node.parentElement) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from<Element>(parent.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement)) continue;
      if (sibling.inert || sibling.hasAttribute("data-inert-exempt") || sibling.tagName === "SCRIPT") continue;
      sibling.inert = true;
      touched.push(sibling);
    }
  }
  return () => touched.forEach((el) => (el.inert = false));
}

/**
 * Modal dialog contract (WAI-ARIA APG): focus moves into the dialog, Tab/Shift+Tab
 * cycle inside it, the background is inert, and Esc/close return focus to the
 * trigger — or to the screen's `data-focus-fallback` element when the trigger is gone.
 */
export function useDialogFocus<T extends HTMLElement>(
  dialogRef: RefObject<T | null>,
  initialFocusRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = dialog.closest<HTMLElement>("[data-device-root]");
    const restoreInert = inertOutside(dialog);
    (initialFocusRef.current ?? dialog).focus({ preventScroll: true });

    return () => {
      restoreInert();
      // Wait for the commit to finish: the trigger may be unmounted by the same update (e.g. a tab switch).
      queueMicrotask(() => {
        if (isUsable(trigger) && trigger !== document.body) {
          trigger.focus({ preventScroll: true });
          return;
        }
        const scope = root?.isConnected ? root : document;
        const fallback =
          scope.querySelector<HTMLElement>("[data-focus-fallback]") ??
          document.querySelector<HTMLElement>("[data-focus-fallback]");
        fallback?.focus({ preventScroll: true });
      });
    };
  }, [dialogRef, initialFocusRef]);

  return (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeRef.current();
      return;
    }
    if (e.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isUsable);
    if (!items.length) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    const outsideItems = !items.includes(active as HTMLElement);
    if (e.shiftKey && (active === first || outsideItems)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || (outsideItems && active !== initialFocusRef.current))) {
      e.preventDefault();
      first.focus();
    }
  };
}
