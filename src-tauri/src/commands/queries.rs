use tauri::State;

use crate::app::state::AppState;
use crate::domain::errors::AppResult;
use crate::domain::file::FileRecord;
use crate::domain::query::{SaveQueryPayload, SavedQuery, TagPageData};
use crate::services::query_service;

#[tauri::command]
pub fn get_inbox_files(state: State<'_, AppState>) -> AppResult<Vec<FileRecord>> {
    query_service::get_inbox_files(&state)
}

#[tauri::command]
pub fn get_tag_page_data(
    tag_id: String,
    mode: String,
    state: State<'_, AppState>,
) -> AppResult<TagPageData> {
    query_service::get_tag_page_data(&state, &tag_id, mode)
}

#[tauri::command]
pub fn query_files_by_tags(
    tag_ids: Vec<String>,
    mode: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<FileRecord>> {
    query_service::query_files_by_tags(&state, tag_ids, mode)
}

#[tauri::command]
pub fn save_query(payload: SaveQueryPayload, state: State<'_, AppState>) -> AppResult<SavedQuery> {
    query_service::save_query(&state, payload)
}

#[tauri::command]
pub fn get_saved_queries(state: State<'_, AppState>) -> AppResult<Vec<SavedQuery>> {
    query_service::get_saved_queries(&state)
}
