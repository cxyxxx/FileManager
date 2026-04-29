import type { ReactNode } from "react";
import type { FileRecord } from "../../../shared/types/domain";

type FileTableProps = {
  files: FileRecord[];
  emptyTitle?: string;
  emptyDescription?: string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelect?: (fileId: string, selected: boolean) => void;
  onOpen?: (file: FileRecord) => void;
  action?: (file: FileRecord) => ReactNode;
  tagCountLabel?: (file: FileRecord) => string;
};

export function FileTable({
  files,
  emptyTitle = "暂无文件",
  emptyDescription,
  selectable = false,
  selectedIds = [],
  onSelect,
  onOpen,
  action,
  tagCountLabel,
}: FileTableProps) {
  if (files.length === 0) {
    return (
      <div className="empty-block">
        <strong>{emptyTitle}</strong>
        {emptyDescription ? <span>{emptyDescription}</span> : null}
      </div>
    );
  }

  return (
    <table className="table">
      <thead>
        <tr>
          {selectable ? <th>选择</th> : null}
          <th>文件名</th>
          <th>类型</th>
          <th>导入时间</th>
          <th>摘要</th>
          <th>Tags</th>
          {action ? <th>操作</th> : null}
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr key={file.id}>
            {selectable ? (
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(file.id)}
                  onChange={(event) => onSelect?.(file.id, event.target.checked)}
                  aria-label={`选择 ${file.originalName}`}
                />
              </td>
            ) : null}
            <td>
              {onOpen ? (
                <button className="link-button" type="button" onClick={() => onOpen(file)}>
                  {file.originalName}
                </button>
              ) : (
                file.originalName
              )}
              <span className="muted-line">{file.sha256.slice(0, 12)}</span>
            </td>
            <td>{fileType(file)}</td>
            <td>{formatDate(file.createdAt)}</td>
            <td className="summary-cell">{summaryPreview(file.summary)}</td>
            <td>{tagCountLabel?.(file) ?? "-"}</td>
            {action ? <td>{action(file)}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function summaryPreview(summary?: string | null, limit = 120) {
  const value = summary?.trim();
  if (!value) {
    return "暂无摘要";
  }
  const chars = Array.from(value);
  return chars.length > limit ? `${chars.slice(0, limit).join("")}...` : value;
}

function fileType(file: FileRecord) {
  const name = file.originalName || file.storedName;
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toUpperCase() : file.status;
}

export function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function formatBytes(value?: number) {
  if (!value) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}
