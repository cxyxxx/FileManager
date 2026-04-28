use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use rusqlite::Connection;
use serde::Serialize;

use crate::domain::errors::{AppError, AppResult};

#[derive(Default)]
pub struct AppState {
    workspace: Mutex<Option<WorkspaceContext>>,
}

impl AppState {
    pub fn set_workspace(&self, workspace: WorkspaceContext) -> AppResult<()> {
        let mut current = self.workspace.lock()?;
        *current = Some(workspace);
        Ok(())
    }

    pub fn workspace(&self) -> AppResult<WorkspaceContext> {
        self.workspace
            .lock()?
            .clone()
            .ok_or_else(|| AppError::NotFound("workspace has not been initialized".into()))
    }
}

#[derive(Clone)]
pub struct WorkspaceContext {
    pub info: WorkspaceInfo,
    pub db: Arc<Mutex<Connection>>,
}

impl WorkspaceContext {
    pub fn with_db<T>(&self, operation: impl FnOnce(&Connection) -> AppResult<T>) -> AppResult<T> {
        let connection = self.db.lock()?;
        operation(&connection)
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceInfo {
    pub root_path: String,
    pub db_path: String,
    pub files_path: String,
    pub previews_path: String,
    pub temp_path: String,
    pub logs_path: String,
}

#[derive(Debug, Clone)]
pub struct WorkspaceDirectories {
    pub root: PathBuf,
    pub data: PathBuf,
    pub db: PathBuf,
    pub files: PathBuf,
    pub previews: PathBuf,
    pub temp: PathBuf,
    pub logs: PathBuf,
}

impl WorkspaceDirectories {
    pub fn info(&self) -> WorkspaceInfo {
        WorkspaceInfo {
            root_path: self.root.to_string_lossy().to_string(),
            db_path: self.db.to_string_lossy().to_string(),
            files_path: self.files.to_string_lossy().to_string(),
            previews_path: self.previews.to_string_lossy().to_string(),
            temp_path: self.temp.to_string_lossy().to_string(),
            logs_path: self.logs.to_string_lossy().to_string(),
        }
    }
}
