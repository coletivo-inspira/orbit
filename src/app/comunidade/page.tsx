import type { Metadata } from "next";
import Link from "next/link";
import { PostTrustBadge } from "@/components/comunidade/PostTrust";
import { RedditCommunities } from "@/components/comunidade/RedditCommunities";
import { PublicShell } from "@/components/public/PublicShell";
import { COMMUNITY_CATEGORIES } from "@/lib/data/intentions";
import { COMMUNITY_POSTS } from "@/lib/data/posts";

export const metadata: Metadata = {
  title: "Comunidade & Saúde",
  description:
    "Artigos de profissionais de saúde e conversas abertas sobre vacinação, prevenção (PrEP/PEP), saúde mental e debates da comunidade Orbit.",
};

export default function ComunidadePage() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Comunidade &amp; Saúde</h1>
      <p className="mt-2 max-w-2xl text-base leading-[1.62] text-texto-suave">
        Artigos de profissionais e conversas da comunidade sobre vacinas, prevenção, bem-estar e debates — sem precisar
        de conta.
      </p>
      <p className="mt-2 max-w-2xl text-sm text-texto-suave">
        Conteúdo de demonstração: autores, registros profissionais e moderação são simulados. Para decisões de saúde,
        procure o SUS ou um profissional.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {COMMUNITY_POSTS.filter((post) => post.status === "publicado").map((post) => {
          const category = COMMUNITY_CATEGORIES[post.category];
          return (
            <li key={post.id} className="flex">
              <Link
                href={`/comunidade/${post.id}`}
                className="flex w-full flex-col gap-3 rounded-[20px] border border-linha bg-leitura p-5 transition-colors hover:border-cobre"
              >
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-cobre-texto">
                  <span>c/{category.slug}</span>
                  <PostTrustBadge post={post} tone="light" />
                </div>
                <h2 className="text-lg leading-snug font-semibold tracking-tight">{post.title}</h2>
                <p className="text-sm leading-relaxed text-texto-suave">{post.summary}</p>
                <span className="mt-auto flex items-center justify-between gap-2 text-xs text-texto-suave">
                  <span className="truncate font-semibold text-tinta">{post.author}</span>
                  <span className="shrink-0">
                    {post.score} pontos · {post.comments.length} comentários
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-8 rounded-[20px] border border-linha bg-leitura p-5">
        <RedditCommunities tone="light" />
      </div>
    </PublicShell>
  );
}
