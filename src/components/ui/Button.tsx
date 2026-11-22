import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primario" | "vidro" | "flutuante" | "fantasma";
export type ButtonSize = "md" | "compacto";

const VARIANTS: Record<ButtonVariant, string> = {
  primario: "lg-btn-primary text-tinta",
  vidro: "lg-glass-tint text-marfim",
  flutuante: "lg-glass lg-sheen text-marfim",
  fantasma: "border border-transparent text-marfim hover:bg-marfim/10",
};

/* The compact size keeps a 36px pill but extends its hit area to 44px with an invisible ::after. */
const SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 text-sm",
  compacto: "min-h-9 px-3.5 text-xs after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
};

/** Class list for pill buttons; also used on links (`<Link className={buttonClass(...)}>`). */
export function buttonClass({
  variant = "vidro",
  size = "md",
  block = false,
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; className?: string } = {}) {
  return `relative inline-flex items-center justify-center gap-1.5 rounded-pilula font-extrabold whitespace-nowrap transition aria-disabled:cursor-default aria-disabled:opacity-70 ${VARIANTS[variant]} ${SIZES[size]} ${block ? "w-full" : "shrink-0"} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
};

export function Button({
  variant,
  size,
  block,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps & { children: ReactNode }) {
  return (
    <button type={type} className={buttonClass({ variant, size, block, className })} {...rest}>
      {children}
    </button>
  );
}

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Accessible name; icon-only buttons have no visible text. */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/** Circular icon button: 44px, or 36px with a 44px hit area when compact. */
export function IconButton({
  label,
  variant = "vidro",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}: IconButtonProps & { children: ReactNode }) {
  const box =
    size === "md" ? "h-11 w-11 text-base" : "h-9 w-9 text-sm after:absolute after:-inset-1 after:content-['']";
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full transition ${VARIANTS[variant]} ${box} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function CloseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function CloseButton({
  onClose,
  label = "Fechar",
  size = "md",
  className = "",
}: {
  onClose: () => void;
  label?: string;
  size?: ButtonSize;
  className?: string;
}) {
  return (
    <IconButton label={label} size={size} onClick={onClose} className={className}>
      <CloseIcon className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />
    </IconButton>
  );
}
