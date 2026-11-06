use super::{Entry, StorageResult};
use std::{
    fs,
    io::{self, Write},
    path::PathBuf,
    ptr, slice,
};
use tauri::Manager;
use tempfile::NamedTempFile;
use windows_sys::Win32::{
    Foundation::LocalFree,
    Security::Cryptography::{
        CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN, CryptProtectData, CryptUnprotectData,
    },
};

fn directory(entry: &Entry) -> StorageResult<PathBuf> {
    Ok(entry
        .app
        .path()
        .app_local_data_dir()?
        .join("protected-state"))
}

fn input_blob(bytes: &[u8]) -> StorageResult<CRYPT_INTEGER_BLOB> {
    Ok(CRYPT_INTEGER_BLOB {
        cbData: u32::try_from(bytes.len())?,
        pbData: bytes.as_ptr().cast_mut(),
    })
}

enum Operation {
    Encrypt,
    Decrypt,
}

fn transform(operation: Operation, data: &[u8], account: &str) -> StorageResult<Vec<u8>> {
    let input = input_blob(data)?;
    let entropy = input_blob(account.as_bytes())?;
    let mut output = CRYPT_INTEGER_BLOB::default();

    // The input buffers live through the call. DPAPI authenticates the blob in the current
    // Windows user's scope; slot-specific entropy prevents moving ciphertext between keys.
    let success = unsafe {
        match operation {
            Operation::Encrypt => CryptProtectData(
                &input,
                ptr::null(),
                &entropy,
                ptr::null(),
                ptr::null(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            ),
            Operation::Decrypt => CryptUnprotectData(
                &input,
                ptr::null_mut(),
                &entropy,
                ptr::null(),
                ptr::null(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            ),
        }
    };

    if success == 0 {
        return Err(io::Error::last_os_error().into());
    }

    // Successful DPAPI output belongs to LocalAlloc, including a possible zero-length value.
    let bytes = unsafe {
        let bytes = if output.cbData == 0 {
            Vec::new()
        } else {
            slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec()
        };
        LocalFree(output.pbData.cast());
        bytes
    };

    Ok(bytes)
}

pub(super) fn read(entry: &Entry) -> StorageResult<Option<String>> {
    let path = directory(entry)?.join(&entry.account);
    let ciphertext = match fs::read(path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.into()),
    };

    let plaintext = transform(Operation::Decrypt, &ciphertext, &entry.account)?;
    Ok(Some(String::from_utf8(plaintext)?))
}

pub(super) fn write(entry: &Entry, value: &str) -> StorageResult<()> {
    let directory = directory(entry)?;
    fs::create_dir_all(&directory)?;

    let ciphertext = transform(Operation::Encrypt, value.as_bytes(), &entry.account)?;
    let mut file = NamedTempFile::new_in(&directory)?;
    file.write_all(&ciphertext)?;
    file.as_file().sync_all()?;
    file.persist(directory.join(&entry.account))?;
    Ok(())
}

pub(super) fn delete(entry: &Entry) -> StorageResult<()> {
    match fs::remove_file(directory(entry)?.join(&entry.account)) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.into()),
    }
}
