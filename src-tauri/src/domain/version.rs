use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionNode {
    pub id: String,
    pub file_id: String,
    pub group_id: String,
    pub role: String,
    pub is_core: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionEdge {
    pub id: String,
    pub source_file_id: String,
    pub derived_file_id: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDerivedVersionPayload {
    pub name: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VersionRole {
    Master,
    Working,
    Delivery,
    Derived,
}

impl VersionRole {
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "master" => Some(Self::Master),
            "working" => Some(Self::Working),
            "delivery" => Some(Self::Delivery),
            "derived" => Some(Self::Derived),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Master => "master",
            Self::Working => "working",
            Self::Delivery => "delivery",
            Self::Derived => "derived",
        }
    }
}
