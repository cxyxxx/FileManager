import { useEffect, useMemo, useState } from "react";
import { navigateTo } from "../../app/router/routes";
import { formatDate } from "../../features/files/components/FileTable";
import { getFilePageData } from "../../features/files/api/filesApi";
import { useImeSafeHandlers } from "../../shared/lib/ime";
import type { FilePageData } from "../../shared/types/domain";
import { createDerivedVersion } from "../../features/versions/api/versionsApi";

export function VersionsPage() {
  const fileId = useMemo(() => new URLSearchParams(window.location.search).get("fileId") ?? "", []);
  const [data, setData] = useState<FilePageData | null>(null);
  const [loading, setLoading] = useState(Boolean(fileId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) {
      setLoading(false);
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getFilePageData(fileId)
      .then((next: FilePageData) => {
        if (!cancelled) {
          setData(next);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>版本链</h2>
        <p>查看当前文件及其派生版本，并快速创建新版本。</p>
      </div>
      {loading ? <p className="empty-state">正在加载版本信息...</p> : null}
      {!fileId ? <p className="empty-state">请从文件详情页或其他文件入口带上 `?fileId=` 打开。</p> : null}
      {error ? <p className="error-text">加载失败：{error}</p> : null}
      {!loading && data ? (
        <div className="detail-grid">
          <div>
            <div className="section-heading">
              <h3>{data.file.originalName}</h3>
              <p>{data.file.relativePath}</p>
            </div>
            <div className="toolbar">
              <button className="button secondary" type="button" onClick={() => navigateTo(`/files/${encodeURIComponent(data.file.id)}`)}>
                打开文件详情
              </button>
            </div>
            <VersionCreateCard fileId={data.file.id} onCreated={(nextId) => navigateTo(`/files/${encodeURIComponent(nextId)}`)} />
            <h3 className="subheading">版本链</h3>
            {data.versions.length > 0 ? (
              <div className="version-list">
                {data.versions.map((version) => (
                  <button
                    className={version.fileId === data.file.id ? "version-item active" : "version-item"}
                    key={version.id}
                    type="button"
                    onClick={() => navigateTo(`/files/${encodeURIComponent(version.fileId)}`)}
                  >
                    <span>{version.role}</span>
                    <small>{version.isCore ? "core" : `created ${formatDate(version.createdAt)}`}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">暂无版本链数据。</p>
            )}
          </div>
          <aside className="side-panel">
            <h3>当前文件</h3>
            <dl className="detail-list">
              <dt>文件名</dt>
              <dd>{data.file.originalName}</dd>
              <dt>导入时间</dt>
              <dd>{formatDate(data.file.importedAt ?? data.file.createdAt)}</dd>
              <dt>状态</dt>
              <dd>{data.file.status}</dd>
              <dt>来源</dt>
              <dd>{data.file.importRootName ?? data.file.sourcePath ?? "-"}</dd>
            </dl>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function VersionCreateCard({ fileId, onCreated }: { fileId: string; onCreated: (fileId: string) => void }) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ime = useImeSafeHandlers();

  async function createVersion() {
    setCreating(true);
    setError(null);
    try {
      const created = await createDerivedVersion(fileId, {
        name: name.trim() || undefined,
      });
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="version-create-card" {...ime}>
      <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="新版本文件名（可选）" />
      <button className="button" type="button" disabled={creating} onClick={() => void createVersion()}>
        {creating ? "创建中..." : "创建新版本"}
      </button>
      {error ? <p className="error-text">创建失败：{error}</p> : null}
    </div>
  );
}
