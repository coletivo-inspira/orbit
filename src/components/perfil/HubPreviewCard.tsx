import type { Ref } from "react";
import { BarrasDesejos } from "@/components/desejos/BarrasDesejos";
import { AppSeal, appSealClass, IntentionPill } from "@/components/perfil/ProfileCard";
import { SectionLabel } from "@/components/ui/Sheet";
import { MolduraAvatar } from "@/components/molduras/MolduraAvatar";
import { Avatar, RingedAvatar } from "@/components/ui/Avatar";
import type { MolduraId } from "@/lib/molduras/catalogo";
import { activeAppIds, INTENTIONS } from "@/lib/data/intentions";
import { labelOf, TOPICS } from "@/lib/data/profileOptions";
import type { DesejoPublico } from "@/lib/desejos/perfis";
import type { UserProfile } from "@/lib/types";

/** The "Cartão Orbit": a live, local preview of what others would see once real profiles exist. */
export function HubPreviewCard({
  user: u,
  headingRef,
  headingId,
  desejos = [],
  moldura,
}: {
  user: UserProfile;
  /** Collectible frame around the avatar; the plain intention ring when absent. */
  moldura?: MolduraId;
  /** Desires the person opted to show; none by default. */
  desejos?: DesejoPublico[];
  headingRef?: Ref<HTMLHeadingElement>;
  headingId?: string;
}) {
  const primary = INTENTIONS[u.primaryIntention] ?? INTENTIONS.troca;
  const apps = activeAppIds(u.apps);
  return (
    <section aria-labelledby={headingId} className="lg-glass-tint relative overflow-hidden rounded-cartao p-5">
      <div className="relative mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="font-display text-xs font-bold tracking-wider text-marfim-suave uppercase"
        >
          Prévia do cartão · só neste navegador
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
            u.isPublic ? "border-salvia/60 bg-salvia text-presenca" : "border-areia/50 bg-areia text-tinta"
          }`}
        >
          {u.isPublic ? "🌐 Público (simulado)" : "🔒 Privado (simulado)"}
        </span>
      </div>

      <div className="relative flex items-center gap-3.5">
        {moldura ? (
          <MolduraAvatar molduraId={moldura} cor={primary.color} size={72}>
            <Avatar cfg={u.avatar} />
          </MolduraAvatar>
        ) : (
          <RingedAvatar cfg={u.avatar} color={primary.color} size={72} />
        )}
        <div className="min-w-0">
          <div className="truncate font-display text-lg font-extrabold text-white">
            {u.name}, {u.age}
          </div>
          <div className="text-xs font-semibold text-areia">{u.handle}</div>
          <div className="mt-0.5 text-xs text-marfim-suave">📍 {u.city}</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-marfim-suave">
        Anel do avatar: <strong className="text-white">{primary.label}</strong> (intenção principal)
      </p>

      <p className="mt-3 text-sm leading-relaxed break-words text-white">
        {u.bio || "Adicione uma bio para se apresentar na Órbita."}
      </p>

      <ul className="mt-3.5 flex flex-wrap gap-1.5" aria-label="Intenções">
        {u.intentions.map((id) => (
          <li key={id}>
            <IntentionPill id={id} principal={u.primaryIntention === id} />
          </li>
        ))}
      </ul>

      {u.topics.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1" aria-label="Assuntos">
          {u.topics.map((id) => (
            <li key={id} className="lg-pill rounded-full px-2.5 py-0.5 text-xs font-semibold text-marfim-suave">
              {labelOf(TOPICS, id)}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-marfim/10 pt-3.5">
        <SectionLabel className="mb-2">Selos ativos</SectionLabel>
        {apps.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {apps.map((id) => {
              const handle = u.apps[id].handle.trim();
              return (
                <li key={id} className={appSealClass}>
                  <AppSeal appId={id} handle={handle} action="leva ao app" />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-marfim-suave">Nenhum selo ativado no momento.</p>
        )}
      </div>

      {desejos.length > 0 && (
        <div className="mt-4 border-t border-marfim/10 pt-3.5">
          <SectionLabel className="mb-2">Desejos</SectionLabel>
          <BarrasDesejos desejos={desejos} />
        </div>
      )}
    </section>
  );
}
