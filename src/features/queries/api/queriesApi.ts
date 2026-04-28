import { command } from "../../../shared/lib/tauri";
import type { FileRecord, SavedQuery, TagPageData } from "../../../shared/types/domain";

export function getTagPageData(tagId: string, mode: "structure" | "aggregation") {
  return command<TagPageData>("get_tag_page_data", { tagId, mode });
}

export function queryFilesByTags(tagIds: string[], mode: "and" | "or") {
  return command<FileRecord[]>("query_files_by_tags", { tagIds, mode });
}

export function saveQuery(payload: { name: string; tagIds: string[]; mode: "and" | "or" }) {
  return command<SavedQuery>("save_query", { payload });
}

export function getSavedQueries() {
  return command<SavedQuery[]>("get_saved_queries");
}
