"use client";

import { useCallback, useState } from "react";
import { sanitizePins, serializePins } from "@/lib/engines/graphDisplay";
import type { PinMap } from "@/lib/engines/graphView";

function read(key: string): PinMap {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? sanitizePins(JSON.parse(raw)) : new Map();
  } catch {
    return new Map();
  }
}

/** Nodes the user pinned on one graph view, remembered on this device. */
export function useGraphPins(storageKey: string) {
  const [pins, setPinsState] = useState<PinMap>(() => read(storageKey));
  const setPins = useCallback(
    (next: PinMap) => {
      setPinsState(next);
      try {
        if (next.size) window.localStorage.setItem(storageKey, JSON.stringify(serializePins(next)));
        else window.localStorage.removeItem(storageKey);
      } catch {
        // Storage full or blocked: pins still hold for this session.
      }
    },
    [storageKey],
  );
  return { pins, setPins };
}
