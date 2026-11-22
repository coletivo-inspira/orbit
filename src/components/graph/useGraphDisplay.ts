"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_GRAPH_DISPLAY, sanitizeGraphDisplay, type GraphDisplay } from "@/lib/engines/graphDisplay";

/** Display settings of one graph view, remembered on this device. */
export function useGraphDisplay(storageKey: string) {
  const [display, setDisplay] = useState<GraphDisplay>(DEFAULT_GRAPH_DISPLAY);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is only readable after mount
      if (raw) setDisplay(sanitizeGraphDisplay(JSON.parse(raw)));
    } catch {
      // Corrupt or blocked storage: keep the defaults.
    }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(display));
    } catch {
      // Storage full or blocked: the settings still apply for this session.
    }
  }, [display, loadedKey, storageKey]);

  const update = useCallback((patch: Partial<GraphDisplay>) => setDisplay((d) => ({ ...d, ...patch })), []);
  const reset = useCallback(() => setDisplay(DEFAULT_GRAPH_DISPLAY), []);
  return { display, update, reset };
}
