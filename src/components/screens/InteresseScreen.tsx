"use client";

import { TapIcon } from "@/components/interesse/TapIcon";
import { CardDeck } from "@/components/ui/CardDeck";
import { ProfileImage } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toasts";
import { formatAgo, INTEREST_FEED, type InterestEntry } from "@/lib/interesse";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";

const TAP_COUNT = INTEREST_FEED.filter((e) => e.tapMinutesAgo !== undefined).length;

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
        <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
          <span className="font-semibold text-white">
            {INTEREST_FEED.length} pessoas · <span className="text-areia">{TAP_COUNT} toques</span>
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
          itemLabel={entryLabel}
          stageClassName={
            isMobile ? "h-[clamp(220px,calc(100cqh-190px),400px)]" : "h-[clamp(260px,calc(100cqh-150px),520px)]"
          }
          onOpen={(e) => dispatch({ type: "openProfile", id: e.profile.id })}
          renderCard={(e, { front }) => (
            <>
              <ProfileImage cfg={e.profile.avatar} photo={e.profile.photo} />
              {e.tapMinutesAgo !== undefined && <InterestStamp animate={front} />}
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

function entryLabel(e: InterestEntry): string {
  const parts = [`${e.profile.name}, ${e.profile.age}`];
  if (e.tapMinutesAgo !== undefined) parts.push("te deu um toque");
  if (e.opens > 1) parts.push(`abriu seu perfil ${e.opens} vezes`);
  return parts.join(", ");
}

/** Rubber stamp over a card whose person tapped the user. */
function InterestStamp({ animate }: { animate: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute top-[11%] left-[9%] flex rotate-[-11deg] items-center gap-1 rounded-md border-[3px] border-areia bg-tinta/60 px-2.5 py-1 text-[15px] font-black tracking-[0.14em] text-areia uppercase shadow-[0_0_0_2px_rgba(28,38,49,0.55),inset_0_0_0_1.5px_rgba(222,201,168,0.45)] backdrop-blur-[2px] ${
        animate ? "carimbo-entra" : ""
      }`}
    >
      <TapIcon className="h-[18px] w-[18px]" filled />
      Interessado
    </span>
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
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
            <span className="sr-only">, online</span>
          </>
        )}
      </p>
      <p className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-slate-300">
        <span>
          {formatAgo(entry.minutesAgo)} · {p.dist}
        </span>
        {entry.opens > 1 && (
          <span className="rounded-full border border-white/15 bg-white/[0.07] px-1.5 text-[11px] font-semibold text-white">
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
