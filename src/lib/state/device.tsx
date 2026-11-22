"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DeviceKind } from "@/lib/types";

interface DeviceContextValue {
  device: DeviceKind;
  /** CSS scale applied to the device by the studio; pointer deltas must be divided by it. */
  getScale: () => number;
  /** Asks the host to switch layout (e.g. the watch hands off to the phone). No-op outside the studio. */
  requestDevice: (device: DeviceKind) => void;
}

const DeviceContext = createContext<DeviceContextValue>({
  device: "mobile",
  getScale: () => 1,
  requestDevice: () => {},
});

export function DeviceProvider({ value, children }: { value: DeviceContextValue; children: ReactNode }) {
  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice(): DeviceContextValue {
  return useContext(DeviceContext);
}
