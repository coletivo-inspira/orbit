import type { ArticleBlock, CommunityPost, PostComment } from "@/lib/types";

type Tone = "dark" | "light";

const muted: Record<Tone, string> = { dark: "text-slate-300", light: "text-texto-suave" };
const accent: Record<Tone, string> = { dark: "text-areia", light: "text-cobre-texto" };

export function ArticleBody({ blocks, className = "" }: { blocks: ArticleBlock[]; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {blocks.map((block, i) => {
        if (typeof block === "string") return <p key={i}>{block}</p>;
        const List = block.list;
        return (
          <List key={i} className={`space-y-2 pl-5 ${block.list === "ul" ? "list-disc" : "list-decimal"}`}>
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

/** Authorship, editorial review and sources — kept visible even while the team hasn't filled them in. */
export function ArticleProvenance({ post, tone }: { post: CommunityPost; tone: Tone }) {
  return (
    <dl className={`grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-[auto_1fr] ${muted[tone]}`}>
      <dt className="font-bold">Autoria</dt>
      <dd>
        {post.author} · {post.date} · {post.readTime} de leitura
      </dd>
      <dt className="font-bold">Revisão</dt>
      <dd>{post.reviewedAt ?? "Pendente — conteúdo de saúde ainda sem revisão editorial."}</dd>
      <dt className="font-bold">Fontes</dt>
      <dd>
        {post.sources?.length ? (
          <ul className="space-y-1">
            {post.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} className={`font-semibold underline underline-offset-2 ${accent[tone]}`}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          "Ainda não cadastradas — aguardando a revisão editorial."
        )}
      </dd>
    </dl>
  );
}

export function CommentList({
  comments,
  tone,
  note,
  headingId,
}: {
  comments: PostComment[];
  tone: Tone;
  note: string;
  headingId: string;
}) {
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className={`font-sans text-sm font-bold ${tone === "dark" ? "text-white" : "text-tinta"}`}>
        Comentários de exemplo ({comments.length})
      </h2>
      <p className={`mt-1 text-xs ${muted[tone]}`}>{note}</p>
      <ul className="mt-3 space-y-2.5">
        {comments.map((c, i) => (
          <li
            key={i}
            className={`rounded-2xl border p-3 ${tone === "dark" ? "border-white/[0.12] bg-tinta" : "border-linha bg-marfim"}`}
          >
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className={`font-bold ${accent[tone]}`}>
                {c.author}
                {c.local && <span className={`ml-1.5 font-semibold ${muted[tone]}`}>· você, só nesta sessão</span>}
              </span>
              <span className={muted[tone]}>{c.time}</span>
            </div>
            <p className={`mt-1 text-sm leading-relaxed ${tone === "dark" ? "text-white" : "text-tinta"}`}>{c.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
