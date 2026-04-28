use std::collections::HashSet;

pub fn dedupe_file_ids(file_ids: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    file_ids
        .into_iter()
        .filter(|file_id| seen.insert(file_id.clone()))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_first_file_id_and_removes_duplicates() {
        let result = dedupe_file_ids(vec!["a".into(), "b".into(), "a".into(), "c".into()]);
        assert_eq!(result, vec!["a", "b", "c"]);
    }
}
