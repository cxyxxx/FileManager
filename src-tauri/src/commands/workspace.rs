use tauri::State;

use crate::app::state::{AppState, WorkspaceInfo};
use crate::domain::errors::AppResult;
use crate::services::workspace_service;

#[tauri::command]
pub fn init_workspace(path: Option<String>, state: State<'_, AppState>) -> AppResult<WorkspaceInfo> {
    workspace_service::init_workspace(&state, path)
}

#[tauri::command]
pub fn get_workspace_info(state: State<'_, AppState>) -> AppResult<WorkspaceInfo> {
    workspace_service::get_workspace_info(&state)
}

#[tauri::command]
pub fn repair_workspace(state: State<'_, AppState>) -> AppResult<WorkspaceInfo> {
    let info = workspace_service::get_workspace_info(&state)?;
    workspace_service::init_workspace(&state, Some(info.root_path))
}
