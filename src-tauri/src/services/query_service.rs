use std::collections::{HashMap, HashSet, VecDeque};

use crate::app::state::AppState;
use crate::domain::errors::{AppError, AppResult};
use crate::domain::file::FileRecord;
use crate::domain::query::{
    SaveQueryPayload, SavedQuery, SavedQueryPayload, TagMatchedFile, TagPageData, TagQueryPayload,
    UpdateSavedQueryPayload,
};
use crate::domain::tag::Tag;
use crate::infra::{clock, ids};
use crate::policies::aggregation_policy;
use crate::repositories::{file_repo, query_repo, tag_repo};

pub fn get_inbox_files(state: &AppState) -> AppResult<Vec<FileRecord>> {
    let workspace = state.workspace()?;
    workspace.with_db(file_repo::list_inbox)
}

pub fn query_files_by_tags(
    state: &AppState,
    tag_ids: Vec<String>,
    mode: String,
) -> AppResult<Vec<FileRecord>> {
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
            _ => Err(AppError::InvalidInput(
                "query mode must be and or or".into(),
            )),
        }
    })
}

pub fn get_tag_page_data(state: &AppState, tag_id: &str, mode: String) -> AppResult<TagPageData> {
    if !matches!(mode.as_str(), "structure" | "aggregation") {
        return Err(AppError::InvalidInput(
            "tag page mode must be structure or aggregation".into(),
        ));
    }

    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        let tag = tag_repo::get(connection, tag_id)?;
        let children = tag_repo::list_children(connection, tag_id)?;
        let direct_files = file_repo::list_by_tag(connection, tag_id)?;
        let total_direct_file_count = direct_files.len();

        let (aggregate_files, descendant_tags, total_aggregate_file_count) =
            if mode == "aggregation" {
                let all_tags = tag_repo::list(connection)?;
                let tags_by_id = all_tags
                    .iter()
                    .map(|tag| (tag.id.as_str(), tag))
                    .collect::<HashMap<_, _>>();
                let descendant_ids = descendant_tag_ids(tag_id, &all_tags);
                let descendant_tags = descendant_ids
                    .iter()
                    .filter_map(|id| tags_by_id.get(id.as_str()).map(|tag| (*tag).clone()))
                    .collect::<Vec<_>>();
                let mut file_map: HashMap<String, TagMatchedFile> = HashMap::new();

                for matched_tag in &descendant_tags {
                    for file in file_repo::list_by_tag(connection, &matched_tag.id)? {
                        let file_id = file.id.clone();
                        file_map
                            .entry(file_id)
                            .or_insert_with(|| TagMatchedFile {
                                file,
                                matched_tags: Vec::new(),
                            })
                            .matched_tags
                            .push(matched_tag.clone());
                    }
                }

                let mut aggregate_files = file_map.into_values().collect::<Vec<_>>();
                aggregate_files.sort_by(|left, right| {
                    right
                        .file
                        .updated_at
                        .cmp(&left.file.updated_at)
                        .then_with(|| left.file.original_name.cmp(&right.file.original_name))
                        .then_with(|| left.file.id.cmp(&right.file.id))
                });
                let total = aggregate_files.len();
                (aggregate_files, descendant_tags, Some(total))
            } else {
                (Vec::new(), Vec::new(), None)
            };

        Ok(TagPageData {
            tag,
            children,
            direct_files,
            aggregate_files,
            descendant_tags,
            total_direct_file_count,
            total_aggregate_file_count,
            mode,
        })
    })
}

pub fn save_query(state: &AppState, payload: SaveQueryPayload) -> AppResult<SavedQuery> {
    if payload.name.trim().is_empty() {
        return Err(AppError::InvalidInput("query name is required".into()));
    }

    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        let query_payload = normalize_saved_query_payload(&payload)?;
        let (query_type, mode, tag_ids) = match &query_payload {
            SavedQueryPayload::Tag(tag_payload) => {
                if !matches!(tag_payload.mode.as_str(), "and" | "or") {
                    return Err(AppError::InvalidInput(
                        "query mode must be and or or".into(),
                    ));
                }
                for tag_id in &tag_payload.tag_ids {
                    tag_repo::get(connection, tag_id)?;
                }
                (
                    "tag".to_string(),
                    tag_payload.mode.clone(),
                    tag_payload.tag_ids.clone(),
                )
            }
            SavedQueryPayload::Keyword(keyword_payload) => {
                if keyword_payload.keyword.trim().is_empty() {
                    return Err(AppError::InvalidInput("keyword is required".into()));
                }
                for tag_id in keyword_payload.tag_ids.as_deref().unwrap_or_default() {
                    tag_repo::get(connection, tag_id)?;
                }
                (
                    "keyword".to_string(),
                    "and".to_string(),
                    keyword_payload.tag_ids.clone().unwrap_or_default(),
                )
            }
        };
        let now = clock::now_iso();
        let query = SavedQuery {
            id: ids::new_id(),
            name: payload.name.trim().into(),
            query_type,
            payload: query_payload,
            mode,
            tag_ids,
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

pub fn update_saved_query(
    state: &AppState,
    query_id: &str,
    payload: UpdateSavedQueryPayload,
) -> AppResult<SavedQuery> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        let current = query_repo::get(connection, query_id)?;
        let name = payload.name.unwrap_or(current.name).trim().to_string();
        if name.is_empty() {
            return Err(AppError::InvalidInput("query name is required".into()));
        }
        query_repo::update_name(connection, query_id, &name, &clock::now_iso())
    })
}

pub fn delete_saved_query(state: &AppState, query_id: &str) -> AppResult<()> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| query_repo::delete(connection, query_id))
}

fn normalize_saved_query_payload(payload: &SaveQueryPayload) -> AppResult<SavedQueryPayload> {
    if let Some(query_payload) = payload.payload.clone() {
        return Ok(query_payload);
    }

    match payload.query_type.as_deref().unwrap_or("tag") {
        "tag" => Ok(SavedQueryPayload::Tag(TagQueryPayload {
            tag_ids: payload.tag_ids.clone().unwrap_or_default(),
            mode: payload.mode.clone().unwrap_or_else(|| "and".into()),
        })),
        "keyword" => Err(AppError::InvalidInput(
            "keyword saved query payload is required".into(),
        )),
        _ => Err(AppError::InvalidInput(
            "queryType must be tag or keyword".into(),
        )),
    }
}

fn descendant_tag_ids(root_id: &str, tags: &[Tag]) -> Vec<String> {
    let mut result = Vec::new();
    let mut visited = HashSet::new();
    let mut cursor = VecDeque::from([root_id.to_string()]);

    while let Some(parent_id) = cursor.pop_front() {
        if !visited.insert(parent_id.clone()) {
            continue;
        }
        result.push(parent_id.clone());

        for tag in tags
            .iter()
            .filter(|tag| tag.parent_id.as_deref() == Some(parent_id.as_str()))
        {
            if !visited.contains(&tag.id) {
                cursor.push_back(tag.id.clone());
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};

    use rusqlite::Connection;

    use super::*;
    use crate::app::state::{WorkspaceContext, WorkspaceInfo};
    use crate::db::migrations;
    use crate::domain::file::FileRecord;
    use crate::repositories::{file_repo, tag_repo};

    #[test]
    fn structure_mode_returns_children_and_direct_files_only() {
        let state = test_state();
        seed_tag_page_fixture(&state);

        let page = get_tag_page_data(&state, "tag_tech", "structure".into()).unwrap();

        assert_eq!(page.tag.id, "tag_tech");
        assert_eq!(ids(&page.children), vec!["tag_db", "tag_llm"]);
        assert_eq!(ids(&page.direct_files), vec!["file_tech"]);
        assert!(page.aggregate_files.is_empty());
        assert!(page.descendant_tags.is_empty());
        assert_eq!(page.total_direct_file_count, 1);
        assert_eq!(page.total_aggregate_file_count, None);
        assert_eq!(page.mode, "structure");
    }

    #[test]
    fn aggregation_mode_returns_descendant_files_and_counts_deduped_files() {
        let state = test_state();
        seed_tag_page_fixture(&state);

        let page = get_tag_page_data(&state, "tag_tech", "aggregation".into()).unwrap();

        assert_eq!(ids(&page.children), vec!["tag_db", "tag_llm"]);
        assert_eq!(ids(&page.direct_files), vec!["file_tech"]);
        assert_eq!(
            ids(&page.descendant_tags),
            vec!["tag_tech", "tag_db", "tag_llm"]
        );
        assert_eq!(page.total_direct_file_count, 1);
        assert_eq!(page.total_aggregate_file_count, Some(2));

        let rag_file = page
            .aggregate_files
            .iter()
            .find(|matched| matched.file.id == "file_rag")
            .unwrap();
        assert_eq!(ids(&rag_file.matched_tags), vec!["tag_llm"]);
    }

    #[test]
    fn aggregation_mode_dedupes_files_and_keeps_all_matched_tags() {
        let state = test_state();
        state
            .workspace()
            .unwrap()
            .with_db(|connection| {
                insert_tag(connection, "tag_tech", "tech", None);
                insert_tag(connection, "tag_llm", "llm", Some("tag_tech"));
                insert_tag(connection, "tag_rag", "rag", Some("tag_tech"));
                insert_file(connection, "file_rag", "RAG.pdf", "2026-01-01T00:00:00Z");
                tag_repo::attach_to_file(
                    connection,
                    "file_rag",
                    "tag_llm",
                    "2026-01-01T00:00:00Z",
                )?;
                tag_repo::attach_to_file(
                    connection,
                    "file_rag",
                    "tag_rag",
                    "2026-01-01T00:00:00Z",
                )?;
                Ok(())
            })
            .unwrap();

        let page = get_tag_page_data(&state, "tag_tech", "aggregation".into()).unwrap();

        assert_eq!(page.aggregate_files.len(), 1);
        assert_eq!(page.total_aggregate_file_count, Some(1));
        assert_eq!(page.aggregate_files[0].file.id, "file_rag");
        assert_eq!(
            ids(&page.aggregate_files[0].matched_tags),
            vec!["tag_llm", "tag_rag"]
        );
    }

    #[test]
    fn rejects_invalid_tag_page_mode() {
        let state = test_state();

        let result = get_tag_page_data(&state, "tag_tech", "all".into());

        assert!(matches!(
            result,
            Err(AppError::InvalidInput(message))
                if message == "tag page mode must be structure or aggregation"
        ));
    }

    fn test_state() -> AppState {
        let connection = Connection::open_in_memory().unwrap();
        migrations::run_migrations(&connection).unwrap();

        let state = AppState::default();
        state
            .set_workspace(WorkspaceContext {
                info: WorkspaceInfo {
                    root_path: String::new(),
                    db_path: String::new(),
                    files_path: String::new(),
                    previews_path: String::new(),
                    temp_path: String::new(),
                    logs_path: String::new(),
                },
                db: Arc::new(Mutex::new(connection)),
            })
            .unwrap();
        state
    }

    fn seed_tag_page_fixture(state: &AppState) {
        state
            .workspace()
            .unwrap()
            .with_db(|connection| {
                insert_tag(connection, "tag_tech", "tech", None);
                insert_tag(connection, "tag_llm", "llm", Some("tag_tech"));
                insert_tag(connection, "tag_db", "db", Some("tag_tech"));
                insert_file(connection, "file_tech", "Tech.pdf", "2026-01-02T00:00:00Z");
                insert_file(connection, "file_rag", "RAG.pdf", "2026-01-01T00:00:00Z");
                tag_repo::attach_to_file(
                    connection,
                    "file_tech",
                    "tag_tech",
                    "2026-01-01T00:00:00Z",
                )?;
                tag_repo::attach_to_file(
                    connection,
                    "file_rag",
                    "tag_llm",
                    "2026-01-01T00:00:00Z",
                )?;
                Ok(())
            })
            .unwrap();
    }

    fn insert_tag(connection: &Connection, id: &str, name: &str, parent_id: Option<&str>) {
        let tag = Tag {
            id: id.into(),
            name: name.into(),
            tag_type: "topic".into(),
            parent_id: parent_id.map(str::to_string),
            is_topic_enabled: true,
            created_at: "2026-01-01T00:00:00Z".into(),
            updated_at: "2026-01-01T00:00:00Z".into(),
        };
        tag_repo::insert(connection, &tag).unwrap();
    }

    fn insert_file(connection: &Connection, id: &str, original_name: &str, updated_at: &str) {
        let file = FileRecord {
            id: id.into(),
            original_name: original_name.into(),
            stored_name: format!("{id}.pdf"),
            source_path: None,
            relative_path: format!("{id}.pdf"),
            size_bytes: 1,
            sha256: format!("sha-{id}"),
            summary: None,
            status: "active".into(),
            freeze_status: "draft".into(),
            created_at: "2026-01-01T00:00:00Z".into(),
            updated_at: updated_at.into(),
        };
        file_repo::insert(connection, &file).unwrap();
    }

    fn ids<T: HasId>(items: &[T]) -> Vec<&str> {
        items.iter().map(HasId::id).collect()
    }

    trait HasId {
        fn id(&self) -> &str;
    }

    impl HasId for Tag {
        fn id(&self) -> &str {
            &self.id
        }
    }

    impl HasId for FileRecord {
        fn id(&self) -> &str {
            &self.id
        }
    }
}
