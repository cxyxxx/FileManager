import { command } from "../../../shared/lib/tauri";
import type {
  FilePageData,
  FileRecord,
  FileSearchResult,
  SearchFilesOptions,
} from "../../../shared/types/domain";

export function importFiles(paths: string[]) {
  return command<FileRecord[]>("import_files", { paths });
}

export function getFileDetail(fileId: string) {
  return command<FileRecord>("get_file_detail", { fileId });
}

export function getFilePageData(fileId: string) {
  return command<FilePageData>("get_file_page_data", { fileId });
}

export function listFiles(options?: { includeArchived?: boolean; archivedOnly?: boolean }) {
  return command<FileRecord[]>("list_files", { options });
}

export function getInboxFiles() {
  return command<FileRecord[]>("get_inbox_files");
}

export function attachTagsToFile(fileId: string, tagIds: string[]) {
  return command<void>("attach_tags_to_file", { fileId, tagIds });
}

export function attachTagsToFiles(fileIds: string[], tagIds: string[]) {
  return Promise.all(fileIds.map((fileId) => attachTagsToFile(fileId, tagIds)));
}

export function updateFileSummary(fileId: string, summary: string) {
  return command<FilePageData>("update_file_summary", { fileId, summary });
}

export function setFileTags(fileId: string, tagIds: string[]) {
  return command<FilePageData>("set_file_tags", { fileId, tagIds });
}

export function openFile(fileId: string) {
  return command<void>("open_file", { fileId });
}

export function revealFile(fileId: string) {
  return command<void>("reveal_file", { fileId });
}

export function archiveFile(fileId: string) {
  return command<void>("archive_file", { fileId });
}

export function restoreFile(fileId: string) {
  return command<void>("restore_file", { fileId });
}

export function searchFiles(keyword: string, options?: SearchFilesOptions) {
  return command<FileSearchResult[]>("search_files", { keyword, options });
}

export function selectFiles(): Promise<string[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.style.display = "none";
    input.addEventListener(
      "change",
      () => {
        const files = Array.from(input.files ?? []);
        const paths = files
          .map((file) => (file as File & { path?: string }).path)
          .filter((path): path is string => Boolean(path));
        input.remove();
        resolve(paths);
      },
      { once: true },
    );
    document.body.appendChild(input);
    input.click();
  });
}
