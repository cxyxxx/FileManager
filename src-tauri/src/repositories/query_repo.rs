use rusqlite::{params, Connection, Row};

use crate::domain::errors::{AppError, AppResult};
use crate::domain::query::SavedQuery;

pub fn insert(connection: &Connection, query: &SavedQuery) -> AppResult<()> {
    connection.execute(
        r#"
        INSERT INTO saved_queries (id, name, mode, tag_ids_json, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        "#,
        params![
            query.id,
            query.name,
            query.mode,
            serde_json::to_string(&query.tag_ids).map_err(|err| AppError::Internal(err.to_string()))?,
            query.created_at,
            query.updated_at
        ],
    )?;
    Ok(())
}

pub fn list(connection: &Connection) -> AppResult<Vec<SavedQuery>> {
    let mut statement = connection.prepare("SELECT * FROM saved_queries ORDER BY updated_at DESC")?;
    let rows = statement.query_map([], map_saved_query)?;
    let queries = rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)?;
    Ok(queries)
}

fn map_saved_query(row: &Row<'_>) -> rusqlite::Result<SavedQuery> {
    let tag_ids_json: String = row.get("tag_ids_json")?;
    let tag_ids = serde_json::from_str(&tag_ids_json).unwrap_or_default();
    Ok(SavedQuery {
        id: row.get("id")?,
        name: row.get("name")?,
        mode: row.get("mode")?,
        tag_ids,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}
