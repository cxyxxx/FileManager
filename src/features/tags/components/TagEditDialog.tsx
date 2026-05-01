import { FormEvent, useEffect, useState } from "react";
import type { Tag, UpdateTagPayload } from "../../../shared/types/domain";
import { useImeSafeHandlers } from "../../../shared/lib/ime";

type TagEditDialogProps = {
  tag: Tag | null;
  tags: Tag[];
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (tagId: string, payload: UpdateTagPayload) => void;
  onDelete: (tagId: string) => void;
};

export function TagEditDialog({ tag, tags, saving = false, error, onClose, onSave, onDelete }: TagEditDialogProps) {
  const [name, setName] = useState("");
  const [tagType, setTagType] = useState("topic");
  const [parentId, setParentId] = useState("");
  const [isTopicEnabled, setIsTopicEnabled] = useState(true);
  const ime = useImeSafeHandlers();

  useEffect(() => {
    setName(tag?.name ?? "");
    setTagType(tag?.tagType ?? "topic");
    setParentId(tag?.parentId ?? "");
    setIsTopicEnabled(tag?.isTopicEnabled ?? true);
  }, [tag]);

  if (!tag) {
    return null;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!tag) {
      return;
    }
    onSave(tag.id, {
      name: name.trim(),
      tagType,
      parentId: parentId || null,
      isTopicEnabled,
    });
  }

  return (
    <div className="drawer-panel">
      <div className="section-title-row">
        <h3>编辑 tag</h3>
        <button className="button secondary small" type="button" disabled={saving} onClick={onClose}>
          关闭
        </button>
      </div>
      <form className="edit-form" onSubmit={submit} {...ime}>
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tag name" />
        <select className="input" value={tagType} onChange={(event) => setTagType(event.target.value)}>
          <option value="topic">topic</option>
          <option value="status">status</option>
          <option value="source">source</option>
          <option value="custom">custom</option>
        </select>
        <select className="input" value={parentId} onChange={(event) => setParentId(event.target.value)}>
          <option value="">无父 tag</option>
          {tags
            .filter((candidate) => candidate.id !== tag.id)
            .map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
        </select>
        <label className="check-row">
          <input type="checkbox" checked={isTopicEnabled} onChange={(event) => setIsTopicEnabled(event.target.checked)} />
          <span>topicEnabled</span>
        </label>
        <div className="toolbar">
          <button className="button" type="submit" disabled={saving || !name.trim()}>
            {saving ? "保存中..." : "保存修改"}
          </button>
          <button className="button danger" type="button" disabled={saving} onClick={() => onDelete(tag.id)}>
            删除 tag
          </button>
        </div>
      </form>
      {error ? <p className="error-text">操作失败：{error}</p> : null}
    </div>
  );
}
