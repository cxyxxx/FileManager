use tauri::State;

use crate::app::state::AppState;
use crate::domain::errors::AppResult;
use crate::domain::tag::{CreateTagPayload, Tag, UpdateTagPayload};
use crate::services::tag_service;

#[tauri::command]
pub fn create_tag(payload: CreateTagPayload, state: State<'_, AppState>) -> AppResult<Tag> {
    tag_service::create_tag(&state, payload)
}

#[tauri::command]
pub fn list_tags(state: State<'_, AppState>) -> AppResult<Vec<Tag>> {
    tag_service::list_tags(&state)
}

#[tauri::command]
pub fn set_tag_parent(
    child_id: String,
    parent_id: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<Tag> {
    tag_service::set_tag_parent(&state, &child_id, parent_id)
}

#[tauri::command]
pub fn update_tag(
    tag_id: String,
    payload: UpdateTagPayload,
    state: State<'_, AppState>,
) -> AppResult<Tag> {
    tag_service::update_tag(&state, &tag_id, payload)
}

#[tauri::command]
pub fn delete_tag(tag_id: String, state: State<'_, AppState>) -> AppResult<()> {
    tag_service::delete_tag(&state, &tag_id)
}

#[tauri::command]
pub fn attach_tags_to_file(
    file_id: String,
    tag_ids: Vec<String>,
    state: State<'_, AppState>,
) -> AppResult<()> {
    tag_service::attach_tags_to_file(&state, &file_id, tag_ids)
}
