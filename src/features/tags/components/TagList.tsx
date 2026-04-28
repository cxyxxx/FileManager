import type { Tag } from "../../../shared/types/domain";

export function TagList({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) {
    return <p className="empty-state">No tags yet.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Topic</th>
          <th>Parent</th>
        </tr>
      </thead>
      <tbody>
        {tags.map((tag) => (
          <tr key={tag.id}>
            <td>{tag.name}</td>
            <td>{tag.tagType}</td>
            <td>{tag.isTopicEnabled ? "Enabled" : "Off"}</td>
            <td>{tag.parentId ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
