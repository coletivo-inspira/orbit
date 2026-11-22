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
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Comunidade &amp; Saúde</h1>
      <p className="mt-2 max-w-2xl text-base leading-[1.62] text-texto-suave">
        Informação aberta sobre vacinas, prevenção, bem-estar e debates — sem precisar de conta.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {COMMUNITY_POSTS.map((post) => {
          const category = COMMUNITY_CATEGORIES[post.category];
          return (
            <li key={post.id} className="flex">
              <Link
                href={`/comunidade/${post.id}`}
                className="flex w-full flex-col gap-3 rounded-[20px] border border-linha bg-leitura p-5 transition-colors hover:border-cobre"
              >
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-cobre-texto">
                  <span>{category.label}</span>
                  <span className="font-medium text-texto-suave">{post.readTime} de leitura</span>
                </div>
                <h2 className="text-lg leading-snug font-semibold tracking-tight">{post.title}</h2>
                <p className="text-sm leading-relaxed text-texto-suave">{post.summary}</p>
                <span className="mt-auto text-xs font-semibold text-tinta">{post.author}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </PublicShell>
  );
}
