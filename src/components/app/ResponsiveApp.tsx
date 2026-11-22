"use client";

import { useSyncExternalStore } from "react";
import { DesktopLayout } from "@/components/app/DesktopLayout";
import { MobileLayout } from "@/components/app/MobileLayout";
import { AvisoMolduras } from "@/components/molduras/AvisoMolduras";
import { ToastProvider } from "@/components/ui/Toasts";
import { DeviceProvider } from "@/lib/state/device";
import { OrbitProvider } from "@/lib/state/OrbitProvider";

const DESKTOP_QUERY = "(min-width: 900px)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

const getScale = () => 1;
const requestDevice = () => {};

/** The installable PWA: phone layout on small screens, desktop layout on large ones. */
export function ResponsiveApp() {
  const isDesktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
  const device = isDesktop ? "desktop" : "mobile";

  return (
    <OrbitProvider>
      <ToastProvider>
        <AvisoMolduras />
        <DeviceProvider value={{ device, getScale, requestDevice }}>
          <div className="fixed inset-0">
            {isDesktop ? (
              <DesktopLayout showStudioLink />
            ) : (
              <MobileLayout statusBar={<div className="h-[env(safe-area-inset-top)] shrink-0" />} />
            )}
          </div>
        </DeviceProvider>
      </ToastProvider>
    </OrbitProvider>
  );
}
