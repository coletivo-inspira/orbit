"use client";

import { useRef, type KeyboardEvent } from "react";
import { rovingIndex } from "@/lib/a11y/roving";

export function segmentTabId(idBase: string, id: string) {
  return `${idBase}-tab-${id}`;
}

/**
 * Pill segmented control with tab semantics (WAI-ARIA APG Tabs): one tab stop, arrows/Home/End
 * move and select. The panel is rendered by the caller with `aria-labelledby={segmentTabId(...)}`.
 */
export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  label,
  idBase,
  panelId,
  compact = false,
  className = "",
}: {
  items: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  idBase: string;
  panelId?: string;
  compact?: boolean;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = Math.max(
    0,
    items.findIndex((i) => i.id === value),
  );
  const onKeyDown = (e: KeyboardEvent) => {
    const next = rovingIndex(e.key, active, items.length);
    if (next === null) return;
    e.preventDefault();
    onChange(items[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`lg-glass-tint flex shrink-0 items-center rounded-full p-1 ${className}`}
    >
      {items.map((item, i) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={segmentTabId(idBase, item.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onKeyDown={onKeyDown}
            onClick={() => onChange(item.id)}
            className={`min-h-9 rounded-full ${compact ? "px-3" : "px-4"} text-xs font-bold transition ${
              selected ? "lg-active-lens" : "border border-transparent text-marfim-suave hover:text-marfim"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
