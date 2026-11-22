"use client";

import { DeviceModals } from "@/components/modals/DeviceModals";
import { WatchScreen } from "@/components/screens/WatchScreen";
import { ToastViewport } from "@/components/ui/Toasts";

export function WatchLayout() {
  return (
    <div className="app-ambient-bg relative flex h-full w-full flex-col">
      <div className="relative flex-1 overflow-hidden">
        <WatchScreen />
      </div>
      <DeviceModals />
      <ToastViewport compact className="absolute bottom-7 left-1/2 -translate-x-1/2 items-center" />
    </div>
  );
}
