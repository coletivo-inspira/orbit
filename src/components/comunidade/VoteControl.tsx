"use client";

import { useOrbit } from "@/lib/state/OrbitProvider";
import type { CommunityPost } from "@/lib/types";

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${down ? "rotate-180" : ""}`} fill="currentColor" aria-hidden>
      <path d="M8 2.5 14 9.5H10.2V13.5H5.8V9.5H2L8 2.5Z" />
    </svg>
  );
}

export function VoteControl({ post, horizontal = false }: { post: CommunityPost; horizontal?: boolean }) {
  const { dispatch } = useOrbit();
  const button =
    "relative flex h-9 w-9 items-center justify-center rounded-full transition after:absolute after:-inset-1 after:content-['']";
  return (
    <div
      className={`lg-pill relative z-10 flex shrink-0 items-center rounded-full p-0.5 ${horizontal ? "flex-row gap-1" : "flex-col"}`}
    >
      <button
        type="button"
        aria-pressed={post.vote === 1}
        aria-label="Votar a favor"
        onClick={() => dispatch({ type: "votePost", id: post.id, direction: 1 })}
        className={`${button} ${post.vote === 1 ? "bg-areia/25 text-areia" : "text-marfim-suave hover:bg-white/10 hover:text-white"}`}
      >
        <Arrow />
      </button>
      <span
        aria-label={`${post.score} pontos`}
        className={`min-w-7 text-center text-xs font-extrabold tabular-nums ${
          post.vote === 1 ? "text-areia" : post.vote === -1 ? "text-salvia" : "text-white"
        }`}
      >
        {post.score}
      </span>
      <button
        type="button"
        aria-pressed={post.vote === -1}
        aria-label="Votar contra"
        onClick={() => dispatch({ type: "votePost", id: post.id, direction: -1 })}
        className={`${button} ${post.vote === -1 ? "bg-salvia/20 text-salvia" : "text-marfim-suave hover:bg-white/10 hover:text-white"}`}
      >
        <Arrow down />
      </button>
    </div>
  );
}
