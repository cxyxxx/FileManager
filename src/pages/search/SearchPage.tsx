import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { navigateTo } from "../../app/router/routes";
import { searchFiles } from "../../features/files/api/filesApi";
import { SearchResultList } from "../../features/search/components/SearchResultList";
import { TagPicker } from "../../features/tags/components/TagPicker";
import { useTags } from "../../features/tags/hooks/useTags";
import type { FileSearchResult } from "../../shared/types/domain";

export function SearchPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialKeyword = params.get("q") ?? "";
  const { tags } = useTags();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [fileTypesText, setFileTypesText] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [results, setResults] = useState<FileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(Boolean(initialKeyword));
  const [error, setError] = useState<string | null>(null);

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
  }, [fileTypesText, includeArchived, keyword, selectedTagIds]);

  useEffect(() => {
    if (initialKeyword) {
      void runSearch();
    }
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void runSearch();
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>关键词搜索</h2>
        <p>搜索文件名、摘要和 tag 名。</p>
      </div>
      <form className="search-form" onSubmit={onSubmit}>
        <div className="toolbar">
          <input className="input search-input" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入关键词" />
          <button className="button" type="submit" disabled={loading || !keyword.trim()}>
            {loading ? "搜索中..." : "搜索"}
          </button>
        </div>
        <div className="filter-panel">
          <label>
            文件类型
            <input className="input compact-input" value={fileTypesText} onChange={(event) => setFileTypesText(event.target.value)} placeholder="pdf, md, docx" />
          </label>
          <label className="check-row inline-check">
            <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
            <span>包含 archived</span>
          </label>
        </div>
        <div className="content-section">
          <h3>筛选 tag</h3>
          <TagPicker tags={tags} selectedIds={selectedTagIds} onChange={setSelectedTagIds} />
        </div>
      </form>
      {error ? <p className="error-text">搜索错误：{error}</p> : null}
      <h3 className="subheading">搜索结果</h3>
      <SearchResultList results={results} loading={loading} searched={searched} />
    </section>
  );
}
