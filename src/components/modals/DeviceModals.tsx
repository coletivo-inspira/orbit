"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { ArticleBody, ArticleProvenance, CommentList } from "@/components/comunidade/ArticleParts";
import { PostTrustBadge } from "@/components/comunidade/PostTrust";
import { VoteControl } from "@/components/comunidade/VoteControl";
import { BarrasDesejos } from "@/components/desejos/BarrasDesejos";
import { DesejoSheet } from "@/components/desejos/DesejoSheet";
import { ComposerSheet } from "@/components/modals/ComposerSheet";
import { OrbitaFiltersSheet } from "@/components/orbita/OrbitaFiltersSheet";
import { AppTile } from "@/components/ui/AppBadge";
import { RingedAvatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toasts";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { copyText } from "@/lib/clipboard";
import { desejosPublicosDe } from "@/lib/desejos/perfis";
import { activeAppIds, COMMUNITY_CATEGORIES, EXTERNAL_APPS, INTENTIONS } from "@/lib/data/intentions";
import {
  CONDOM_USE,
  DEMO_MONTH,
  formatMonth,
  GENDERS,
  HIV_STATUS,
  labelOf,
  LOOKING_FOR,
  MEET_PLACES,
  ORIENTATIONS,
  POSITIONS,
  PRONOUNS,
  relationshipLabel,
  SPORTS,
  TOPICS,
  TRIBES,
} from "@/lib/data/profileOptions";
import { getPost } from "@/lib/data/posts";
import { SIMULATED_PROFILES } from "@/lib/data/profiles";
import { monthsBetween, sharedTopics } from "@/lib/orbitaFilters";
import { articleRoute, publicUrl } from "@/lib/publicUrl";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import { COMMENT_MAX_LENGTH } from "@/lib/state/reducer";
import type { AppId, CommunityPost, Profile } from "@/lib/types";

/** Profile / article / composer sheets rendered inside the current device screen. */
export function DeviceModals() {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const close = () => dispatch({ type: "closeModals" });
  const showFilters = state.orbitaFiltersOpen && device !== "watch";
  const composerKind = device === "watch" ? null : state.composerKind;
  const desejo = device === "watch" ? null : state.desejoAberto;
  const open = Boolean(state.selectedProfileId || state.selectedArticleId || composerKind || showFilters || desejo);

  const profile = state.selectedProfileId
    ? SIMULATED_PROFILES.find((p) => p.id === state.selectedProfileId)
    : undefined;
  const post = state.selectedArticleId ? state.posts.find((p) => p.id === state.selectedArticleId) : undefined;

  return (
    <div className={`absolute inset-0 z-40 ${open ? "" : "pointer-events-none"}`}>
      {profile && <ProfileSheet key={profile.id} profile={profile} onClose={close} />}
      {post && <ArticleSheet key={post.id} post={post} onClose={close} />}
      {showFilters && <OrbitaFiltersSheet onClose={close} />}
      {composerKind && <ComposerSheet initialKind={composerKind} onClose={close} />}
      {desejo && <DesejoSheet key={desejo} id={desejo} onClose={close} />}
    </div>
  );
}

function CloseButton({ onClose, className }: { onClose: () => void; className: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Fechar"
      className={`lg-pill flex items-center justify-center rounded-full text-white ${className}`}
    >
      ✕
    </button>
  );
}

function ProfileSheet({ profile: p, onClose }: { profile: Profile; onClose: () => void }) {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const showToast = useToast();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const onKeyDown = useDialogFocus(dialogRef, titleRef, onClose);
  const primary = INTENTIONS[p.primaryIntention] ?? INTENTIONS.troca;
  const apps = activeAppIds(p.apps);
  const shared = sharedTopics(state.user.topics, p.topics);
  const desejos = desejosPublicosDe(p.id);

  const wave = () => {
    onClose();
    showToast(`Você acenou para ${p.name}! 👋 (simulação)`, "success");
  };

  const onBadge = async (appId: AppId) => {
    const app = EXTERNAL_APPS[appId];
    const handle = p.apps[appId]?.handle ?? "";
    if (!handle) {
      showToast(`${p.name} declarou presença no ${app.name}.`, "info");
      return;
    }
    const ok = await copyText(handle);
    showToast(ok ? `${handle} (${app.name}) copiado!` : handle, ok ? "success" : "info");
  };

  if (device === "watch") {
    return (
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="lg-sheet absolute inset-0 z-50 flex flex-col justify-between p-4"
      >
        <div className="flex items-center justify-between">
          <CloseButton onClose={onClose} className="h-6 w-6 text-xs" />
          <span className="text-[10px] font-bold text-slate-300">📍 {p.dist}</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <RingedAvatar cfg={p.avatar} photo={p.photo} color={primary.color} size={56} />
          <h2 ref={titleRef} id={titleId} tabIndex={-1} className="mt-1.5 font-sans text-sm font-extrabold text-white">
            {p.name}, {p.age}
          </h2>
          <span
            className="mt-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold"
            style={{ background: primary.bg, color: primary.text }}
          >
            {primary.emoji} {primary.label}
          </span>
          <div className="mt-2.5 flex items-center justify-center gap-1.5">
            {apps.map((id) => (
              <AppTile key={id} appId={id} className="h-6 w-6 rounded-lg" iconClassName="h-3.5 w-3.5" />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={wave}
          className="lg-btn-primary w-full rounded-full py-2.5 text-xs font-extrabold active:scale-95"
        >
          Acenar 👋
        </button>
      </div>
    );
  }

  const isMobile = device === "mobile";
  return (
    <div
      onClick={onClose}
      className={`absolute inset-0 z-50 flex bg-tinta/75 ${isMobile ? "items-end p-2.5 pb-4" : "items-center justify-center p-6"}`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`lg-sheet relative flex w-full flex-col overflow-hidden outline-none ${isMobile ? "max-h-[94%] rounded-[32px]" : "max-h-[92%] max-w-[460px] rounded-[30px]"}`}
      >
        <CloseButton onClose={onClose} className="absolute top-4 right-4 z-10 h-8 w-8 text-sm" />
        <div className="orbit-scroll flex-1 overflow-y-auto p-5">
          <div className="flex items-center gap-3.5 pr-10">
            <RingedAvatar cfg={p.avatar} photo={p.photo} color={primary.color} size={isMobile ? 76 : 88}>
              {p.online && (
                <span className="absolute right-1 bottom-1 h-3.5 w-3.5 rounded-full border-2 border-tinta bg-emerald-400" />
              )}
            </RingedAvatar>
            <div className="min-w-0">
              <h2
                ref={titleRef}
                id={titleId}
                tabIndex={-1}
                className="font-sans text-lg leading-tight font-extrabold text-white"
              >
                {p.name}, {p.age}
              </h2>
              <p className="text-xs text-slate-300">
                {PRONOUNS[p.pronouns]} · {p.city}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
                <span>📍 {p.dist} (aprox.)</span>
                <span aria-hidden="true">·</span>
                <span className={p.online ? "font-semibold text-salvia" : "text-slate-300"}>
                  {p.online ? "Online agora" : "Visto há pouco"}
                </span>
              </div>
            </div>
          </div>
          {p.photo && (
            <p className="mt-2 text-[10px] leading-snug text-slate-300">
              Foto ilustrativa gerada por IA — perfil simulado
            </p>
          )}

          <p className="mt-3 text-sm leading-relaxed text-white">{p.bio}</p>

          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Intenções">
            {p.intentions.map((id) => {
              const it = INTENTIONS[id];
              return (
                <li
                  key={id}
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: it.bg, color: it.text, border: `1px solid ${it.border}` }}
                >
                  {it.emoji} {it.label}
                  {id === p.primaryIntention && " · principal"}
                </li>
              );
            })}
          </ul>

          {shared.length > 0 && (
            <p className="mt-3 rounded-2xl border border-areia/40 bg-areia/10 px-3 py-2 text-xs text-areia">
              <span className="font-bold">✦ Em comum:</span> {shared.map((id) => labelOf(TOPICS, id)).join(", ")}
            </p>
          )}

          <SheetSection title="Sobre">
            <FactList
              facts={[
                ["Gênero", labelOf(GENDERS, p.gender)],
                ["Orientação", labelOf(ORIENTATIONS, p.orientation)],
                ["Altura", p.heightCm && `${p.heightCm} cm`],
                ["Peso", p.weightKg && `${p.weightKg} kg`],
                ["Relacionamento", p.relationship && relationshipLabel(p.relationship, p.pronouns)],
                ["Tribos", p.tribes.length ? p.tribes.map((id) => labelOf(TRIBES, id)).join(", ") : "Sem tribo"],
                ["Esportes", p.sports.map((id) => labelOf(SPORTS, id)).join(", ")],
              ]}
            />
          </SheetSection>

          <SheetSection title="Busca">
            <FactList
              facts={[
                ["Procura", p.lookingFor.map((id) => labelOf(LOOKING_FOR, id)).join(", ")],
                ["Posição", p.position && labelOf(POSITIONS, p.position)],
                ["Fotos NSFW", p.acceptsNsfw === undefined ? undefined : p.acceptsNsfw ? "Aceita" : "Não aceita"],
              ]}
            />
          </SheetSection>

          <SheetSection title="Encontro">
            <FactList facts={[["Prefere", p.meetAt.map((id) => labelOf(MEET_PLACES, id)).join(", ")]]} />
          </SheetSection>

          <SheetSection title="Saúde sexual">
            <p className="mb-2 text-[11px] leading-snug text-slate-300">
              Autodeclarado e opcional. Dados de saúde e sexualidade são sensíveis (LGPD): só aparecem quando a pessoa
              escolhe contar.
            </p>
            <FactList
              empty="Não informado."
              facts={[
                ["PrEP", p.health.prep === undefined ? undefined : p.health.prep ? "Usa" : "Não usa"],
                ["Preservativo", p.health.condom && labelOf(CONDOM_USE, p.health.condom)],
                ["Última testagem", p.health.lastTest && testLabel(p.health.lastTest)],
                ["Status", p.health.status && HIV_STATUS[p.health.status]],
              ]}
            />
          </SheetSection>

          <SheetSection title="Assuntos">
            <ul className="flex flex-wrap gap-1.5" aria-label="Assuntos para trocar ideia">
              {p.topics.map((id) => {
                const isShared = shared.includes(id);
                return (
                  <li
                    key={id}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isShared ? "border-areia/60 bg-areia/15 text-areia" : "border-white/[0.14] bg-white/[0.06] text-slate-300"}`}
                  >
                    {isShared && <span aria-hidden="true">✦ </span>}
                    {labelOf(TOPICS, id)}
                    {isShared && <span className="sr-only"> (em comum)</span>}
                  </li>
                );
              })}
            </ul>
          </SheetSection>

          {desejos.length > 0 && (
            <SheetSection title="Desejos">
              <p className="mb-2 text-[11px] leading-snug text-slate-300">
                {p.name} escolheu mostrar estes temas do quiz Desejos. São curiosidades de um dia, não rótulos.
              </p>
              <BarrasDesejos desejos={desejos} />
            </SheetSection>
          )}

          <SheetSection title="Presença em outros aplicativos">
            <p className="mb-2 text-[11px] text-slate-300">
              Autodeclarada. “Presença” indica conta ativa; um @ pode ser copiado para abrir no app.
            </p>
            <div className="flex flex-wrap gap-2">
              {apps.map((id) => {
                const handle = p.apps[id]?.handle ?? "";
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onBadge(id)}
                    className="lg-pill inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-left"
                  >
                    <AppTile appId={id} className="h-5 w-5 rounded-md" />
                    <span className="text-[11px] font-bold text-white">{EXTERNAL_APPS[id].name}</span>
                    <span className={`text-[11px] ${handle ? "text-areia" : "text-salvia"}`}>
                      {handle ? `${handle} · copiar` : "Presença"}
                    </span>
                  </button>
                );
              })}
            </div>
          </SheetSection>
        </div>

        <div
          className={`grid shrink-0 gap-2.5 border-t border-white/[0.12] bg-tinta px-5 py-3.5 ${p.inPark ? "grid-cols-2" : "grid-cols-1"}`}
        >
          <button
            type="button"
            onClick={wave}
            className="lg-btn-primary rounded-full px-4 py-2.5 text-xs font-extrabold active:scale-95"
          >
            Mandar um oi 👋
          </button>
          {p.inPark && (
            <button
              type="button"
              onClick={() => dispatch({ type: "setTab", tab: "parque" })}
              className="lg-pill rounded-full px-4 py-2.5 text-xs font-extrabold text-white active:scale-95"
            >
              🌳 Ir pro Parque
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function testLabel(ym: string): string {
  const months = monthsBetween(ym, DEMO_MONTH);
  const ago = months <= 0 ? "este mês" : months === 1 ? "há 1 mês" : `há ${months} meses`;
  return `${formatMonth(ym)} (${ago})`;
}

function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 border-t border-white/[0.12] pt-3.5">
      <h3 className="mb-2 font-sans text-[11px] font-bold tracking-wider text-slate-300 uppercase">{title}</h3>
      {children}
    </section>
  );
}

/** Label/value pairs; blank optional fields are skipped instead of shown as empty. */
function FactList({ facts, empty }: { facts: [string, string | number | undefined | 0][]; empty?: string }) {
  const filled = facts.filter((f): f is [string, string] => Boolean(f[1]));
  if (!filled.length) return empty ? <p className="text-xs text-slate-300">{empty}</p> : null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
      {filled.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-slate-300">{label}</dt>
          <dd className="font-semibold text-white">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ArticleSheet({ post, onClose }: { post: CommunityPost; onClose: () => void }) {
  const { dispatch } = useOrbit();
  const { device } = useDevice();
  const showToast = useToast();
  const [comment, setComment] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const commentsId = useId();
  const onKeyDown = useDialogFocus(dialogRef, titleRef, onClose);
  const isMobile = device === "mobile";
  const category = COMMUNITY_CATEGORIES[post.category];
  const route = articleRoute(post.id);
  const isPublicPage = Boolean(getPost(post.id));
  const pending = post.status === "em_revisao";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    dispatch({ type: "addComment", id: post.id, text: comment });
    setComment("");
    showToast("Comentário simulado: fica só nesta sessão.", "info");
  };

  const share = async () => {
    const ok = await copyText(publicUrl(route));
    showToast(ok ? "Link público do artigo copiado! 🔗" : "Não foi possível copiar o link.", ok ? "success" : "info");
  };

  return (
    <div
      onClick={onClose}
      className={`absolute inset-0 z-50 flex items-center justify-center bg-tinta/75 ${isMobile ? "p-2.5" : "p-6"}`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`lg-sheet flex w-full flex-col overflow-hidden rounded-[30px] outline-none ${isMobile ? "max-h-[92%]" : "max-h-[88%] max-w-[620px]"}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.12] px-5 py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${category.badge}`}>
              c/{category.slug}
            </span>
            <PostTrustBadge post={post} />
          </div>
          <CloseButton onClose={onClose} className="h-8 w-8 text-sm" />
        </div>

        <div className="orbit-scroll flex-1 overflow-y-auto p-5">
          <h2
            ref={titleRef}
            id={titleId}
            tabIndex={-1}
            className={`${isMobile ? "text-lg" : "text-2xl"} leading-snug font-bold tracking-tight text-white`}
          >
            {post.title}
          </h2>
          <div className="mt-3 mb-4">
            <ArticleProvenance post={post} tone="dark" />
          </div>
          {pending && (
            <div className="mb-4 rounded-2xl border border-amber-300/40 bg-amber-400/10 p-3.5 text-xs leading-relaxed text-amber-50">
              <strong className="font-extrabold">Em revisão · só você vê este artigo.</strong> Na versão real, a equipe
              confere o registro na consulta pública do conselho profissional e revisa o texto antes de publicar.
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "approveArticle", id: post.id });
                  showToast("Artigo aprovado e publicado com selo de verificado! ✅", "success");
                }}
                className="lg-pill mt-2.5 block rounded-full px-3.5 py-1.5 text-xs font-extrabold text-white"
              >
                ✅ Aprovar (simular moderação)
              </button>
            </div>
          )}
          <ArticleBody blocks={post.content} className="text-[15px] leading-[1.62] text-white" />

          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-white/[0.12] pt-4">
            <VoteControl post={post} horizontal />
            {isPublicPage && (
              <>
                <Link
                  href={route}
                  className="lg-btn-primary rounded-full px-3.5 py-1.5 text-xs font-bold"
                  onClick={() => dispatch({ type: "closeModals" })}
                >
                  Ler artigo público ↗
                </Link>
                <button
                  type="button"
                  onClick={share}
                  className="lg-pill rounded-full px-3.5 py-1.5 text-xs font-semibold text-white"
                >
                  🔗 Copiar link público
                </button>
              </>
            )}
          </div>

          <div className="mt-5">
            <CommentList
              comments={post.comments}
              tone="dark"
              headingId={commentsId}
              note="Comentários fictícios do Modo Explorar. O que você escrever aqui fica só nesta sessão e não aparece na página pública."
            />
          </div>
        </div>

        <form
          onSubmit={submit}
          className="flex shrink-0 items-center gap-2 border-t border-white/[0.12] bg-tinta p-3.5"
        >
          <input
            type="text"
            value={comment}
            maxLength={COMMENT_MAX_LENGTH}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentário simulado..."
            aria-label="Novo comentário simulado (fica só nesta sessão)"
            className="min-w-0 flex-1 rounded-full border border-white/20 bg-noite px-4 py-2 text-sm text-white placeholder-slate-300"
          />
          <button type="submit" className="lg-btn-primary shrink-0 rounded-full px-4 py-2 text-xs font-bold">
            Publicar
          </button>
        </form>
      </div>
    </div>
  );
}
