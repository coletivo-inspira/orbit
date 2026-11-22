"use client";

import { OrbitRadial, useOrbitRecenter } from "@/components/orbita/OrbitRadial";
import { usePrivacyToggle } from "@/components/screens/PerfilScreen";
import { AppTile } from "@/components/ui/AppBadge";
import { Avatar, RingedAvatar } from "@/components/ui/Avatar";
import { activeAppIds, INTENTIONS } from "@/lib/data/intentions";
import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { OrbitState } from "@/lib/state/reducer";

const WATCH_PROFILES = SIMULATED_PROFILES.slice(0, 12);
const IN_PARK = SIMULATED_PROFILES.filter((p) => p.inPark);

function TopClock() {
  return (
    <div className="pointer-events-none absolute top-2.5 right-4 left-4 z-30 flex items-center justify-between text-[11px] font-bold text-white/95">
      <span className="tracking-tight text-violet-200">Orbit</span>
      <span>16:36</span>
    </div>
  );
}

function PageDots() {
  const { state, dispatch } = useOrbit();
  const pages: { page: OrbitState["watchPage"]; title: string; active: string }[] = [
    { page: 0, title: "Órbita", active: "bg-white" },
    { page: 1, title: "Parque 2D", active: "bg-emerald-300" },
    { page: 2, title: "Meu Cartão", active: "bg-cyan-300" },
  ];
  return (
    <div className="lg-pill pointer-events-auto absolute bottom-2.5 left-1/2 z-30 flex -translate-x-1/2 items-center justify-center gap-2 rounded-full px-2.5 py-1">
      {pages.map((p) => (
        <button
          key={p.page}
          type="button"
          title={p.title}
          aria-label={p.title}
          aria-current={state.watchPage === p.page}
          onClick={() => dispatch({ type: "setWatchPage", page: p.page })}
          className={`h-1.5 rounded-full transition-all ${state.watchPage === p.page ? `w-4 ${p.active}` : "w-1.5 bg-white/35 hover:bg-white/65"}`}
        />
      ))}
    </div>
  );
}

function WatchRecenterButton() {
  const recenter = useOrbitRecenter();
  return (
    <button
      type="button"
      title="Centralizar"
      aria-label="Centralizar"
      onClick={recenter}
      className="lg-pill absolute right-3.5 bottom-7 z-30 flex h-7 w-7 items-center justify-center rounded-full text-xs text-white"
    >
      ◎
    </button>
  );
}

/** watchOS-style glanceable pages: Órbita, Parque summary and the user's card. */
export function WatchScreen() {
  const { state, dispatch } = useOrbit();
  const { requestDevice } = useDevice();
  const togglePrivacy = usePrivacyToggle();

  if (state.watchPage === 0) {
    return (
      <OrbitRadial
        profiles={WATCH_PROFILES}
        isWatch
        onCenterClick={() => dispatch({ type: "setWatchPage", page: 2 })}
        className="h-full w-full"
        style={{ background: "radial-gradient(circle at center, rgba(167,139,250,0.18) 0%, rgba(10,14,28,0.88) 72%)" }}
        overlay={
          <>
            <TopClock />
            <WatchRecenterButton />
            <PageDots />
          </>
        }
      />
    );
  }

  if (state.watchPage === 1) {
    return (
      <div className="relative flex h-full w-full flex-col justify-between bg-gradient-to-b from-emerald-950/35 to-[#060a14] px-4 pt-9 pb-9">
        <TopClock />
        <div className="mt-1 flex flex-col items-center text-center">
          <div className="lg-pill flex h-12 w-12 items-center justify-center rounded-2xl text-2xl">🌳</div>
          <div className="mt-2 text-sm font-extrabold text-white">Parque Central</div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
            {IN_PARK.length} pessoas andando agora
          </div>
          <div className="mt-3 flex items-center justify-center -space-x-2">
            {IN_PARK.slice(0, 5).map((p) => (
              <div key={p.id} className="h-8 w-8 overflow-hidden rounded-full border-2 border-[#080d18]">
                <Avatar cfg={p.avatar} />
              </div>
            ))}
            {IN_PARK.length > 5 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#080d18] bg-white/15 text-[10px] font-bold text-white backdrop-blur-md">
                +{IN_PARK.length - 5}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "setTab", tab: "parque" });
            requestDevice("mobile");
          }}
          className="lg-pill w-full rounded-full border-emerald-300/40 bg-emerald-400/25 py-2.5 text-xs font-extrabold text-emerald-100 active:scale-95"
        >
          Entrar no Celular →
        </button>
        <PageDots />
      </div>
    );
  }

  const u = state.user;
  const primary = INTENTIONS[u.primaryIntention] ?? INTENTIONS.troca;
  return (
    <div className="relative flex h-full w-full flex-col justify-between bg-gradient-to-b from-indigo-950/35 to-[#060914] px-4 pt-9 pb-9">
      <TopClock />
      <div className="flex flex-col items-center text-center">
        <RingedAvatar cfg={u.avatar} color={primary.color} size={56} />
        <div className="mt-2 text-sm font-extrabold text-white">{u.firstName}</div>
        <div className="mt-0.5 text-[10px] font-bold" style={{ color: primary.color }}>
          {primary.emoji} {primary.label}
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {activeAppIds(u.apps)
            .slice(0, 5)
            .map((id) => (
              <AppTile key={id} appId={id} className="h-6 w-6 rounded-lg" iconClassName="h-3.5 w-3.5" />
            ))}
        </div>
      </div>
      <button
        type="button"
        onClick={togglePrivacy}
        className={`lg-pill flex w-full items-center justify-between rounded-full px-3 py-2 text-xs font-bold ${u.isPublic ? "border-emerald-300/35 text-emerald-200" : "border-amber-300/35 text-amber-200"}`}
      >
        <span>{u.isPublic ? "🌐 Público" : "🔒 Privado"}</span>
        <span className="text-[10px] opacity-80">Alternar</span>
      </button>
      <PageDots />
    </div>
  );
}
