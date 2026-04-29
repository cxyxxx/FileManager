use serde::{Deserialize, Serialize};

use crate::domain::tag::Tag;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileRecord {
    pub id: String,
    pub original_name: String,
    pub stored_name: String,
    pub source_path: Option<String>,
    pub relative_path: String,
    pub size_bytes: i64,
    pub sha256: String,
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
