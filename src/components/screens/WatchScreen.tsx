"use client";

import { OrbitRadial, useOrbitRecenter } from "@/components/orbita/OrbitRadial";
import { InterestStamp } from "@/components/interesse/InterestStamp";
import { PerfilRelogio } from "@/components/perfil/PerfilRelogio";
import { Avatar, ProfileImage } from "@/components/ui/Avatar";
import { CardDeck } from "@/components/ui/CardDeck";
import { findCityRoom } from "@/lib/data/parkRooms";
import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import { formatAgo, INTEREST_FEED, INTEREST_TAP_COUNT, interestEntryLabel, type InterestEntry } from "@/lib/interesse";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { OrbitState } from "@/lib/state/reducer";

const WATCH_PROFILES = SIMULATED_PROFILES.slice(0, 12);
const IN_PARK = SIMULATED_PROFILES.filter((p) => p.inPark);

function TopClock() {
  return (
    <div className="pointer-events-none absolute top-2.5 right-4 left-4 z-30 flex items-center justify-between text-[11px] font-bold text-white/95">
      <span className="font-display tracking-tight text-areia">Orbit</span>
      <span>16:36</span>
    </div>
  );
}

function PageDots() {
  const { state, dispatch } = useOrbit();
  const pages: { page: OrbitState["watchPage"]; title: string; active: string }[] = [
    { page: 0, title: "Órbita", active: "bg-white" },
    { page: 1, title: "Parque 2D", active: "bg-salvia" },
    { page: 3, title: "Interesse", active: "bg-cobre" },
    { page: 2, title: "Meu Cartão", active: "bg-areia" },
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

/** watchOS-style glanceable pages: Órbita, Parque summary, Interesse pile and the user's card. */
export function WatchScreen() {
  const { state, dispatch } = useOrbit();
  const { requestDevice } = useDevice();

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
    const room = findCityRoom(state.parkRoomId);
    const roomEmoji = room ? room.flag : state.parkRoomId ? "🌳" : "🌍";
    const roomName = room ? room.name : state.parkRoomId ? "Parque Central" : "Parque pelo mundo";
    const walking = room ? room.botCount : IN_PARK.length;
    return (
      <div className="relative flex h-full w-full flex-col justify-between bg-linear-to-b/srgb from-presenca/40 to-[#121921] px-4 pt-9 pb-9">
        <TopClock />
        <div className="mt-1 flex flex-col items-center text-center">
          <div className="lg-pill flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" aria-hidden="true">
            {roomEmoji}
          </div>
          <div className="mt-2 text-sm font-extrabold text-white">{roomName}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-salvia">
            <span className="h-1.5 w-1.5 rounded-full bg-salvia" />
            {walking} pessoas andando agora
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
          className="presenca-chip w-full rounded-full py-2.5 text-xs font-extrabold active:scale-95"
        >
          Entrar no Celular →
        </button>
        <PageDots />
      </div>
    );
  }

  if (state.watchPage === 3) {
    return (
      <div className="relative flex h-full w-full flex-col bg-linear-to-b/srgb from-cobre/25 to-[#121921] px-5 pt-8">
        <TopClock />
        <h2 className="text-center text-[11px] font-extrabold text-white">
          Interesse <span className="text-areia">· {INTEREST_TAP_COUNT} toques</span>
        </h2>
        <CardDeck
          compact
          items={INTEREST_FEED}
          getKey={(e) => e.profile.id}
          label="Interesse: quem passou pela sua órbita"
          itemLabel={interestEntryLabel}
          openLabel="Abrir no celular o perfil de"
          stageClassName="h-[166px]"
          className="mt-0.5"
          onOpen={(e) => {
            requestDevice("mobile");
            dispatch({ type: "setTab", tab: "interesse" });
            dispatch({ type: "openProfile", id: e.profile.id });
          }}
          renderCard={(e, { front }) => (
            <>
              <ProfileImage cfg={e.profile.avatar} photo={e.profile.photo} />
              {e.tapMinutesAgo !== undefined && <InterestStamp compact animate={front} />}
            </>
          )}
          renderCaption={(e) => <WatchInterestCaption entry={e} />}
        />
        <PageDots />
      </div>
    );
  }

  return (
    <PerfilRelogio>
      <TopClock />
      <PageDots />
    </PerfilRelogio>
  );
}

function WatchInterestCaption({ entry }: { entry: InterestEntry }) {
  const p = entry.profile;
  return (
    <>
      <p className="flex items-center justify-center gap-1 truncate text-[12px] font-bold text-white">
        <span className="truncate">
          {p.name}, {p.age}
        </span>
        {p.online && <span className="h-1.5 w-1.5 shrink-0 rounded-full presenca-ponto" aria-hidden="true" />}
      </p>
      <p className="truncate text-[10px] font-medium text-marfim-suave">
        {formatAgo(entry.minutesAgo)}
        {entry.opens > 1 && <span className="font-bold text-white"> · abriu {entry.opens}×</span>}
      </p>
    </>
  );
}
