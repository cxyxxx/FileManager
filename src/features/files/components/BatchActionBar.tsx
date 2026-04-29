type BatchActionBarProps = {
  selectedCount: number;
  busy?: boolean;
  onAddTags: () => void;
  onArchive: () => void;
  onClear: () => void;
};

export function BatchActionBar({ selectedCount, busy = false, onAddTags, onArchive, onClear }: BatchActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="batch-bar">
      <strong>已选择 {selectedCount} 个文件</strong>
      <button className="button secondary small" type="button" disabled={busy} onClick={onAddTags}>
        批量添加 tag
      </button>
      <button className="button danger small" type="button" disabled={busy} onClick={onArchive}>
        批量归档
      </button>
      <button className="button secondary small" type="button" disabled={busy} onClick={onClear}>
        取消选择
      </button>
    </div>
  );
}
