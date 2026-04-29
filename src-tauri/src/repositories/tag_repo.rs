use rusqlite::{params, params_from_iter, Connection, OptionalExtension, Row};

use crate::domain::errors::{AppError, AppResult};
use crate::domain::tag::Tag;

pub fn insert(connection: &Connection, tag: &Tag) -> AppResult<()> {
    connection.execute(
        r#"
        INSERT INTO tags (
          id, name, tag_type, parent_id, is_topic_enabled, created_at, updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        "#,
        params![
            tag.id,
            tag.name,
            tag.tag_type,
            tag.parent_id,
            bool_to_int(tag.is_topic_enabled),
            tag.created_at,
            tag.updated_at
        ],
    )?;
    Ok(())
}

pub fn get(connection: &Connection, tag_id: &str) -> AppResult<Tag> {
    find(connection, tag_id)?.ok_or_else(|| AppError::NotFound(format!("tag {tag_id}")))
}

pub fn find(connection: &Connection, tag_id: &str) -> AppResult<Option<Tag>> {
    connection
        .query_row("SELECT * FROM tags WHERE id = ?1", params![tag_id], map_tag)
        .optional()
        .map_err(AppError::from)
}

pub fn list(connection: &Connection) -> AppResult<Vec<Tag>> {
    let mut statement = connection.prepare("SELECT * FROM tags ORDER BY tag_type, name")?;
    let rows = statement.query_map([], map_tag)?;
    let tags = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(AppError::from)?;
    Ok(tags)
}

pub fn list_children(connection: &Connection, parent_id: &str) -> AppResult<Vec<Tag>> {
    let mut statement = connection.prepare(
        r#"
        SELECT *
        FROM tags
        WHERE parent_id = ?1
        ORDER BY tag_type, name
        "#,
    )?;
    let rows = statement.query_map(params![parent_id], map_tag)?;
    let tags = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(AppError::from)?;
    Ok(tags)
}

pub fn list_by_ids(connection: &Connection, tag_ids: &[String]) -> AppResult<Vec<Tag>> {
    if tag_ids.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders = vec!["?"; tag_ids.len()].join(", ");
    let sql = format!(
        r#"
        SELECT *
        FROM tags
        WHERE id IN ({placeholders})
        ORDER BY tag_type, name
        "#
    );
    let mut statement = connection.prepare(&sql)?;
    let rows = statement.query_map(params_from_iter(tag_ids), map_tag)?;
    let tags = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(AppError::from)?;
    Ok(tags)
}

pub fn update_parent(
    connection: &Connection,
    child_id: &str,
    parent_id: Option<&str>,
    updated_at: &str,
) -> AppResult<Tag> {
    let affected = connection.execute(
        "UPDATE tags SET parent_id = ?1, updated_at = ?2 WHERE id = ?3",
        params![parent_id, updated_at, child_id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("tag {child_id}")));
    }
    get(connection, child_id)
}

pub fn attach_to_file(
    connection: &Connection,
    file_id: &str,
    tag_id: &str,
    created_at: &str,
) -> AppResult<()> {
    connection.execute(
        "INSERT INTO file_tags (file_id, tag_id, created_at) VALUES (?1, ?2, ?3)",
        params![file_id, tag_id, created_at],
    )?;
    Ok(())
}

pub fn file_tag_exists(connection: &Connection, file_id: &str, tag_id: &str) -> AppResult<bool> {
    let exists: i64 = connection.query_row(
        "SELECT COUNT(*) FROM file_tags WHERE file_id = ?1 AND tag_id = ?2",
        params![file_id, tag_id],
        |row| row.get(0),
    )?;
    Ok(exists > 0)
}

pub fn topic_tag_count_for_file(connection: &Connection, file_id: &str) -> AppResult<usize> {
    let count: i64 = connection.query_row(
        r#"
        SELECT COUNT(*)
        FROM file_tags
        JOIN tags ON tags.id = file_tags.tag_id
        WHERE file_tags.file_id = ?1 AND tags.is_topic_enabled = 1
        "#,
        params![file_id],
        |row| row.get(0),
    )?;
    Ok(count as usize)
}

fn map_tag(row: &Row<'_>) -> rusqlite::Result<Tag> {
    let enabled: i64 = row.get("is_topic_enabled")?;
    Ok(Tag {
        id: row.get("id")?,
        name: row.get("name")?,
        tag_type: row.get("tag_type")?,
        parent_id: row.get("parent_id")?,
        is_topic_enabled: enabled == 1,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn bool_to_int(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}
