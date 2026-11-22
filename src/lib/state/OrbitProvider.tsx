"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { createInitialState, orbitReducer, sanitizeStoredUser, type OrbitAction, type OrbitState } from "./reducer";
import { sanitizarDesejos } from "@/lib/desejos/pontuacao";
import type { EstadoDesejos } from "@/lib/desejos/types";
import type { UserProfile } from "@/lib/types";

const STORAGE_KEY = "orbit:user:v1";
const REGION_KEY = "orbit:region:v1";
const DESEJOS_KEY = "orbit:desejos:v1";
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

function readStoredDesejos(): EstadoDesejos | null {
  try {
    const raw = window.localStorage.getItem(DESEJOS_KEY);
    return raw ? sanitizarDesejos(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * Holds the single app state shared by every device layout, so switching
 * desktop / mobile / watch in the studio keeps the session in sync.
 * Until a backend exists, only the user's hub, chosen region, sent taps and Desejos answers are persisted (localStorage).
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
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(REGION_KEY, state.regionId);
    } catch {}
  }, [state.regionId]);

  // Strict Mode replays this effect before the hydration dispatch lands; the untouched
  // initial objects must never overwrite stored answers.
  const desejosIniciais = useRef({ desejos: state.desejos, publicos: state.desejosPublicos });
  useEffect(() => {
    if (!hydrated.current) return;
    const inicial = desejosIniciais.current;
    if (state.desejos === inicial.desejos && state.desejosPublicos === inicial.publicos) return;
    const estado: EstadoDesejos = { ...state.desejos, publicos: state.desejosPublicos };
    try {
      window.localStorage.setItem(DESEJOS_KEY, JSON.stringify(estado));
    } catch {}
  }, [state.desejos, state.desejosPublicos]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(TAPS_KEY, JSON.stringify(state.sentTaps));
    } catch {}
  }, [state.sentTaps]);

  useEffect(() => {
    const stored = readStoredUser();
    const desejos = readStoredDesejos();
    if (desejos) dispatch({ type: "hydrateDesejos", estado: desejos });
    if (stored) dispatch({ type: "hydrateUser", user: stored });
    try {
      const region = window.localStorage.getItem(REGION_KEY);
      if (region) dispatch({ type: "setRegion", regionId: region });
      const taps = window.localStorage.getItem(TAPS_KEY);
      if (taps) dispatch({ type: "hydrateTaps", ids: JSON.parse(taps) });
    } catch {}
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
