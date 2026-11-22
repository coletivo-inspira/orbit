/** Sage online marker. Decorative: the online state must also be written next to it or in the accessible name. */
export function PresenceDot({ className = "h-3 w-3" }: { className?: string }) {
  return <span aria-hidden="true" className={`presenca-ponto inline-block shrink-0 rounded-full ${className}`} />;
}
