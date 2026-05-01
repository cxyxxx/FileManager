use std::collections::HashSet;
use std::fs as std_fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::app::state::{AppState, WorkspaceContext};
use crate::domain::errors::{AppError, AppResult};
use crate::domain::file::{
    FileContent, FilePageData, FilePreview, FileRecord, FileSearchResult, FileStatus, FreezeStatus,
    ImportBatchResult, ImportResultItem, ListFilesOptions, SearchFilesOptions, SearchHighlight,
    TagSuggestion,
};
use crate::domain::version::VersionNode;
use crate::infra::{clock, fs, hashing, ids};
use crate::repositories::{file_content_repo, file_repo, tag_repo, version_repo};

const TEXT_PREVIEW_LIMIT: usize = 12_000;

enum ImportedFile {
    Created(FileRecord),
    Duplicate(FileRecord),
}

pub fn import_files(state: &AppState, paths: Vec<String>) -> AppResult<ImportBatchResult> {
    let workspace = state.workspace()?;
    let sources = paths.into_iter().map(PathBuf::from).collect::<Vec<_>>();
    if sources.is_empty() {
        return Ok(ImportBatchResult { items: Vec::new() });
    }
    let batch_root = import_batch_root(&sources)?;
    let batch = ImportBatchContext::new(&batch_root)?;
    let mut items = Vec::new();

    for source in &sources {
        import_source_tree(&workspace, &batch_root, source, &batch, &mut items)?;
    }

    Ok(ImportBatchResult { items })
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

pub fn clear_all_files(state: &AppState) -> AppResult<usize> {
    let workspace = state.workspace()?;
    let deleted_count = workspace.with_db(|connection| {
        connection.execute_batch("BEGIN IMMEDIATE TRANSACTION;")?;
        let result = (|| {
            let deleted_files = connection.execute("DELETE FROM files", [])?;
            connection.execute("DELETE FROM version_groups", [])?;
            Ok(deleted_files)
        })();

        match result {
            Ok(deleted_files) => {
                connection.execute_batch("COMMIT;")?;
                Ok(deleted_files)
            }
            Err(error) => {
                let _ = connection.execute_batch("ROLLBACK;");
                Err(error)
            }
        }
    })?;

    clear_directory_contents(Path::new(&workspace.info.files_path))?;
    clear_directory_contents(Path::new(&workspace.info.previews_path))?;

    Ok(deleted_count)
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
            scopes: None,
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
        let all_tags = tag_repo::list(connection)?;
        let required_tag_families = expand_tag_families(&required_tag_ids, &all_tags);
        let scopes = options
            .scopes
            .unwrap_or_else(|| {
                vec![
                    "fileName".into(),
                    "summary".into(),
                    "tag".into(),
                    "content".into(),
                ]
            })
            .into_iter()
            .collect::<HashSet<_>>();
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
            if !required_tag_families.is_empty()
                && !required_tag_families
                    .iter()
                    .all(|family| family.iter().any(|tag_id| tag_ids.contains(tag_id)))
            {
                continue;
            }

            let name_match =
                scopes.contains("fileName") && file.original_name.to_lowercase().contains(&keyword);
            let summary_match = scopes.contains("summary")
                && file
                    .summary
                    .as_deref()
                    .unwrap_or("")
                    .to_lowercase()
                    .contains(&keyword);
            let matched_tags = if scopes.contains("tag") {
                tags.iter()
                    .filter(|tag| tag.name.to_lowercase().contains(&keyword))
                    .cloned()
                    .collect::<Vec<_>>()
            } else {
                Vec::new()
            };
            let content_text = if scopes.contains("content") {
                file_content_repo::find(connection, &file.id)?
                    .and_then(|content| content.content_text)
                    .unwrap_or_default()
            } else {
                String::new()
            };
            let content_match =
                scopes.contains("content") && content_text.to_lowercase().contains(&keyword);
            if !name_match && !summary_match && matched_tags.is_empty() && !content_match {
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
            if content_match {
                matched_fields.push("content".into());
            }
            results.push(FileSearchResult {
                highlight: SearchHighlight {
                    file_name: name_match.then(|| file.original_name.clone()),
                    summary: summary_match
                        .then(|| summary_excerpt(file.summary.as_deref().unwrap_or(""), &keyword)),
                    content: content_match.then(|| text_excerpt(&content_text, &keyword, 180)),
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

pub fn extract_file_content(state: &AppState, file_id: &str) -> AppResult<FileContent> {
    extract_content(state, file_id)
}

pub fn reextract_file_content(state: &AppState, file_id: &str) -> AppResult<FileContent> {
    extract_content(state, file_id)
}

pub fn get_file_content(state: &AppState, file_id: &str) -> AppResult<FileContent> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        file_repo::get(connection, file_id)?;
        file_content_repo::get_or_pending(connection, file_id)
    })
}

pub fn get_file_preview(state: &AppState, file_id: &str) -> AppResult<FilePreview> {
    let workspace = state.workspace()?;
    let file = workspace.with_db(|connection| file_repo::get(connection, file_id))?;
    let extension = file_extension(&file).to_lowercase();
    let path = PathBuf::from(&workspace.info.root_path).join(&file.relative_path);

    if is_text_extension(&extension) {
        let text = workspace
            .with_db(|connection| file_content_repo::find(connection, file_id))?
            .and_then(|content| {
                (content.extraction_status == "success")
                    .then_some(content.content_text)
                    .flatten()
            })
            .or_else(|| std_fs::read_to_string(&path).ok())
            .map(|text| text.chars().take(TEXT_PREVIEW_LIMIT).collect::<String>());
        return Ok(FilePreview {
            file_id: file_id.into(),
            preview_type: "text".into(),
            text,
            image_url: None,
            error: None,
        });
    }

    if is_image_extension(&extension) {
        return Ok(FilePreview {
            file_id: file_id.into(),
            preview_type: "image".into(),
            text: None,
            image_url: Some(path.to_string_lossy().to_string()),
            error: None,
        });
    }

    Ok(FilePreview {
        file_id: file_id.into(),
        preview_type: "unsupported".into(),
        text: None,
        image_url: None,
        error: None,
    })
}

pub fn generate_file_summary(state: &AppState, file_id: &str) -> AppResult<FilePageData> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        file_repo::get(connection, file_id)?;
        let content = file_content_repo::find(connection, file_id)?
            .and_then(|content| content.content_text)
            .ok_or_else(|| AppError::InvalidInput("请先抽取文件内容".into()))?;
        let summary = normalize_summary(&content);
        if summary.is_empty() {
            return Err(AppError::InvalidInput("文件正文为空，无法生成摘要".into()));
        }
        file_repo::update_summary(connection, file_id, Some(&summary), &clock::now_iso())?;
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

pub fn suggest_tags_for_file(state: &AppState, file_id: &str) -> AppResult<Vec<TagSuggestion>> {
    let workspace = state.workspace()?;
    workspace.with_db(|connection| {
        let file = file_repo::get(connection, file_id)?;
        let attached = tag_repo::list_for_file(connection, file_id)?
            .into_iter()
            .map(|tag| tag.id)
            .collect::<HashSet<_>>();
        let content = file_content_repo::find(connection, file_id)?
            .and_then(|content| content.content_text)
            .unwrap_or_default()
            .to_lowercase();
        let name = file.original_name.to_lowercase();
        let summary = file.summary.as_deref().unwrap_or("").to_lowercase();
        let mut suggestions = Vec::new();

        for tag in tag_repo::list(connection)? {
            if attached.contains(&tag.id) || tag.name.trim().is_empty() {
                continue;
            }
            let needle = tag.name.to_lowercase();
            let mut score = 0;
            let mut reasons = Vec::new();
            if name.contains(&needle) {
                score += 3;
                reasons.push(format!("文件名命中：{}", tag.name));
            }
            if summary.contains(&needle) {
                score += 2;
                reasons.push(format!("摘要命中：{}", tag.name));
            }
            if content.contains(&needle) {
                score += 1;
                reasons.push(format!("正文命中：{}", tag.name));
            }
            if score > 0 {
                suggestions.push(TagSuggestion {
                    tag,
                    score,
                    reason: reasons.join("；"),
                });
            }
        }

        suggestions.sort_by(|left, right| {
            right
                .score
                .cmp(&left.score)
                .then_with(|| left.tag.name.cmp(&right.tag.name))
        });
        Ok(suggestions)
    })
}

fn extract_content(state: &AppState, file_id: &str) -> AppResult<FileContent> {
    let workspace = state.workspace()?;
    let file = workspace.with_db(|connection| file_repo::get(connection, file_id))?;
    let extension = file_extension(&file).to_lowercase();
    let path = PathBuf::from(&workspace.info.root_path).join(&file.relative_path);
    let now = clock::now_iso();

    let mut content = FileContent {
        file_id: file_id.into(),
        content_text: None,
        extraction_status: "pending".into(),
        extraction_error: None,
        extracted_at: None,
        created_at: Some(now.clone()),
        updated_at: Some(now.clone()),
    };

    if !is_text_extension(&extension) {
        content.extraction_status = "unsupported".into();
        return persist_file_content(&workspace, content);
    }

    match std_fs::read_to_string(&path) {
        Ok(text) => {
            content.extraction_status = "success".into();
            content.content_text = Some(text);
            content.extracted_at = Some(now);
        }
        Err(error) => {
            content.extraction_status = "failed".into();
            content.extraction_error = Some(error.to_string());
        }
    }

    persist_file_content(&workspace, content)
}

fn persist_file_content(
    workspace: &WorkspaceContext,
    mut content: FileContent,
) -> AppResult<FileContent> {
    workspace.with_db(|connection| {
        if let Some(existing) = file_content_repo::find(connection, &content.file_id)? {
            content.created_at = existing.created_at;
        }
        file_content_repo::upsert(connection, &content)?;
        file_content_repo::get_or_pending(connection, &content.file_id)
    })
}

fn stored_file_path(state: &AppState, file_id: &str) -> AppResult<PathBuf> {
    let workspace = state.workspace()?;
    let file = workspace.with_db(|connection| file_repo::get(connection, file_id))?;
    Ok(PathBuf::from(workspace.info.root_path).join(file.relative_path))
}

fn clear_directory_contents(path: &Path) -> AppResult<()> {
    if !path.exists() {
        return Ok(());
    }

    for entry in std_fs::read_dir(path)? {
        let entry = entry?;
        let entry_path = entry.path();
        let file_type = entry.file_type()?;
        if file_type.is_dir() {
            std_fs::remove_dir_all(&entry_path)?;
        } else {
            std_fs::remove_file(&entry_path)?;
        }
    }

    Ok(())
}

#[derive(Debug, Clone)]
struct ImportBatchContext {
    id: String,
    root_name: String,
    root_path: String,
    imported_at: String,
}

impl ImportBatchContext {
    fn new(source: &Path) -> AppResult<Self> {
        Ok(Self {
            id: ids::new_id(),
            root_name: source_basename(source)?,
            root_path: source.to_string_lossy().to_string(),
            imported_at: clock::now_iso(),
        })
    }
}

fn import_batch_root(paths: &[PathBuf]) -> AppResult<PathBuf> {
    let mut iter = paths.iter();
    let first = iter
        .next()
        .ok_or_else(|| AppError::InvalidInput("no import paths provided".into()))?;

    if paths.len() == 1 {
        return Ok(first.clone());
    }

    let mut root = first.clone();
    for source in iter {
        root = common_path_prefix(&root, source)
            .ok_or_else(|| AppError::InvalidInput("failed to derive import root".into()))?;
    }

    Ok(root)
}

fn common_path_prefix(left: &Path, right: &Path) -> Option<PathBuf> {
    let left_components = left.components().collect::<Vec<_>>();
    let right_components = right.components().collect::<Vec<_>>();
    let mut prefix = Vec::new();

    for (left_component, right_component) in left_components.iter().zip(right_components.iter()) {
        if left_component != right_component {
            break;
        }
        prefix.push((*left_component).clone());
    }

    if prefix.is_empty() {
        None
    } else {
        Some(prefix.into_iter().collect())
    }
}

fn import_source_tree(
    workspace: &WorkspaceContext,
    root_source: &Path,
    current: &Path,
    batch: &ImportBatchContext,
    items: &mut Vec<ImportResultItem>,
) -> AppResult<()> {
    if current.is_dir() {
        let entries = std_fs::read_dir(current)?;
        for entry in entries {
            match entry {
                Ok(entry) => {
                    import_source_tree(workspace, root_source, &entry.path(), batch, items)?;
                }
                Err(error) => {
                    items.push(ImportResultItem {
                        path: current.to_string_lossy().to_string(),
                        original_name: None,
                        status: "failed".into(),
                        file: None,
                        reason: Some(error.to_string()),
                        duplicate_of: None,
                    });
                }
            }
        }
        return Ok(());
    }

    if current.is_file() {
        match import_single_source_file(workspace, root_source, current, batch) {
            Ok(ImportedFile::Created(file)) => {
                items.push(ImportResultItem {
                    path: current.to_string_lossy().to_string(),
                    original_name: Some(file.original_name.clone()),
                    status: "success".into(),
                    file: Some(file),
                    reason: None,
                    duplicate_of: None,
                });
            }
            Ok(ImportedFile::Duplicate(duplicate_of)) => {
                items.push(ImportResultItem {
                    path: current.to_string_lossy().to_string(),
                    original_name: Some(
                        current
                            .file_name()
                            .and_then(|name| name.to_str())
                            .unwrap_or_default()
                            .to_string(),
                    ),
                    status: "duplicate".into(),
                    file: None,
                    reason: None,
                    duplicate_of: Some(duplicate_of),
                });
            }
            Err(error) => {
                items.push(ImportResultItem {
                    path: current.to_string_lossy().to_string(),
                    original_name: Some(
                        current
                            .file_name()
                            .and_then(|name| name.to_str())
                            .unwrap_or_default()
                            .to_string(),
                    ),
                    status: "failed".into(),
                    file: None,
                    reason: Some(error.to_string()),
                    duplicate_of: None,
                });
            }
        }
        return Ok(());
    }

    items.push(ImportResultItem {
        path: current.to_string_lossy().to_string(),
        original_name: None,
        status: "failed".into(),
        file: None,
        reason: Some(AppError::FileNotFound.to_string()),
        duplicate_of: None,
    });
    Ok(())
}

fn import_single_source_file(
    workspace: &WorkspaceContext,
    root_source: &Path,
    source: &Path,
    batch: &ImportBatchContext,
) -> AppResult<ImportedFile> {
    if !source.is_file() {
        return Err(AppError::FileNotFound);
    }
    let sha256 = hashing::sha256_file(source)?;
    if let Some(duplicate) =
        workspace.with_db(|connection| file_repo::find_active_by_sha256(connection, &sha256))?
    {
        return Ok(ImportedFile::Duplicate(duplicate));
    }

    let id = ids::new_id();
    let original_name = source_basename(source)?;
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
        import_batch_id: Some(batch.id.clone()),
        import_root_name: Some(batch.root_name.clone()),
        import_root_path: Some(batch.root_path.clone()),
        import_relative_path: Some(import_relative_path(root_source, source)?),
        imported_at: Some(batch.imported_at.clone()),
        size_bytes: metadata.len() as i64,
        sha256,
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

    Ok(ImportedFile::Created(record))
}

fn source_basename(path: &Path) -> AppResult<String> {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.to_string())
        .ok_or_else(|| AppError::InvalidInput("source file name is invalid".into()))
}

fn import_relative_path(root_source: &Path, source: &Path) -> AppResult<String> {
    let relative = if root_source.is_file() {
        source
            .file_name()
            .and_then(|name| name.to_str())
            .map(|name| name.to_string())
            .ok_or_else(|| AppError::InvalidInput("source file name is invalid".into()))?
    } else {
        source
            .strip_prefix(root_source)
            .map_err(|_| AppError::InvalidInput("failed to derive import relative path".into()))?
            .to_string_lossy()
            .to_string()
    };
    Ok(relative.replace('\\', "/"))
}

fn open_path(path: &Path) -> AppResult<()> {
    if !path.exists() {
        return Err(AppError::FileNotFound);
    }

    if open_with_system(path) {
        Ok(())
    } else {
        let target = reveal_target_path(path);
        if target.exists() && reveal_with_system(path, &target) {
            Ok(())
        } else {
            Err(AppError::Internal(format!(
                "failed to open {}",
                path.display()
            )))
        }
    }
}

fn reveal_path(path: &Path) -> AppResult<()> {
    let target = reveal_target_path(path);

    if !target.exists() {
        return Err(AppError::FileNotFound);
    }

    if reveal_with_system(path, &target) {
        Ok(())
    } else {
        Err(AppError::Internal(format!(
            "failed to reveal {}",
            path.display()
        )))
    }
}

fn reveal_target_path(path: &Path) -> PathBuf {
    path.parent().unwrap_or(path).to_path_buf()
}

fn open_with_system(path: &Path) -> bool {
    if cfg!(target_os = "windows") {
        let mut command = Command::new("cmd");
        command.args(["/C", "start", ""]).arg(path);
        command_succeeds(&mut command)
    } else if cfg!(target_os = "macos") {
        let mut command = Command::new("open");
        command.arg(path);
        command_succeeds(&mut command)
    } else {
        let mut gio = Command::new("gio");
        gio.arg("open").arg(path);
        if command_succeeds(&mut gio) {
            return true;
        }

        let mut xdg_open = Command::new("xdg-open");
        xdg_open.arg(path);
        command_succeeds(&mut xdg_open)
    }
}

fn reveal_with_system(original_path: &Path, target: &Path) -> bool {
    if cfg!(target_os = "windows") {
        let mut command = Command::new("explorer");
        command.arg(format!("/select,{}", original_path.display()));
        command_succeeds(&mut command)
    } else if cfg!(target_os = "macos") {
        let mut command = Command::new("open");
        command.arg("-R").arg(original_path);
        command_succeeds(&mut command)
    } else {
        let mut gio = Command::new("gio");
        gio.arg("open").arg(target);
        if command_succeeds(&mut gio) {
            return true;
        }

        let mut xdg_open = Command::new("xdg-open");
        xdg_open.arg(target);
        command_succeeds(&mut xdg_open)
    }
}

fn command_succeeds(command: &mut Command) -> bool {
    command
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
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
    text_excerpt(summary, keyword, 120)
}

fn text_excerpt(text: &str, keyword: &str, limit: usize) -> String {
    let chars = text.chars().collect::<Vec<_>>();
    if chars.is_empty() {
        return String::new();
    }

    let lower = text.to_lowercase();
    let char_index = lower
        .find(keyword)
        .map(|byte_index| lower[..byte_index].chars().count())
        .unwrap_or(0);
    let context = 32;
    let start = char_index.saturating_sub(context);
    let mut excerpt = chars
        .iter()
        .skip(start)
        .take(limit)
        .collect::<String>()
        .replace('\n', " ");
    if start > 0 {
        excerpt = format!("... {excerpt}");
    }
    if start + limit < chars.len() {
        excerpt.push_str(" ...");
    }
    excerpt
}

fn is_text_extension(extension: &str) -> bool {
    matches!(extension, "txt" | "md" | "json" | "csv")
}

fn is_image_extension(extension: &str) -> bool {
    matches!(extension, "png" | "jpg" | "jpeg" | "webp")
}

fn normalize_summary(content: &str) -> String {
    content
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(500)
        .collect()
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
    if result.matched_fields.iter().any(|field| field == "content") {
        score += 60;
    }
    score
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn source_basename_strips_parent_path() {
        let path = Path::new("/tmp/imports/深度学习/强化学习/DQL.md");
        assert_eq!(source_basename(path).unwrap(), "DQL.md");
    }

    #[test]
    fn import_relative_path_keeps_folder_structure() {
        let root = Path::new("/tmp/imports/深度学习");
        let file = Path::new("/tmp/imports/深度学习/强化学习/DQL.md");
        assert_eq!(import_relative_path(root, file).unwrap(), "强化学习/DQL.md");
    }

    #[test]
    fn import_batch_root_uses_common_parent_for_multiple_files() {
        let sources = vec![
            PathBuf::from("/tmp/imports/年度归档/发票/A.pdf"),
            PathBuf::from("/tmp/imports/年度归档/发票/B.pdf"),
            PathBuf::from("/tmp/imports/年度归档/发票/子目录/C.pdf"),
        ];
        assert_eq!(
            import_batch_root(&sources).unwrap(),
            PathBuf::from("/tmp/imports/年度归档/发票")
        );
    }

    #[test]
    fn import_batch_root_keeps_single_file_as_is() {
        let sources = vec![PathBuf::from("/tmp/imports/年度归档/发票/A.pdf")];
        assert_eq!(
            import_batch_root(&sources).unwrap(),
            PathBuf::from("/tmp/imports/年度归档/发票/A.pdf")
        );
    }

    #[test]
    fn reveal_target_path_uses_parent_for_files() {
        let path = Path::new("/tmp/workspace/files/2026/05/example.bin");
        assert_eq!(
            reveal_target_path(path),
            PathBuf::from("/tmp/workspace/files/2026/05")
        );
    }
}

fn expand_tag_families(
    tag_ids: &[String],
    tags: &[crate::domain::tag::Tag],
) -> Vec<HashSet<String>> {
    tag_ids
        .iter()
        .map(|tag_id| {
            descendant_tag_ids(tag_id, tags)
                .into_iter()
                .collect::<HashSet<_>>()
        })
        .collect()
}

fn descendant_tag_ids(root_id: &str, tags: &[crate::domain::tag::Tag]) -> Vec<String> {
    let mut result = Vec::new();
    let mut visited = HashSet::new();
    let mut queue = std::collections::VecDeque::from([root_id.to_string()]);

    while let Some(parent_id) = queue.pop_front() {
        if !visited.insert(parent_id.clone()) {
            continue;
        }
        result.push(parent_id.clone());
        for tag in tags
            .iter()
            .filter(|tag| tag.parent_id.as_deref() == Some(parent_id.as_str()))
        {
            if !visited.contains(&tag.id) {
                queue.push_back(tag.id.clone());
            }
        }
    }

    result
}
