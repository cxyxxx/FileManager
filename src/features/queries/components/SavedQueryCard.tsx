import type { SavedQuery } from "../../../shared/types/domain";

type SavedQueryCardProps = {
  query: SavedQuery;
  busy?: boolean;
  onRun: (query: SavedQuery) => void;
  onRename: (query: SavedQuery) => void;
  onDelete: (query: SavedQuery) => void;
};

export function SavedQueryCard({ query, busy = false, onRun, onRename, onDelete }: SavedQueryCardProps) {
  const subtitle =
    query.queryType === "keyword" && "keyword" in query.payload
      ? `keyword query · ${query.payload.keyword}`
      : `tag query · ${query.mode.toUpperCase()} · ${query.tagIds.length} tags`;
  return (
    <article className="saved-query-card">
      <div>
        <strong>{query.name}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="toolbar compact-actions">
        <button className="button secondary small" type="button" disabled={busy} onClick={() => onRun(query)}>
          执行
        </button>
        <button className="button secondary small" type="button" disabled={busy} onClick={() => onRename(query)}>
          重命名
        </button>
        <button className="button danger small" type="button" disabled={busy} onClick={() => onDelete(query)}>
          删除
        </button>
      </div>
    </article>
  );
}
