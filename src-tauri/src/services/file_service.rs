use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::app::state::{AppState, WorkspaceContext};
use crate::domain::errors::{AppError, AppResult};
use crate::domain::file::{
    FilePageData, FileRecord, FileSearchResult, FileStatus, FreezeStatus, ListFilesOptions,
    SearchFilesOptions, SearchHighlight,
};
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

pub fn list_files(
    state: &AppState,
    options: Option<ListFilesOptions>,
) -> AppResult<Vec<FileRecord>> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        file_repo::list_all(
            connection,
            &options.unwrap_or(ListFilesOptions {
                include_archived: Some(false),
                archived_only: Some(false),
            }),
        )
    })
}

pub fn get_file_page_data(state: &AppState, file_id: &str) -> AppResult<FilePageData> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        let file = file_repo::get(connection, file_id)?;
        let tags = tag_repo::list_for_file(connection, file_id)?;
        let versions = version_repo::find_node_by_file(connection, file_id)?
            .map(|node| version_repo::list_group_nodes(connection, &node.group_id))
            .transpose()?
            .unwrap_or_default();
        Ok(FilePageData {
            file,
            tags,
            versions,
        })
    })
}

pub fn update_file_summary(
    state: &AppState,
    file_id: &str,
    summary: String,
) -> AppResult<FilePageData> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        let trimmed = summary.trim();
        file_repo::update_summary(
            connection,
            file_id,
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            },
            &clock::now_iso(),
        )?;
        let file = file_repo::get(connection, file_id)?;
        let tags = tag_repo::list_for_file(connection, file_id)?;
        let versions = version_repo::find_node_by_file(connection, file_id)?
            .map(|node| version_repo::list_group_nodes(connection, &node.group_id))
            .transpose()?
            .unwrap_or_default();
        Ok(FilePageData {
            file,
            tags,
            versions,
        })
    })
}

pub fn set_file_tags(
    state: &AppState,
    file_id: &str,
    tag_ids: Vec<String>,
) -> AppResult<FilePageData> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        file_repo::get(connection, file_id)?;
        for tag_id in &tag_ids {
            tag_repo::get(connection, tag_id)?;
        }
        tag_repo::replace_for_file(connection, file_id, &tag_ids, &clock::now_iso())?;
        let file = file_repo::get(connection, file_id)?;
        let tags = tag_repo::list_for_file(connection, file_id)?;
        let versions = version_repo::find_node_by_file(connection, file_id)?
            .map(|node| version_repo::list_group_nodes(connection, &node.group_id))
            .transpose()?
            .unwrap_or_default();
        Ok(FilePageData {
            file,
            tags,
            versions,
        })
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

pub fn restore_file(state: &AppState, file_id: &str) -> AppResult<()> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        file_repo::update_status(
            connection,
            file_id,
            FileStatus::Active.as_str(),
            &clock::now_iso(),
        )
    })
}

pub fn open_file(state: &AppState, file_id: &str) -> AppResult<()> {
    let path = stored_file_path(state, file_id)?;
    open_path(&path)
}

pub fn reveal_file(state: &AppState, file_id: &str) -> AppResult<()> {
    let path = stored_file_path(state, file_id)?;
    reveal_path(&path)
}

pub fn search_files(
    state: &AppState,
    keyword: String,
    options: Option<SearchFilesOptions>,
) -> AppResult<Vec<FileSearchResult>> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        let options = options.unwrap_or(SearchFilesOptions {
            tag_ids: None,
            file_types: None,
            include_archived: Some(false),
        });
        let keyword = keyword.trim().to_lowercase();
        if keyword.is_empty() {
            return Ok(Vec::new());
        }
        let required_tag_ids = options.tag_ids.unwrap_or_default();
        for tag_id in &required_tag_ids {
            tag_repo::get(connection, tag_id)?;
        }
        let required_tag_set = required_tag_ids.into_iter().collect::<HashSet<_>>();
        let file_types = options
            .file_types
            .unwrap_or_default()
            .into_iter()
            .map(|item| item.trim().trim_start_matches('.').to_lowercase())
            .filter(|item| !item.is_empty())
            .collect::<HashSet<_>>();

        let mut results = Vec::new();
        for file in
            file_repo::search_candidates(connection, options.include_archived.unwrap_or(false))?
        {
            if !file_types.is_empty() && !file_types.contains(&file_extension(&file).to_lowercase())
            {
                continue;
            }

            let tags = tag_repo::list_for_file(connection, &file.id)?;
            let tag_ids = tags
                .iter()
                .map(|tag| tag.id.clone())
                .collect::<HashSet<_>>();
            if !required_tag_set.is_empty()
                && !required_tag_set
                    .iter()
                    .all(|tag_id| tag_ids.contains(tag_id))
            {
                continue;
            }

            let name_match = file.original_name.to_lowercase().contains(&keyword);
            let summary_match = file
                .summary
                .as_deref()
                .unwrap_or("")
                .to_lowercase()
                .contains(&keyword);
            let matched_tags = tags
                .iter()
                .filter(|tag| tag.name.to_lowercase().contains(&keyword))
                .cloned()
                .collect::<Vec<_>>();
            if !name_match && !summary_match && matched_tags.is_empty() {
                continue;
            }

            let mut matched_fields = Vec::new();
            if name_match {
                matched_fields.push("fileName".into());
            }
            if !matched_tags.is_empty() {
                matched_fields.push("tag".into());
            }
            if summary_match {
                matched_fields.push("summary".into());
            }
            results.push(FileSearchResult {
                highlight: SearchHighlight {
                    file_name: name_match.then(|| file.original_name.clone()),
                    summary: summary_match
                        .then(|| summary_excerpt(file.summary.as_deref().unwrap_or(""), &keyword)),
                    tags: matched_tags.iter().map(|tag| tag.name.clone()).collect(),
                },
                file,
                matched_tags,
                matched_fields,
            });
        }

        results.sort_by(|left, right| {
            score_result(right)
                .cmp(&score_result(left))
                .then_with(|| right.file.updated_at.cmp(&left.file.updated_at))
                .then_with(|| left.file.original_name.cmp(&right.file.original_name))
        });
        Ok(results)
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
        summary: None,
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

fn stored_file_path(state: &AppState, file_id: &str) -> AppResult<PathBuf> {
    let workspace = state.workspace()?;
    let file = workspace.with_db(|connection| file_repo::get(connection, file_id))?;
    Ok(PathBuf::from(workspace.info.root_path).join(file.relative_path))
}

fn open_path(path: &Path) -> AppResult<()> {
    let status = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "start", "", &path.to_string_lossy()])
            .status()
    } else if cfg!(target_os = "macos") {
        Command::new("open").arg(path).status()
    } else {
        Command::new("xdg-open").arg(path).status()
    }?;
    if status.success() {
        Ok(())
    } else {
        Err(AppError::Internal(format!(
            "failed to open {}",
            path.display()
        )))
    }
}

fn reveal_path(path: &Path) -> AppResult<()> {
    let status = if cfg!(target_os = "windows") {
        Command::new("explorer")
            .arg(format!("/select,{}", path.display()))
            .status()
    } else if cfg!(target_os = "macos") {
        Command::new("open").arg("-R").arg(path).status()
    } else {
        let folder = path.parent().unwrap_or(path);
        Command::new("xdg-open").arg(folder).status()
    }?;
    if status.success() {
        Ok(())
    } else {
        Err(AppError::Internal(format!(
            "failed to reveal {}",
            path.display()
        )))
    }
}

fn file_extension(file: &FileRecord) -> String {
    let name = if file.original_name.is_empty() {
        &file.stored_name
    } else {
        &file.original_name
    };
    Path::new(name)
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or("")
        .to_string()
}

fn summary_excerpt(summary: &str, keyword: &str) -> String {
    let lower = summary.to_lowercase();
    if let Some(index) = lower.find(keyword) {
        let start = summary
            .char_indices()
            .map(|(position, _)| position)
            .filter(|position| *position <= index)
            .rev()
            .nth(24)
            .unwrap_or(0);
        summary[start..].chars().take(120).collect()
    } else {
        summary.chars().take(120).collect()
    }
}

fn score_result(result: &FileSearchResult) -> usize {
    let mut score = 0;
    if result
        .matched_fields
        .iter()
        .any(|field| field == "fileName")
    {
        score += 300;
    }
    if result.matched_fields.iter().any(|field| field == "tag") {
        score += 200;
    }
    if result.matched_fields.iter().any(|field| field == "summary") {
        score += 100;
    }
    score
}
