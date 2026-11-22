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
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
        pressed
          ? "lg-active-lens"
          : `border bg-white/[0.06] hover:bg-white/[0.12] hover:text-white ${highlight ? "border-areia/50 text-areia" : "border-white/[0.14] text-slate-300"}`
      } ${className}`}
    >
      {children}
    </button>
  );
}
