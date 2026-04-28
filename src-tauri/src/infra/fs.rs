use std::fs;
use std::path::{Path, PathBuf};

use crate::domain::errors::{AppError, AppResult};

pub fn create_dir(path: &Path) -> AppResult<()> {
    fs::create_dir_all(path)?;
    Ok(())
}

pub fn copy_file(source: &Path, destination: &Path) -> AppResult<u64> {
    if !source.is_file() {
        return Err(AppError::FileNotFound);
    }
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)?;
    }
    Ok(fs::copy(source, destination)?)
}

pub fn sanitize_file_name(name: &str) -> String {
    let sanitized: String = name
        .chars()
        .map(|ch| match ch {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            ch if ch.is_control() => '_',
            ch => ch,
        })
        .collect();

    let trimmed = sanitized.trim().trim_matches('.').trim().to_string();
    if trimmed.is_empty() {
        "file".into()
    } else {
        trimmed
    }
}

pub fn relative_files_path(year: &str, month: &str, stored_name: &str) -> String {
    PathBuf::from("files")
        .join(year)
        .join(month)
        .join(stored_name)
        .to_string_lossy()
        .replace('\\', "/")
}
