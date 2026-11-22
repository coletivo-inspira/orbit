import { verificationText } from "@/components/comunidade/PostTrust";
import type { ArticleBlock, CommunityPost, PostComment } from "@/lib/types";

type Tone = "dark" | "light";

const muted: Record<Tone, string> = { dark: "text-marfim-suave", light: "text-texto-suave" };
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
      <dt className="font-bold">Verificação</dt>
      <dd>{verificationText(post)}</dd>
      <dt className="font-bold">Revisão</dt>
      <dd>
        {post.kind === "discussao"
          ? "Não se aplica — conversa aberta, sem revisão editorial."
          : (post.reviewedAt ??
            (post.reviewedBy
              ? `Revisado por ${post.reviewedBy}`
              : post.status === "em_revisao"
                ? "Na fila de moderação."
                : "Pendente — conteúdo de saúde ainda sem revisão editorial."))}
      </dd>
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
        ) : post.kind === "discussao" ? (
          "Relato pessoal, sem fontes."
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
  onReply,
  replyingTo,
}: {
  comments: PostComment[];
  tone: Tone;
  note: string;
  headingId: string;
  /** When set, each comment gets a "Responder" button. */
  onReply?: (index: number) => void;
  replyingTo?: number | null;
}) {
  const total = comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className={`text-sm font-bold ${tone === "dark" ? "text-white" : "text-tinta"}`}>
        Comentários de exemplo ({total})
      </h2>
      <p className={`mt-1 text-xs ${muted[tone]}`}>{note}</p>
      <ul className="mt-3 space-y-2.5">
        {comments.map((c, i) => (
          <li key={i}>
            <CommentCard comment={c} tone={tone} highlighted={replyingTo === i}>
              {onReply && (
                <button
                  type="button"
                  onClick={() => onReply(i)}
                  aria-label={`Responder ${c.author}`}
                  className={`mt-1.5 text-xs font-bold ${accent[tone]} hover:underline`}
                >
                  ↩ Responder
                </button>
              )}
            </CommentCard>
            {c.replies && c.replies.length > 0 && (
              <ul
                aria-label={`Respostas a ${c.author}`}
                className={`mt-2 ml-4 space-y-2 border-l-2 pl-3 ${tone === "dark" ? "border-areia/40" : "border-linha"}`}
              >
                {c.replies.map((r, j) => (
                  <li key={j}>
                    <CommentCard comment={r} tone={tone} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CommentCard({
  comment: c,
  tone,
  highlighted = false,
  children,
}: {
  comment: PostComment;
  tone: Tone;
  highlighted?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-cartao border p-3 ${tone === "dark" ? "bg-tinta" : "bg-marfim"} ${
        highlighted ? "border-areia" : tone === "dark" ? "border-white/[0.12]" : "border-linha"
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`font-bold ${accent[tone]}`}>
          {c.author}
          {c.local && <span className={`ml-1.5 font-semibold ${muted[tone]}`}>· você, só nesta sessão</span>}
        </span>
        <span className={muted[tone]}>{c.time}</span>
      </div>
      <p className={`mt-1 text-sm leading-relaxed ${tone === "dark" ? "text-white" : "text-tinta"}`}>{c.text}</p>
      {children}
    </div>
  );
}
