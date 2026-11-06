fn main() {
    let manifest = tauri_build::AppManifest::new().commands(&[
        "keychain_get",
        "keychain_set",
        "keychain_delete",
    ]);

    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(manifest))
        .expect("could not build Testing Tracker");
}
