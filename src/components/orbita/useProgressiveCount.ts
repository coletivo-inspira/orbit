"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export const LIST_BATCH = 48;

/**
 * Grows how many items a long list mounts as a sentinel nears the bottom of its scroll container,
 * so 1000+ cards never mount at once. Resets when `resetKey` changes (new filters or sort).
 */
export function useProgressiveCount(total: number, rootRef: RefObject<HTMLElement | null>, resetKey: string) {
  const [state, setState] = useState({ key: resetKey, count: LIST_BATCH });
  const count = state.key === resetKey ? state.count : LIST_BATCH;
  if (state.key !== resetKey) setState({ key: resetKey, count: LIST_BATCH });
  const sentinelRef = useRef<HTMLLIElement>(null);
  const shown = Math.min(total, count);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || shown >= total) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState((s) => ({ key: s.key, count: s.count + LIST_BATCH }));
        }
      },
      { root: rootRef.current, rootMargin: "0px 0px 900px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [shown, total, rootRef]);

  return { shown, sentinelRef, more: () => setState((s) => ({ key: s.key, count: s.count + LIST_BATCH })) };
}
