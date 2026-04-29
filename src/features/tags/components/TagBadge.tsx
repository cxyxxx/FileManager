import type { Tag } from "../../../shared/types/domain";

export function TagBadge({ tag }: { tag: Tag }) {
  return (
    <span className="tag-badge" title={tag.id}>
      {tag.name}
      <small>{tag.tagType}</small>
    </span>
  );
}
