use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use directories::ProjectDirs;

use crate::app::state::{AppState, WorkspaceContext, WorkspaceDirectories, WorkspaceInfo};
use crate::db::{connection, migrations};
use crate::domain::errors::{AppError, AppResult};
use crate::infra::fs;

pub fn init_workspace(state: &AppState, path: Option<String>) -> AppResult<WorkspaceInfo> {
    let directories = workspace_directories(path)?;
    fs::create_dir(&directories.data)?;
    fs::create_dir(&directories.files)?;
    fs::create_dir(&directories.previews)?;
    fs::create_dir(&directories.temp)?;
    fs::create_dir(&directories.logs)?;

    let database = connection::open_database(&directories.db)?;
    migrations::run_migrations(&database)?;

    let info = directories.info();
    state.set_workspace(WorkspaceContext {
        info: info.clone(),
        db: Arc::new(Mutex::new(database)),
    })?;

    Ok(info)
}

pub fn get_workspace_info(state: &AppState) -> AppResult<WorkspaceInfo> {
    Ok(state.workspace()?.info)
}

pub fn workspace_directories(path: Option<String>) -> AppResult<WorkspaceDirectories> {
    let root = match path {
        Some(path) if !path.trim().is_empty() => PathBuf::from(path),
        _ => default_workspace_path()?,
    };

    let data = root.join("data");
    Ok(WorkspaceDirectories {
        db: data.join("app.db"),
        data,
        files: root.join("files"),
        previews: root.join("previews"),
        temp: root.join("temp"),
        logs: root.join("logs"),
        root,
    })
}

fn default_workspace_path() -> AppResult<PathBuf> {
    ProjectDirs::from("com", "FilesManager", "FilesManager")
        .map(|dirs| dirs.data_local_dir().join("workspace"))
        .ok_or_else(|| AppError::Internal("could not resolve default workspace path".into()))
}
