import { FormEvent, useCallback, useEffect, useState } from "react";
import { navigateTo } from "../../app/router/routes";
import { importFiles, listFiles } from "../../features/files/api/filesApi";
import { FileTable } from "../../features/files/components/FileTable";
import type { FileRecord } from "../../shared/types/domain";

export function FilePage() {
  const [pathsText, setPathsText] = useState("");
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [recentImported, setRecentImported] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFiles(await listFiles());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onImport(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const paths = pathsText
      .split(/\r?\n/)
      .map((path) => path.trim())
      .filter(Boolean);
    if (paths.length === 0) {
      return;
    }
    setImporting(true);
    try {
      const imported = await importFiles(paths);
      setRecentImported(imported);
      setNotice(`导入成功：${imported.length} 个文件`);
      setPathsText("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>导入文件</h2>
        <p>每行一个本地文件路径。</p>
      </div>
      <form className="import-form" onSubmit={onImport}>
        <textarea
          className="textarea"
          value={pathsText}
          onChange={(event) => setPathsText(event.target.value)}
          placeholder="/Users/xin/Desktop/RAG 系统设计方案.pdf"
        />
        <div className="toolbar">
          <button className="button" type="submit" disabled={importing}>
            {importing ? "导入中..." : "导入"}
          </button>
          <button className="button secondary" type="button" onClick={refresh}>
            刷新列表
          </button>
        </div>
      </form>
      {notice ? <p className="success-text">{notice}</p> : null}
      {error ? <p className="error-text">导入失败：{error}</p> : null}
      {recentImported.length > 0 ? (
        <>
          <h3 className="subheading">最近导入</h3>
          <FileTable files={recentImported} onOpen={(file) => navigateTo(`/files/${encodeURIComponent(file.id)}`)} />
        </>
      ) : null}
      <h3 className="subheading">文件列表</h3>
      {loading ? <p className="empty-state">正在加载文件...</p> : null}
      {!loading ? (
        <FileTable
          files={files}
          emptyTitle="暂无文件"
          emptyDescription="导入文件后，它们会先进入 Inbox。"
          onOpen={(file) => navigateTo(`/files/${encodeURIComponent(file.id)}`)}
        />
      ) : null}
    </section>
  );
}
