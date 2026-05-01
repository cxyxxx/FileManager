import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { FileRecord } from "../../../shared/types/domain";
import { summaryPreview } from "./FileTable";

type FileTreeListProps = {
  files: FileRecord[];
  emptyTitle?: string;
  emptyDescription?: string;
  onOpen?: (file: FileRecord) => void;
  action?: (file: FileRecord) => ReactNode;
  tagCountLabel?: (file: FileRecord) => string;
};

type FileTreeGroup = {
  id: string;
  label: string;
  importedAt: string | null;
  rootPath: string | null;
  nodes: FileTreeNode[];
};

type FileTreeNode =
  | {
      kind: "folder";
      id: string;
      name: string;
      children: FileTreeNode[];
    }
  | {
      kind: "file";
      id: string;
      file: FileRecord;
    };

export function FileTreeList({
  files,
  emptyTitle = "暂无文件",
  emptyDescription,
  onOpen,
  action,
  tagCountLabel,
}: FileTreeListProps) {
  const groups = useMemo(() => buildFileTreeGroups(files), [files]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedIds((current) => {
      const next = new Set(current);
      for (const group of groups) {
        next.add(group.id);
      }
      return next;
    });
  }, [groups]);

  function toggle(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <div className="empty-block">
        <strong>{emptyTitle}</strong>
        {emptyDescription ? <span>{emptyDescription}</span> : null}
      </div>
    );
  }

  return (
    <div className="file-tree-list">
      {groups.map((group) => (
        <section className="file-tree-group" key={group.id}>
          <button className="file-tree-group-header" type="button" onClick={() => toggle(group.id)}>
            <strong>{group.label}</strong>
            <small>{group.importedAt ? `导入时间 ${formatImportDate(group.importedAt)}` : group.rootPath ?? "未记录导入来源"}</small>
          </button>
          {expandedIds.has(group.id) ? (
            <div className="file-tree-group-body">
              {group.nodes.map((node) => (
                <FileTreeNodeView
                  key={node.id}
                  node={node}
                  expandedIds={expandedIds}
                  onToggle={toggle}
                  onOpen={onOpen}
                  action={action}
                  tagCountLabel={tagCountLabel}
                />
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function FileTreeNodeView({
  node,
  expandedIds,
  onToggle,
  onOpen,
  action,
  tagCountLabel,
}: {
  node: FileTreeNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onOpen?: (file: FileRecord) => void;
  action?: (file: FileRecord) => ReactNode;
  tagCountLabel?: (file: FileRecord) => string;
}) {
  if (node.kind === "folder") {
    const open = expandedIds.has(node.id);
    return (
      <div className="file-tree-folder">
        <button className="file-tree-folder-button" type="button" onClick={() => onToggle(node.id)}>
          <span>{open ? "▾" : "▸"}</span>
          <strong>{node.name}</strong>
        </button>
        {open ? (
          <div className="file-tree-children">
            {node.children.map((child) => (
              <FileTreeNodeView
                key={child.id}
                node={child}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onOpen={onOpen}
                action={action}
                tagCountLabel={tagCountLabel}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const file = node.file;
  return (
    <div className="file-tree-file-row">
      <button className="file-tree-file-button" type="button" onClick={() => onOpen?.(file)}>
        <strong>{file.originalName}</strong>
        <span>{fileType(file)}</span>
        <small>{summaryPreview(file.summary)}</small>
      </button>
      <div className="toolbar compact-actions file-tree-actions">
        {tagCountLabel ? <span className="status-chip">{tagCountLabel(file)}</span> : null}
        {action ? action(file) : null}
      </div>
    </div>
  );
}

function buildFileTreeGroups(files: FileRecord[]): FileTreeGroup[] {
  const grouped = new Map<string, FileRecord[]>();
  for (const file of files) {
    const key = file.importBatchId ?? file.id;
    const current = grouped.get(key) ?? [];
    current.push(file);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .map(([id, groupFiles]) => {
      const first = groupFiles[0];
      const label = first.importRootName ?? first.originalName;
      const importedAt = first.importedAt ?? first.createdAt ?? null;
      const rootPath = first.importRootPath ?? first.sourcePath;
      return {
        id,
        label,
        importedAt,
        rootPath,
        nodes: buildNodesForGroup(groupFiles, id),
      };
    })
    .sort((left, right) => {
      const leftDate = left.importedAt ?? "";
      const rightDate = right.importedAt ?? "";
      return rightDate.localeCompare(leftDate) || left.label.localeCompare(right.label);
    });
}

function buildNodesForGroup(files: FileRecord[], groupId: string): FileTreeNode[] {
  const rootChildren: FileTreeNode[] = [];

  for (const file of files.sort((left, right) => pathForFile(left).localeCompare(pathForFile(right)))) {
    const segments = pathForFile(file).split("/").filter(Boolean);
    insertNode(rootChildren, segments.length > 0 ? segments : [file.originalName], file, `group:${groupId}`);
  }

  return rootChildren;
}

function insertNode(children: FileTreeNode[], segments: string[], file: FileRecord, prefix: string) {
  if (segments.length <= 1) {
    children.push({
      kind: "file",
      id: `${prefix}:file:${file.id}`,
      file,
    });
    return;
  }

  const [head, ...tail] = segments;
  let folder = children.find((node): node is Extract<FileTreeNode, { kind: "folder" }> => node.kind === "folder" && node.name === head);
  if (!folder) {
    folder = {
      kind: "folder",
      id: `${prefix}:folder:${head}`,
      name: head,
      children: [],
    };
    children.push(folder);
  }
  insertNode(folder.children, tail, file, folder.id);
}

function pathForFile(file: FileRecord) {
  return (file.importRelativePath ?? file.originalName).replace(/\\/g, "/");
}

function fileType(file: FileRecord) {
  const name = file.originalName || file.storedName;
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toUpperCase() : file.status;
}

function formatImportDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}
