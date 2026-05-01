import { FormEvent, useCallback, useEffect, useState } from "react";
import { navigateTo } from "../../app/router/routes";
import {
  archiveFile,
  clearAllFiles,
  extractFileContent,
  importFiles,
  listFiles,
  restoreFile,
} from "../../features/files/api/filesApi";
import { FilePickerDropzone } from "../../features/files/components/FilePickerDropzone";
import { FileTreeList } from "../../features/files/components/FileTreeList";
import { ImportResultPanel } from "../../features/files/components/ImportResultPanel";
import type { FileRecord, ImportResultItem } from "../../shared/types/domain";

type FileFilter = "active" | "archived" | "all";

export function FilePage() {
  const [pathsText, setPathsText] = useState("");
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [recentImported, setRecentImported] = useState<FileRecord[]>([]);
  const [importResults, setImportResults] = useState<ImportResultItem[]>([]);
  const [filter, setFilter] = useState<FileFilter>("active");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFiles(await listFiles({ includeArchived: filter === "all", archivedOnly: filter === "archived" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function importPathList(paths: string[]) {
    setError(null);
    setNotice(null);
    if (paths.length === 0) {
      return;
    }
    setImporting(true);
    try {
      const batch = await importFiles(paths);
      const imported = batch.items.flatMap((item) => item.file ? [item.file] : []);
      setRecentImported(imported);
      setImportResults(batch.items);
      const failed = batch.items.filter((item) => item.status === "failed").length;
      const duplicates = batch.items.filter((item) => item.status === "duplicate").length;
      const autoExtract = window.localStorage.getItem("filesManager.autoExtractContent") === "true";
      if (autoExtract && imported.length > 0) {
        await Promise.allSettled(imported.map((file) => extractFileContent(file.id)));
      }
      setNotice(`导入完成：成功 ${imported.length} 个，失败 ${failed} 个，重复 ${duplicates} 个${autoExtract ? "；已尝试自动抽取正文" : ""}`);
      setPathsText("");
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setImportResults(paths.map((path) => ({ path, status: "failed", reason: message })));
      setError(message);
    } finally {
      setImporting(false);
    }
  }

  async function onImport(event: FormEvent) {
    event.preventDefault();
    const paths = pathsText
      .split(/\r?\n/)
      .map((path) => path.trim())
      .filter(Boolean);
    await importPathList(paths);
  }

  async function toggleArchive(file: FileRecord) {
    if (file.status !== "archived" && !window.confirm("确定要归档这个文件吗？\n归档后它将不再出现在 Inbox 和常规文件列表中。")) {
      return;
    }
    setActingId(file.id);
    setError(null);
    try {
      if (file.status === "archived") {
        await restoreFile(file.id);
      } else {
        await archiveFile(file.id);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActingId(null);
    }
  }

  async function clearAllFilesDebug() {
    if (
      !window.confirm(
        "确认清空当前所有文件吗？\n这会删除数据库里的所有文件记录，并清空本地 files / previews 目录，操作不可恢复。",
      )
    ) {
      return;
    }
    setClearing(true);
    setError(null);
    setNotice(null);
    try {
      const deletedCount = await clearAllFiles();
      setRecentImported([]);
      setImportResults([]);
      setNotice(`已清空 ${deletedCount} 个文件`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setClearing(false);
    }
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>导入文件</h2>
        <p>选择或拖拽本地文件，导入后会先进入 Inbox 等待整理。</p>
      </div>
      <FilePickerDropzone disabled={importing} onImport={(paths) => void importPathList(paths)} />
      <details className="advanced-import" open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}>
        <summary>高级 / 调试导入</summary>
        <form className="import-form" onSubmit={onImport}>
          <textarea
            className="textarea"
            value={pathsText}
            onChange={(event) => setPathsText(event.target.value)}
            placeholder="/Users/xin/Desktop/RAG 系统设计方案.pdf"
          />
          <div className="toolbar">
            <button className="button" type="submit" disabled={importing}>
              {importing ? "导入中..." : "导入路径"}
            </button>
          </div>
        </form>
        <div className="toolbar compact-actions">
          <button className="button danger small" type="button" disabled={clearing || importing} onClick={() => void clearAllFilesDebug()}>
            {clearing ? "清空中..." : "清空全部文件"}
          </button>
        </div>
      </details>
      {notice ? <p className="success-text">{notice}</p> : null}
      {error ? <p className="error-text">导入失败：{error}</p> : null}
      <ImportResultPanel items={importResults} />
      {recentImported.length > 0 ? (
        <>
          <h3 className="subheading">最近导入</h3>
          <FileTreeList files={recentImported} onOpen={(file) => navigateTo(`/files/${encodeURIComponent(file.id)}`)} />
        </>
      ) : null}
      <div className="section-title-row list-heading-row">
        <h3 className="subheading">文件列表</h3>
        <div className="toolbar compact-actions">
          <select className="input compact-input" value={filter} onChange={(event) => setFilter(event.target.value as FileFilter)}>
            <option value="active">活跃文件</option>
            <option value="archived">已归档文件</option>
            <option value="all">全部文件</option>
          </select>
          <button className="button secondary" type="button" onClick={refresh}>
            刷新列表
          </button>
        </div>
      </div>
      {loading ? <p className="empty-state">正在加载文件...</p> : null}
      {!loading ? (
        <FileTreeList
          files={files}
          emptyTitle="暂无文件"
          emptyDescription="导入文件后，它们会先进入 Inbox。"
          onOpen={(file) => navigateTo(`/files/${encodeURIComponent(file.id)}`)}
          action={(file) => (
            <button className={file.status === "archived" ? "button secondary small" : "button danger small"} type="button" disabled={actingId === file.id} onClick={() => void toggleArchive(file)}>
              {file.status === "archived" ? "恢复" : "归档"}
            </button>
          )}
        />
      ) : null}
    </section>
  );
}
