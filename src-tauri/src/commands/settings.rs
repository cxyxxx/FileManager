use tauri::State;

use crate::app::state::AppState;
use crate::domain::errors::AppResult;
use crate::services::settings_service::{self, SettingsInfo};

#[tauri::command]
pub fn get_settings_info(state: State<'_, AppState>) -> AppResult<SettingsInfo> {
    settings_service::get_settings_info(&state)
}
