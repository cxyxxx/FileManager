export type AppError = {
  code: string;
  message: string;
};

export type WorkspaceInfo = {
  rootPath: string;
  dbPath: string;
  filesPath: string;
  previewsPath: string;
  tempPath: string;
  logsPath: string;
};

export type FileRecord = {
  id: string;
  originalName: string;
  storedName: string;
  sourcePath: string | null;
  relativePath: string;
  importBatchId?: string | null;
  importRootName?: string | null;
  importRootPath?: string | null;
  importRelativePath?: string | null;
  importedAt?: string | null;
  extension?: string;
  mimeType?: string;
  sizeBytes: number;
  sha256: string;
  summary?: string | null;
  status: string;
  freezeStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type FilePageData = {
  file: FileRecord;
  tags: Tag[];
  versions: VersionNode[];
};

export type ImportBatchResult = {
  items: ImportResultItem[];
};

export type ImportResultItem = {
  path: string;
  originalName?: string | null;
  status: "success" | "failed" | "duplicate";
  file?: FileRecord | null;
  reason?: string | null;
  duplicateOf?: FileRecord | null;
};

export type Tag = {
  id: string;
  name: string;
  tagType: string;
  parentId: string | null;
  isTopicEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VersionNode = {
  id: string;
  fileId: string;
  groupId: string;
  role: string;
  isCore: boolean;
  createdAt: string;
};

export type SavedQuery = {
  id: string;
  name: string;
  queryType: "tag" | "keyword";
  payload: SavedQueryPayload;
  mode: "and" | "or";
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type SavedQueryPayload =
  | {
      tagIds: string[];
      mode: "and" | "or";
    }
  | {
      keyword: string;
      scopes?: SearchScope[];
      tagIds?: string[];
      fileTypes?: string[];
      includeArchived?: boolean;
    };

export type SearchScope = "fileName" | "summary" | "tag" | "content";

export type SearchFilesOptions = {
  scopes?: SearchScope[];
  tagIds?: string[];
  fileTypes?: string[];
  includeArchived?: boolean;
};

export type FileSearchResult = {
  file: FileRecord;
  matchedTags: Tag[];
  matchedFields: SearchScope[];
  highlight?: {
    fileName?: string;
    summary?: string;
    content?: string;
    tags?: string[];
  };
};

export type FileContent = {
  fileId: string;
  contentText?: string | null;
  extractionStatus: "pending" | "success" | "failed" | "unsupported";
  extractionError?: string | null;
  extractedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type FilePreview = {
  fileId: string;
  previewType: "text" | "image" | "unsupported";
  text?: string | null;
  imageUrl?: string | null;
  error?: string | null;
};

export type TagSuggestion = {
  tag: Tag;
  score: number;
  reason: string;
};

export type UpdateTagPayload = {
  name?: string;
  parentId?: string | null;
  tagType?: string;
  isTopicEnabled?: boolean;
};

export type UpdateSavedQueryPayload = {
  name?: string;
};

export type TagMatchedFile = {
  file: FileRecord;
  matchedTags: Tag[];
};

export type TagPageData = {
  tag: Tag;
  children: Tag[];
  directFiles: FileRecord[];
  aggregateFiles: TagMatchedFile[];
  descendantTags: Tag[];
  totalDirectFileCount: number;
  totalAggregateFileCount: number | null;
  mode: "structure" | "aggregation";
};
