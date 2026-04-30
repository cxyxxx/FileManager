use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::domain::errors::{AppError, AppResult};
use crate::domain::file::FileContent;

pub fn upsert(connection: &Connection, content: &FileContent) -> AppResult<()> {
    connection.execute(
        r#"
        INSERT INTO file_contents (
          file_id, content_text, extraction_status, extraction_error,
          extracted_at, created_at, updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(file_id) DO UPDATE SET
          content_text = excluded.content_text,
          extraction_status = excluded.extraction_status,
          extraction_error = excluded.extraction_error,
          extracted_at = excluded.extracted_at,
          updated_at = excluded.updated_at
        "#,
        params![
            content.file_id,
            content.content_text,
            content.extraction_status,
            content.extraction_error,
            content.extracted_at,
            content.created_at,
            content.updated_at
        ],
    )?;
    Ok(())
}

pub fn find(connection: &Connection, file_id: &str) -> AppResult<Option<FileContent>> {
    connection
        .query_row(
            "SELECT * FROM file_contents WHERE file_id = ?1",
            params![file_id],
            map_file_content,
        )
        .optional()
        .map_err(AppError::from)
}

pub fn get_or_pending(connection: &Connection, file_id: &str) -> AppResult<FileContent> {
    Ok(find(connection, file_id)?.unwrap_or_else(|| FileContent {
        file_id: file_id.to_string(),
        content_text: None,
        extraction_status: "pending".into(),
        extraction_error: None,
        extracted_at: None,
        created_at: None,
        updated_at: None,
    }))
}

fn map_file_content(row: &Row<'_>) -> rusqlite::Result<FileContent> {
    Ok(FileContent {
        file_id: row.get("file_id")?,
        content_text: row.get("content_text")?,
        extraction_status: row.get("extraction_status")?,
        extraction_error: row.get("extraction_error")?,
        extracted_at: row.get("extracted_at")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}
