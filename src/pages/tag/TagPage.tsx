import { FormEvent, useState } from "react";
import { navigateTo } from "../../app/router/routes";
import { clearAllTags, deleteTag, updateTag } from "../../features/tags/api/tagsApi";
import { TagEditDialog } from "../../features/tags/components/TagEditDialog";
import { TagTree } from "../../features/tags/components/TagTree";
import { useTags } from "../../features/tags/hooks/useTags";
import { useImeSafeHandlers } from "../../shared/lib/ime";
import type { Tag, UpdateTagPayload } from "../../shared/types/domain";

export function TagPage() {
  const { tags, loading, error, create, refresh } = useTags();
  const ime = useImeSafeHandlers();
  const [name, setName] = useState("");
  const [tagType, setTagType] = useState("topic");
  const [parentId, setParentId] = useState("");
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [searchText, setSearchText] = useState("");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  async function onUpdateTag(tagId: string, payload: UpdateTagPayload) {
    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      const updated = await updateTag(tagId, payload);
      setEditingTag(updated);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteTag(tagId: string) {
    if (!window.confirm("确定要删除这个 tag 吗？")) {
      return;
    }
    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      await deleteTag(tagId);
      setEditingTag(null);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function clearAllTagsDebug() {
    if (!window.confirm("确认清空当前所有 tag 吗？\n这会删除数据库里的所有 tag，并解除所有文件上的 tag 关联，操作不可恢复。")) {
      return;
    }
    setClearing(true);
    setActionError(null);
    setNotice(null);
    try {
      const deletedCount = await clearAllTags();
      setEditingTag(null);
      await refresh();
      setNotice(`已清空 ${deletedCount} 个 tag`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setClearing(false);
    }
  }

  const visibleTags = searchText.trim()
    ? tags.filter((tag) => tag.name.toLowerCase().includes(searchText.trim().toLowerCase()))
    : tags;

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Tag 结构</h2>
        <p>创建 topic/status/source/custom tag，并维护 tag 树。</p>
      </div>
      <form className="toolbar" onSubmit={onSubmit} {...ime}>
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tag name" />
        <select className="input" value={tagType} onChange={(event) => setTagType(event.target.value)}>
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
      <div className="toolbar">
        <input className="input" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="搜索 tag" />
      </div>
      <div className="toolbar compact-actions">
        <button className="button danger small" type="button" disabled={clearing || saving} onClick={() => void clearAllTagsDebug()}>
          {clearing ? "清空中..." : "清空全部 tag"}
        </button>
      </div>
      {notice ? <p className="success-text">{notice}</p> : null}
      {loading ? <p className="empty-state">正在加载 tag...</p> : null}
      {error ? <p className="error-text">加载失败：{error}</p> : null}
      {actionError ? <p className="error-text">操作失败：{actionError}</p> : null}
      {!loading && !error ? (
        <div className="two-column">
          <TagTree
            tags={visibleTags}
            currentId={editingTag?.id}
            onOpen={(tag) => navigateTo(`/tags/${encodeURIComponent(tag.id)}`)}
            action={(tag) => (
              <button
                className="button secondary small"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setEditingTag(tag);
                }}
              >
                编辑
              </button>
            )}
          />
          <TagEditDialog
            tag={editingTag}
            tags={tags}
            saving={saving}
            error={actionError}
            onClose={() => setEditingTag(null)}
            onSave={(tagId, payload) => void onUpdateTag(tagId, payload)}
            onDelete={(tagId) => void onDeleteTag(tagId)}
          />
        </div>
      ) : null}
    </section>
  );
}
