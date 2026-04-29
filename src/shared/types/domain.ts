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
  queryType?: "tag" | "keyword";
  payload?: SavedQueryPayload;
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
      tagIds?: string[];
      includeArchived?: boolean;
    };

export type SearchFilesOptions = {
  tagIds?: string[];
  fileTypes?: string[];
  includeArchived?: boolean;
};

export type FileSearchResult = {
  file: FileRecord;
  matchedTags: Tag[];
  matchedFields: Array<"fileName" | "summary" | "tag">;
  highlight?: {
    fileName?: string;
    summary?: string;
    tags?: string[];
  };
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
