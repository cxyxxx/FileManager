use serde::{Deserialize, Serialize};

use crate::domain::file::FileRecord;
use crate::domain::tag::Tag;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedQuery {
    pub id: String,
    pub name: String,
    pub query_type: String,
    pub payload: SavedQueryPayload,
    pub mode: String,
    pub tag_ids: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagQueryPayload {
    pub tag_ids: Vec<String>,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeywordQueryPayload {
    pub keyword: String,
    pub scopes: Option<Vec<String>>,
    pub tag_ids: Option<Vec<String>>,
    pub file_types: Option<Vec<String>>,
    pub include_archived: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SavedQueryPayload {
    Tag(TagQueryPayload),
    Keyword(KeywordQueryPayload),
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveQueryPayload {
    pub name: String,
    pub query_type: Option<String>,
    pub payload: Option<SavedQueryPayload>,
    pub mode: Option<String>,
    pub tag_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSavedQueryPayload {
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagMatchedFile {
    pub file: FileRecord,
    pub matched_tags: Vec<Tag>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagPageData {
    pub tag: Tag,
    pub children: Vec<Tag>,
    pub direct_files: Vec<FileRecord>,
    pub aggregate_files: Vec<TagMatchedFile>,
    pub descendant_tags: Vec<Tag>,
    pub total_direct_file_count: usize,
    pub total_aggregate_file_count: Option<usize>,
    pub mode: String,
}
