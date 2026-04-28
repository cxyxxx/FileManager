use super::state::AppState;

pub fn bootstrap_state() -> AppState {
    let _ = tracing_subscriber::fmt().with_target(false).try_init();
    AppState::default()
}
