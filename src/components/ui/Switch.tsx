export function Switch({
  checked,
  onChange,
  label,
  size = "md",
  onClass = "bg-cobre",
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  size?: "sm" | "md";
  onClass?: string;
}) {
  const track = size === "md" ? "h-7 w-12" : "h-6 w-10";
  const knob = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const shift = size === "md" ? "translate-x-5" : "translate-x-4";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative shrink-0 rounded-full border border-white/25 transition-colors ${track} ${checked ? onClass : "bg-white/15"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow-md transition-transform ${knob} ${checked ? shift : "translate-x-0"}`}
      />
    </button>
  );
}
