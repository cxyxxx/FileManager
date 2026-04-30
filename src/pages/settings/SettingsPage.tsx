import { useEffect, useState } from "react";
import { useWorkspace } from "../../app/providers/WorkspaceProvider";

export function SettingsPage() {
  const { workspace, loading, error, initialize, refresh } = useWorkspace();
  const [path, setPath] = useState(workspace?.rootPath ?? "");
  const [autoExtract, setAutoExtract] = useState(() => window.localStorage.getItem("filesManager.autoExtractContent") === "true");

  useEffect(() => {
    setPath(workspace?.rootPath ?? "");
  }, [workspace?.rootPath]);

  function updateAutoExtract(enabled: boolean) {
    setAutoExtract(enabled);
    window.localStorage.setItem("filesManager.autoExtractContent", enabled ? "true" : "false");
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Workspace</h2>
        <p>查看当前 workspace、数据库和文件存储位置。</p>
      </div>
      <div className="toolbar">
        <input
          className="input"
          value={path}
          onChange={(event) => setPath(event.target.value)}
          placeholder="Workspace path"
        />
        <button className="button" type="button" onClick={() => initialize(path || undefined)}>
          初始化
        </button>
        <button className="button secondary" type="button" onClick={refresh}>
          刷新
        </button>
      </div>
      {loading ? <p className="empty-state">正在加载 workspace 信息...</p> : null}
      {error ? <p className="error-text">workspace 未初始化或加载失败：{error}</p> : null}
      {workspace ? (
        <>
          <dl className="detail-list">
            <dt>Workspace 路径</dt>
            <dd>{workspace.rootPath}</dd>
            <dt>数据库状态</dt>
            <dd>ready</dd>
            <dt>数据库路径</dt>
            <dd>{workspace.dbPath}</dd>
            <dt>文件存储路径</dt>
            <dd>{workspace.filesPath}</dd>
            <dt>预览缓存路径</dt>
            <dd>{workspace.previewsPath}</dd>
            <dt>应用版本</dt>
            <dd>0.1.0</dd>
          </dl>
          <section className="content-section">
            <h3>导入处理</h3>
            <label className="check-row inline-check">
              <input type="checkbox" checked={autoExtract} onChange={(event) => updateAutoExtract(event.target.checked)} />
              <span>导入后自动抽取文本内容</span>
            </label>
          </section>
        </>
      ) : (
        <div className="empty-block">
          <strong>workspace 未初始化</strong>
          <span>点击初始化后，应用会创建所需目录和数据库。</span>
        </div>
      )}
    </section>
  );
}
