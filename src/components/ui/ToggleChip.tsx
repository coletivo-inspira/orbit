import type { ReactNode } from "react";

/** Multi-select chip: a toggle button announced through `aria-pressed`. */
export function ToggleChip({
  pressed,
  onToggle,
  children,
  highlight = false,
  className = "",
}: {
  pressed: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** Marks chips that match the viewer (e.g. a topic they also picked). */
  highlight?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition ${
        pressed ? "lg-active-lens" : `lg-pill hover:text-marfim ${highlight ? "text-areia" : "text-marfim-suave"}`
      } ${className}`}
    >
      {children}
    </button>
  );
}
