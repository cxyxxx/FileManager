import { useCallback, useEffect, useState } from "react";
import { navigateTo } from "../../app/router/routes";
import { getTagPageData } from "../../features/queries/api/queriesApi";
import { FileTable, formatDate, summaryPreview } from "../../features/files/components/FileTable";
import { TagBadge } from "../../features/tags/components/TagBadge";
import type { TagPageData } from "../../shared/types/domain";

type TagPageMode = "structure" | "aggregation";

export function TagDetailPage({ tagId }: { tagId: string }) {
  const [mode, setMode] = useState<TagPageMode>("structure");
  const [data, setData] = useState<TagPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tagId) {
      setError("缺少 tagId");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await getTagPageData(tagId, mode));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [tagId, mode]);

  useEffect(() => {
    setMode("structure");
  }, [tagId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="panel">
      <div className="toolbar">
        <button className="button secondary" type="button" onClick={() => navigateTo("/tags")}>
          返回 Tags
        </button>
        <button className="button secondary" type="button" onClick={load}>
          刷新
        </button>
      </div>
      {loading ? <p className="empty-state">正在加载 tag 详情...</p> : null}
      {error ? <p className="error-text">加载失败：{error}</p> : null}
      {!loading && data ? (
        <>
          <div className="tag-detail-header">
            <div>
              <h2>{data.tag.name}</h2>
              <p>
                {data.tag.tagType} · 直接文件 {data.totalDirectFileCount}
                {mode === "aggregation" ? ` · 聚合文件 ${data.totalAggregateFileCount ?? 0}` : ""}
              </p>
            </div>
            <div className="mode-toggle" role="group" aria-label="Tag page mode">
              <button className={mode === "structure" ? "active" : ""} type="button" onClick={() => setMode("structure")}>
                结构模式
              </button>
              <button className={mode === "aggregation" ? "active" : ""} type="button" onClick={() => setMode("aggregation")}>
                聚合模式
              </button>
            </div>
          </div>
          {mode === "structure" ? <StructureView data={data} /> : <AggregationView data={data} />}
        </>
      ) : null}
    </section>
  );
}

function StructureView({ data }: { data: TagPageData }) {
  return (
    <div className="two-column">
      <section>
        <h3 className="subheading">子 Tag</h3>
        {data.children.length > 0 ? (
          <div className="list-stack">
            {data.children.map((tag) => (
              <button className="list-row clickable" key={tag.id} type="button" onClick={() => navigateTo(`/tags/${encodeURIComponent(tag.id)}`)}>
                <span>{tag.name}</span>
                <small>{tag.tagType}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-block">
            <strong>暂无子 tag</strong>
            <span>可以在 Tags 页面创建子 tag。</span>
          </div>
        )}
      </section>
      <section>
        <h3 className="subheading">直接文件</h3>
        <FileTable
          files={data.directFiles}
          emptyTitle="暂无直接文件"
          emptyDescription="结构模式只展示直接绑定当前 tag 的文件。"
          onOpen={(file) => navigateTo(`/files/${encodeURIComponent(file.id)}`)}
        />
      </section>
    </div>
  );
}

function AggregationView({ data }: { data: TagPageData }) {
  if (data.aggregateFiles.length === 0) {
    return (
      <div className="empty-block">
        <strong>暂无聚合结果</strong>
        <span>当前 tag 及其后代 tag 还没有命中文件。</span>
      </div>
    );
  }

  return (
    <div className="file-card-grid">
      {data.aggregateFiles.map(({ file, matchedTags }) => (
        <button className="file-card" key={file.id} type="button" onClick={() => navigateTo(`/files/${encodeURIComponent(file.id)}`)}>
          <strong>{file.originalName}</strong>
          <p>{summaryPreview(file.summary)}</p>
          <span>{formatDate(file.createdAt)}</span>
          <div className="badge-row">
            {matchedTags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
