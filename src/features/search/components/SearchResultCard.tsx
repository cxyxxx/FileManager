import { navigateTo } from "../../../app/router/routes";
import type { FileSearchResult } from "../../../shared/types/domain";
import { formatDate, summaryPreview } from "../../files/components/FileTable";
import { TagBadge } from "../../tags/components/TagBadge";

const fieldLabels: Record<string, string> = {
  fileName: "文件名",
  summary: "摘要",
  tag: "Tag",
  content: "正文",
};

export function SearchResultCard({ result }: { result: FileSearchResult }) {
  return (
    <article className="search-result-card">
      <div>
        <button className="link-button title-link" type="button" onClick={() => navigateTo(`/files/${encodeURIComponent(result.file.id)}`)}>
          {result.highlight?.fileName ?? result.file.originalName}
        </button>
        <p>{result.highlight?.summary ?? summaryPreview(result.file.summary)}</p>
        {result.highlight?.content ? <p className="content-hit">... {result.highlight.content} ...</p> : null}
      </div>
      <div className="badge-row">
        {result.matchedFields.map((field) => (
          <span className="field-chip" key={field}>
            命中 {fieldLabels[field] ?? field}
          </span>
        ))}
        <span className="field-chip">{result.file.status}</span>
      </div>
      {result.matchedTags.length > 0 ? (
        <div className="badge-row">
          {result.matchedTags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      ) : null}
      <div className="section-title-row">
        <small className="muted">更新于 {formatDate(result.file.updatedAt)}</small>
        <button className="button secondary small" type="button" onClick={() => navigateTo(`/files/${encodeURIComponent(result.file.id)}`)}>
          打开详情
        </button>
      </div>
    </article>
  );
}
