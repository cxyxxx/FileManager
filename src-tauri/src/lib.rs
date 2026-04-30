pub mod app;
pub mod commands;
pub mod db;
pub mod domain;
pub mod infra;
pub mod policies;
pub mod repositories;
pub mod services;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = app::bootstrap::bootstrap_state();

    tauri::Builder::default()
        .manage(state)
        .setup(|app| {
            #[cfg(debug_assertions)]
            if let Some(webview) = app.get_webview_window("main") {
                webview.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::workspace::init_workspace,
            commands::workspace::get_workspace_info,
            commands::workspace::repair_workspace,
            commands::files::import_files,
            commands::files::get_file_detail,
            commands::files::list_files,
            commands::files::get_file_page_data,
            commands::files::update_file_summary,
            commands::files::set_file_tags,
            commands::files::archive_file,
            commands::files::restore_file,
            commands::files::open_file,
            commands::files::reveal_file,
            commands::files::search_files,
            commands::files::extract_file_content,
            commands::files::get_file_content,
            commands::files::reextract_file_content,
            commands::files::get_file_preview,
            commands::files::generate_file_summary,
            commands::files::suggest_tags_for_file,
            commands::tags::create_tag,
            commands::tags::list_tags,
            commands::tags::set_tag_parent,
            commands::tags::update_tag,
            commands::tags::delete_tag,
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
            commands::queries::update_saved_query,
            commands::queries::delete_saved_query,
            commands::settings::get_settings_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
