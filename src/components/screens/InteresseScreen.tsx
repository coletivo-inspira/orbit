"use client";

import { InterestStamp } from "@/components/interesse/InterestStamp";
import { TapIcon } from "@/components/interesse/TapIcon";
import { SelosStatus } from "@/components/orbita/SelosStatus";
import { CardDeck } from "@/components/ui/CardDeck";
import { ProfileImage } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toasts";
import { INTENTIONS } from "@/lib/data/intentions";
import {
  formatAgo,
  INTEREST_FEED,
  INTEREST_TAP_COUNT,
  interestEntryLabel,
  profileStatusLabels,
  type InterestEntry,
} from "@/lib/interesse";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";

/** Everyone who viewed or tapped the user, one card per person in a single pile. Simulated data. */
export function InteresseScreen() {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const showToast = useToast();
  const isMobile = device === "mobile";

  const tapBack = (entry: InterestEntry) => {
    dispatch({ type: "tapProfile", id: entry.profile.id });
    showToast(`Você tocou de volta em ${entry.profile.name}. (simulação)`, "success");
  };

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
        <p className="mt-0.5 text-xs leading-snug text-marfim-suave">
          <span className="font-semibold text-white">
            {INTEREST_FEED.length} pessoas · <span className="text-areia">{INTEREST_TAP_COUNT} toques</span>
          </span>{" "}
          — quem abriu seu perfil ou te deu um toque, do mais recente. Dados simulados; distâncias aproximadas.
        </p>
      </div>

      <div
        style={{ containerType: "size" }}
        className={`orbit-scroll flex min-h-0 flex-1 flex-col justify-center overflow-x-hidden overflow-y-auto ${
          isMobile ? "px-3 pt-4 pb-24" : "p-6"
        }`}
      >
        <CardDeck
          items={INTEREST_FEED}
          getKey={(e) => e.profile.id}
          label="Quem passou pela sua órbita"
          itemLabel={(e) =>
            [interestEntryLabel(e), ...profileStatusLabels(e.profile, state.conversations[e.profile.id])].join(", ")
          }
          stageClassName={
            isMobile ? "h-[clamp(220px,calc(100cqh-190px),400px)]" : "h-[clamp(260px,calc(100cqh-150px),520px)]"
          }
          onOpen={(e) => dispatch({ type: "openProfile", id: e.profile.id })}
          tint={(e) => ({ cor: INTENTIONS[e.profile.primaryIntention].color, online: e.profile.online })}
          renderCard={(e, { front }) => (
            <>
              <ProfileImage cfg={e.profile.avatar} photo={e.profile.photo} />
              {e.tapMinutesAgo !== undefined && <InterestStamp animate={front} />}
              <SelosStatus profile={e.profile} conversation={state.conversations[e.profile.id]} variant="cartao" />
            </>
          )}
          renderActions={(e) =>
            e.tapMinutesAgo !== undefined && (
              <TapBackButton
                name={e.profile.name}
                tapped={state.sentTaps.includes(e.profile.id)}
                onTapBack={() => tapBack(e)}
              />
            )
          }
          renderCaption={(e) => <InterestCaption entry={e} />}
        />
      </div>
    </div>
  );
}

function InterestCaption({ entry }: { entry: InterestEntry }) {
  const p = entry.profile;
  return (
    <>
      <p className="flex items-center justify-center gap-1.5 truncate text-sm font-bold text-white">
        <span className="truncate">
          {p.name}, {p.age}
        </span>
        {p.online && (
          <>
            <span className="h-2 w-2 shrink-0 rounded-full presenca-ponto" aria-hidden="true" />
            <span className="sr-only">, online</span>
          </>
        )}
      </p>
      <p className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-marfim-suave">
        <span>
          {formatAgo(entry.minutesAgo)} · {p.dist}
        </span>
        {entry.opens > 1 && (
          <span className="rounded-full border border-white/15 bg-white/[0.07] px-1.5 text-xs font-semibold text-white">
            abriu {entry.opens}×
          </span>
        )}
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
      className={`absolute right-[8%] bottom-[8%] z-10 flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold backdrop-blur-md aria-disabled:cursor-default ${
        tapped ? "border-areia bg-areia text-tinta" : "border-white/25 bg-tinta/75 text-white hover:text-areia"
      }`}
    >
      <TapIcon className="h-5 w-5" filled={tapped} />
      {tapped ? "Tocado" : "Tocar de volta"}
    </button>
  );
}
