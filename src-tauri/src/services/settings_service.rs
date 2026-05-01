use serde::Serialize;

use crate::app::state::AppState;
use crate::domain::errors::AppResult;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsInfo {
    pub workspace_root: Option<String>,
}

pub fn get_settings_info(state: &AppState) -> AppResult<SettingsInfo> {
    Ok(SettingsInfo {
        workspace_root: state
            .workspace()
            .ok()
            .map(|workspace| workspace.info.root_path),
    })
}
