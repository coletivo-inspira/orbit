"use client";

import { latestLine, type Conversation } from "@/lib/conversas";

interface ConversationBalloonProps {
  name: string;
  conversation: Conversation;
  onOpen: (origin: { x: number; y: number }) => void;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  /** Hidden until the engine marks the bubble as touching the user's own (`data-near`). */
  nearOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Comic-style balloon next to a profile bubble: their last line, or empty when they have not replied. */
export function ConversationBalloon({
  name,
  conversation,
  onOpen,
  onFocus,
  nearOnly,
  className = "",
  style,
}: ConversationBalloonProps) {
  const theirs = latestLine(conversation.theirs);
  return (
    <button
      type="button"
      data-balloon
      data-near={nearOnly ? "false" : undefined}
      onFocus={onFocus}
      onClick={(e) => {
        e.stopPropagation();
        const avatar = e.currentTarget.parentElement?.querySelector<HTMLElement>("[data-avatar]");
        const rect = (avatar ?? e.currentTarget).getBoundingClientRect();
        onOpen({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
      className={`hq-balloon orbit-balloon absolute z-10 flex h-[22px] max-w-[84px] cursor-pointer items-center rounded-full px-2 text-xs leading-none font-bold ${
        theirs ? "hq-balloon-filled text-tinta" : "hq-balloon-empty min-w-[30px]"
      } ${className}`}
      style={style}
    >
      <span className="truncate" aria-hidden="true">
        {theirs ?? ""}
      </span>
      <span className="sr-only">
        Mini chat com {name}: {theirs ? `última fala, “${theirs}”` : "ainda não respondeu"}
      </span>
    </button>
  );
}
