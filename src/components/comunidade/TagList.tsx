/** Keyword tags of a post, as small "#tag" chips. */
export function TagList({ tags, className = "" }: { tags: string[]; className?: string }) {
  if (!tags.length) return null;
  return (
    <ul aria-label="Tags" className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map((tag) => (
        <li key={tag} className="rounded-full bg-white/[0.07] px-2 py-px text-xs font-semibold text-areia">
          #{tag}
        </li>
      ))}
    </ul>
  );
}
