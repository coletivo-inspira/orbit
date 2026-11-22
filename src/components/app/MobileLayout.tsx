"use client";

import type { ReactNode } from "react";
import { ActiveScreen, AmbientOrbs } from "@/components/app/ActiveScreen";
import { NAV_ITEMS } from "@/components/app/navigation";
import { DeviceModals } from "@/components/modals/DeviceModals";
import { ToastViewport } from "@/components/ui/Toasts";
import { useOrbit } from "@/lib/state/OrbitProvider";

/** Phone layout: content scrolls under a floating Liquid Glass capsule nav (iOS 26 style). */
export function MobileLayout({ statusBar, homeIndicator = false }: { statusBar?: ReactNode; homeIndicator?: boolean }) {
  const { state, dispatch } = useOrbit();
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0b101d]">
      <AmbientOrbs />
      {statusBar}
      <main className="relative z-10 min-h-0 flex-1 overflow-hidden">
        <ActiveScreen />
      </main>

      <div className="pointer-events-none absolute right-3.5 bottom-[max(1rem,env(safe-area-inset-bottom))] left-3.5 z-30 flex flex-col items-center gap-2">
        <nav
          aria-label="Navegação principal"
          className="lg-bar pointer-events-auto flex h-[60px] w-full items-center justify-around rounded-[30px] px-2"
        >
          {NAV_ITEMS.map((item) => {
            const active = state.activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => dispatch({ type: "setTab", tab: item.id })}
                className={`relative flex h-[46px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] transition-all ${
                  active ? "lg-active-lens text-white" : "text-slate-300/75 hover:text-white"
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-semibold tracking-tight">{item.short}</span>
                {item.badge && (
                  <span className="absolute top-1 right-4 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-extrabold text-slate-950 shadow">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        {homeIndicator && <div className="h-1 w-28 rounded-full bg-white/35" />}
      </div>

      <DeviceModals />
      <ToastViewport className="absolute bottom-[92px] left-1/2 -translate-x-1/2 items-center" />
    </div>
  );
}
