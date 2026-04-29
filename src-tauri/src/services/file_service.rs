use std::path::{Path, PathBuf};

use crate::app::state::{AppState, WorkspaceContext};
use crate::domain::errors::{AppError, AppResult};
use crate::domain::file::{FilePageData, FileRecord, FileStatus, FreezeStatus};
use crate::domain::version::VersionNode;
use crate::infra::{clock, fs, hashing, ids};
use crate::repositories::{file_repo, tag_repo, version_repo};

pub fn import_files(state: &AppState, paths: Vec<String>) -> AppResult<Vec<FileRecord>> {
    let workspace = state.workspace()?;
    let mut imported = Vec::with_capacity(paths.len());

    for path in paths {
        let source = PathBuf::from(path);
        let file = import_single_file(&workspace, &source)?;
        imported.push(file);
    }

    Ok(imported)
}

pub fn get_file_detail(state: &AppState, file_id: &str) -> AppResult<FileRecord> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| file_repo::get(connection, file_id))
}

pub fn list_files(state: &AppState) -> AppResult<Vec<FileRecord>> {
    let workspace = state.workspace()?;
    workspace.with_db(file_repo::list_all)
}

pub fn get_file_page_data(state: &AppState, file_id: &str) -> AppResult<FilePageData> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        let file = file_repo::get(connection, file_id)?;
        let tags = tag_repo::list_for_file(connection, file_id)?;
        Ok(FilePageData { file, tags })
    })
}

pub fn archive_file(state: &AppState, file_id: &str) -> AppResult<()> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        file_repo::update_status(
            connection,
            file_id,
            FileStatus::Archived.as_str(),
            &clock::now_iso(),
        )
    })
}

pub fn import_single_file(workspace: &WorkspaceContext, source: &Path) -> AppResult<FileRecord> {
    if !source.is_file() {
        return Err(AppError::FileNotFound);
    }

    let id = ids::new_id();
    let original_name = source
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| AppError::InvalidInput("source file name is invalid".into()))?
        .to_string();
    let safe_name = fs::sanitize_file_name(&original_name);
    let stored_name = format!("{id}_{safe_name}");
    let (year, month) = clock::year_month_segments();
    let destination = PathBuf::from(&workspace.info.files_path)
        .join(&year)
        .join(&month)
        .join(&stored_name);

    fs::copy_file(source, &destination)?;
    let metadata = destination.metadata()?;
    let now = clock::now_iso();
    let record = FileRecord {
        id: id.clone(),
        original_name,
        stored_name,
        source_path: Some(source.to_string_lossy().to_string()),
        relative_path: fs::relative_files_path(&year, &month, &format!("{id}_{safe_name}")),
        size_bytes: metadata.len() as i64,
        sha256: hashing::sha256_file(&destination)?,
        status: FileStatus::Active.as_str().into(),
        freeze_status: FreezeStatus::Draft.as_str().into(),
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    workspace.with_db(|connection| {
        file_repo::insert(connection, &record)?;
        let group_id = ids::new_id();
        version_repo::create_group(connection, &group_id, &now)?;
        version_repo::insert_node(
            connection,
            &VersionNode {
                id: ids::new_id(),
                file_id: record.id.clone(),
                group_id,
                role: "working".into(),
                is_core: true,
                created_at: now,
            },
        )?;
        Ok(())
    })?;

    Ok(record)
}
