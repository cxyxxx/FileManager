use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::domain::errors::{AppError, AppResult};
use crate::domain::file::{FileRecord, ListFilesOptions};

pub fn insert(connection: &Connection, file: &FileRecord) -> AppResult<()> {
    connection.execute(
        r#"
        INSERT INTO files (
          id, original_name, stored_name, source_path, relative_path, size_bytes,
          sha256, summary, status, freeze_status, created_at, updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
        "#,
        params![
            file.id,
            file.original_name,
            file.stored_name,
            file.source_path,
            file.relative_path,
            file.size_bytes,
            file.sha256,
            file.summary,
            file.status,
            file.freeze_status,
            file.created_at,
            file.updated_at
        ],
    )?;
    Ok(())
}

pub fn get(connection: &Connection, file_id: &str) -> AppResult<FileRecord> {
    find(connection, file_id)?.ok_or(AppError::FileNotFound)
}

pub fn find(connection: &Connection, file_id: &str) -> AppResult<Option<FileRecord>> {
    connection
        .query_row(
            "SELECT * FROM files WHERE id = ?1",
            params![file_id],
            map_file_record,
        )
        .optional()
        .map_err(AppError::from)
}

pub fn find_active_by_sha256(
    connection: &Connection,
    sha256: &str,
) -> AppResult<Option<FileRecord>> {
    connection
        .query_row(
            "SELECT * FROM files WHERE sha256 = ?1 AND status != 'archived' LIMIT 1",
            params![sha256],
            map_file_record,
        )
        .optional()
        .map_err(AppError::from)
}

pub fn list_by_tag(connection: &Connection, tag_id: &str) -> AppResult<Vec<FileRecord>> {
    let mut statement = connection.prepare(
        r#"
        SELECT files.*
        FROM files
        JOIN file_tags ON file_tags.file_id = files.id
        WHERE file_tags.tag_id = ?1 AND files.status != 'archived'
        ORDER BY files.updated_at DESC
        "#,
    )?;
    let rows = statement.query_map(params![tag_id], map_file_record)?;
    let files = collect_files(rows)?;
    Ok(files)
}

pub fn list_inbox(connection: &Connection) -> AppResult<Vec<FileRecord>> {
    let mut statement = connection.prepare(
        r#"
        SELECT files.*
        FROM files
        WHERE files.status != 'archived'
          AND NOT EXISTS (
            SELECT 1
            FROM file_tags
            JOIN tags ON tags.id = file_tags.tag_id
            WHERE file_tags.file_id = files.id
              AND tags.is_topic_enabled = 1
          )
        ORDER BY files.updated_at DESC
        "#,
    )?;
    let rows = statement.query_map([], map_file_record)?;
    let files = collect_files(rows)?;
    Ok(files)
}

pub fn list_all(connection: &Connection, options: &ListFilesOptions) -> AppResult<Vec<FileRecord>> {
    let where_clause = if options.archived_only.unwrap_or(false) {
        "WHERE status = 'archived'"
    } else if options.include_archived.unwrap_or(false) {
        ""
    } else {
        "WHERE status != 'archived'"
    };
    let mut statement = connection.prepare(&format!(
        "SELECT * FROM files {where_clause} ORDER BY updated_at DESC"
    ))?;
    let rows = statement.query_map([], map_file_record)?;
    let files = collect_files(rows)?;
    Ok(files)
}

pub fn update_status(
    connection: &Connection,
    file_id: &str,
    status: &str,
    updated_at: &str,
) -> AppResult<()> {
    let affected = connection.execute(
        "UPDATE files SET status = ?1, updated_at = ?2 WHERE id = ?3",
        params![status, updated_at, file_id],
    )?;
    if affected == 0 {
        return Err(AppError::FileNotFound);
    }
    Ok(())
}

pub fn update_summary(
    connection: &Connection,
    file_id: &str,
    summary: Option<&str>,
    updated_at: &str,
) -> AppResult<()> {
    let affected = connection.execute(
        "UPDATE files SET summary = ?1, updated_at = ?2 WHERE id = ?3",
        params![summary, updated_at, file_id],
    )?;
    if affected == 0 {
        return Err(AppError::FileNotFound);
    }
    Ok(())
}

pub fn search_candidates(
    connection: &Connection,
    include_archived: bool,
) -> AppResult<Vec<FileRecord>> {
    let sql = if include_archived {
        "SELECT * FROM files ORDER BY updated_at DESC"
    } else {
        "SELECT * FROM files WHERE status != 'archived' ORDER BY updated_at DESC"
    };
    let mut statement = connection.prepare(sql)?;
    let rows = statement.query_map([], map_file_record)?;
    collect_files(rows)
}

fn collect_files<F>(rows: rusqlite::MappedRows<'_, F>) -> AppResult<Vec<FileRecord>>
where
    F: FnMut(&Row<'_>) -> rusqlite::Result<FileRecord>,
{
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
}

fn map_file_record(row: &Row<'_>) -> rusqlite::Result<FileRecord> {
    Ok(FileRecord {
        id: row.get("id")?,
        original_name: row.get("original_name")?,
        stored_name: row.get("stored_name")?,
        source_path: row.get("source_path")?,
        relative_path: row.get("relative_path")?,
        size_bytes: row.get("size_bytes")?,
        sha256: row.get("sha256")?,
        summary: row.get("summary")?,
        status: row.get("status")?,
        freeze_status: row.get("freeze_status")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}
