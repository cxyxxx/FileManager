use crate::app::state::AppState;
use crate::domain::errors::{AppError, AppResult};
use crate::domain::tag::{CreateTagPayload, Tag, UpdateTagPayload};
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

pub fn set_tag_parent(
    state: &AppState,
    child_id: &str,
    parent_id: Option<String>,
) -> AppResult<Tag> {
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
        tag_repo::update_parent(
            connection,
            child_id,
            parent_id.as_deref(),
            &clock::now_iso(),
        )
    })
}

pub fn update_tag(state: &AppState, tag_id: &str, payload: UpdateTagPayload) -> AppResult<Tag> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        let current = tag_repo::get(connection, tag_id)?;
        let name = payload
            .name
            .unwrap_or_else(|| current.name.clone())
            .trim()
            .to_string();
        let tag_type = payload
            .tag_type
            .unwrap_or_else(|| current.tag_type.clone())
            .trim()
            .to_string();
        tag_policy::validate_tag_name_and_type(&name, &tag_type)?;

        let parent_id = payload.parent_id.unwrap_or(current.parent_id.clone());
        if let Some(parent_id) = parent_id.as_deref() {
            tag_repo::get(connection, parent_id)?;
        }
        let tags = tag_repo::list(connection)?;
        let items = tags
            .into_iter()
            .map(|tag| TagHierarchyItem {
                parent_id: if tag.id == tag_id {
                    parent_id.clone()
                } else {
                    tag.parent_id
                },
                id: tag.id,
            })
            .collect::<Vec<_>>();
        tag_policy::validate_parent_change(tag_id, parent_id.as_deref(), &items)?;

        tag_repo::update(
            connection,
            tag_id,
            &name,
            parent_id.as_deref(),
            &tag_type,
            payload.is_topic_enabled.unwrap_or(current.is_topic_enabled),
            &clock::now_iso(),
        )
        .map_err(map_tag_insert_error)
    })
}

pub fn delete_tag(state: &AppState, tag_id: &str) -> AppResult<()> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        tag_repo::get(connection, tag_id)?;
        if tag_repo::child_count(connection, tag_id)? > 0 {
            return Err(AppError::Conflict("该 tag 下还有子 tag，不能删除".into()));
        }
        if tag_repo::file_count_for_tag(connection, tag_id)? > 0 {
            return Err(AppError::Conflict("该 tag 仍绑定文件，不能删除".into()));
        }
        tag_repo::delete(connection, tag_id)
    })
}

pub fn clear_all_tags(state: &AppState) -> AppResult<usize> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        connection.execute_batch("BEGIN IMMEDIATE TRANSACTION;")?;
        let result = (|| {
            let deleted_tags = connection.execute("DELETE FROM tags", [])?;
            Ok(deleted_tags)
        })();

        match result {
            Ok(deleted_tags) => {
                connection.execute_batch("COMMIT;")?;
                Ok(deleted_tags)
            }
            Err(error) => {
                let _ = connection.execute_batch("ROLLBACK;");
                Err(error)
            }
        }
    })
}

pub fn attach_tags_to_file(state: &AppState, file_id: &str, tag_ids: Vec<String>) -> AppResult<()> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        file_repo::get(connection, file_id)?;
        for tag_id in tag_ids {
            tag_repo::get(connection, &tag_id)?;
            tag_repo::attach_to_file_ignore_existing(
                connection,
                file_id,
                &tag_id,
                &clock::now_iso(),
            )?;
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
