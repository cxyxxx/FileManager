import type { ReactNode } from "react";
import type { FileRecord } from "../../../shared/types/domain";

type FileTableProps = {
  files: FileRecord[];
  emptyTitle?: string;
  emptyDescription?: string;
  onOpen?: (file: FileRecord) => void;
  action?: (file: FileRecord) => ReactNode;
  tagCountLabel?: (file: FileRecord) => string;
};

export function FileTable({
  files,
  emptyTitle = "暂无文件",
  emptyDescription,
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
            <td className="muted">暂未生成</td>
            <td>{tagCountLabel?.(file) ?? "-"}</td>
            {action ? <td>{action(file)}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
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
