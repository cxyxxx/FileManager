use crate::domain::errors::{AppError, AppResult};

pub fn ensure_file_can_be_mutated(freeze_status: &str) -> AppResult<()> {
    if freeze_status == "delivery_frozen" {
        return Err(AppError::DeliveryFileFrozen);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::errors::AppError;

    #[test]
    fn rejects_delivery_frozen_file_mutation() {
        let result = ensure_file_can_be_mutated("delivery_frozen");
        assert!(matches!(result, Err(AppError::DeliveryFileFrozen)));
    }

    #[test]
    fn allows_draft_file_mutation() {
        assert!(ensure_file_can_be_mutated("draft").is_ok());
    }
}
