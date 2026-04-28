use std::collections::{HashMap, HashSet};

use serde::Serialize;

use crate::app::state::AppState;
use crate::domain::errors::{AppError, AppResult};
use crate::domain::file::FileRecord;
use crate::domain::query::{SaveQueryPayload, SavedQuery};
use crate::domain::tag::Tag;
use crate::infra::{clock, ids};
use crate::policies::aggregation_policy;
use crate::repositories::{file_repo, query_repo, tag_repo};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TagPageData {
    pub tag: Tag,
    pub direct_files: Vec<FileRecord>,
    pub aggregate_files: Vec<FileRecord>,
}

pub fn get_inbox_files(state: &AppState) -> AppResult<Vec<FileRecord>> {
    let workspace = state.workspace()?;
    workspace.with_db(file_repo::list_inbox)
}

pub fn query_files_by_tags(state: &AppState, tag_ids: Vec<String>, mode: String) -> AppResult<Vec<FileRecord>> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        if tag_ids.is_empty() {
            return Ok(Vec::new());
        }
        for tag_id in &tag_ids {
            tag_repo::get(connection, tag_id)?;
        }

        match mode.as_str() {
            "or" => {
                let mut ids = Vec::new();
                let mut by_id = HashMap::new();
                for tag_id in tag_ids {
                    for file in file_repo::list_by_tag(connection, &tag_id)? {
                        ids.push(file.id.clone());
                        by_id.insert(file.id.clone(), file);
                    }
                }
                Ok(aggregation_policy::dedupe_file_ids(ids)
                    .into_iter()
                    .filter_map(|id| by_id.remove(&id))
                    .collect())
            }
            "and" => {
                let mut counts: HashMap<String, usize> = HashMap::new();
                let mut by_id = HashMap::new();
                for tag_id in &tag_ids {
                    let mut seen_for_tag = HashSet::new();
                    for file in file_repo::list_by_tag(connection, tag_id)? {
                        if seen_for_tag.insert(file.id.clone()) {
                            *counts.entry(file.id.clone()).or_default() += 1;
                            by_id.insert(file.id.clone(), file);
                        }
                    }
                }
                Ok(counts
                    .into_iter()
                    .filter_map(|(file_id, count)| {
                        if count == tag_ids.len() {
                            by_id.remove(&file_id)
                        } else {
                            None
                        }
                    })
                    .collect())
            }
            _ => Err(AppError::InvalidInput("query mode must be and or or".into())),
        }
    })
}

pub fn get_tag_page_data(state: &AppState, tag_id: &str, mode: String) -> AppResult<TagPageData> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        let tag = tag_repo::get(connection, tag_id)?;
        let direct_files = file_repo::list_by_tag(connection, tag_id)?;
        let aggregate_files = if mode == "aggregation" {
            let tags = tag_repo::list(connection)?;
            let descendant_ids = descendant_tag_ids(tag_id, &tags);
            let mut ids = Vec::new();
            let mut by_id = HashMap::new();
            for current_id in descendant_ids {
                for file in file_repo::list_by_tag(connection, &current_id)? {
                    ids.push(file.id.clone());
                    by_id.insert(file.id.clone(), file);
                }
            }
            aggregation_policy::dedupe_file_ids(ids)
                .into_iter()
                .filter_map(|id| by_id.remove(&id))
                .collect()
        } else {
            direct_files.clone()
        };
        Ok(TagPageData {
            tag,
            direct_files,
            aggregate_files,
        })
    })
}

pub fn save_query(state: &AppState, payload: SaveQueryPayload) -> AppResult<SavedQuery> {
    if payload.name.trim().is_empty() {
        return Err(AppError::InvalidInput("query name is required".into()));
    }
    if !matches!(payload.mode.as_str(), "and" | "or") {
        return Err(AppError::InvalidInput("query mode must be and or or".into()));
    }

    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        for tag_id in &payload.tag_ids {
            tag_repo::get(connection, tag_id)?;
        }
        let now = clock::now_iso();
        let query = SavedQuery {
            id: ids::new_id(),
            name: payload.name.trim().into(),
            mode: payload.mode,
            tag_ids: payload.tag_ids,
            created_at: now.clone(),
            updated_at: now,
        };
        query_repo::insert(connection, &query)?;
        Ok(query)
    })
}

pub fn get_saved_queries(state: &AppState) -> AppResult<Vec<SavedQuery>> {
    let workspace = state.workspace()?;
    workspace.with_db(query_repo::list)
}

fn descendant_tag_ids(root_id: &str, tags: &[Tag]) -> Vec<String> {
    let mut result = vec![root_id.to_string()];
    let mut cursor = vec![root_id.to_string()];
    while let Some(parent_id) = cursor.pop() {
        for tag in tags.iter().filter(|tag| tag.parent_id.as_deref() == Some(parent_id.as_str())) {
            result.push(tag.id.clone());
            cursor.push(tag.id.clone());
        }
    }
    result
}
