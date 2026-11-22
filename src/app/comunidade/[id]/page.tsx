import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public/PublicShell";
import { COMMUNITY_CATEGORIES } from "@/lib/data/intentions";
import { COMMUNITY_POSTS, getPost } from "@/lib/data/posts";

export function generateStaticParams() {
  return COMMUNITY_POSTS.map((post) => ({ id: post.id }));
}

export async function generateMetadata({ params }: PageProps<"/comunidade/[id]">): Promise<Metadata> {
  const { id } = await params;
  const post = getPost(id);
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary,
    openGraph: { title: post.title, description: post.summary, type: "article" },
  };
}

export default async function ArticlePage({ params }: PageProps<"/comunidade/[id]">) {
  const { id } = await params;
  const post = getPost(id);
  if (!post) notFound();
  const category = COMMUNITY_CATEGORIES[post.category];

  return (
    <PublicShell>
      <Link href="/comunidade" className="text-xs font-semibold text-violet-200 hover:text-white">
        ← Todos os artigos
      </Link>
      <article className="lg-sheet mt-4 rounded-[30px] p-6 sm:p-8">
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${category.badge}`}>
          {category.label}
        </span>
        <h1 className="mt-4 text-2xl leading-snug font-extrabold text-white sm:text-3xl">{post.title}</h1>
        <div className="mt-2 text-xs text-slate-300/80">
          {post.author} · {post.readTime} de leitura
        </div>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-100/95 sm:text-base">
          {post.content.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <section className="mt-8 border-t border-white/[0.12] pt-6" aria-labelledby="comments-title">
          <h2 id="comments-title" className="text-sm font-bold text-white">
            Comentários ({post.comments.length})
          </h2>
          <div className="mt-3 space-y-2.5">
            {post.comments.map((c, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.11] bg-white/[0.06] p-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-violet-200">{c.author}</span>
                  <span className="text-slate-400">{c.time}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-100/90">{c.text}</p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </PublicShell>
  );
}
