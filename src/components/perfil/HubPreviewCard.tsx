import { AppTile } from "@/components/ui/AppBadge";
import { RingedAvatar } from "@/components/ui/Avatar";
import { activeAppIds, EXTERNAL_APPS, INTENTIONS } from "@/lib/data/intentions";
import { profileSlug } from "@/lib/data/user";
import type { UserProfile } from "@/lib/types";

/** The shareable "Cartão Orbit": a live preview of what others see. */
export function HubPreviewCard({ user: u }: { user: UserProfile }) {
  const primary = INTENTIONS[u.primaryIntention] ?? INTENTIONS.troca;
  const apps = activeAppIds(u.apps);
  return (
    <div className="lg-panel lg-sheen relative overflow-hidden rounded-[28px] p-5">
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-25 blur-3xl"
        style={{ background: primary.color }}
      />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-cyan-300 opacity-15 blur-3xl" />

      <div className="relative mb-4 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold backdrop-blur-md ${
            u.isPublic
              ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-200"
              : "border-amber-300/35 bg-amber-400/15 text-amber-200"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${u.isPublic ? "bg-emerald-300" : "bg-amber-300"}`} />
          {u.isPublic ? "Público na Órbita" : "Modo Privado"}
        </span>
        <span className="text-[11px] font-semibold text-slate-300/85">orbit.app/{profileSlug(u.handle)}</span>
      </div>

      <div className="relative flex items-center gap-3.5">
        <RingedAvatar cfg={u.avatar} color={primary.color} size={64} />
        <div className="min-w-0">
          <div className="truncate text-base font-extrabold text-white">
            {u.name}, {u.age}
          </div>
          <div className="text-xs font-semibold text-violet-200">{u.handle}</div>
          <div className="mt-0.5 text-[11px] text-slate-300/80">📍 {u.city}</div>
        </div>
      </div>

      <p className="mt-3.5 text-xs leading-relaxed break-words text-slate-200/90">
        {u.bio || "Adicione uma bio para se apresentar na Órbita."}
      </p>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {u.intentions.map((id) => {
          const it = INTENTIONS[id];
          if (!it) return null;
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur-md"
              style={{ background: it.bg, color: it.color, border: `1px solid ${it.border}` }}
            >
              {it.emoji} {it.label}
              {u.primaryIntention === id ? " ★" : ""}
            </span>
          );
        })}
      </div>

      <div className="mt-4 border-t border-white/[0.12] pt-3.5">
        <div className="mb-2 text-[10px] font-bold tracking-wider text-slate-300/75 uppercase">
          Meus aplicativos ativos
        </div>
        {apps.length ? (
          <div className="flex flex-wrap gap-1.5">
            {apps.map((id) => {
              const handle = u.apps[id].handle.trim();
              return (
                <div
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.15] bg-white/[0.08] px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                >
                  <AppTile appId={id} className="h-4 w-4 rounded-md" iconClassName="h-2.5 w-2.5" />
                  <span className="text-[11px] font-bold text-white">{EXTERNAL_APPS[id].name}</span>
                  <span className={`text-[10px] ${handle ? "text-violet-200" : "text-emerald-200"}`}>
                    {handle || "Ativo"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">Nenhum selo ativado no momento.</p>
        )}
      </div>
    </div>
  );
}
