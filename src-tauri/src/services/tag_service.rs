use crate::app::state::AppState;
use crate::domain::errors::{AppError, AppResult};
use crate::domain::tag::{CreateTagPayload, Tag};
use crate::infra::{clock, ids};
use crate::policies::tag_policy::{self, TagHierarchyItem};
use crate::repositories::{file_repo, tag_repo};

pub fn create_tag(state: &AppState, payload: CreateTagPayload) -> AppResult<Tag> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        tag_policy::validate_tag_name_and_type(&payload.name, &payload.tag_type)?;
        if let Some(parent_id) = payload.parent_id.as_deref() {
            tag_repo::get(connection, parent_id)?;
        }
        let now = clock::now_iso();
        let tag = Tag {
            id: ids::new_id(),
            name: payload.name.trim().into(),
            tag_type: payload.tag_type.trim().into(),
            parent_id: payload.parent_id,
            is_topic_enabled: payload.is_topic_enabled.unwrap_or(true),
            created_at: now.clone(),
            updated_at: now,
        };
        tag_repo::insert(connection, &tag).map_err(map_tag_insert_error)?;
        Ok(tag)
    })
}

pub fn list_tags(state: &AppState) -> AppResult<Vec<Tag>> {
    let workspace = state.workspace()?;
    workspace.with_db(tag_repo::list)
}

pub fn set_tag_parent(state: &AppState, child_id: &str, parent_id: Option<String>) -> AppResult<Tag> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        tag_repo::get(connection, child_id)?;
        if let Some(parent_id) = parent_id.as_deref() {
            tag_repo::get(connection, parent_id)?;
        }
        let tags = tag_repo::list(connection)?;
        let items = tags
            .into_iter()
            .map(|tag| TagHierarchyItem {
                id: tag.id,
                parent_id: tag.parent_id,
            })
            .collect::<Vec<_>>();
        tag_policy::validate_parent_change(child_id, parent_id.as_deref(), &items)?;
        tag_repo::update_parent(connection, child_id, parent_id.as_deref(), &clock::now_iso())
    })
}

pub fn attach_tags_to_file(state: &AppState, file_id: &str, tag_ids: Vec<String>) -> AppResult<()> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        file_repo::get(connection, file_id)?;
        for tag_id in tag_ids {
            tag_repo::get(connection, &tag_id)?;
            if tag_repo::file_tag_exists(connection, file_id, &tag_id)? {
                return Err(AppError::Conflict(format!("tag {tag_id} is already attached")));
            }
            tag_repo::attach_to_file(connection, file_id, &tag_id, &clock::now_iso())?;
        }
        Ok(())
    })
}

fn map_tag_insert_error(error: AppError) -> AppError {
    match error {
        AppError::Internal(message) if message.contains("UNIQUE") => AppError::TagConflict,
        other => other,
    }
}
