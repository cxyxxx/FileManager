import { command } from "../../../shared/lib/tauri";
import type { FileRecord } from "../../../shared/types/domain";

export function importFiles(paths: string[]) {
  return command<FileRecord[]>("import_files", { paths });
}

export function getFileDetail(fileId: string) {
  return command<FileRecord>("get_file_detail", { fileId });
}

export function getInboxFiles() {
  return command<FileRecord[]>("get_inbox_files");
}

export function queryFiles(tagIds: string[], mode: "and" | "or") {
  return command<FileRecord[]>("query_files_by_tags", { tagIds, mode });
}
