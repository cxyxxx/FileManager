use std::path::PathBuf;

use crate::app::state::{AppState, WorkspaceContext};
use crate::domain::errors::{AppError, AppResult};
use crate::domain::file::{FileRecord, FileStatus, FreezeStatus};
use crate::domain::version::{CreateDerivedVersionPayload, VersionEdge, VersionNode, VersionRole};
use crate::infra::{clock, fs, hashing, ids};
use crate::repositories::{file_repo, version_repo};

pub fn create_derived_version(
    state: &AppState,
    source_file_id: &str,
    payload: CreateDerivedVersionPayload,
) -> AppResult<FileRecord> {
    let workspace = state.workspace()?;
    let source = workspace.with_db(|connection| file_repo::get(connection, source_file_id))?;
    let source_path = PathBuf::from(&workspace.info.root_path).join(&source.relative_path);
    let derived = copy_derived_file(&workspace, &source, &source_path, payload.name)?;

    workspace.with_db(|connection| {
        file_repo::insert(connection, &derived)?;
        let source_node = ensure_version_node(connection, &source)?;
        version_repo::insert_node(
            connection,
            &VersionNode {
                id: ids::new_id(),
                file_id: derived.id.clone(),
                group_id: source_node.group_id.clone(),
                role: VersionRole::Derived.as_str().into(),
                is_core: false,
                created_at: derived.created_at.clone(),
            },
        )?;
        version_repo::insert_edge(
            connection,
            &VersionEdge {
                id: ids::new_id(),
                source_file_id: source.id,
                derived_file_id: derived.id.clone(),
                created_at: derived.created_at.clone(),
            },
        )?;
        Ok(())
    })?;

    Ok(derived)
}

pub fn set_version_role(state: &AppState, file_id: &str, role: String) -> AppResult<VersionNode> {
    let parsed = VersionRole::parse(&role).ok_or(AppError::InvalidVersionRole)?;
    let workspace = state.workspace()?;
    workspace.with_db(|connection| version_repo::update_role(connection, file_id, parsed.as_str()))
}

pub fn set_core_version(
    state: &AppState,
    version_group_id: &str,
    role: String,
    file_id: &str,
) -> AppResult<VersionNode> {
    let parsed = VersionRole::parse(&role).ok_or(AppError::InvalidVersionRole)?;
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        let node = version_repo::get_node_by_file(connection, file_id)?;
        if node.group_id != version_group_id || node.role != parsed.as_str() {
            return Err(AppError::InvalidVersionRole);
        }
        version_repo::clear_core_for_role(connection, version_group_id, parsed.as_str())?;
        version_repo::set_core(connection, file_id, true)
    })
}

pub fn get_version_chain(state: &AppState, file_id: &str) -> AppResult<Vec<VersionNode>> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        let node = version_repo::get_node_by_file(connection, file_id)?;
        version_repo::list_group_nodes(connection, &node.group_id)
    })
}

fn copy_derived_file(
    workspace: &WorkspaceContext,
    source: &FileRecord,
    source_path: &PathBuf,
    name: Option<String>,
) -> AppResult<FileRecord> {
    let id = ids::new_id();
    let original_name = name
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| format!("derived_{}", source.original_name));
    let safe_name = fs::sanitize_file_name(&original_name);
    let stored_name = format!("{id}_{safe_name}");
    let (year, month) = clock::year_month_segments();
    let destination = PathBuf::from(&workspace.info.files_path)
        .join(&year)
        .join(&month)
        .join(&stored_name);
    fs::copy_file(source_path, &destination)?;
    let metadata = destination.metadata()?;
    let now = clock::now_iso();
    Ok(FileRecord {
        id,
        original_name,
        stored_name,
        source_path: Some(source.relative_path.clone()),
        relative_path: fs::relative_files_path(&year, &month, &safe_name_with_id(&destination)),
        import_batch_id: None,
        import_root_name: None,
        import_root_path: None,
        import_relative_path: None,
        imported_at: None,
        size_bytes: metadata.len() as i64,
        sha256: hashing::sha256_file(&destination)?,
        summary: None,
        status: FileStatus::Active.as_str().into(),
        freeze_status: FreezeStatus::Draft.as_str().into(),
        created_at: now.clone(),
        updated_at: now,
    })
}

fn safe_name_with_id(path: &PathBuf) -> String {
    path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("file")
        .to_string()
}

fn ensure_version_node(
    connection: &rusqlite::Connection,
    source: &FileRecord,
) -> AppResult<VersionNode> {
    if let Some(node) = version_repo::find_node_by_file(connection, &source.id)? {
        return Ok(node);
    }

    let group_id = ids::new_id();
    let now = clock::now_iso();
    version_repo::create_group(connection, &group_id, &now)?;
    let node = VersionNode {
        id: ids::new_id(),
        file_id: source.id.clone(),
        group_id,
        role: VersionRole::Working.as_str().into(),
        is_core: true,
        created_at: now,
    };
    version_repo::insert_node(connection, &node)?;
    Ok(node)
}
