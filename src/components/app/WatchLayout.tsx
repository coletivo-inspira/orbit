"use client";

import { DeviceModals } from "@/components/modals/DeviceModals";
import { WatchScreen } from "@/components/screens/WatchScreen";
import { ToastViewport } from "@/components/ui/Toasts";

export function WatchLayout() {
  return (
    <div data-device-root className="relative flex h-full w-full flex-col bg-[#121921]">
      <div className="relative flex-1 overflow-hidden">
        <WatchScreen />
      </div>
      <DeviceModals />
      <ToastViewport compact className="absolute bottom-7 left-1/2 -translate-x-1/2 items-center" />
    </div>
  );
}
