mod storage;
mod window;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            storage::keychain_get,
            storage::keychain_set,
            storage::keychain_delete,
        ])
        .setup(|app| {
            let main_window = app
                .get_webview_window("main")
                .expect("the application config must define the main window");

            window::apply_material(&main_window)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("could not run Testing Tracker");
}
