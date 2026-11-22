import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public/PublicShell";
import { COMMUNITY_CATEGORIES } from "@/lib/data/intentions";
import { COMMUNITY_POSTS } from "@/lib/data/posts";

export const metadata: Metadata = {
  title: "Comunidade & Saúde",
  description: "Guias públicos sobre vacinação, prevenção (PrEP/PEP), saúde mental e debates da comunidade Orbit.",
};

export default function ComunidadePage() {
  return (
    <PublicShell>
      <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Comunidade & Saúde</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-300/85">
        Informação aberta sobre vacinas, prevenção, bem-estar e debates — sem precisar de conta.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {COMMUNITY_POSTS.map((post) => {
          const category = COMMUNITY_CATEGORIES[post.category];
          return (
            <Link
              key={post.id}
              href={`/comunidade/${post.id}`}
              className="lg-panel lg-sheen flex flex-col gap-3 rounded-[24px] p-5 transition-all hover:-translate-y-0.5 hover:border-white/30"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${category.badge}`}>
                  {category.label}
                </span>
                <span className="text-[11px] text-slate-300/70">{post.readTime} de leitura</span>
              </div>
              <h2 className="text-base leading-snug font-bold text-white">{post.title}</h2>
              <p className="text-sm leading-relaxed text-slate-300/85">{post.summary}</p>
              <span className="mt-auto text-xs font-medium text-slate-200">{post.author}</span>
            </Link>
          );
        })}
      </div>
    </PublicShell>
  );
}
