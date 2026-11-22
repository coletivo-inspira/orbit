import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody, ArticleProvenance, CommentList } from "@/components/comunidade/ArticleParts";
import { PostTrustBadge } from "@/components/comunidade/PostTrust";
import { PublicShell } from "@/components/public/PublicShell";
import { COMMUNITY_CATEGORIES } from "@/lib/data/intentions";
import { COMMUNITY_POSTS, getPost } from "@/lib/data/posts";

export function generateStaticParams() {
  return COMMUNITY_POSTS.filter((post) => post.status === "publicado").map((post) => ({ id: post.id }));
}

export async function generateMetadata({ params }: PageProps<"/comunidade/[id]">): Promise<Metadata> {
  const { id } = await params;
  const post = getPost(id);
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary,
    openGraph: { title: post.title, description: post.summary, type: post.kind === "artigo" ? "article" : "website" },
  };
}

export default async function ArticlePage({ params }: PageProps<"/comunidade/[id]">) {
  const { id } = await params;
  const post = getPost(id);
  if (!post) notFound();
  const category = COMMUNITY_CATEGORIES[post.category];

  return (
    <PublicShell>
      <Link href="/comunidade" className="text-sm font-bold text-cobre-texto underline underline-offset-4">
        ← Comunidade &amp; Saúde
      </Link>
      <article className="mt-4 rounded-[24px] bg-leitura p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-cobre-texto">Comunidade &amp; Saúde · c/{category.slug}</p>
          <PostTrustBadge post={post} tone="light" />
        </div>
        <h1 className="mt-2 text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl">{post.title}</h1>
        <div className="mt-4 border-y border-linha py-3">
          <ArticleProvenance post={post} tone="light" />
        </div>
        <ArticleBody blocks={post.content} className="mt-6 max-w-[70ch] text-base leading-[1.62]" />

        <div className="mt-8 border-t border-linha pt-6">
          <CommentList
            comments={post.comments}
            tone="light"
            headingId="comentarios"
            note="Comentários fictícios de demonstração. Comentários escritos no app (Modo Explorar) não são publicados aqui."
          />
        </div>
      </article>
    </PublicShell>
  );
}
