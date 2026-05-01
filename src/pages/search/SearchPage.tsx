import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { navigateTo } from "../../app/router/routes";
import { searchFiles } from "../../features/files/api/filesApi";
import { saveQuery } from "../../features/queries/api/queriesApi";
import { SearchResultList } from "../../features/search/components/SearchResultList";
import { TagPicker } from "../../features/tags/components/TagPicker";
import { useTags } from "../../features/tags/hooks/useTags";
import { useImeSafeHandlers } from "../../shared/lib/ime";
import type { FileSearchResult, SearchScope } from "../../shared/types/domain";

const scopeOptions: Array<{ value: SearchScope; label: string }> = [
  { value: "fileName", label: "文件名" },
  { value: "summary", label: "摘要" },
  { value: "tag", label: "Tag" },
  { value: "content", label: "正文" },
];

export function SearchPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialKeyword = params.get("q") ?? "";
  const { tags, create } = useTags();
  const ime = useImeSafeHandlers();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [fileTypesText, setFileTypesText] = useState("");
  const [scopes, setScopes] = useState<SearchScope[]>(["fileName", "summary", "tag", "content"]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [results, setResults] = useState<FileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(Boolean(initialKeyword));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    const query = keyword.trim();
    if (!query) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const fileTypes = fileTypesText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      setResults(await searchFiles(query, {
        scopes,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        fileTypes: fileTypes.length > 0 ? fileTypes : undefined,
        includeArchived,
      }));
      navigateTo(`/search?q=${encodeURIComponent(query)}`, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [fileTypesText, includeArchived, keyword, scopes, selectedTagIds]);

  useEffect(() => {
    if (initialKeyword) {
      void runSearch();
    }
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void runSearch();
  }

  function toggleScope(scope: SearchScope) {
    setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]);
  }

  async function saveCurrentSearch() {
    const query = keyword.trim();
    if (!query) {
      return;
    }
    const name = window.prompt("搜索名称", `${query} 搜索`);
    if (!name?.trim()) {
      return;
    }
    setError(null);
    try {
      const fileTypes = fileTypesText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      await saveQuery({
        name: name.trim(),
        queryType: "keyword",
        payload: {
          keyword: query,
          scopes,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          fileTypes: fileTypes.length > 0 ? fileTypes : undefined,
          includeArchived,
        },
      });
      setNotice("搜索已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>关键词搜索</h2>
        <p>搜索文件名、摘要、tag 名和已抽取正文。</p>
      </div>
      <form className="search-form" onSubmit={onSubmit} {...ime}>
        <div className="toolbar">
          <input className="input search-input" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入关键词" />
          <button className="button" type="submit" disabled={loading || !keyword.trim()}>
            {loading ? "搜索中..." : "搜索"}
          </button>
        </div>
        <div className="filter-panel">
          <div>
            <span className="filter-label">搜索范围</span>
            <div className="toolbar compact-actions">
              {scopeOptions.map((option) => (
                <label className="check-row inline-check" key={option.value}>
                  <input type="checkbox" checked={scopes.includes(option.value)} onChange={() => toggleScope(option.value)} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          <label>
            文件类型
            <input className="input compact-input" value={fileTypesText} onChange={(event) => setFileTypesText(event.target.value)} placeholder="pdf, md, docx" />
          </label>
          <label className="check-row inline-check">
            <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
            <span>包含 archived</span>
          </label>
        </div>
        <button className="button secondary small" type="button" disabled={!keyword.trim()} onClick={() => void saveCurrentSearch()}>
          保存搜索
        </button>
        <div className="content-section">
          <h3>筛选 tag</h3>
          <TagPicker
            tags={tags}
            selectedIds={selectedTagIds}
            onChange={setSelectedTagIds}
            onCreateTag={create}
            createDefaults={{ tagType: "topic", isTopicEnabled: true }}
          />
        </div>
      </form>
      {error ? <p className="error-text">搜索错误：{error}</p> : null}
      {notice ? <p className="success-text">{notice}</p> : null}
      <h3 className="subheading">搜索结果</h3>
      <SearchResultList results={results} loading={loading} searched={searched} />
    </section>
  );
}
