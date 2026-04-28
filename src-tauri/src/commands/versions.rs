use tauri::State;

use crate::app::state::AppState;
use crate::domain::errors::AppResult;
use crate::domain::file::FileRecord;
use crate::domain::version::{CreateDerivedVersionPayload, VersionNode};
use crate::services::version_service;

#[tauri::command]
pub fn create_derived_version(
    source_file_id: String,
    payload: CreateDerivedVersionPayload,
    state: State<'_, AppState>,
) -> AppResult<FileRecord> {
    version_service::create_derived_version(&state, &source_file_id, payload)
}

#[tauri::command]
pub fn set_version_role(file_id: String, role: String, state: State<'_, AppState>) -> AppResult<VersionNode> {
    version_service::set_version_role(&state, &file_id, role)
}

#[tauri::command]
pub fn set_core_version(
    version_group_id: String,
    role: String,
    file_id: String,
    state: State<'_, AppState>,
) -> AppResult<VersionNode> {
    version_service::set_core_version(&state, &version_group_id, role, &file_id)
}

#[tauri::command]
pub fn get_version_chain(file_id: String, state: State<'_, AppState>) -> AppResult<Vec<VersionNode>> {
    version_service::get_version_chain(&state, &file_id)
}
