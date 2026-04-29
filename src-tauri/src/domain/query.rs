use serde::{Deserialize, Serialize};

use crate::domain::file::FileRecord;
use crate::domain::tag::Tag;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedQuery {
    pub id: String,
    pub name: String,
    pub mode: String,
    pub tag_ids: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveQueryPayload {
    pub name: String,
    pub mode: String,
    pub tag_ids: Vec<String>,
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
