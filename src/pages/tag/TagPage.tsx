import { FormEvent, useState } from "react";
import { TagList } from "../../features/tags/components/TagList";
import { useTags } from "../../features/tags/hooks/useTags";

export function TagPage() {
  const { tags, loading, error, create } = useTags();
  const [name, setName] = useState("");
  const [tagType, setTagType] = useState("topic");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !tagType.trim()) {
      return;
    }
    await create({ name: name.trim(), tagType: tagType.trim(), isTopicEnabled: true });
    setName("");
  }

  return (
    <section className="panel">
      <form className="toolbar" onSubmit={onSubmit}>
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tag name"
        />
        <input
          className="input"
          value={tagType}
          onChange={(event) => setTagType(event.target.value)}
          placeholder="Tag type"
        />
        <button className="button" type="submit">
          Create
        </button>
      </form>
      {loading ? <p className="empty-state">Loading tags.</p> : null}
      {error ? <p className="empty-state">{error}</p> : null}
      {!loading && !error ? <TagList tags={tags} /> : null}
    </section>
  );
}
