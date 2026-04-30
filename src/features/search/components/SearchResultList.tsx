import type { FileSearchResult } from "../../../shared/types/domain";
import { SearchResultCard } from "./SearchResultCard";

type SearchResultListProps = {
  results: FileSearchResult[];
  loading?: boolean;
  searched?: boolean;
};

export function SearchResultList({ results, loading = false, searched = false }: SearchResultListProps) {
  if (loading) {
    return <p className="empty-state">正在搜索...</p>;
  }

  if (searched && results.length === 0) {
    return (
      <div className="empty-block">
        <strong>没有找到相关文件</strong>
        <span>可以尝试更换关键词，或检查文件是否已归档。</span>
      </div>
    );
  }

  if (!searched) {
    return (
      <div className="empty-block">
        <strong>输入关键词开始搜索</strong>
        <span>搜索范围包括文件名、摘要、tag 名和已抽取正文。</span>
      </div>
    );
  }

  return (
    <div className="search-result-list">
      {results.map((result) => (
        <SearchResultCard key={result.file.id} result={result} />
      ))}
    </div>
  );
}
