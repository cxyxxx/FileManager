import { FormEvent, useCallback, useEffect, useState } from "react";
import { navigateTo } from "../../app/router/routes";
import { searchFiles } from "../../features/files/api/filesApi";
import {
  deleteSavedQuery,
  getSavedQueries,
  queryFilesByTags,
  saveQuery,
  updateSavedQuery,
} from "../../features/queries/api/queriesApi";
import { FileTable } from "../../features/files/components/FileTable";
import { SavedQueryCard } from "../../features/queries/components/SavedQueryCard";
import { SearchResultList } from "../../features/search/components/SearchResultList";
import { TagPicker } from "../../features/tags/components/TagPicker";
import { useTags } from "../../features/tags/hooks/useTags";
import type { FileRecord, FileSearchResult, SavedQuery } from "../../shared/types/domain";

export function QueriesPage() {
  const { tags } = useTags();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"and" | "or">("and");
  const [queryName, setQueryName] = useState("");
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [keywordResults, setKeywordResults] = useState<FileSearchResult[]>([]);
  const [resultMode, setResultMode] = useState<"tag" | "keyword">("tag");
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyQueryId, setBusyQueryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSavedQueries = useCallback(async () => {
    try {
      setSavedQueries(await getSavedQueries());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    loadSavedQueries();
  }, [loadSavedQueries]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await runQuery(selectedTagIds, mode);
  }

  async function runQuery(tagIds: string[], queryMode: "and" | "or") {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      setFiles(await queryFilesByTags(tagIds, queryMode));
      setKeywordResults([]);
      setResultMode("tag");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function onSaveQuery() {
    if (!queryName.trim() || selectedTagIds.length === 0) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveQuery({ name: queryName.trim(), tagIds: selectedTagIds, mode });
      setQueryName("");
      setNotice("查询已保存");
      await loadSavedQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function applySavedQuery(query: SavedQuery) {
    if (query.queryType === "keyword" && "keyword" in query.payload) {
      setBusyQueryId(query.id);
      setLoading(true);
      setError(null);
      setNotice(null);
      try {
        setKeywordResults(await searchFiles(query.payload.keyword, {
          scopes: query.payload.scopes,
          tagIds: query.payload.tagIds,
          fileTypes: query.payload.fileTypes,
          includeArchived: query.payload.includeArchived,
        }));
        setFiles([]);
        setResultMode("keyword");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        setBusyQueryId(null);
      }
      return;
    }

    const tagIds = "mode" in query.payload ? query.payload.tagIds : query.tagIds;
    const queryMode = "mode" in query.payload ? query.payload.mode : query.mode;
    setSelectedTagIds(tagIds);
    setMode(queryMode);
    await runQuery(tagIds, queryMode);
  }

  async function renameQuery(query: SavedQuery) {
    const name = window.prompt("输入新的 saved query 名称", query.name);
    if (!name?.trim()) {
      return;
    }
    setBusyQueryId(query.id);
    setError(null);
    try {
      await updateSavedQuery(query.id, { name: name.trim() });
      setNotice("Saved query 已重命名");
      await loadSavedQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyQueryId(null);
    }
  }

  async function removeQuery(query: SavedQuery) {
    if (!window.confirm(`确定要删除 saved query “${query.name}” 吗？`)) {
      return;
    }
    setBusyQueryId(query.id);
    setError(null);
    try {
      await deleteSavedQuery(query.id);
      setNotice("Saved query 已删除");
      await loadSavedQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyQueryId(null);
    }
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Tag 查询</h2>
        <p>选择多个 tag，使用 AND 或 OR 找回文件。</p>
      </div>
      <div className="queries-grid">
        <div>
          <form onSubmit={onSubmit}>
            <TagPicker tags={tags} selectedIds={selectedTagIds} onChange={setSelectedTagIds} />
            <div className="toolbar">
              <select className="input" value={mode} onChange={(event) => setMode(event.target.value as "and" | "or")}>
                <option value="and">AND</option>
                <option value="or">OR</option>
              </select>
              <button className="button" type="submit" disabled={loading || selectedTagIds.length === 0}>
                {loading ? "查询中..." : "查询"}
              </button>
            </div>
          </form>
          <div className="toolbar">
            <input className="input" value={queryName} onChange={(event) => setQueryName(event.target.value)} placeholder="保存查询名称" />
            <button className="button secondary" type="button" disabled={saving || !queryName.trim() || selectedTagIds.length === 0} onClick={onSaveQuery}>
              {saving ? "保存中..." : "保存查询"}
            </button>
          </div>
          {error ? <p className="error-text">操作失败：{error}</p> : null}
          {notice ? <p className="success-text">{notice}</p> : null}
          <h3 className="subheading">查询结果</h3>
          {resultMode === "keyword" ? (
            <SearchResultList results={keywordResults} loading={loading} searched />
          ) : (
            <FileTable
              files={files}
              emptyTitle="暂无查询结果"
              emptyDescription="选择 tag 并执行查询后，结果会显示在这里。"
              onOpen={(file) => navigateTo(`/files/${encodeURIComponent(file.id)}`)}
            />
          )}
        </div>
        <aside className="side-panel">
          <h3>已保存查询</h3>
          {savedQueries.length > 0 ? (
            <div className="saved-query-list">
              {savedQueries.map((query) => (
                <SavedQueryCard
                  key={query.id}
                  query={query}
                  busy={busyQueryId === query.id}
                  onRun={(item) => void applySavedQuery(item)}
                  onRename={(item) => void renameQuery(item)}
                  onDelete={(item) => void removeQuery(item)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-block">
              <strong>暂无 saved query</strong>
              <span>保存常用 tag 查询或关键词搜索后会显示在这里。</span>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
