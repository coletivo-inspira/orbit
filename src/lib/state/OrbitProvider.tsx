"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { createConversationArchive, type ConversationArchive } from "@/lib/seguranca/conversationArchive";
import { createInitialState, orbitReducer, sanitizeStoredUser, type OrbitAction, type OrbitState } from "./reducer";
import type { UserProfile } from "@/lib/types";

const STORAGE_KEY = "orbit:user:v1";
const REGION_KEY = "orbit:region:v1";
const TAPS_KEY = "orbit:taps:v1";

interface OrbitContextValue {
  state: OrbitState;
  dispatch: (action: OrbitAction) => void;
}

const OrbitContext = createContext<OrbitContextValue | null>(null);

function readStoredUser(): UserProfile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeStoredUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * Holds the single app state shared by every device layout, so switching
 * desktop / mobile / watch in the studio keeps the session in sync.
 * Until a backend exists, only the user's hub, chosen region and sent taps are persisted (localStorage);
 * conversations are deliberately not.
 */
export function OrbitProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(orbitReducer, undefined, createInitialState);
  const hydrated = useRef(false);
  const archive = useRef<ConversationArchive | null>(null);

  // Every line said also goes to the sealed archive; the visible state keeps only the last one per side.
  const dispatch = useCallback((action: OrbitAction) => {
    if (action.type === "recordLine" && action.text.trim()) {
      archive.current ??= createConversationArchive();
      void archive.current
        .append({ profileId: action.id, from: action.from, text: action.text.trim(), at: new Date().toISOString() })
        .catch(() => {});
    }
    rawDispatch(action);
  }, []);

  // Declared before the hydration effect so the mount pass never overwrites the stored hub with demo data.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.user));
    } catch {
      // Storage can be unavailable (private mode / quota); the session still works in memory.
    }
  }, [state.user]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(REGION_KEY, state.regionId);
    } catch {}
  }, [state.regionId]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(TAPS_KEY, JSON.stringify(state.sentTaps));
    } catch {}
  }, [state.sentTaps]);

  useEffect(() => {
    const stored = readStoredUser();
    if (stored) rawDispatch({ type: "hydrateUser", user: stored });
    try {
      const region = window.localStorage.getItem(REGION_KEY);
      if (region) rawDispatch({ type: "setRegion", regionId: region });
      const taps = window.localStorage.getItem(TAPS_KEY);
      if (taps) rawDispatch({ type: "hydrateTaps", ids: JSON.parse(taps) });
    } catch {}
    hydrated.current = true;
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <OrbitContext.Provider value={value}>{children}</OrbitContext.Provider>;
}

export function useOrbit(): OrbitContextValue {
  const ctx = useContext(OrbitContext);
  if (!ctx) throw new Error("useOrbit must be used inside <OrbitProvider>");
  return ctx;
}
