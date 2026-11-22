"use client";

import type { ReactNode } from "react";
import { MolduraDoUsuario } from "@/components/molduras/MolduraAvatar";
import { usePrivacyToggle } from "@/components/screens/PerfilScreen";
import { AppTile } from "@/components/ui/AppBadge";
import { ProfileImage } from "@/components/ui/Avatar";
import { CenaOceano } from "@/components/ui/CenaOceano";
import { activeAppIds, INTENTIONS } from "@/lib/data/intentions";
import { DEMO_USER_PHOTO } from "@/lib/data/user";
import { PROFILE_VIEWS, RECEIVED_TAPS } from "@/lib/interesse";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";

/** Watch "Meu Cartão": the user's photo and summary in Liquid Glass over the ocean. `children` are the watch overlays. */
export function PerfilRelogio({ children }: { children?: ReactNode }) {
  const { state, dispatch } = useOrbit();
  const { requestDevice } = useDevice();
  const togglePrivacy = usePrivacyToggle();
  const u = state.user;
  const primary = INTENTIONS[u.primaryIntention] ?? INTENTIONS.troca;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#072a43]">
      <CenaOceano />
      {children}
      <div className="relative z-10 flex h-full flex-col justify-between px-3.5 pt-8 pb-9">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <MolduraDoUsuario size={62} sombra="0 10px 26px rgba(2,12,22,0.6)">
              <ProfileImage cfg={u.avatar} photo={DEMO_USER_PHOTO} />
            </MolduraDoUsuario>
            <div
              className="lg-liquid absolute -bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap"
              style={{ color: primary.text }}
            >
              <span aria-hidden="true">{primary.emoji}</span>
              {primary.label}
            </div>
          </div>
          <div className="mt-5 font-display text-[15px] leading-5 font-extrabold text-white [text-shadow:0_1px_10px_rgb(2_12_22/70%)]">
            {u.firstName}
          </div>
        </div>

        <div className="lg-liquid lg-sheen flex flex-col items-center gap-1.5 rounded-[20px] px-2.5 py-2">
          <div className="flex items-center justify-center gap-1.5">
            {activeAppIds(u.apps)
              .slice(0, 5)
              .map((id) => (
                <AppTile key={id} appId={id} className="h-6 w-6 rounded-lg" iconClassName="h-3.5 w-3.5" />
              ))}
          </div>
          <p className="text-[10px] font-semibold text-slate-200">
            <strong className="font-extrabold text-white">{PROFILE_VIEWS.length}</strong> visualizações ·{" "}
            <strong className="font-extrabold text-white">{RECEIVED_TAPS.length}</strong> toques
          </p>
        </div>

        <div className="flex w-full flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "setTab", tab: "desejos" });
              requestDevice("mobile");
            }}
            className="lg-liquid lg-sheen flex h-10 w-full items-center justify-between rounded-full px-3.5 text-[11px] font-bold text-areia"
          >
            <span>✦ Desejos</span>
            <span className="text-[10px] text-marfim/85">no celular →</span>
          </button>
          <button
            type="button"
            onClick={togglePrivacy}
            className={`lg-liquid lg-sheen flex h-10 w-full items-center justify-between rounded-full px-3.5 text-[11px] font-bold ${u.isPublic ? "text-salvia" : "text-amber-200"}`}
          >
            <span>{u.isPublic ? "🌐 Público (simulado)" : "🔒 Privado (simulado)"}</span>
            <span className="text-[10px] text-marfim/85">Alternar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
