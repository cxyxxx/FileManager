import { useState } from "react";
import { navigateTo } from "../../app/router/routes";
import { archiveFile, attachTagsToFile, attachTagsToFiles } from "../../features/files/api/filesApi";
import { BatchActionBar } from "../../features/files/components/BatchActionBar";
import { FileTable } from "../../features/files/components/FileTable";
import { useInboxFiles } from "../../features/files/hooks/useInboxFiles";
import { TagPicker } from "../../features/tags/components/TagPicker";
import { useTags } from "../../features/tags/hooks/useTags";

export function InboxPage() {
  const { files, loading, error, refresh } = useInboxFiles();
  const { tags } = useTags();
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState<"tags" | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  async function saveTags(fileId: string) {
    if (selectedTagIds.length === 0) {
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await attachTagsToFile(fileId, selectedTagIds);
      setSelectedTagIds([]);
      setActiveFileId(null);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function toggleSelected(fileId: string, selected: boolean) {
    setSelectedFileIds((current) => selected ? [...current, fileId] : current.filter((id) => id !== fileId));
  }

  async function saveBatchTags() {
    if (selectedFileIds.length === 0 || selectedTagIds.length === 0) {
      return;
    }
    setSaving(true);
    setActionError(null);
    setBatchNotice(null);
    try {
      await attachTagsToFiles(selectedFileIds, selectedTagIds);
      setBatchNotice(`批量添加成功：${selectedFileIds.length} 个文件`);
      setSelectedFileIds([]);
      setSelectedTagIds([]);
      setBatchMode(null);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function archiveSelected() {
    if (selectedFileIds.length === 0) {
      return;
    }
    if (!window.confirm(`确定要归档选中的 ${selectedFileIds.length} 个文件吗？`)) {
      return;
    }
    setSaving(true);
    setActionError(null);
    setBatchNotice(null);
    const failed: string[] = [];
    for (const fileId of selectedFileIds) {
      try {
        await archiveFile(fileId);
      } catch (err) {
        failed.push(`${fileId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    setBatchNotice(`归档完成：成功 ${selectedFileIds.length - failed.length} 个，失败 ${failed.length} 个`);
    setActionError(failed.length > 0 ? failed.join("\n") : null);
    setSelectedFileIds([]);
    setSaving(false);
    await refresh();
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>未整理文件</h2>
        <p>没有绑定 topic-enabled tag 的文件会出现在这里。</p>
      </div>
      <div className="toolbar">
        <button className="button secondary" type="button" onClick={refresh}>
          刷新
        </button>
      </div>
      {loading ? <p className="empty-state">正在加载 Inbox 文件...</p> : null}
      {error ? <p className="error-text">加载失败：{error}</p> : null}
      {actionError ? <p className="error-text">操作失败：{actionError}</p> : null}
      {batchNotice ? <p className="success-text">{batchNotice}</p> : null}
      <BatchActionBar
        selectedCount={selectedFileIds.length}
        busy={saving}
        onAddTags={() => {
          setBatchMode("tags");
          setActiveFileId(null);
          setSelectedTagIds([]);
        }}
        onArchive={() => void archiveSelected()}
        onClear={() => setSelectedFileIds([])}
      />
      {!loading && !error ? (
        <FileTable
          files={files}
          selectable
          selectedIds={selectedFileIds}
          onSelect={toggleSelected}
          emptyTitle="Inbox 已清空"
          emptyDescription="所有文件都已完成基础整理。"
          onOpen={(file) => navigateTo(`/files/${encodeURIComponent(file.id)}`)}
          tagCountLabel={() => "0 topic"}
          action={(file) => (
            <button
              className="button secondary small"
              type="button"
              onClick={() => {
                setActiveFileId(file.id);
                setSelectedTagIds([]);
                setActionError(null);
              }}
            >
              添加 tag
            </button>
          )}
        />
      ) : null}
      {batchMode === "tags" ? (
        <div className="drawer-panel">
          <div className="section-heading compact">
            <h3>批量添加 tag</h3>
            <p>为选中的 {selectedFileIds.length} 个文件添加一个或多个 tag。</p>
          </div>
          <TagPicker tags={tags} selectedIds={selectedTagIds} onChange={setSelectedTagIds} />
          <div className="toolbar end">
            <button className="button secondary" type="button" onClick={() => setBatchMode(null)}>
              取消
            </button>
            <button className="button" type="button" disabled={saving || selectedTagIds.length === 0} onClick={() => void saveBatchTags()}>
              {saving ? "保存中..." : "批量保存"}
            </button>
          </div>
        </div>
      ) : null}
      {activeFileId ? (
        <div className="drawer-panel">
          <div className="section-heading compact">
            <h3>添加 tag</h3>
            <p>选择一个或多个 tag 后，文件会按 topic tag 从 Inbox 中移出。</p>
          </div>
          <TagPicker tags={tags} selectedIds={selectedTagIds} onChange={setSelectedTagIds} />
          <div className="toolbar end">
            <button className="button secondary" type="button" onClick={() => setActiveFileId(null)}>
              取消
            </button>
            <button className="button" type="button" disabled={saving || selectedTagIds.length === 0} onClick={() => saveTags(activeFileId)}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
