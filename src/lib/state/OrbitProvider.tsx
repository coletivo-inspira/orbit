"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { createInitialState, orbitReducer, sanitizeStoredUser, type OrbitAction, type OrbitState } from "./reducer";
import type { UserProfile } from "@/lib/types";

const STORAGE_KEY = "orbit:user:v1";

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
 * Until a backend exists, only the user's hub is persisted (localStorage).
 */
export function OrbitProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(orbitReducer, undefined, createInitialState);
  const hydrated = useRef(false);

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
    const stored = readStoredUser();
    if (stored) dispatch({ type: "hydrateUser", user: stored });
    hydrated.current = true;
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <OrbitContext.Provider value={value}>{children}</OrbitContext.Provider>;
}

export function useOrbit(): OrbitContextValue {
  const ctx = useContext(OrbitContext);
  if (!ctx) throw new Error("useOrbit must be used inside <OrbitProvider>");
  return ctx;
}
