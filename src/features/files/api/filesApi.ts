import { command } from "../../../shared/lib/tauri";
import type {
  FileContent,
  FilePageData,
  FilePreview,
  FileRecord,
  FileSearchResult,
  ImportBatchResult,
  SearchFilesOptions,
  TagSuggestion,
} from "../../../shared/types/domain";

export function importFiles(paths: string[]) {
  return command<ImportBatchResult>("import_files", { paths });
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

export function extractFileContent(fileId: string) {
  return command<FileContent>("extract_file_content", { fileId });
}

export function getFileContent(fileId: string) {
  return command<FileContent>("get_file_content", { fileId });
}

export function reextractFileContent(fileId: string) {
  return command<FileContent>("reextract_file_content", { fileId });
}

export function getFilePreview(fileId: string) {
  return command<FilePreview>("get_file_preview", { fileId });
}

export function generateFileSummary(fileId: string) {
  return command<FilePageData>("generate_file_summary", { fileId });
}

export function suggestTagsForFile(fileId: string) {
  return command<TagSuggestion[]>("suggest_tags_for_file", { fileId });
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
