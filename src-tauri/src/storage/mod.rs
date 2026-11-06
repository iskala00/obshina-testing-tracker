use sha2::{Digest, Sha256};
use std::error::Error;
use tauri::{AppHandle, async_runtime};

#[cfg(target_os = "macos")]
#[path = "macos.rs"]
mod platform;

#[cfg(target_os = "windows")]
#[path = "windows.rs"]
mod platform;

type StorageResult<T> = Result<T, Box<dyn Error + Send + Sync>>;

struct Entry {
    app: AppHandle,
    account: String,
}

impl Entry {
    fn new(app: AppHandle, namespace: String, key: String) -> Self {
        // Length framing preserves arbitrary Unicode names, including delimiters and empty strings.
        let mut hash = Sha256::new();
        for part in [app.config().identifier.as_str(), &namespace, &key] {
            hash.update((part.len() as u64).to_be_bytes());
            hash.update(part.as_bytes());
        }

        Self {
            app,
            account: hex::encode(hash.finalize()),
        }
    }
}

async fn run<T: Send + 'static>(
    operation: impl FnOnce() -> StorageResult<T> + Send + 'static,
) -> Result<T, String> {
    async_runtime::spawn_blocking(operation)
        .await
        .map_err(|err| err.to_string())?
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn keychain_get(
    app: AppHandle,
    namespace: String,
    key: String,
) -> Result<Option<String>, String> {
    run(move || platform::read(&Entry::new(app, namespace, key))).await
}

#[tauri::command]
pub async fn keychain_set(
    app: AppHandle,
    namespace: String,
    key: String,
    value: String,
) -> Result<(), String> {
    run(move || platform::write(&Entry::new(app, namespace, key), &value)).await
}

#[tauri::command]
pub async fn keychain_delete(app: AppHandle, namespace: String, key: String) -> Result<(), String> {
    run(move || platform::delete(&Entry::new(app, namespace, key))).await
}
