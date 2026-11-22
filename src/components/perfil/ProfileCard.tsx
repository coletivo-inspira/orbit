import type { ReactNode } from "react";
import { SelosStatus } from "@/components/orbita/SelosStatus";
import { AppTile } from "@/components/ui/AppBadge";
import { RingedAvatar } from "@/components/ui/Avatar";
import { PresenceDot } from "@/components/ui/PresenceDot";
import { activeAppIds, EXTERNAL_APPS, INTENTIONS } from "@/lib/data/intentions";
import { labelOf, PRONOUNS, TOPICS } from "@/lib/data/profileOptions";
import { sharedTopics } from "@/lib/orbitaFilters";
import type { AppId, IntentionId, Profile, TopicId } from "@/lib/types";

/*
  Profile card system (brandbook v2 "Cartão de perfil", after ADPList mentor cards and Topmate pages):
  round avatar → name → one-line role (main intention) → metrics line → badges → one pill action.
*/

/** "180m · Online agora · no Parque": short facts separated by dots, like the mentor stats line. */
export function MetricLine({
  items,
  className = "",
}: {
  items: (ReactNode | false | null | undefined)[];
  className?: string;
}) {
  const shown = items.filter(Boolean);
  return (
    <p className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-marfim-suave ${className}`}>
      {shown.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && (
            <span aria-hidden="true" className="text-marfim-apagado">
              ·
            </span>
          )}
          {item}
        </span>
      ))}
    </p>
  );
}

export function OnlineMetric({ online }: { online: boolean }) {
  return online ? (
    <span className="inline-flex items-center gap-1 font-semibold text-salvia">
      <PresenceDot className="h-2 w-2" />
      Online agora
    </span>
  ) : (
    <span>Visto há pouco</span>
  );
}

export function IntentionPill({
  id,
  principal = false,
  className = "",
}: {
  id: IntentionId;
  principal?: boolean;
  className?: string;
}) {
  const it = INTENTIONS[id];
  if (!it) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${className}`}
      style={{ background: it.bg, color: it.text, border: `1px solid ${it.border}` }}
    >
      <span aria-hidden="true">{it.emoji}</span> {it.label}
      {principal && <span className="font-semibold opacity-90"> · principal</span>}
    </span>
  );
}

/** Presence badge for another app: round tile + name + what it does ("Presença" or the @ it leads to). */
export function AppSeal({ appId, handle, action }: { appId: AppId; handle?: string; action?: string }) {
  const app = EXTERNAL_APPS[appId];
  return (
    <>
      <AppTile appId={appId} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
      <span className="text-xs font-bold text-marfim">{app.name}</span>
      <span className={`text-xs ${handle ? "text-areia" : "text-salvia"}`}>
        {handle ? `${handle}${action ? ` · ${action}` : ""}` : "Presença"}
      </span>
    </>
  );
}

export const appSealClass = "lg-glass-tint inline-flex min-h-9 items-center gap-1.5 rounded-full py-1 pr-3 pl-1.5";

/** Lista card: the whole card opens the profile; the pill at the bottom only shows the action. */
export function ProfileCard({
  profile: p,
  userTopics,
  compact,
  onOpen,
}: {
  profile: Profile;
  userTopics: TopicId[];
  compact: boolean;
  onOpen: () => void;
}) {
  const intention = INTENTIONS[p.primaryIntention];
  const apps = activeAppIds(p.apps);
  const shared = sharedTopics(userTopics, p.topics);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="lg-glass-tint group flex w-full flex-col items-center gap-2 rounded-cartao p-3.5 text-center"
    >
      <RingedAvatar cfg={p.avatar} photo={p.photo} color={intention.color} online={p.online} size={compact ? 68 : 76}>
        <SelosStatus profile={p} variant="orbe" />
      </RingedAvatar>
      <div className="w-full min-w-0">
        <div className="truncate font-display text-base font-bold text-marfim">
          {p.name}, {p.age}
        </div>
        <div className="truncate text-xs text-marfim-apagado">{PRONOUNS[p.pronouns]}</div>
      </div>
      <IntentionPill id={p.primaryIntention} className="max-w-full" />
      <MetricLine
        className="justify-center"
        items={[
          <span key="dist">📍 {p.dist}</span>,
          p.online && (
            <span key="online" className="inline-flex items-center gap-1 text-salvia">
              <PresenceDot className="h-2 w-2" />
              online
            </span>
          ),
          p.inPark && (
            <span key="parque" className="font-semibold text-salvia">
              no Parque
            </span>
          ),
          p.visitingFrom && <span key="visita">✈️ de {p.visitingFrom}</span>,
        ]}
      />
      {!compact && <p className="line-clamp-2 text-xs leading-relaxed text-marfim-suave">{p.bio}</p>}
      {shared.length > 0 && (
        <p className="text-xs leading-snug text-areia">
          <span className="font-bold">✦ Em comum:</span> {shared.map((id) => labelOf(TOPICS, id)).join(", ")}
        </p>
      )}
      <div className="mt-auto flex w-full items-center justify-between gap-2 border-t border-marfim/10 pt-2.5">
        <span className="flex items-center -space-x-1">
          {apps.slice(0, 4).map((id) => (
            <AppTile key={id} appId={id} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
          ))}
          {apps.length > 4 && <span className="pl-2 text-xs text-marfim-suave">+{apps.length - 4}</span>}
          <span className="sr-only">Selos: {apps.map((id) => EXTERNAL_APPS[id].name).join(", ")}</span>
        </span>
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-areia/50 text-areia transition group-hover:bg-areia group-hover:text-tinta"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </button>
  );
}
