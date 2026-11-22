"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LOCATION, roundLocation } from "@/lib/geo/approxPosition";
import type { LngLat } from "@/lib/geo/mercator";

export type LocationStatus = "padrao" | "buscando" | "aparelho" | "negada" | "indisponivel";

export interface UserLocationState {
  location: LngLat;
  status: LocationStatus;
}

/**
 * Where "Você" sits on the map. Memory only: the device position is rounded, never stored and
 * never sent anywhere; reloading the page goes back to the default city.
 */
let state: UserLocationState = { location: DEFAULT_LOCATION, status: "padrao" };
const listeners = new Set<() => void>();

function set(next: UserLocationState) {
  state = next;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER_STATE: UserLocationState = { location: DEFAULT_LOCATION, status: "padrao" };

export function useUserLocation(): UserLocationState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

/** Asks the browser for the position; only call it from an explicit user action. */
export function requestDeviceLocation(): void {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    set({ ...state, status: "indisponivel" });
    return;
  }
  set({ ...state, status: "buscando" });
  navigator.geolocation.getCurrentPosition(
    (pos) =>
      set({
        location: roundLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        status: "aparelho",
      }),
    (err) =>
      set({ location: DEFAULT_LOCATION, status: err.code === err.PERMISSION_DENIED ? "negada" : "indisponivel" }),
    { enableHighAccuracy: false, maximumAge: 10 * 60_000, timeout: 12_000 },
  );
}

export function resetToDefaultLocation(): void {
  set({ location: DEFAULT_LOCATION, status: "padrao" });
}
