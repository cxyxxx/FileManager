use rusqlite::{params, Connection, OptionalExtension, Row};

use crate::domain::errors::{AppError, AppResult};
use crate::domain::version::{VersionEdge, VersionNode};

pub fn create_group(connection: &Connection, group_id: &str, created_at: &str) -> AppResult<()> {
    connection.execute(
        "INSERT OR IGNORE INTO version_groups (id, created_at) VALUES (?1, ?2)",
        params![group_id, created_at],
    )?;
    Ok(())
}

pub fn insert_node(connection: &Connection, node: &VersionNode) -> AppResult<()> {
    connection.execute(
        r#"
        INSERT INTO version_nodes (id, file_id, group_id, role, is_core, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        "#,
        params![
            node.id,
            node.file_id,
            node.group_id,
            node.role,
            bool_to_int(node.is_core),
            node.created_at
        ],
    )?;
    Ok(())
}

pub fn insert_edge(connection: &Connection, edge: &VersionEdge) -> AppResult<()> {
    connection.execute(
        r#"
        INSERT INTO version_edges (id, source_file_id, derived_file_id, created_at)
        VALUES (?1, ?2, ?3, ?4)
        "#,
        params![edge.id, edge.source_file_id, edge.derived_file_id, edge.created_at],
    )?;
    Ok(())
}

pub fn find_node_by_file(connection: &Connection, file_id: &str) -> AppResult<Option<VersionNode>> {
    connection
        .query_row(
            "SELECT * FROM version_nodes WHERE file_id = ?1",
            params![file_id],
            map_node,
        )
        .optional()
        .map_err(AppError::from)
}

pub fn get_node_by_file(connection: &Connection, file_id: &str) -> AppResult<VersionNode> {
    find_node_by_file(connection, file_id)?.ok_or_else(|| AppError::NotFound(format!("version node for {file_id}")))
}

pub fn list_group_nodes(connection: &Connection, group_id: &str) -> AppResult<Vec<VersionNode>> {
    let mut statement =
        connection.prepare("SELECT * FROM version_nodes WHERE group_id = ?1 ORDER BY created_at ASC")?;
    let rows = statement.query_map(params![group_id], map_node)?;
    let nodes = rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)?;
    Ok(nodes)
}

pub fn update_role(connection: &Connection, file_id: &str, role: &str) -> AppResult<VersionNode> {
    let affected = connection.execute(
        "UPDATE version_nodes SET role = ?1 WHERE file_id = ?2",
        params![role, file_id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("version node for {file_id}")));
    }
    get_node_by_file(connection, file_id)
}

pub fn clear_core_for_role(connection: &Connection, group_id: &str, role: &str) -> AppResult<()> {
    connection.execute(
        "UPDATE version_nodes SET is_core = 0 WHERE group_id = ?1 AND role = ?2",
        params![group_id, role],
    )?;
    Ok(())
}

pub fn set_core(connection: &Connection, file_id: &str, is_core: bool) -> AppResult<VersionNode> {
    let affected = connection.execute(
        "UPDATE version_nodes SET is_core = ?1 WHERE file_id = ?2",
        params![bool_to_int(is_core), file_id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("version node for {file_id}")));
    }
    get_node_by_file(connection, file_id)
}

fn map_node(row: &Row<'_>) -> rusqlite::Result<VersionNode> {
    let is_core: i64 = row.get("is_core")?;
    Ok(VersionNode {
        id: row.get("id")?,
        file_id: row.get("file_id")?,
        group_id: row.get("group_id")?,
        role: row.get("role")?,
        is_core: is_core == 1,
        created_at: row.get("created_at")?,
    })
}

fn bool_to_int(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}
