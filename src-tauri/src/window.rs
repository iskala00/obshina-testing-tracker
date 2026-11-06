use tauri::WebviewWindow;
use window_vibrancy::Error;

#[cfg(target_os = "macos")]
pub fn apply_material(window: &WebviewWindow) -> Result<(), Error> {
    use window_vibrancy::{
        LiquidGlassOptions, NSGlassEffectViewStyle, NSVisualEffectMaterial, NSVisualEffectState,
        apply_liquid_glass, apply_vibrancy,
    };

    let glass = LiquidGlassOptions::new(NSGlassEffectViewStyle::Regular).radius(0.0);
    match apply_liquid_glass(window, glass) {
        Err(Error::UnsupportedPlatformVersion(_)) => apply_vibrancy(
            window,
            NSVisualEffectMaterial::Popover,
            Some(NSVisualEffectState::Active),
            None,
        ),
        result => result,
    }
}

#[cfg(target_os = "windows")]
pub fn apply_material(window: &WebviewWindow) -> Result<(), Error> {
    use window_vibrancy::{apply_acrylic, apply_mica};

    match apply_mica(window, None) {
        Err(Error::UnsupportedPlatformVersion(_) | Error::Win32Error { .. }) => {
            match apply_acrylic(window, None) {
                // DWM may disable transparency, e.g. in a remote session. Keep the native window usable.
                Err(Error::UnsupportedPlatformVersion(_) | Error::Win32Error { .. }) => Ok(()),
                result => result,
            }
        }
        result => result,
    }
}
