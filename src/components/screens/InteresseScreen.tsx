"use client";

import { useId, type ReactNode } from "react";
import { TapIcon } from "@/components/interesse/TapIcon";
import { CardDeck } from "@/components/ui/CardDeck";
import { ProfileImage } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toasts";
import { formatAgo, PROFILE_VIEWS, RECEIVED_TAPS, type InterestEvent } from "@/lib/interesse";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";

/** Who viewed the user's profile and who tapped them, as two card piles on one screen. Simulated data. */
export function InteresseScreen() {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const showToast = useToast();
  const isMobile = device === "mobile";

  const open = (event: InterestEvent) => dispatch({ type: "openProfile", id: event.profile.id });
  const tapBack = (event: InterestEvent) => {
    dispatch({ type: "tapProfile", id: event.profile.id });
    showToast(`Você tocou de volta em ${event.profile.name}. (simulação)`, "success");
  };

  const stage = isMobile
    ? "h-[clamp(150px,calc((100cqh-290px)/2),280px)]"
    : "h-[clamp(220px,calc(100cqh-210px),460px)]";

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className={`lg-header z-20 shrink-0 ${isMobile ? "px-4 pt-2 pb-2" : "px-5 pt-4 pb-3"}`}>
        <h1
          tabIndex={-1}
          data-focus-fallback
          className={`${isMobile ? "text-lg" : "text-xl"} font-bold tracking-tight text-white`}
        >
          Interesse
        </h1>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
          Deslize as pilhas para ver quem passou pela sua órbita. Dados simulados; distâncias aproximadas.
        </p>
      </div>

      <div
        style={{ containerType: "size" }}
        className={`orbit-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto ${isMobile ? "px-3 pt-3 pb-24" : "p-5"}`}
      >
        <div className={isMobile ? "flex flex-col gap-5" : "grid grid-cols-2 gap-6"}>
          <InterestPile
            title="Visualizações"
            hint="Quem abriu seu perfil"
            events={PROFILE_VIEWS}
            stageClassName={stage}
            onOpen={open}
          />
          <InterestPile
            title="Toques"
            hint="Quem te deu um toque"
            events={RECEIVED_TAPS}
            stageClassName={stage}
            onOpen={open}
            renderActions={(event) => (
              <TapBackButton
                name={event.profile.name}
                tapped={state.sentTaps.includes(event.profile.id)}
                onTapBack={() => tapBack(event)}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}

function InterestPile({
  title,
  hint,
  events,
  stageClassName,
  onOpen,
  renderActions,
}: {
  title: string;
  hint: string;
  events: InterestEvent[];
  stageClassName: string;
  onOpen: (event: InterestEvent) => void;
  renderActions?: (event: InterestEvent) => ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col">
      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <h2 id={headingId} className="text-base font-bold text-white">
          {title} <span className="text-areia tabular-nums">{events.length}</span>
        </h2>
        <span className="truncate text-[11px] text-slate-300">{hint}</span>
      </div>
      <CardDeck
        items={events}
        getKey={(e) => e.profile.id}
        label={`${title}: ${hint.toLowerCase()}`}
        itemLabel={(e) => `${e.profile.name}, ${e.profile.age}`}
        stageClassName={stageClassName}
        onOpen={onOpen}
        renderCard={(e) => <ProfileImage cfg={e.profile.avatar} photo={e.profile.photo} />}
        renderActions={renderActions}
        renderCaption={(e) => <InterestCaption event={e} />}
      />
    </section>
  );
}

function InterestCaption({ event }: { event: InterestEvent }) {
  const p = event.profile;
  return (
    <>
      <p className="flex items-center justify-center gap-1.5 truncate text-sm font-bold text-white">
        <span className="truncate">
          {p.name}, {p.age}
        </span>
        {p.online && (
          <>
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
            <span className="sr-only">, online</span>
          </>
        )}
      </p>
      <p className="text-[12px] font-medium text-slate-300">
        {formatAgo(event.minutesAgo)} · {p.dist}
      </p>
    </>
  );
}

function TapBackButton({ name, tapped, onTapBack }: { name: string; tapped: boolean; onTapBack: () => void }) {
  return (
    <button
      type="button"
      onClick={() => !tapped && onTapBack()}
      aria-disabled={tapped}
      aria-label={tapped ? `Você já tocou de volta em ${name}` : `Tocar de volta em ${name}`}
      title={tapped ? "Tocado de volta" : "Tocar de volta"}
      className={`absolute top-[8%] right-[8%] z-10 flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md aria-disabled:cursor-default ${
        tapped ? "border-areia bg-areia text-tinta" : "border-white/25 bg-tinta/70 text-white hover:text-areia"
      }`}
    >
      <TapIcon className="h-5 w-5" filled={tapped} />
    </button>
  );
}
