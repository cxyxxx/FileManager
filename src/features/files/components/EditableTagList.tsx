import { useEffect, useMemo, useState } from "react";
import type { Tag } from "../../../shared/types/domain";
import { TagBadge } from "../../tags/components/TagBadge";
import { TagPicker } from "../../tags/components/TagPicker";

type EditableTagListProps = {
  allTags: Tag[];
  attachedTags: Tag[];
  saving?: boolean;
  error?: string | null;
  onSave: (tagIds: string[]) => Promise<void> | void;
};

export function EditableTagList({ allTags, attachedTags, saving = false, error, onSave }: EditableTagListProps) {
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(attachedTags.map((tag) => tag.id));
  const tagById = useMemo(() => new Map(allTags.map((tag) => [tag.id, tag])), [allTags]);

  useEffect(() => {
    if (!editing) {
      setSelectedIds(attachedTags.map((tag) => tag.id));
    }
  }, [attachedTags, editing]);

  async function save() {
    await onSave(selectedIds);
    setEditing(false);
  }

  return (
    <section className="content-section">
      <div className="section-title-row">
        <h3>Tags</h3>
        <div className="toolbar compact-actions">
          {editing ? (
            <>
              <button className="button secondary small" type="button" disabled={saving} onClick={() => setEditing(false)}>
                取消
              </button>
              <button className="button small" type="button" disabled={saving} onClick={save}>
                {saving ? "保存中..." : "保存 tag"}
              </button>
            </>
          ) : (
            <button className="button secondary small" type="button" onClick={() => setEditing(true)}>
              编辑 tags
            </button>
          )}
        </div>
      </div>
      {editing ? (
        <>
          <div className="badge-row tag-editing-row">
            {selectedIds.length > 0 ? (
              selectedIds.map((tagId) => {
                const tag = tagById.get(tagId);
                if (!tag) {
                  return null;
                }
                return (
                  <button className="tag-remove-button" key={tag.id} type="button" onClick={() => setSelectedIds(selectedIds.filter((id) => id !== tag.id))}>
                    <TagBadge tag={tag} />
                    <span>移除</span>
                  </button>
                );
              })
            ) : (
              <span className="muted">暂无 tag</span>
            )}
          </div>
          <TagPicker tags={allTags} selectedIds={selectedIds} onChange={setSelectedIds} />
          {error ? <p className="error-text">保存失败：{error}</p> : null}
        </>
      ) : (
        <div className="badge-row">
          {attachedTags.length > 0 ? attachedTags.map((tag) => <TagBadge key={tag.id} tag={tag} />) : <span className="muted">暂无 tag</span>}
        </div>
      )}
    </section>
  );
}
