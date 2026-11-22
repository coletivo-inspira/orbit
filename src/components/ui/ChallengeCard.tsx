import type { ReactNode } from "react";

/**
 * Prompt card (brandbook v2 "Cartão-desafio", after Sharpen's generated prompts): round icon,
 * a small category label, one question as the title and up to two pill actions.
 */
export function ChallengeCard({
  icon,
  eyebrow,
  title,
  titleAs: Title = "h2",
  children,
  actions,
  align = "center",
  className = "",
  role,
}: {
  icon?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  titleAs?: "h2" | "h3";
  children?: ReactNode;
  actions?: ReactNode;
  align?: "center" | "start";
  className?: string;
  role?: "status";
}) {
  const centered = align === "center";
  return (
    <div
      role={role}
      className={`lg-glass-tint rounded-cartao p-5 ${centered ? "text-center" : "text-left"} ${className}`}
    >
      {icon && (
        <div
          aria-hidden="true"
          className={`lg-glass-tint flex h-12 w-12 items-center justify-center rounded-full text-2xl ${centered ? "mx-auto" : ""}`}
        >
          {icon}
        </div>
      )}
      {eyebrow && <p className="mt-3 font-display text-xs font-bold tracking-wider text-areia uppercase">{eyebrow}</p>}
      <Title className={`${eyebrow ? "mt-1" : "mt-3"} text-lg leading-snug font-bold text-marfim`}>{title}</Title>
      {children && <div className="mt-1.5 text-sm leading-relaxed text-marfim-suave">{children}</div>}
      {actions && <div className={`mt-4 flex flex-wrap gap-2 ${centered ? "justify-center" : ""}`}>{actions}</div>}
    </div>
  );
}
