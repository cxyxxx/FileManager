use tauri::State;

use crate::app::state::AppState;
use crate::domain::errors::AppResult;
use crate::domain::file::{FilePageData, FileRecord};
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
pub fn list_files(state: State<'_, AppState>) -> AppResult<Vec<FileRecord>> {
    file_service::list_files(&state)
}

#[tauri::command]
pub fn get_file_page_data(file_id: String, state: State<'_, AppState>) -> AppResult<FilePageData> {
    file_service::get_file_page_data(&state, &file_id)
}

#[tauri::command]
pub fn archive_file(file_id: String, state: State<'_, AppState>) -> AppResult<()> {
    file_service::archive_file(&state, &file_id)
}

#[tauri::command]
pub fn open_file(file_id: String, state: State<'_, AppState>) -> AppResult<FileRecord> {
    file_service::get_file_detail(&state, &file_id)
}
