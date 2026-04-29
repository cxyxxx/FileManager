import type { ReactNode } from "react";
import type { Tag } from "../../../shared/types/domain";

export type TagTreeNode = Tag & {
  children: TagTreeNode[];
};

type TagTreeProps = {
  tags: Tag[];
  currentId?: string;
  onOpen?: (tag: Tag) => void;
  action?: (tag: Tag) => ReactNode;
};

export function TagTree({ tags, currentId, onOpen, action }: TagTreeProps) {
  const tree = buildTagTree(tags);
  if (tree.length === 0) {
    return (
      <div className="empty-block">
        <strong>暂无 tag</strong>
        <span>创建第一个 topic tag 后，就可以开始整理 Inbox。</span>
      </div>
    );
  }

  return (
    <div className="tag-tree">
      {tree.map((node) => (
        <TagTreeItem key={node.id} node={node} currentId={currentId} onOpen={onOpen} action={action} />
      ))}
    </div>
  );
}

function TagTreeItem({
  node,
  currentId,
  onOpen,
  action,
}: {
  node: TagTreeNode;
  currentId?: string;
  onOpen?: (tag: Tag) => void;
  action?: (tag: Tag) => ReactNode;
}) {
  return (
    <div className="tag-tree-item">
      <div className={currentId === node.id ? "tag-tree-row active" : "tag-tree-row"}>
        <button className="tag-tree-button" type="button" onClick={() => onOpen?.(node)}>
          <span>{node.name}</span>
          <small>{node.tagType}</small>
        </button>
        {action?.(node)}
      </div>
      {node.children.length > 0 ? (
        <div className="tag-tree-children">
          {node.children.map((child) => (
            <TagTreeItem key={child.id} node={child} currentId={currentId} onOpen={onOpen} action={action} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function buildTagTree(tags: Tag[]) {
  const byId = new Map<string, TagTreeNode>();
  const roots: TagTreeNode[] = [];
  for (const tag of tags) {
    byId.set(tag.id, { ...tag, children: [] });
  }
  for (const tag of tags) {
    const node = byId.get(tag.id);
    if (!node) {
      continue;
    }
    const parent = tag.parentId ? byId.get(tag.parentId) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
