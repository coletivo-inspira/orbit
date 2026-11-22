"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";

export type SheetPlacement = "baixo" | "centro" | "lateral";

const SCRIM: Record<SheetPlacement, string> = {
  baixo: "items-end p-2.5 pb-4",
  centro: "items-center justify-center p-6",
  lateral: "justify-end p-4",
};

const PANEL: Record<SheetPlacement, string> = {
  baixo: "max-h-[94%] rounded-folha",
  centro: "max-h-[92%] rounded-folha",
  lateral: "h-full rounded-folha",
};

/**
 * Modal sheet (brandbook v2): opaque body for reading, with `SheetHeader`/`SheetFooter` as
 * sticky level-1 glass the content scrolls under. Focus contract comes from `useDialogFocus`.
 */
export function Sheet({
  labelledBy,
  initialFocusRef,
  onClose,
  placement = "centro",
  maxWidth = "max-w-[460px]",
  className = "",
  children,
}: {
  labelledBy: string;
  initialFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  placement?: SheetPlacement;
  maxWidth?: string;
  className?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useDialogFocus(dialogRef, initialFocusRef, onClose);
  return (
    <div onClick={onClose} className={`absolute inset-0 z-50 flex bg-tinta/75 ${SCRIM[placement]}`}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`lg-sheet relative flex w-full flex-col overflow-hidden outline-none ${PANEL[placement]} ${placement === "baixo" ? "" : maxWidth} ${className}`}
      >
        <div className="orbit-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function SheetHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`lg-glass lg-header sticky top-0 z-10 flex shrink-0 items-center gap-3 px-5 py-3.5 ${className}`}>
      {children}
    </div>
  );
}

export function SheetBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex-1 p-5 ${className}`}>{children}</div>;
}

export function SheetFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`lg-glass lg-glass-footer sticky bottom-0 z-10 mt-auto flex shrink-0 flex-wrap gap-2 px-4 py-3.5 ${className}`}
    >
      {children}
    </div>
  );
}

/** Uppercase section label used inside sheets and cards (12px, Bricolage, secondary ivory). */
export function SectionLabel({
  children,
  as: Tag = "h3",
  className = "",
}: {
  children: ReactNode;
  as?: "h2" | "h3" | "p";
  className?: string;
}) {
  return (
    <Tag className={`font-display text-xs font-bold tracking-wider text-marfim-suave uppercase ${className}`}>
      {children}
    </Tag>
  );
}
