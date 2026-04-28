use serde::ser::{SerializeStruct, Serializer};
use serde::Serialize;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, thiserror::Error, Clone)]
pub enum AppError {
    #[error("File not found")]
    FileNotFound,
    #[error("Tag conflict")]
    TagConflict,
    #[error("Tag hierarchy cycle")]
    TagHierarchyCycle,
    #[error("Delivery file is frozen")]
    DeliveryFileFrozen,
    #[error("Invalid version role")]
    InvalidVersionRole,
    #[error("Unclassified file is required")]
    UnclassifiedRequired,
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Conflict: {0}")]
    Conflict(String),
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    #[error("Internal error: {0}")]
    Internal(String),
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::FileNotFound => "FILE_NOT_FOUND",
            Self::TagConflict => "TAG_CONFLICT",
            Self::TagHierarchyCycle => "TAG_HIERARCHY_CYCLE",
            Self::DeliveryFileFrozen => "DELIVERY_FILE_FROZEN",
            Self::InvalidVersionRole => "INVALID_VERSION_ROLE",
            Self::UnclassifiedRequired => "UNCLASSIFIED_REQUIRED",
            Self::NotFound(_) => "NOT_FOUND",
            Self::Conflict(_) => "CONFLICT",
            Self::InvalidInput(_) => "INVALID_INPUT",
            Self::Internal(_) => "INTERNAL",
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("code", self.code())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Internal(value.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(value: std::io::Error) -> Self {
        Self::Internal(value.to_string())
    }
}

impl<T> From<std::sync::PoisonError<T>> for AppError {
    fn from(value: std::sync::PoisonError<T>) -> Self {
        Self::Internal(value.to_string())
    }
}
