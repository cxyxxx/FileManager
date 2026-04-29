use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub tag_type: String,
    pub parent_id: Option<String>,
    pub is_topic_enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTagPayload {
    pub name: String,
    pub tag_type: String,
    pub parent_id: Option<String>,
    pub is_topic_enabled: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTagPayload {
    pub name: Option<String>,
    pub parent_id: Option<Option<String>>,
    pub tag_type: Option<String>,
    pub is_topic_enabled: Option<bool>,
}
