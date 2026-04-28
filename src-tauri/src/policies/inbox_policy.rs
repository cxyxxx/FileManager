pub fn is_unclassified_topic_file(topic_enabled_tag_count: usize) -> bool {
    topic_enabled_tag_count == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_without_topic_enabled_tags_is_unclassified() {
        assert!(is_unclassified_topic_file(0));
    }

    #[test]
    fn file_with_topic_enabled_tag_is_not_unclassified() {
        assert!(!is_unclassified_topic_file(1));
    }
}
