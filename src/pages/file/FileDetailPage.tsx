import { useCallback, useEffect, useState } from "react";
import { navigateTo } from "../../app/router/routes";
import {
  archiveFile,
  generateFileSummary,
  getFilePageData,
  openFile,
  revealFile,
  restoreFile,
  setFileTags,
  suggestTagsForFile,
  updateFileSummary,
} from "../../features/files/api/filesApi";
import { EditableTagList } from "../../features/files/components/EditableTagList";
import { FileActionMenu } from "../../features/files/components/FileActionMenu";
import { FileContentPanel } from "../../features/files/components/FileContentPanel";
import { FilePreviewPanel } from "../../features/files/components/FilePreviewPanel";
import { formatBytes, formatDate } from "../../features/files/components/FileTable";
import { SummaryEditor } from "../../features/files/components/SummaryEditor";
import { TagPicker } from "../../features/tags/components/TagPicker";
import { useTags } from "../../features/tags/hooks/useTags";
import { useImeSafeHandlers } from "../../shared/lib/ime";
import type { FilePageData, TagSuggestion } from "../../shared/types/domain";
import { createDerivedVersion } from "../../features/versions/api/versionsApi";

export function FileDetailPage({ fileId }: { fileId: string }) {
  const [data, setData] = useState<FilePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSummary, setSavingSummary] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [acting, setActing] = useState(false);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [tagError, setTagError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { tags, create } = useTags();

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
      setSuggestions(await suggestTagsForFile(fileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSummary(summary: string) {
    setSavingSummary(true);
    setSummaryError(null);
    try {
      setData(await updateFileSummary(fileId, summary));
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setSavingSummary(false);
    }
  }

  async function generateSummary() {
    setGeneratingSummary(true);
    setGenerateError(null);
    try {
      const next = await generateFileSummary(fileId);
      setData(next);
      setSuggestions(await suggestTagsForFile(fileId));
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err));
    } finally {
      setGeneratingSummary(false);
    }
  }

  async function saveTags(tagIds: string[]) {
    setSavingTags(true);
    setTagError(null);
    try {
      setData(await setFileTags(fileId, tagIds));
      setSuggestions(await suggestTagsForFile(fileId));
    } catch (err) {
      setTagError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setSavingTags(false);
    }
  }

  async function runAction(action: () => Promise<void>, success?: () => void | Promise<void>) {
    setActing(true);
    setActionError(null);
    try {
      await action();
      await success?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  }

  function confirmArchive() {
    const confirmed = window.confirm("确定要归档这个文件吗？\n归档后它将不再出现在 Inbox 和常规文件列表中。");
    if (!confirmed) {
      return;
    }
    void runAction(() => archiveFile(fileId), () => navigateTo("/files"));
  }

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
            <SummaryEditor
              summary={data.file.summary}
              saving={savingSummary}
              error={summaryError}
              onSave={saveSummary}
              onGenerate={generateSummary}
              generating={generatingSummary}
              generateError={generateError}
            />
            <EditableTagList
              allTags={tags}
              attachedTags={data.tags}
              suggestions={suggestions}
              saving={savingTags}
              error={tagError}
              onSave={saveTags}
            />
            <FileContentPanel fileId={fileId} onExtracted={async () => setSuggestions(await suggestTagsForFile(fileId))} />
            <FilePreviewPanel fileId={fileId} />
            <div className="content-section">
              <div className="section-title-row">
                <h3>创建版本</h3>
              </div>
              <VersionCreateCard fileId={fileId} />
            </div>
            <div className="content-section">
              <div className="section-title-row">
                <h3>快速添加 Tag</h3>
              </div>
              <TagPicker
                tags={tags}
                selectedIds={data.tags.map((tag) => tag.id)}
                onChange={(ids) => void saveTags(ids)}
                onCreateTag={create}
                createDefaults={{ tagType: "topic", isTopicEnabled: true }}
              />
            </div>
          </div>
          <aside className="side-panel">
            <h3>文件操作</h3>
            <FileActionMenu
              archived={data.file.status === "archived"}
              busy={acting}
              onOpen={() => void runAction(() => openFile(fileId))}
              onReveal={() => void runAction(() => revealFile(fileId))}
              onArchive={confirmArchive}
              onRestore={() => void runAction(() => restoreFile(fileId), load)}
            />
            <div className="toolbar">
              <button className="button secondary small" type="button" onClick={() => navigateTo(`/versions?fileId=${encodeURIComponent(fileId)}`)}>
                查看版本页
              </button>
            </div>
            {actionError ? <p className="error-text">操作失败：{actionError}</p> : null}
            <h3>版本信息</h3>
            {data.versions.length > 0 ? (
              <div className="version-list">
                {data.versions.map((version) => (
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

function VersionCreateCard({ fileId }: { fileId: string }) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const ime = useImeSafeHandlers();

  async function createVersion() {
    const nextName = name.trim() || undefined;
    setCreating(true);
    setError(null);
    try {
      const created = await createDerivedVersion(fileId, { name: nextName });
      navigateTo(`/files/${encodeURIComponent(created.id)}`);
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

function fileExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toUpperCase() : "未知";
}
