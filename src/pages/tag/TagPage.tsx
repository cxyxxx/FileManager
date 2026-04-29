import { FormEvent, useState } from "react";
import { navigateTo } from "../../app/router/routes";
import { setTagParent } from "../../features/tags/api/tagsApi";
import { TagTree } from "../../features/tags/components/TagTree";
import { useTags } from "../../features/tags/hooks/useTags";

export function TagPage() {
  const { tags, loading, error, create, refresh } = useTags();
  const [name, setName] = useState("");
  const [tagType, setTagType] = useState("topic");
  const [parentId, setParentId] = useState("");
  const [editingTagId, setEditingTagId] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !tagType.trim()) {
      return;
    }
    setActionError(null);
    try {
      await create({
        name: name.trim(),
        tagType: tagType.trim(),
        parentId: parentId || null,
        isTopicEnabled: tagType === "topic",
      });
      setName("");
      setParentId("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onSetParent(event: FormEvent) {
    event.preventDefault();
    if (!editingTagId) {
      return;
    }
    if (editingTagId === newParentId) {
      setActionError("不能选择自己作为父 tag");
      return;
    }
    setActionError(null);
    try {
      await setTagParent(editingTagId, newParentId || null);
      setEditingTagId("");
      setNewParentId("");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Tag 结构</h2>
        <p>创建 topic/status/source/custom tag，并用父子关系组织资料。</p>
      </div>
      <form className="toolbar" onSubmit={onSubmit}>
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tag name"
        />
        <select
          className="input"
          value={tagType}
          onChange={(event) => setTagType(event.target.value)}
        >
          <option value="topic">topic</option>
          <option value="status">status</option>
          <option value="source">source</option>
          <option value="custom">custom</option>
        </select>
        <select className="input" value={parentId} onChange={(event) => setParentId(event.target.value)}>
          <option value="">无父 tag</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
        <button className="button" type="submit">
          创建 tag
        </button>
      </form>
      <form className="toolbar" onSubmit={onSetParent}>
        <select className="input" value={editingTagId} onChange={(event) => setEditingTagId(event.target.value)}>
          <option value="">选择要调整的 tag</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
        <select className="input" value={newParentId} onChange={(event) => setNewParentId(event.target.value)}>
          <option value="">设为根 tag</option>
          {tags
            .filter((tag) => tag.id !== editingTagId)
            .map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
        </select>
        <button className="button secondary" type="submit">
          设置父 tag
        </button>
      </form>
      {loading ? <p className="empty-state">正在加载 tag...</p> : null}
      {error ? <p className="error-text">加载失败：{error}</p> : null}
      {actionError ? <p className="error-text">操作失败：{actionError}</p> : null}
      {!loading && !error ? <TagTree tags={tags} onOpen={(tag) => navigateTo(`/tags/${encodeURIComponent(tag.id)}`)} /> : null}
    </section>
  );
}
