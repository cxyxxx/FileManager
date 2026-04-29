import { useCallback, useEffect, useState } from "react";
import { navigateTo } from "../../app/router/routes";
import { attachTagsToFile, getFilePageData } from "../../features/files/api/filesApi";
import { formatBytes, formatDate } from "../../features/files/components/FileTable";
import { TagBadge } from "../../features/tags/components/TagBadge";
import { TagPicker } from "../../features/tags/components/TagPicker";
import { useTags } from "../../features/tags/hooks/useTags";
import { getVersionChain } from "../../features/versions/api/versionsApi";
import type { FilePageData, VersionNode } from "../../shared/types/domain";

export function FileDetailPage({ fileId }: { fileId: string }) {
  const [data, setData] = useState<FilePageData | null>(null);
  const [versions, setVersions] = useState<VersionNode[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tags } = useTags();

  const load = useCallback(async () => {
    if (!fileId) {
      setError("缺少 fileId");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const pageData = await getFilePageData(fileId);
      setData(pageData);
      setVersions(await getVersionChain(fileId).catch(() => []));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveTags() {
    if (selectedTagIds.length === 0) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await attachTagsToFile(fileId, selectedTagIds);
      setSelectedTagIds([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const attachedIds = data?.tags.map((tag) => tag.id) ?? [];

  return (
    <section className="panel">
      <div className="toolbar">
        <button className="button secondary" type="button" onClick={() => window.history.back()}>
          返回
        </button>
        <button className="button secondary" type="button" onClick={load}>
          刷新
        </button>
      </div>
      {loading ? <p className="empty-state">正在加载文件详情...</p> : null}
      {error ? <p className="error-text">加载失败：{error}</p> : null}
      {!loading && data ? (
        <div className="detail-grid">
          <div>
            <div className="section-heading">
              <h2>{data.file.originalName}</h2>
              <p>{data.file.relativePath}</p>
            </div>
            <dl className="detail-list">
              <dt>文件类型</dt>
              <dd>{fileExtension(data.file.originalName)}</dd>
              <dt>文件大小</dt>
              <dd>{formatBytes(data.file.sizeBytes)}</dd>
              <dt>导入时间</dt>
              <dd>{formatDate(data.file.createdAt)}</dd>
              <dt>状态</dt>
              <dd>{data.file.status}</dd>
              <dt>SHA256</dt>
              <dd>{data.file.sha256}</dd>
            </dl>
          </div>
          <aside className="side-panel">
            <h3>当前 tags</h3>
            <div className="badge-row">
              {data.tags.length > 0 ? data.tags.map((tag) => <TagBadge key={tag.id} tag={tag} />) : <span className="muted">暂无 tag</span>}
            </div>
            <h3>添加 tag</h3>
            <TagPicker tags={tags} selectedIds={selectedTagIds} onChange={setSelectedTagIds} disabledIds={attachedIds} />
            <button className="button full-width" type="button" disabled={saving || selectedTagIds.length === 0} onClick={saveTags}>
              {saving ? "保存中..." : "添加 tag"}
            </button>
            <h3>版本信息</h3>
            {versions.length > 0 ? (
              <div className="version-list">
                {versions.map((version) => (
                  <button
                    className={version.fileId === fileId ? "version-item active" : "version-item"}
                    key={version.id}
                    type="button"
                    onClick={() => navigateTo(`/files/${encodeURIComponent(version.fileId)}`)}
                  >
                    <span>{version.role}</span>
                    <small>{version.isCore ? "core" : "derived"}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">暂无版本链数据。</p>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function fileExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toUpperCase() : "未知";
}
