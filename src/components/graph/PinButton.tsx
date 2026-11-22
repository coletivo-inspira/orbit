/** Pins a graph node where it is, or releases it back to the physics. */
export function PinButton({ pinned, onToggle }: { pinned: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={pinned}
      title={pinned ? "Soltar: volta para a física (ou dê dois cliques no nó)" : "Fixar onde está (ou arraste o nó)"}
      className={`relative flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] ${pinned ? "lg-btn-primary" : "lg-pill text-white"}`}
    >
      <span aria-hidden="true">📌</span>
      {pinned ? "Soltar" : "Fixar"}
    </button>
  );
}
