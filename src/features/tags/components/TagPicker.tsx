import type { Tag } from "../../../shared/types/domain";

type TagPickerProps = {
  tags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabledIds?: string[];
};

export function TagPicker({ tags, selectedIds, onChange, disabledIds = [] }: TagPickerProps) {
  if (tags.length === 0) {
    return <p className="empty-state">暂无 tag，请先在 Tags 页面创建。</p>;
  }

  const disabled = new Set(disabledIds);

  return (
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
                  onChange([...selectedIds, tag.id]);
                } else {
                  onChange(selectedIds.filter((id) => id !== tag.id));
                }
              }}
            />
            <span>{tag.name}</span>
            <small>{tag.tagType}</small>
          </label>
        );
      })}
    </div>
  );
}
