use tauri::State;

use crate::app::state::AppState;
use crate::domain::errors::AppResult;
use crate::domain::file::{
    FilePageData, FileRecord, FileSearchResult, ListFilesOptions, SearchFilesOptions,
};
use crate::services::file_service;

#[tauri::command]
pub fn import_files(paths: Vec<String>, state: State<'_, AppState>) -> AppResult<Vec<FileRecord>> {
    file_service::import_files(&state, paths)
}

#[tauri::command]
pub fn get_file_detail(file_id: String, state: State<'_, AppState>) -> AppResult<FileRecord> {
    file_service::get_file_detail(&state, &file_id)
}

#[tauri::command]
pub fn list_files(
    options: Option<ListFilesOptions>,
    state: State<'_, AppState>,
) -> AppResult<Vec<FileRecord>> {
    file_service::list_files(&state, options)
}

#[tauri::command]
pub fn get_file_page_data(file_id: String, state: State<'_, AppState>) -> AppResult<FilePageData> {
    file_service::get_file_page_data(&state, &file_id)
}

#[tauri::command]
pub fn update_file_summary(
    file_id: String,
    summary: String,
    state: State<'_, AppState>,
) -> AppResult<FilePageData> {
    file_service::update_file_summary(&state, &file_id, summary)
}

#[tauri::command]
pub fn set_file_tags(
    file_id: String,
    tag_ids: Vec<String>,
    state: State<'_, AppState>,
) -> AppResult<FilePageData> {
    file_service::set_file_tags(&state, &file_id, tag_ids)
}

#[tauri::command]
pub fn archive_file(file_id: String, state: State<'_, AppState>) -> AppResult<()> {
    file_service::archive_file(&state, &file_id)
}

#[tauri::command]
pub fn restore_file(file_id: String, state: State<'_, AppState>) -> AppResult<()> {
    file_service::restore_file(&state, &file_id)
}

#[tauri::command]
pub fn open_file(file_id: String, state: State<'_, AppState>) -> AppResult<()> {
    file_service::open_file(&state, &file_id)
}

#[tauri::command]
pub fn reveal_file(file_id: String, state: State<'_, AppState>) -> AppResult<()> {
    file_service::reveal_file(&state, &file_id)
}

#[tauri::command]
pub fn search_files(
    keyword: String,
    options: Option<SearchFilesOptions>,
    state: State<'_, AppState>,
) -> AppResult<Vec<FileSearchResult>> {
    file_service::search_files(&state, keyword, options)
}
