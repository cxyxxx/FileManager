use std::collections::HashMap;

use crate::domain::errors::{AppError, AppResult};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TagHierarchyItem {
    pub id: String,
    pub parent_id: Option<String>,
}

pub fn validate_parent_change(
    child_id: &str,
    parent_id: Option<&str>,
    items: &[TagHierarchyItem],
) -> AppResult<()> {
    let Some(parent_id) = parent_id else {
        return Ok(());
    };

    if child_id == parent_id {
        return Err(AppError::TagHierarchyCycle);
    }

    let parent_by_id: HashMap<&str, Option<&str>> = items
        .iter()
        .map(|item| (item.id.as_str(), item.parent_id.as_deref()))
        .collect();

    let mut cursor = Some(parent_id);
    while let Some(current_id) = cursor {
        if current_id == child_id {
            return Err(AppError::TagHierarchyCycle);
        }
        cursor = parent_by_id.get(current_id).and_then(|parent| *parent);
    }

    Ok(())
}

pub fn validate_tag_name_and_type(name: &str, tag_type: &str) -> AppResult<()> {
    if name.trim().is_empty() {
        return Err(AppError::InvalidInput("tag name is required".into()));
    }
    if tag_type.trim().is_empty() {
        return Err(AppError::InvalidInput("tag type is required".into()));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::errors::AppError;

    #[test]
    fn rejects_self_parent() {
        let result = validate_parent_change("tag-a", Some("tag-a"), &[]);
        assert!(matches!(result, Err(AppError::TagHierarchyCycle)));
    }

    #[test]
    fn rejects_parent_that_is_descendant() {
        let items = vec![
            TagHierarchyItem {
                id: "parent".into(),
                parent_id: None,
            },
            TagHierarchyItem {
                id: "child".into(),
                parent_id: Some("parent".into()),
            },
            TagHierarchyItem {
                id: "grandchild".into(),
                parent_id: Some("child".into()),
            },
        ];

        let result = validate_parent_change("parent", Some("grandchild"), &items);
        assert!(matches!(result, Err(AppError::TagHierarchyCycle)));
    }
}
