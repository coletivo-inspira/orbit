"use client";

import Link from "next/link";
import { useState } from "react";
import { CommunityTimelapse } from "@/components/comunidade/CommunityTimelapse";
import { PostTrustBadge } from "@/components/comunidade/PostTrust";
import { TagList } from "@/components/comunidade/TagList";
import { RedditCommunities } from "@/components/comunidade/RedditCommunities";
import { RegionalAlerts } from "@/components/comunidade/RegionalAlerts";
import { VoteControl } from "@/components/comunidade/VoteControl";
import { commentCount, postTags, sortPosts, type CommunitySort } from "@/lib/community";
import { COMMUNITY_CATEGORIES } from "@/lib/data/intentions";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { CommunityFilter } from "@/lib/state/reducer";
import type { CommunityPost } from "@/lib/types";
import { buttonClass } from "@/components/ui/Button";
import { ChallengeCard } from "@/components/ui/ChallengeCard";

const FILTERS: { id: CommunityFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  ...(Object.entries(COMMUNITY_CATEGORIES) as [CommunityFilter, { label: string }][]).map(([id, c]) => ({
    id,
    label: c.label,
  })),
];

const SORTS: { id: CommunitySort; label: string }[] = [
  { id: "hot", label: "🔥 Em alta" },
  { id: "new", label: "✨ Novos" },
];

export function ComunidadeScreen() {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const isMobile = device === "mobile";
  const filtered =
    state.communityFilter === "all" ? state.posts : state.posts.filter((p) => p.category === state.communityFilter);
  const posts = sortPosts(filtered, state.communitySort);
  const pending = state.posts.filter((p) => p.status === "em_revisao").length;
  const [timelapse, setTimelapse] = useState(false);

  const feed = (
    <section aria-label="Posts da comunidade" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="lg-glass-tint flex shrink-0 items-center gap-1 rounded-full p-1">
          {SORTS.map((s) => {
            const active = state.communitySort === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch({ type: "setCommunitySort", sort: s.id })}
                className={`rounded-full px-3 min-h-9 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                  active ? "lg-active-lens text-white" : "border border-transparent text-marfim-suave hover:text-white"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTimelapse(true)}
            aria-haspopup="dialog"
            title="Reveja as interações da comunidade numa animação"
            className="lg-pill flex items-center gap-1.5 rounded-full px-3 min-h-9 py-1.5 text-xs font-bold text-white active:scale-95"
          >
            <svg
              className="h-3.5 w-3.5 text-areia"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m4 20 11-11M14 4v2M18 6l-1.5 1.5M20 10h-2M10 4l.6 1.4M20 14l-1.4-.6" />
            </svg>
            Linha do tempo
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "openComposer", kind: "discussao" })}
            className="lg-btn-primary rounded-full px-3.5 min-h-9 py-1.5 text-xs font-extrabold active:scale-95"
          >
            ＋ Criar post
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <PostRow key={post.id} post={post} />
        ))}
        {!posts.length && (
          <ChallengeCard
            icon="💬"
            eyebrow="Comunidade vazia"
            title="Que tal abrir a primeira conversa?"
            titleAs="h3"
            actions={
              <button
                type="button"
                onClick={() => dispatch({ type: "openComposer", kind: "discussao" })}
                className={buttonClass({ variant: "primario", size: "compacto" })}
              >
                ＋ Criar post
              </button>
            }
          >
            Nada por aqui ainda nesta subcomunidade.
          </ChallengeCard>
        )}
      </div>
    </section>
  );

  const aside = (
    <div className="flex flex-col gap-5">
      <ProfessionalCard pending={pending} />
      <RedditCommunities filter={state.communityFilter} limit={isMobile ? 4 : undefined} />
    </div>
  );

  return (
    <div className="relative flex h-full w-full flex-col">
      {timelapse && (
        <CommunityTimelapse
          posts={filtered}
          compact={isMobile}
          onClose={() => setTimelapse(false)}
          onOpenPost={(id) => {
            setTimelapse(false);
            dispatch({ type: "openArticle", id });
          }}
        />
      )}
      <div className={`lg-header shrink-0 ${isMobile ? "px-4 pt-2.5 pb-3" : "px-6 pt-5 pb-3.5"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1
            tabIndex={-1}
            data-focus-fallback
            className={`${isMobile ? "text-lg" : "text-2xl"} font-bold tracking-tight text-white`}
          >
            Comunidade & Saúde
          </h1>
          <Link
            href="/comunidade"
            className="inline-flex items-center lg-pill rounded-full px-3 min-h-9 py-1.5 text-xs font-bold text-white"
          >
            Abrir versão pública ↗
          </Link>
        </div>
        <p className="mt-0.5 text-xs text-marfim-suave">
          Alertas da sua região, artigos de profissionais verificados e conversas abertas.
        </p>
        <div
          role="group"
          className="orbit-scroll mt-3 flex items-center gap-1.5 overflow-x-auto pr-6 pb-0.5 [mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)]"
          aria-label="Subcomunidades"
        >
          {FILTERS.map((c) => {
            const active = state.communityFilter === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch({ type: "setCommunityFilter", filter: c.id })}
                className={`min-h-9 shrink-0 rounded-full px-3.5 text-xs font-semibold transition ${
                  active ? "lg-active-lens text-white" : "lg-pill text-marfim-suave hover:text-white"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`orbit-scroll flex-1 overflow-y-auto ${isMobile ? "p-3.5 pb-24" : "p-6"}`}>
        <div className={`flex max-w-5xl flex-col ${isMobile ? "gap-5" : "gap-6"}`}>
          <RegionalAlerts compact={isMobile} />
          {isMobile ? (
            <>
              {feed}
              {aside}
            </>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-start gap-5">
              {feed}
              <aside>{aside}</aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PostRow({ post }: { post: CommunityPost }) {
  const { dispatch } = useOrbit();
  const category = COMMUNITY_CATEGORIES[post.category];
  const verified = post.kind === "artigo" && post.status === "publicado";
  return (
    <article
      className={`lg-glass-tint group relative flex gap-3 rounded-cartao p-3.5 transition-colors hover:border-white/30 ${
        verified ? "border-salvia/25" : post.status === "em_revisao" ? "border-areia/30 border-dashed" : ""
      }`}
    >
      <VoteControl post={post} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-marfim-suave">
          <span className={`rounded-full border px-2 py-px font-bold ${category.badge}`}>c/{category.slug}</span>
          <span className="truncate font-semibold text-marfim-suave">{post.author}</span>
          <span aria-hidden>·</span>
          <span>{post.date}</span>
        </div>
        <h2 className="mt-1.5 text-sm leading-snug font-bold text-white transition group-hover:text-areia">
          <button
            type="button"
            onClick={() => dispatch({ type: "openArticle", id: post.id })}
            className="text-left after:absolute after:inset-0 after:rounded-cartao after:content-['']"
          >
            {post.title}
          </button>
        </h2>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-marfim-suave">{post.summary}</p>
        <TagList tags={postTags(post)} className="mt-2" />
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-marfim-suave">
          <PostTrustBadge post={post} />
          <span>
            <span aria-hidden="true">💬</span>
            <span className="sr-only">Comentários e respostas:</span> {commentCount(post)}
          </span>
          <span>· {post.readTime}</span>
        </div>
      </div>
    </article>
  );
}

function ProfessionalCard({ pending }: { pending: number }) {
  const { dispatch } = useOrbit();
  return (
    <section aria-label="Artigos de profissionais de saúde" className="lg-glass-tint rounded-cartao p-4">
      <h2 className="text-sm font-extrabold text-white">🩺 Sou profissional de saúde</h2>
      <p className="mt-1 text-xs leading-relaxed text-marfim-suave">
        Médicos(as), enfermeiros(as) e psicólogos(as) podem publicar artigos com selo de verificado.
      </p>
      <ol className="mt-2.5 space-y-1.5 text-xs leading-snug text-marfim-suave">
        <li>
          <strong className="text-white">1. Registro:</strong> conferimos CRM, COREN ou CRP no conselho profissional.
        </li>
        <li>
          <strong className="text-white">2. Revisão:</strong> moderadores checam conteúdo e fontes antes de publicar.
        </li>
        <li>
          <strong className="text-white">3. Selo:</strong> o artigo sai com “Profissional verificado” e quem revisou.
        </li>
      </ol>
      {pending > 0 && (
        <p className="mt-2.5 rounded-cartao border border-areia/30 bg-areia/10 px-2.5 py-1.5 text-xs font-semibold text-areia">
          ⏳ {pending} {pending === 1 ? "artigo seu em revisão" : "artigos seus em revisão"}
        </p>
      )}
      <button
        type="button"
        onClick={() => dispatch({ type: "openComposer", kind: "artigo" })}
        className="lg-pill mt-3 w-full rounded-full px-3 py-2 text-xs font-extrabold text-white"
      >
        Enviar artigo para revisão
      </button>
      <p className="mt-2 text-xs leading-snug text-marfim-suave">
        Demo: a verificação é simulada, nenhum dado é enviado aos conselhos.
      </p>
    </section>
  );
}
