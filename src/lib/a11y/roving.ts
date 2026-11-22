export type RovingOrientation = "horizontal" | "vertical";

/** Index targeted by an arrow/Home/End key in a roving group, or null when the key isn't handled. */
export function rovingIndex(
  key: string,
  current: number,
  count: number,
  orientation: RovingOrientation = "horizontal",
): number | null {
  if (count <= 0) return null;
  const prev = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
  const next = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
  switch (key) {
    case prev:
      return (current - 1 + count) % count;
    case next:
      return (current + 1) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
