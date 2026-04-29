import { command } from "../../../shared/lib/tauri";
import type { FilePageData, FileRecord } from "../../../shared/types/domain";

export function importFiles(paths: string[]) {
  return command<FileRecord[]>("import_files", { paths });
}

export function getFileDetail(fileId: string) {
  return command<FileRecord>("get_file_detail", { fileId });
}

export function getFilePageData(fileId: string) {
  return command<FilePageData>("get_file_page_data", { fileId });
}

export function listFiles() {
  return command<FileRecord[]>("list_files");
}

export function getInboxFiles() {
  return command<FileRecord[]>("get_inbox_files");
}

export function attachTagsToFile(fileId: string, tagIds: string[]) {
  return command<void>("attach_tags_to_file", { fileId, tagIds });
}
