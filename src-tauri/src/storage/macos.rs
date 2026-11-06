use super::{Entry, StorageResult};
use security_framework::passwords::{
    PasswordOptions, delete_generic_password, generic_password, set_generic_password_options,
};
use security_framework_sys::base::errSecItemNotFound;

fn options(entry: &Entry) -> PasswordOptions {
    PasswordOptions::new_generic_password(&entry.app.config().identifier, &entry.account)
}

pub(super) fn read(entry: &Entry) -> StorageResult<Option<String>> {
    match generic_password(options(entry)) {
        Ok(bytes) => Ok(Some(String::from_utf8(bytes)?)),
        Err(error) if error.code() == errSecItemNotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

pub(super) fn write(entry: &Entry, value: &str) -> StorageResult<()> {
    set_generic_password_options(value.as_bytes(), options(entry))?;
    Ok(())
}

pub(super) fn delete(entry: &Entry) -> StorageResult<()> {
    match delete_generic_password(&entry.app.config().identifier, &entry.account) {
        Ok(()) => Ok(()),
        Err(error) if error.code() == errSecItemNotFound => Ok(()),
        Err(error) => Err(error.into()),
    }
}
