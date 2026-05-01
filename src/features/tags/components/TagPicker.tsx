import { FormEvent, useState } from "react";
import type { Tag } from "../../../shared/types/domain";
import { useImeSafeHandlers } from "../../../shared/lib/ime";

type TagCreationPayload = {
  name: string;
  tagType: string;
  parentId?: string | null;
  isTopicEnabled?: boolean;
};

type TagPickerProps = {
  tags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabledIds?: string[];
  onCreateTag?: (payload: TagCreationPayload) => Promise<Tag> | Promise<void> | Tag | void;
  createDefaults?: Partial<TagCreationPayload>;
};

export function TagPicker({
  tags,
  selectedIds,
  onChange,
  disabledIds = [],
  onCreateTag,
  createDefaults,
}: TagPickerProps) {
  const ime = useImeSafeHandlers();
  const [creatingName, setCreatingName] = useState("");
  const [creatingType, setCreatingType] = useState(createDefaults?.tagType ?? "topic");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function toggleTag(tagId: string) {
    onChange(selectedIds.includes(tagId) ? selectedIds.filter((id) => id !== tagId) : [...selectedIds, tagId]);
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    const name = creatingName.trim();
    if (!name || !onCreateTag) {
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await onCreateTag({
        name,
        tagType: creatingType,
        parentId: createDefaults?.parentId ?? null,
        isTopicEnabled: createDefaults?.isTopicEnabled ?? (creatingType === "topic"),
      });
      if (created && typeof created === "object" && "id" in created) {
        onChange(selectedIds.includes(created.id) ? selectedIds : [...selectedIds, created.id]);
      }
      setCreatingName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  if (tags.length === 0) {
    return (
      <div className="tag-picker-shell">
        {onCreateTag ? (
          <form className="tag-picker-create" onSubmit={submitCreate} {...ime}>
            <strong>随用随建</strong>
            <input
              className="input"
              value={creatingName}
              onChange={(event) => setCreatingName(event.target.value)}
              placeholder="新 tag 名称"
            />
            <select className="input" value={creatingType} onChange={(event) => setCreatingType(event.target.value)}>
              <option value="topic">topic</option>
              <option value="status">status</option>
              <option value="source">source</option>
              <option value="custom">custom</option>
            </select>
            <button className="button secondary" type="submit" disabled={creating || !creatingName.trim()}>
              {creating ? "创建中..." : "创建 tag"}
            </button>
            {createError ? <small className="error-inline">{createError}</small> : null}
          </form>
        ) : null}
        <p className="empty-state">暂无 tag，请先在 Tags 页面创建。</p>
      </div>
    );
  }

  const disabled = new Set(disabledIds);

  return (
    <div className="tag-picker-shell">
      {onCreateTag ? (
        <form className="tag-picker-create" onSubmit={submitCreate} {...ime}>
          <strong>随用随建</strong>
          <div className="toolbar compact-actions">
            <input
              className="input"
              value={creatingName}
              onChange={(event) => setCreatingName(event.target.value)}
              placeholder="新 tag 名称"
            />
            <select className="input" value={creatingType} onChange={(event) => setCreatingType(event.target.value)}>
              <option value="topic">topic</option>
              <option value="status">status</option>
              <option value="source">source</option>
              <option value="custom">custom</option>
            </select>
            <button className="button secondary" type="submit" disabled={creating || !creatingName.trim()}>
              {creating ? "创建中..." : "创建 tag"}
            </button>
          </div>
          {createError ? <small className="error-inline">{createError}</small> : null}
        </form>
      ) : null}
      <div className="tag-picker">
      {tags.map((tag) => {
        const checked = selectedIds.includes(tag.id);
        return (
          <label className={disabled.has(tag.id) ? "tag-option disabled" : "tag-option"} key={tag.id}>
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled.has(tag.id)}
              onChange={(event) => {
                if (event.target.checked) {
                  toggleTag(tag.id);
                } else {
                  toggleTag(tag.id);
                }
              }}
            />
            <span>{tag.name}</span>
            <small>{tag.tagType}</small>
          </label>
        );
      })}
      </div>
    </div>
  );
}
