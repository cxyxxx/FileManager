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
  sizeBytes: number;
  sha256: string;
  status: string;
  freezeStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type FilePageData = {
  file: FileRecord;
  tags: Tag[];
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
  mode: "and" | "or";
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
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
