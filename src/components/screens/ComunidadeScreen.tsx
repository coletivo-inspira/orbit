"use client";

import Link from "next/link";
import { COMMUNITY_CATEGORIES } from "@/lib/data/intentions";
import { useDevice } from "@/lib/state/device";
import { useOrbit } from "@/lib/state/OrbitProvider";
import type { CommunityFilter } from "@/lib/state/reducer";

const FILTERS: { id: CommunityFilter; label: string }[] = [
  { id: "all", label: "Tudo" },
  ...(Object.entries(COMMUNITY_CATEGORIES) as [CommunityFilter, { label: string }][]).map(([id, c]) => ({
    id,
    label: c.label,
  })),
];

export function ComunidadeScreen() {
  const { state, dispatch } = useOrbit();
  const { device } = useDevice();
  const isMobile = device === "mobile";
  const posts =
    state.communityFilter === "all" ? state.posts : state.posts.filter((p) => p.category === state.communityFilter);

  return (
    <div className="flex h-full w-full flex-col">
      <div className={`lg-header shrink-0 ${isMobile ? "px-4 pt-2.5 pb-3" : "px-6 pt-5 pb-3.5"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1
            tabIndex={-1}
            data-focus-fallback
            className={`${isMobile ? "text-lg" : "text-2xl"} font-bold tracking-tight text-white`}
          >
            Comunidade & Saúde
          </h1>
          <Link href="/comunidade" className="lg-pill rounded-full px-3 py-1.5 text-[11px] font-bold text-white">
            Abrir versão pública ↗
          </Link>
        </div>
        <p className="mt-0.5 text-xs text-slate-300">
          Vacinas, prevenção, bem-estar e debates. Os artigos têm versão pública, sem login, com link próprio.
        </p>
        <div className="orbit-scroll mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {FILTERS.map((c) => {
            const active = state.communityFilter === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch({ type: "setCommunityFilter", filter: c.id })}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? "lg-active-lens text-white"
                    : "border border-white/[0.14] bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] hover:text-white"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`orbit-scroll flex-1 overflow-y-auto ${isMobile ? "p-3.5 pb-24" : "p-6"}`}>
        <div className={`grid max-w-4xl ${isMobile ? "grid-cols-1 gap-3.5" : "grid-cols-2 gap-4"}`}>
          {posts.map((post) => {
            const category = COMMUNITY_CATEGORIES[post.category];
            return (
              <article
                key={post.id}
                className="lg-panel group relative flex flex-col justify-between gap-3 rounded-[24px] p-4 transition-colors hover:border-white/30"
              >
                <div>
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${category.badge}`}>
                      {category.label}
                    </span>
                    <span className="text-[11px] text-slate-300">
                      {post.readTime} · {post.date}
                    </span>
                  </div>
                  <h2 className="font-sans text-sm leading-snug font-bold text-white transition group-hover:text-areia">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "openArticle", id: post.id })}
                      className="text-left after:absolute after:inset-0 after:rounded-[24px] after:content-['']"
                    >
                      {post.title}
                    </button>
                  </h2>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-300">{post.summary}</p>
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.1] pt-3 text-[11px] text-slate-300">
                  <span className="truncate pr-2 font-medium text-slate-200">{post.author}</span>
                  <div className="relative z-10 flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      aria-pressed={post.liked}
                      onClick={() => dispatch({ type: "togglePostLike", id: post.id })}
                      className={`flex items-center gap-1 transition hover:text-rose-300 ${post.liked ? "font-bold text-rose-300" : ""}`}
                    >
                      <span aria-hidden="true">{post.liked ? "❤️" : "🤍"}</span>
                      <span className="sr-only">Curtir, curtidas:</span> {post.likes}
                    </button>
                    <span className="flex items-center gap-1">
                      <span aria-hidden="true">💬</span>
                      <span className="sr-only">Comentários:</span> {post.comments.length}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
