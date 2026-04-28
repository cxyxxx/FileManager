pub mod app;
pub mod commands;
pub mod db;
pub mod domain;
pub mod infra;
pub mod policies;
pub mod repositories;
pub mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = app::bootstrap::bootstrap_state();

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::workspace::init_workspace,
            commands::workspace::get_workspace_info,
            commands::workspace::repair_workspace,
            commands::files::import_files,
            commands::files::get_file_detail,
            commands::files::archive_file,
            commands::files::open_file,
            commands::tags::create_tag,
            commands::tags::list_tags,
            commands::tags::set_tag_parent,
            commands::tags::attach_tags_to_file,
            commands::versions::create_derived_version,
            commands::versions::set_version_role,
            commands::versions::set_core_version,
            commands::versions::get_version_chain,
            commands::queries::get_inbox_files,
            commands::queries::get_tag_page_data,
            commands::queries::query_files_by_tags,
            commands::queries::save_query,
            commands::queries::get_saved_queries,
            commands::settings::get_settings_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
