use rusqlite::Connection;

use crate::domain::errors::AppResult;

pub fn run_migrations(connection: &Connection) -> AppResult<()> {
    connection.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS migrations (
          id TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          original_name TEXT NOT NULL,
          stored_name TEXT NOT NULL,
          source_path TEXT,
          relative_path TEXT NOT NULL UNIQUE,
          import_batch_id TEXT,
          import_root_name TEXT,
          import_root_path TEXT,
          import_relative_path TEXT,
          imported_at TEXT,
          size_bytes INTEGER NOT NULL,
          sha256 TEXT NOT NULL,
          status TEXT NOT NULL,
          freeze_status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          tag_type TEXT NOT NULL,
          parent_id TEXT REFERENCES tags(id) ON DELETE SET NULL,
          is_topic_enabled INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(name, tag_type)
        );

        CREATE TABLE IF NOT EXISTS file_tags (
          file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
          tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL,
          PRIMARY KEY (file_id, tag_id)
        );

        CREATE TABLE IF NOT EXISTS version_groups (
          id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS version_nodes (
          id TEXT PRIMARY KEY,
          file_id TEXT NOT NULL UNIQUE REFERENCES files(id) ON DELETE CASCADE,
          group_id TEXT NOT NULL REFERENCES version_groups(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          is_core INTEGER NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS version_edges (
          id TEXT PRIMARY KEY,
          source_file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
          derived_file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL,
          UNIQUE(source_file_id, derived_file_id)
        );

        CREATE TABLE IF NOT EXISTS saved_queries (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          mode TEXT NOT NULL,
          tag_ids_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS file_contents (
          file_id TEXT PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
          content_text TEXT,
          extraction_status TEXT NOT NULL,
          extraction_error TEXT,
          extracted_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        INSERT OR IGNORE INTO migrations (id, applied_at)
        VALUES ('0001_initial_schema', datetime('now'));
        "#,
    )?;
    ensure_column(connection, "files", "summary", "TEXT")?;
    ensure_column(connection, "files", "import_batch_id", "TEXT")?;
    ensure_column(connection, "files", "import_root_name", "TEXT")?;
    ensure_column(connection, "files", "import_root_path", "TEXT")?;
    ensure_column(connection, "files", "import_relative_path", "TEXT")?;
    ensure_column(connection, "files", "imported_at", "TEXT")?;
    ensure_column(
        connection,
        "saved_queries",
        "query_type",
        "TEXT NOT NULL DEFAULT 'tag'",
    )?;
    ensure_column(connection, "saved_queries", "payload_json", "TEXT")?;
    Ok(())
}

fn ensure_column(
    connection: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> AppResult<()> {
    let mut statement = connection.prepare(&format!("PRAGMA table_info({table})"))?;
    let rows = statement.query_map([], |row| row.get::<_, String>(1))?;
    let columns = rows.collect::<Result<Vec<_>, _>>()?;
    if !columns.iter().any(|name| name == column) {
        connection.execute(
            &format!("ALTER TABLE {table} ADD COLUMN {column} {definition}"),
            [],
        )?;
    }
    Ok(())
}
