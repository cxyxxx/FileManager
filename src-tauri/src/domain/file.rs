use serde::{Deserialize, Serialize};

use crate::domain::tag::Tag;
use crate::domain::version::VersionNode;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileRecord {
    pub id: String,
    pub original_name: String,
    pub stored_name: String,
    pub source_path: Option<String>,
    pub relative_path: String,
    pub import_batch_id: Option<String>,
    pub import_root_name: Option<String>,
    pub import_root_path: Option<String>,
    pub import_relative_path: Option<String>,
    pub imported_at: Option<String>,
    pub size_bytes: i64,
    pub sha256: String,
    pub summary: Option<String>,
    pub status: String,
    pub freeze_status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilePageData {
    pub file: FileRecord,
    pub tags: Vec<Tag>,
    pub versions: Vec<VersionNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportBatchResult {
    pub items: Vec<ImportResultItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportBatch {
    pub id: String,
    pub root_name: String,
    pub root_path: String,
    pub imported_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResultItem {
    pub path: String,
    pub original_name: Option<String>,
    pub status: String,
    pub file: Option<FileRecord>,
    pub reason: Option<String>,
    pub duplicate_of: Option<FileRecord>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListFilesOptions {
    pub include_archived: Option<bool>,
    pub archived_only: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchFilesOptions {
    pub scopes: Option<Vec<String>>,
    pub tag_ids: Option<Vec<String>>,
    pub file_types: Option<Vec<String>>,
    pub include_archived: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSearchResult {
    pub file: FileRecord,
    pub matched_tags: Vec<Tag>,
    pub matched_fields: Vec<String>,
    pub highlight: SearchHighlight,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHighlight {
    pub file_name: Option<String>,
    pub summary: Option<String>,
    pub content: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub file_id: String,
    pub content_text: Option<String>,
    pub extraction_status: String,
    pub extraction_error: Option<String>,
    pub extracted_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilePreview {
    pub file_id: String,
    pub preview_type: String,
    pub text: Option<String>,
    pub image_url: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagSuggestion {
    pub tag: Tag,
    pub score: usize,
    pub reason: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileStatus {
    Active,
    Archived,
    Missing,
}

impl FileStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Archived => "archived",
            Self::Missing => "missing",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FreezeStatus {
    Draft,
    DeliveryFrozen,
}

impl FreezeStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::DeliveryFrozen => "delivery_frozen",
        }
    }
}
