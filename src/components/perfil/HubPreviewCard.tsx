import type { Ref } from "react";
import { AppTile } from "@/components/ui/AppBadge";
import { RingedAvatar } from "@/components/ui/Avatar";
import { activeAppIds, EXTERNAL_APPS, INTENTIONS } from "@/lib/data/intentions";
import type { UserProfile } from "@/lib/types";

/** The "Cartão Orbit": a live, local preview of what others would see once real profiles exist. */
export function HubPreviewCard({
  user: u,
  headingRef,
  headingId,
}: {
  user: UserProfile;
  headingRef?: Ref<HTMLHeadingElement>;
  headingId?: string;
}) {
  const primary = INTENTIONS[u.primaryIntention] ?? INTENTIONS.troca;
  const apps = activeAppIds(u.apps);
  return (
    <section aria-labelledby={headingId} className="lg-panel relative overflow-hidden rounded-[28px] p-5">
      <div className="relative mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="font-sans text-[11px] font-bold tracking-wider text-slate-300 uppercase"
        >
          Prévia do cartão · só neste navegador
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
            u.isPublic ? "border-salvia/60 bg-salvia text-presenca" : "border-amber-300/50 bg-amber-100 text-amber-900"
          }`}
        >
          {u.isPublic ? "🌐 Público (simulado)" : "🔒 Privado (simulado)"}
        </span>
      </div>

      <div className="relative flex items-center gap-3.5">
        <RingedAvatar cfg={u.avatar} color={primary.color} size={64} />
        <div className="min-w-0">
          <div className="truncate text-base font-extrabold text-white">
            {u.name}, {u.age}
          </div>
          <div className="text-xs font-semibold text-areia">{u.handle}</div>
          <div className="mt-0.5 text-[11px] text-slate-300">📍 {u.city}</div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-300">
        Anel do avatar: <strong className="text-white">{primary.label}</strong> (intenção principal)
      </p>

      <p className="mt-3 text-sm leading-relaxed break-words text-white">
        {u.bio || "Adicione uma bio para se apresentar na Órbita."}
      </p>

      <ul className="mt-3.5 flex flex-wrap gap-1.5" aria-label="Intenções">
        {u.intentions.map((id) => {
          const it = INTENTIONS[id];
          if (!it) return null;
          return (
            <li
              key={id}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ background: it.bg, color: it.color, border: `1px solid ${it.border}` }}
            >
              {it.emoji} {it.label}
              {u.primaryIntention === id ? " ★ principal" : ""}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-white/[0.12] pt-3.5">
        <h3 className="mb-2 font-sans text-[11px] font-bold tracking-wider text-slate-300 uppercase">Selos ativos</h3>
        {apps.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {apps.map((id) => {
              const handle = u.apps[id].handle.trim();
              return (
                <li
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.15] bg-tinta px-2.5 py-1.5"
                >
                  <AppTile appId={id} className="h-4 w-4 rounded-md" iconClassName="h-2.5 w-2.5" />
                  <span className="text-[11px] font-bold text-white">{EXTERNAL_APPS[id].name}</span>
                  <span className={`text-[11px] ${handle ? "text-areia" : "text-salvia"}`}>
                    {handle ? `${handle} · leva ao app` : "Presença"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[11px] text-slate-300">Nenhum selo ativado no momento.</p>
        )}
      </div>
    </section>
  );
}
