"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { ArticleBody, ArticleProvenance, CommentList } from "@/components/comunidade/ArticleParts";
import { PostTrustBadge } from "@/components/comunidade/PostTrust";
import { TagList } from "@/components/comunidade/TagList";
import { VoteControl } from "@/components/comunidade/VoteControl";
import { BarrasDesejos } from "@/components/desejos/BarrasDesejos";
import { DesejoSheet } from "@/components/desejos/DesejoSheet";
import { ComposerSheet } from "@/components/modals/ComposerSheet";
import { TapIcon } from "@/components/interesse/TapIcon";
import { MiniChat } from "@/components/orbita/MiniChat";
import { OrbitaFiltersSheet } from "@/components/orbita/OrbitaFiltersSheet";
import { AppSeal, appSealClass, IntentionPill, MetricLine, OnlineMetric } from "@/components/perfil/ProfileCard";
import { AppTile } from "@/components/ui/AppBadge";
import { RingedAvatar } from "@/components/ui/Avatar";
import { Button, buttonClass, CloseButton } from "@/components/ui/Button";
import { PresenceDot } from "@/components/ui/PresenceDot";
import { SectionLabel, Sheet, SheetBody, SheetFooter, SheetHeader } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toasts";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { postTags } from "@/lib/community";
import { copyText } from "@/lib/clipboard";
import { desejosPublicosDe } from "@/lib/desejos/perfis";
import { activeAppIds, COMMUNITY_CATEGORIES, EXTERNAL_APPS, INTENTIONS } from "@/lib/data/intentions";
import {
  BODY_TYPES,
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
import { profileById } from "@/lib/data/profiles";
import { formatAgo, receivedTapFrom } from "@/lib/interesse";
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
  const miniChat = device === "watch" ? null : state.miniChat;
  const desejo = device === "watch" ? null : state.desejoAberto;
  const open = Boolean(
    state.selectedProfileId || state.selectedArticleId || composerKind || showFilters || miniChat || desejo,
  );

  const profile = state.selectedProfileId ? profileById(state.selectedProfileId) : undefined;
  const chatProfile = miniChat ? profileById(miniChat.profileId) : undefined;
  const post = state.selectedArticleId ? state.posts.find((p) => p.id === state.selectedArticleId) : undefined;

  return (
    <div className={`absolute inset-0 z-40 ${open ? "" : "pointer-events-none"}`}>
      {profile && <ProfileSheet key={profile.id} profile={profile} onClose={close} />}
      {post && <ArticleSheet key={post.id} post={post} onClose={close} />}
      {showFilters && <OrbitaFiltersSheet onClose={close} />}
      {composerKind && <ComposerSheet initialKind={composerKind} onClose={close} />}
      {chatProfile && miniChat && (
        <MiniChat key={chatProfile.id} profile={chatProfile} origin={miniChat.origin} onClose={close} />
      )}
      {desejo && <DesejoSheet key={desejo} id={desejo} onClose={close} />}
    </div>
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
  const tappedYou = receivedTapFrom(p.id);
  const tapped = state.sentTaps.includes(p.id);

  const wave = () => {
    onClose();
    showToast(`Você acenou para ${p.name}! 👋 (simulação)`, "success");
  };

  const tap = () => {
    if (tapped) return;
    dispatch({ type: "tapProfile", id: p.id });
    showToast(`Você ${tappedYou ? "tocou de volta em" : "tocou em"} ${p.name}. (simulação)`, "success");
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
          <CloseButton onClose={onClose} size="compacto" />
          <span className="text-xs font-bold text-marfim-suave">📍 {p.dist}</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <RingedAvatar cfg={p.avatar} photo={p.photo} color={primary.color} online={p.online} size={56} />
          <h2 ref={titleRef} id={titleId} tabIndex={-1} className="mt-1.5 text-sm font-extrabold text-white">
            {p.name}, {p.age}
          </h2>
          <span
            className="mt-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{ background: primary.bg, color: primary.text }}
          >
            {primary.emoji} {primary.label}
          </span>
          <div className="mt-2.5 flex items-center justify-center gap-1.5">
            {apps.map((id) => (
              <AppTile key={id} appId={id} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
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
    <Sheet labelledBy={titleId} initialFocusRef={titleRef} onClose={onClose} placement={isMobile ? "baixo" : "centro"}>
      <SheetHeader className="items-start">
        <RingedAvatar cfg={p.avatar} photo={p.photo} color={primary.color} online={p.online} size={isMobile ? 60 : 72}>
          {p.online && <PresenceDot className="absolute right-0.5 bottom-0.5 h-3 w-3" />}
        </RingedAvatar>
        <div className="min-w-0 flex-1 self-center">
          <h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-xl leading-tight font-extrabold text-white">
            {p.name}, {p.age}
          </h2>
          <p className="text-xs text-marfim-suave">
            {PRONOUNS[p.pronouns]} · {p.city}
          </p>
          <MetricLine
            className="mt-0.5"
            items={[<span key="dist">📍 {p.dist} (aprox.)</span>, <OnlineMetric key="online" online={p.online} />]}
          />
          {p.visitingFrom && (
            <p className="mt-0.5 text-xs font-semibold text-areia">
              <span aria-hidden="true">✈️ </span>De passagem por aqui · mora em {p.visitingFrom}
            </p>
          )}
        </div>
        <CloseButton onClose={onClose} />
      </SheetHeader>
      <SheetBody className="pt-3">
        {p.photo && (
          <p className="mt-2 text-xs leading-snug text-marfim-suave">
            Foto ilustrativa gerada por IA — perfil simulado
          </p>
        )}

        {tappedYou && (
          <p className="lg-glass-tint mt-3 flex items-center gap-2 rounded-cartao px-3.5 py-2 text-xs text-white">
            <TapIcon className="h-4 w-4 shrink-0 text-areia" />
            {p.name} te deu um toque {formatAgo(tappedYou.minutesAgo)}.
          </p>
        )}

        <p className="mt-3 text-sm leading-relaxed text-white">{p.bio}</p>

        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Intenções">
          {p.intentions.map((id) => (
            <li key={id}>
              <IntentionPill id={id} principal={id === p.primaryIntention} />
            </li>
          ))}
        </ul>

        {shared.length > 0 && (
          <p className="mt-3 rounded-cartao border border-areia/40 bg-areia/10 px-3.5 py-2 text-xs text-areia">
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
              ["Tipo de corpo", p.bodyType && labelOf(BODY_TYPES, p.bodyType)],
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
          <p className="mb-2 text-xs leading-snug text-marfim-suave">
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
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${isShared ? "border-areia/60 bg-areia/15 text-areia" : "border-white/[0.14] bg-white/[0.06] text-marfim-suave"}`}
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
            <p className="mb-2 text-xs leading-snug text-marfim-suave">
              {p.name} escolheu mostrar estes temas do quiz Desejos. São curiosidades de um dia, não rótulos.
            </p>
            <BarrasDesejos desejos={desejos} />
          </SheetSection>
        )}

        <SheetSection title="Presença em outros aplicativos">
          <p className="mb-2 text-xs text-marfim-suave">
            Autodeclarada. “Presença” indica conta ativa; um @ pode ser copiado para abrir no app.
          </p>
          <div className="flex flex-wrap gap-2">
            {apps.map((id) => {
              const handle = p.apps[id]?.handle ?? "";
              return (
                <button key={id} type="button" onClick={() => onBadge(id)} className={`${appSealClass} text-left`}>
                  <AppSeal appId={id} handle={handle} action="copiar" />
                </button>
              );
            })}
          </div>
        </SheetSection>
      </SheetBody>

      <SheetFooter>
        <Button size="compacto" onClick={tap} aria-disabled={tapped} className={tapped ? "text-areia" : ""}>
          <TapIcon className="h-4 w-4" filled={tapped} />
          {tapped ? "Tocado" : tappedYou ? "Tocar de volta" : "Tocar"}
        </Button>
        <Button variant="primario" size="compacto" block onClick={wave} className="flex-1">
          Mandar um oi 👋
        </Button>
        {p.inPark && (
          <Button size="compacto" block className="flex-1" onClick={() => dispatch({ type: "setTab", tab: "parque" })}>
            🌳 Ir pro Parque
          </Button>
        )}
      </SheetFooter>
    </Sheet>
  );
}

function testLabel(ym: string): string {
  const months = monthsBetween(ym, DEMO_MONTH);
  const ago = months <= 0 ? "este mês" : months === 1 ? "há 1 mês" : `há ${months} meses`;
  return `${formatMonth(ym)} (${ago})`;
}

function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 border-t border-marfim/10 pt-3.5">
      <SectionLabel className="mb-2">{title}</SectionLabel>
      {children}
    </section>
  );
}

/** Label/value pairs; blank optional fields are skipped instead of shown as empty. */
function FactList({ facts, empty }: { facts: [string, string | number | undefined | 0][]; empty?: string }) {
  const filled = facts.filter((f): f is [string, string] => Boolean(f[1]));
  if (!filled.length) return empty ? <p className="text-xs text-marfim-suave">{empty}</p> : null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
      {filled.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-marfim-suave">{label}</dt>
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
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const commentsId = useId();
  const replyAuthor = replyTo !== null ? post.comments[replyTo]?.author : undefined;
  const isMobile = device === "mobile";
  const category = COMMUNITY_CATEGORIES[post.category];
  const route = articleRoute(post.id);
  const isPublicPage = Boolean(getPost(post.id));
  const pending = post.status === "em_revisao";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    dispatch({
      type: "addComment",
      id: post.id,
      text: comment,
      replyTo: replyAuthor ? (replyTo ?? undefined) : undefined,
    });
    setComment("");
    setReplyTo(null);
    showToast(
      replyAuthor ? "Resposta simulada: fica só nesta sessão." : "Comentário simulado: fica só nesta sessão.",
      "info",
    );
  };

  const share = async () => {
    const ok = await copyText(publicUrl(route));
    showToast(ok ? "Link público do artigo copiado! 🔗" : "Não foi possível copiar o link.", ok ? "success" : "info");
  };

  return (
    <Sheet
      labelledBy={titleId}
      initialFocusRef={titleRef}
      onClose={onClose}
      placement={isMobile ? "baixo" : "centro"}
      maxWidth="max-w-[620px]"
    >
      <SheetHeader className="justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${category.badge}`}>
            c/{category.slug}
          </span>
          <PostTrustBadge post={post} />
        </div>
        <CloseButton onClose={onClose} />
      </SheetHeader>
      <SheetBody>
        <h2
          ref={titleRef}
          id={titleId}
          tabIndex={-1}
          className={`${isMobile ? "text-lg" : "text-2xl"} leading-snug font-bold tracking-tight text-white`}
        >
          {post.title}
        </h2>
        <TagList tags={postTags(post)} className="mt-2.5" />
        <div className="mt-3 mb-4">
          <ArticleProvenance post={post} tone="dark" />
        </div>
        {pending && (
          <div className="mb-4 rounded-cartao border border-areia/40 bg-areia/10 p-3.5 text-xs leading-relaxed text-areia">
            <strong className="font-extrabold">Em revisão · só você vê este artigo.</strong> Na versão real, a equipe
            confere o registro na consulta pública do conselho profissional e revisa o texto antes de publicar.
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "approveArticle", id: post.id });
                showToast("Artigo aprovado e publicado com selo de verificado! ✅", "success");
              }}
              className={buttonClass({ size: "compacto", className: "mt-2.5" })}
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
                className={buttonClass({ variant: "primario", size: "compacto" })}
                onClick={() => dispatch({ type: "closeModals" })}
              >
                Ler artigo público ↗
              </Link>
              <Button size="compacto" onClick={share}>
                🔗 Copiar link público
              </Button>
            </>
          )}
        </div>

        <div className="mt-5">
          <CommentList
            comments={post.comments}
            tone="dark"
            headingId={commentsId}
            replyingTo={replyTo}
            onReply={(i) => {
              setReplyTo(i);
              commentInputRef.current?.focus();
            }}
            note="Comentários fictícios do Modo Explorar. O que você escrever aqui fica só nesta sessão e não aparece na página pública."
          />
        </div>
      </SheetBody>

      <SheetFooter className="p-0">
        <form onSubmit={submit} className="flex w-full flex-col gap-2 p-3.5">
          {replyAuthor && (
            <div className="flex items-center justify-between gap-2 text-xs text-marfim-suave">
              <span>
                ↩ Respondendo a <strong className="text-areia">{replyAuthor}</strong>
              </span>
              <CloseButton onClose={() => setReplyTo(null)} label="Cancelar resposta" size="compacto" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={commentInputRef}
              type="text"
              value={comment}
              maxLength={COMMENT_MAX_LENGTH}
              onChange={(e) => setComment(e.target.value)}
              placeholder={replyAuthor ? `Resposta para ${replyAuthor}...` : "Comentário simulado..."}
              aria-label={
                replyAuthor
                  ? `Resposta simulada para ${replyAuthor} (fica só nesta sessão)`
                  : "Novo comentário simulado (fica só nesta sessão)"
              }
              className="min-h-11 min-w-0 flex-1 rounded-full border border-marfim/25 bg-tinta px-4 text-sm text-white placeholder-marfim-apagado"
            />
            <Button type="submit" variant="primario">
              {replyAuthor ? "Responder" : "Publicar"}
            </Button>
          </div>
        </form>
      </SheetFooter>
    </Sheet>
  );
}
