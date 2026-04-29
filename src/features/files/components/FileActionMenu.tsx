type FileActionMenuProps = {
  archived?: boolean;
  busy?: boolean;
  onOpen: () => void;
  onReveal: () => void;
  onArchive: () => void;
  onRestore?: () => void;
};

export function FileActionMenu({ archived = false, busy = false, onOpen, onReveal, onArchive, onRestore }: FileActionMenuProps) {
  return (
    <div className="action-grid">
      <button className="button secondary" type="button" disabled={busy} onClick={onOpen}>
        打开文件
      </button>
      <button className="button secondary" type="button" disabled={busy} onClick={onReveal}>
        在文件夹中显示
      </button>
      {archived && onRestore ? (
        <button className="button" type="button" disabled={busy} onClick={onRestore}>
          恢复归档
        </button>
      ) : (
        <button className="button danger" type="button" disabled={busy} onClick={onArchive}>
          归档文件
        </button>
      )}
    </div>
  );
}
