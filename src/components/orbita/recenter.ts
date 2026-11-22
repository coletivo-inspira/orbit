"use client";

import { createContext, useContext } from "react";

/** Recenter action of the radar the overlay sits in (honeycomb on the watch, map elsewhere). */
export const RecenterContext = createContext<() => void>(() => {});

export function useOrbitRecenter() {
  return useContext(RecenterContext);
}
